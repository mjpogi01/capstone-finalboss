const express = require('express');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { authenticateSupabaseToken, requireAdminOrOwner } = require('../middleware/supabaseAuth');
const { executeSql } = require('../lib/sqlClient');
const { callGroq, sanitizeMessages } = require('./aiCommon');

const router = express.Router();
router.use(authenticateSupabaseToken);
router.use(requireAdminOrOwner);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const MAX_SQL_GENERATION_ATTEMPTS = 2;
const MAX_SQL_EXECUTION_ATTEMPTS = 3;

async function getSchemaSnapshot() {
  const sql = `
    SELECT
      t.table_name AS table_name,
      array_agg(
        jsonb_build_object(
          'column_name', c.column_name,
          'data_type', c.data_type,
          'is_nullable', c.is_nullable
        )
        ORDER BY c.ordinal_position
      ) AS columns
    FROM information_schema.tables t
    JOIN information_schema.columns c
      ON t.table_name = c.table_name AND t.table_schema = c.table_schema
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
    GROUP BY t.table_name
    ORDER BY t.table_name;
  `;

  const { rows } = await pool.query(sql);
  return rows;
}

function normalizeSql(sql) {
  return sql.replace(/;\s*$/g, '').trim();
}

function isSafeSelect(sql) {
  return /^\s*select\b/i.test(sql) && !/\b(insert|update|delete|drop|alter|create|grant|revoke)\b/i.test(sql);
}

function extractSqlBlock(text = '') {
  const inlineMatch = text.match(/<SQL>([\s\S]*?)<\/SQL>/i);
  if (inlineMatch) {
    return inlineMatch[1].trim();
  }

  const fencedMatch = text.match(/```sql([\s\S]*?)```/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  return null;
}

function stripSqlBlocks(text = '') {
  return text
    .replace(/<SQL>[\s\S]*?<\/SQL>/gi, '')
    .replace(/<THINK>[\s\S]*?<\/THINK>/gi, '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<internal>[\s\S]*?<\/internal>/gi, '')
    .trim();
}

function buildSchemaPrompt(snapshot = []) {
  const lines = snapshot.map(({ table_name: tableName, columns }) => {
    const columnDetails = columns
      .map((column) => `${column.column_name} (${column.data_type}${column.is_nullable === 'NO' ? ', not null' : ''})`)
      .join(', ');

    return `Table ${tableName}: ${columnDetails}`;
  });

  return lines.join('\n');
}

function buildWhereClause(filters = {}) {
  const clauses = [];
  const params = [];
  let index = 1;

  if (Number.isInteger(filters.yearStart)) {
    clauses.push(`EXTRACT(YEAR FROM created_at) >= $${index}`);
    params.push(filters.yearStart);
    index += 1;
  }

  if (Number.isInteger(filters.yearEnd)) {
    clauses.push(`EXTRACT(YEAR FROM created_at) <= $${index}`);
    params.push(filters.yearEnd);
    index += 1;
  }

  clauses.push("created_at < date_trunc('month', CURRENT_TIMESTAMP)");

  return {
    clause: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params
  };
}

router.get('/schema', async (_req, res) => {
  try {
    const snapshot = await getSchemaSnapshot();
    res.json({ success: true, schema: snapshot });
  } catch (error) {
    console.error('Failed to fetch schema snapshot:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch schema snapshot.' });
  }
});

router.post('/assistant', async (req, res) => {
  try {
    const { question, messages } = req.body || {};

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ success: false, error: 'A question is required.' });
    }

    const schemaSnapshot = await getSchemaSnapshot();
    const schemaPrompt = buildSchemaPrompt(schemaSnapshot);

    const systemPrompt = [
      'You are Nexus, an AI analytics assistant with full access to the Yohanns database schema.',
      'The schema is described below. Use it to craft safe SQL queries (SELECT only).',
      'Only propose SQL you are confident will run. Wrap SQL in <SQL>...</SQL>.',
      'If the question cannot be answered without querying the data, ALWAYS provide a SELECT statement inside <SQL>...</SQL> first, then wait for query results before presenting conclusions.',
      'Branch information lives in orders.pickup_location (text) rather than a branch_id column; join to the branches table by name when needed.',
      'Customer location data: orders.delivery_address is a JSONB field containing city, province, barangay, and other address fields. Access with delivery_address->>\'province\', delivery_address->>\'city\', etc. For location queries, check both user_addresses table and orders.delivery_address JSONB field. Use UNION to combine results from both sources.',
      'After receiving query results, explain them using the same bold heading format as before.',
      'Never attempt to modify the database. Return informative errors if a query would fail.'
    ].join('\n\n');

    const schemaMessage = `Database schema summary:\n${schemaPrompt}`;

    const rawQuestion = question.trim();
    const conversation = [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: schemaMessage }
    ];

    const sanitized = sanitizeMessages(messages);
    if (sanitized.length > 0) {
      conversation.push(...sanitized);
    }

    conversation.push({ role: 'user', content: rawQuestion });

    let initialResponse;
    let initialReply;
    let proposedSql;
    let draftAttempts = 0;

    while (draftAttempts <= MAX_SQL_GENERATION_ATTEMPTS) {
      initialResponse = await callGroq(conversation, { estimatedTokens: 4000 });
      initialReply = initialResponse.reply;
      proposedSql = extractSqlBlock(initialReply);

      if (proposedSql) {
        break;
      }

      conversation.push({ role: 'assistant', content: initialReply });
      conversation.push({
        role: 'user',
        content: 'You did not provide SQL. Respond with only the SELECT query required, wrapped in <SQL>...</SQL>, with no additional commentary.'
      });

      draftAttempts += 1;
    }

    if (!proposedSql) {
      return res.json({
        success: true,
        reply: stripSqlBlocks(initialReply),
        model: initialResponse.model,
        usage: initialResponse.usage || null
      });
    }

    let normalizedSql = normalizeSql(proposedSql);

    if (!isSafeSelect(normalizedSql)) {
      return res.status(400).json({
        success: false,
        error: 'Only SELECT queries are supported in this assistant.'
      });
    }

    let result;
    let sqlAttempts = 0;

    while (sqlAttempts < MAX_SQL_EXECUTION_ATTEMPTS) {
      try {
        result = await executeSql(normalizedSql);
        break;
      } catch (sqlError) {
        sqlAttempts += 1;
        console.error('Schema assistant SQL error:', sqlError);

        if (sqlAttempts >= MAX_SQL_EXECUTION_ATTEMPTS) {
          return res.status(500).json({ success: false, error: `SQL execution failed: ${sqlError.message}` });
        }

        conversation.push({ role: 'assistant', content: initialReply });
        conversation.push({
          role: 'user',
          content: `The SQL failed with error: ${sqlError.message}. Provide a corrected SELECT query wrapped in <SQL>...</SQL> with no additional commentary.`
        });

        initialResponse = await callGroq(conversation, { estimatedTokens: 4000 });
        initialReply = initialResponse.reply;
        proposedSql = extractSqlBlock(initialReply);

        if (!proposedSql) {
          conversation.push({ role: 'assistant', content: initialReply });
          conversation.push({
            role: 'user',
            content: 'You still have not provided SQL. Respond with only the SELECT query required, wrapped in <SQL>...</SQL>, with no narration.'
          });
          continue;
        }

        normalizedSql = normalizeSql(proposedSql);

        if (!isSafeSelect(normalizedSql)) {
          return res.status(400).json({ success: false, error: 'Only SELECT queries are supported in this assistant.' });
        }
      }
    }

    const summary = {
      executedSql: normalizedSql,
      rowCount: result.rowCount,
      durationMs: result.durationMs || null,
      columns: result.fields?.map((field) => field.name) || [],
      sampleRows: Array.isArray(result.rows) ? result.rows.slice(0, 50) : []
    };

    const interpretationPrompt = [
      'SQL executed successfully.',
      `Rows returned: ${summary.rowCount}`,
      `Columns: ${summary.columns.join(', ') || 'n/a'}`,
      `Execution time: ${summary.durationMs !== null ? `${summary.durationMs} ms` : 'n/a'}`,
      `Sample rows:\n${JSON.stringify(summary.sampleRows, null, 2)}`,
      'Provide a single consolidated analysis that incorporates these results. Do not repeat earlier phrasing or produce multiple summaries—respond once using the agreed bold headings and bullet formatting.'
    ].join('\n\n');

    const followUpMessages = [
      ...conversation,
      { role: 'assistant', content: initialReply },
      { role: 'user', content: interpretationPrompt }
    ];

    const followUp = await callGroq(followUpMessages, { estimatedTokens: 3000 });

    res.json({
      success: true,
      reply: stripSqlBlocks(followUp.reply),
      sql: summary.executedSql,
      rows: summary.sampleRows,
      columns: summary.columns,
      rowCount: summary.rowCount,
      durationMs: summary.durationMs,
      model: followUp.model,
      usage: followUp.usage || null
    });
  } catch (error) {
    console.error('Schema assistant error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to process schema assistant request.' });
  }
});

module.exports = router;
