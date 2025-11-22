const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { modelManager, DEFAULT_ESTIMATED_TOKENS } = require('../lib/modelManager');

const GROQ_API_KEY = process.env.GROQ_API_KEY;

function sanitizeMessages(rawMessages = []) {
  if (!Array.isArray(rawMessages)) {
    return [];
  }

  return rawMessages
    .filter((msg) => msg && typeof msg === 'object')
    .map((msg) => ({
      role:
        msg.role === 'assistant'
          ? 'assistant'
          : msg.role === 'system'
            ? 'system'
            : 'user',
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
    }));
}

async function callGroq(messages, options = {}) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured.');
  }

  const estimatedTokens = options.estimatedTokens || DEFAULT_ESTIMATED_TOKENS;
  const temperature = typeof options.temperature === 'number' ? options.temperature : 0.2;
  const maxTokens = typeof options.max_tokens === 'number' ? options.max_tokens : 1024;

  const attempted = new Set();
  const maxAttempts = options.model ? 1 : modelManager.models.length;

  let lastError;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    let selectedModel = null;
    let model = options.model;

    if (!model) {
      selectedModel = modelManager.selectModel(estimatedTokens, attempted);
      model = selectedModel.name;
      attempted.add(model);
    }

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (selectedModel && /rate limit/i.test(errorText)) {
          modelManager.markCooldown(model, 120000);
        }
        throw new Error(`Groq API error: ${errorText}`);
      }

      const completion = await response.json();
      const reply = completion?.choices?.[0]?.message?.content;

      if (!reply) {
        throw new Error('Groq API returned an empty response.');
      }

      const usage = completion?.usage || null;
      if (selectedModel && usage) {
        modelManager.recordUsage(
          model,
          usage.prompt_tokens || 0,
          usage.completion_tokens || 0
        );
      }

      return {
        reply: reply.trim(),
        usage,
        model
      };
    } catch (error) {
      lastError = error;
      if (!options.model && /rate limit/i.test(error.message || '')) {
        if (selectedModel) {
          modelManager.markCooldown(selectedModel.name, 120000);
        }
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error('No Groq model available to service the request.');
}

module.exports = {
  sanitizeMessages,
  callGroq
};

