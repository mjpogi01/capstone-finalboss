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

function reduceMessageSize(messages, targetReduction = 0.5) {
  if (!Array.isArray(messages) || messages.length <= 3) {
    return messages;
  }

  // Always keep system messages and the last user/assistant exchange
  const systemMessages = messages.filter((msg) => msg.role === 'system');
  const lastMessages = messages.slice(-2); // Last user message and assistant response
  const middleMessages = messages.slice(systemMessages.length, -2);

  // Reduce middle messages by keeping only every other message or truncating content
  const reducedMiddle = middleMessages.slice(Math.floor(middleMessages.length * targetReduction));

  return [...systemMessages, ...reducedMiddle, ...lastMessages];
}

function isRetryableError(errorMessage) {
  if (!errorMessage) return false;
  const lowerError = errorMessage.toLowerCase();
  return (
    /rate limit/i.test(lowerError) ||
    /tokens per minute/i.test(lowerError) ||
    /tpm/i.test(lowerError) ||
    /request too large/i.test(lowerError) ||
    /too large for model/i.test(lowerError)
  );
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
  let currentMessages = messages;
  let messageSizeReduced = false;

  let lastError;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    let selectedModel = null;
    let model = options.model;

    if (!model) {
      try {
        selectedModel = modelManager.selectModel(estimatedTokens, attempted);
        model = selectedModel.name;
        attempted.add(model);
      } catch (selectError) {
        // If we can't select a model, try with reduced message size
        if (!messageSizeReduced && currentMessages.length > 3) {
          currentMessages = reduceMessageSize(currentMessages, 0.6);
          messageSizeReduced = true;
          attempt = -1; // Reset attempt counter
          attempted.clear(); // Clear attempted models
          continue;
        }
        throw selectError;
      }
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
          messages: currentMessages,
          temperature,
          max_tokens: maxTokens
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        const isRetryable = isRetryableError(errorText);
        
        if (selectedModel && isRetryable) {
          modelManager.markCooldown(model, 120000);
        }
        
        // If it's a "too large" error and we haven't reduced messages yet, try reducing
        if (!messageSizeReduced && /too large|tpm|tokens per minute/i.test(errorText) && currentMessages.length > 3) {
          currentMessages = reduceMessageSize(currentMessages, 0.6);
          messageSizeReduced = true;
          attempted.delete(model); // Remove from attempted so we can retry
          attempt = -1; // Reset attempt counter
          continue;
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
      const isRetryable = isRetryableError(error.message || '');
      
      // If it's a retryable error and we haven't reduced messages yet, try reducing
      if (!options.model && isRetryable && !messageSizeReduced && currentMessages.length > 3) {
        currentMessages = reduceMessageSize(currentMessages, 0.6);
        messageSizeReduced = true;
        if (selectedModel) {
          modelManager.markCooldown(selectedModel.name, 120000);
        }
        attempted.delete(model); // Remove from attempted so we can retry
        attempt = -1; // Reset attempt counter
        continue;
      }
      
      // If it's a retryable error and we can try another model, continue
      if (!options.model && isRetryable) {
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

