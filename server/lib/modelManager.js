const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_ESTIMATED_TOKENS = 3500;

const MODEL_CONFIGS = [
  {
    name: 'llama-3.3-70b-versatile',
    rpm: 30,
    rpd: 1000,
    tpm: 12000,
    tpd: 100000
  },
  {
    name: 'llama-3.1-8b-instant',
    rpm: 30,
    rpd: 14400,
    tpm: 6000,
    tpd: 500000
  },
  {
    name: 'meta-llama/llama-4-maverick-17b-128e-instruct',
    rpm: 30,
    rpd: 1000,
    tpm: 6000,
    tpd: 500000
  },
  {
    name: 'qwen/qwen3-32b',
    rpm: 60,
    rpd: 1000,
    tpm: 6000,
    tpd: 500000
  }
];

function initialiseUsageWindow() {
  const now = Date.now();
  return {
    requests: 0,
    tokens: 0,
    minuteWindowReset: now,
    dayWindowReset: now
  };
}

class ModelManager {
  constructor(configs) {
    this.models = configs.map((config) => ({
      config,
      usage: initialiseUsageWindow(),
      cooldownUntil: 0
    }));
  }

  resetWindows(model) {
    const usage = model.usage;
    const now = Date.now();

    if (now - usage.minuteWindowReset >= MINUTE_MS) {
      usage.requests = 0;
      usage.tokens = 0;
      usage.minuteWindowReset = now;
    }

    if (now - usage.dayWindowReset >= DAY_MS) {
      usage.requestsDay = 0;
      usage.tokensDay = 0;
      usage.dayWindowReset = now;
    }

    usage.requestsDay = usage.requestsDay || 0;
    usage.tokensDay = usage.tokensDay || 0;
  }

  hasCapacity(model, estimatedTokens) {
    const { config, usage, cooldownUntil } = model;
    const now = Date.now();

    if (cooldownUntil && now < cooldownUntil) {
      return false;
    }

    this.resetWindows(model);

    const tokens = estimatedTokens || DEFAULT_ESTIMATED_TOKENS;

    if (typeof config.rpm === 'number' && usage.requests + 1 > config.rpm) {
      return false;
    }

    if (typeof config.rpd === 'number' && (usage.requestsDay + 1) > config.rpd) {
      return false;
    }

    if (typeof config.tpm === 'number' && (usage.tokens + tokens) > config.tpm) {
      return false;
    }

    if (typeof config.tpd === 'number' && (usage.tokensDay + tokens) > config.tpd) {
      return false;
    }

    return true;
  }

  selectModel(estimatedTokens, excluded = new Set()) {
    const tokens = estimatedTokens || DEFAULT_ESTIMATED_TOKENS;
    const available = this.models.find((model) =>
      !excluded.has(model.config.name) && this.hasCapacity(model, tokens)
    );
    if (!available) {
      throw new Error('All Groq models have reached their usage limits. Please wait before trying again.');
    }
    return { name: available.config.name, internal: available };
  }

  recordUsage(modelName, promptTokens, completionTokens) {
    const totalTokens = (promptTokens || 0) + (completionTokens || 0);
    const model = this.models.find((entry) => entry.config.name === modelName);
    if (!model) {
      return;
    }

    this.resetWindows(model);

    model.usage.requests += 1;
    model.usage.tokens += totalTokens;
    model.usage.requestsDay += 1;
    model.usage.tokensDay += totalTokens;
  }

  markCooldown(modelName, cooldownMs) {
    const model = this.models.find((entry) => entry.config.name === modelName);
    if (!model) {
      return;
    }
    model.cooldownUntil = Date.now() + cooldownMs;
  }
}

const modelManager = new ModelManager(MODEL_CONFIGS);

module.exports = {
  modelManager,
  DEFAULT_ESTIMATED_TOKENS
};
