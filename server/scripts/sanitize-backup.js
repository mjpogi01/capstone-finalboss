const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

/**
 * Remove customer-related data (accounts + orders) from a SQL backup file.
 */
async function sanitizeBackup() {
  console.log('\n🧼 SQL Backup Sanitizer\n');
  console.log('This tool removes customer accounts and orders data from a backup file.\n');

  try {
    const backupsDir = path.join(__dirname, '..', '..', 'backups');
    if (!fs.existsSync(backupsDir)) {
      throw new Error(`Backups directory not found: ${backupsDir}`);
    }

    const backupFiles = fs
      .readdirSync(backupsDir)
      .filter((file) => file.endsWith('.sql'))
      .map((file) => {
        const fullPath = path.join(backupsDir, file);
        return {
          name: file,
          path: fullPath,
          size: fs.statSync(fullPath).size
        };
      })
      .sort((a, b) => b.size - a.size);

    if (backupFiles.length === 0) {
      throw new Error('No .sql backup files found in backups/ directory');
    }

    console.log('📁 Available backup files:');
    backupFiles.forEach((file, idx) => {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      console.log(`   ${idx + 1}. ${file.name} (${sizeMB} MB)`);
    });
    console.log();

    // Select file
    let selectedFile;
    const autoIndex = process.env.SANITIZE_FILE_INDEX;
    if (autoIndex) {
      const index = parseInt(autoIndex, 10) - 1;
      if (Number.isNaN(index) || index < 0 || index >= backupFiles.length) {
        throw new Error(
          `Invalid SANITIZE_FILE_INDEX value: ${autoIndex}. Must be between 1 and ${backupFiles.length}.`
        );
      }
      selectedFile = backupFiles[index];
      console.log(`✅ Selected via SANITIZE_FILE_INDEX: ${selectedFile.name}\n`);
    } else if (backupFiles.length === 1) {
      selectedFile = backupFiles[0];
      console.log(`✅ Using: ${selectedFile.name}\n`);
    } else {
      const choice = await question(`Select backup file (1-${backupFiles.length}): `);
      const index = parseInt(choice, 10) - 1;
      if (Number.isNaN(index) || index < 0 || index >= backupFiles.length) {
        throw new Error('Invalid selection');
      }
      selectedFile = backupFiles[index];
      console.log(`✅ Selected: ${selectedFile.name}\n`);
    }

    // Output file name
    const defaultOutputName = selectedFile.name.replace('.sql', '-sanitized.sql');
    let outputNameInput = process.env.SANITIZE_OUTPUT_NAME;
    if (!outputNameInput) {
      outputNameInput = await question(
        `Enter output file name (default: ${defaultOutputName}): `
      );
    } else {
      console.log(
        `📝 Using SANITIZE_OUTPUT_NAME: ${outputNameInput.trim() || defaultOutputName}`
      );
    }
    const outputName = (outputNameInput || '').trim() || defaultOutputName;
    const outputPath = path.join(backupsDir, outputName);

    // Tables whose data we remove (customer accounts & orders)
    const tablesToStrip = new Set([
      // Customer accounts & orders
      'users',
      'user_profiles',
      'user_addresses',
      'user_carts',
      'user_wishlist',
      'orders',
      'order_items',
      'order_reviews',
      'order_tracking',
      'order_types',
      // Artist tasks & chatrooms
      'artist_tasks',
      'artist_task_notes',
      'artist_task_events',
      'artist_assignments',
      'task_comments',
      'task_comment_files',
      'artist_chatrooms',
      'artist_chatroom_messages',
      'artist_chatroom_participants',
      // Branch chat + production workflow
      'branch_chat_messages',
      'branch_chat_rooms',
      'branch_chat_room_members',
      'production_workflow',
      'production_workflow_logs',
      'production_workflow_history'
    ]);

    console.log('🧾 Reading backup file (this may take a minute)...');
    const fileContent = fs.readFileSync(selectedFile.path, 'utf8');
    console.log('🔍 Parsing SQL statements...');

    const sanitizedStatements = [];
    let current = '';
    let inString = false;
    let stringChar = '';
    let parenDepth = 0;

    for (let i = 0; i < fileContent.length; i++) {
      const char = fileContent[i];
      const prevChar = i > 0 ? fileContent[i - 1] : '';

      if (!inString && (char === "'" || char === '"')) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && prevChar !== '\\') {
        inString = false;
        stringChar = '';
      }

      if (!inString) {
        if (char === '(') parenDepth++;
        if (char === ')') parenDepth--;
      }

      current += char;

      if (!inString && parenDepth === 0 && char === ';') {
        const trimmed = current.trim();
        if (trimmed.length > 0) {
          const cleaned = trimmed
            .split('\n')
            .filter((line) => !line.trim().startsWith('--'))
            .join('\n')
            .trim();
          if (cleaned.length > 0) {
            sanitizedStatements.push(cleaned);
          }
        }
        current = '';
      }
    }

    if (current.trim().length > 0) {
      sanitizedStatements.push(current.trim());
    }

    console.log(`📋 Total statements: ${sanitizedStatements.length}`);

    // Filter statements
    const keptStatements = [];
    let strippedCount = 0;

    const insertRegex = /^INSERT\s+INTO\s+"?([a-zA-Z0-9_]+)"?/i;

    for (const stmt of sanitizedStatements) {
      const match = stmt.match(insertRegex);
      if (match) {
        const tableName = match[1].toLowerCase();
        if (tablesToStrip.has(tableName)) {
          strippedCount++;
          continue;
        }
      }
      keptStatements.push(stmt);
    }

    console.log(`🗑️  Removed ${strippedCount.toLocaleString()} INSERT statements from customer tables.`);
    console.log(`✅ Remaining statements: ${keptStatements.length.toLocaleString()}`);

    console.log('\n💾 Writing sanitized backup...');
    fs.writeFileSync(outputPath, keptStatements.join('\n') + '\n', 'utf8');

    const finalSizeMB = (fs.statSync(outputPath).size / (1024 * 1024)).toFixed(2);
    console.log(`✅ Sanitized backup saved: ${outputPath} (${finalSizeMB} MB)`);
    console.log('\n📋 Next Steps:');
    console.log('   1. Use the sanitized backup for splitting/importing');
    console.log('   2. Customer accounts & orders are no longer included\n');
  } catch (error) {
    console.error('\n❌ Error sanitizing backup:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  sanitizeBackup()
    .then(() => {
      console.log('🎉 Sanitization completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Sanitization failed:', error);
      process.exit(1);
    });
}

module.exports = { sanitizeBackup };


