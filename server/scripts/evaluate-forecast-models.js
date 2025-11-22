const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { executeSql } = require('../lib/sqlClient');

function formatMonthLabel(date) {
  return date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

function monthKey(date) {
  return date.toISOString().slice(0, 7);
}

function holtWintersMultiplicative(series, seasonLength, horizon, alpha = 0.35, beta = 0.15, gamma = 0.3) {
  if (!Array.isArray(series) || series.length < seasonLength * 2) {
    return null;
  }

  const n = series.length;
  const seasons = Math.floor(n / seasonLength);
  if (seasons < 2) {
    return null;
  }

  const seasonAverages = [];
  for (let season = 0; season < seasons; season += 1) {
    let sum = 0;
    for (let i = 0; i < seasonLength; i += 1) {
      const value = series[season * seasonLength + i];
      if (!Number.isFinite(value) || value <= 0) {
        return null;
      }
      sum += value;
    }
    seasonAverages.push(sum / seasonLength);
  }

  const seasonals = new Array(seasonLength).fill(0);
  for (let i = 0; i < seasonLength; i += 1) {
    let sum = 0;
    for (let season = 0; season < seasons; season += 1) {
      sum += series[season * seasonLength + i] / seasonAverages[season];
    }
    seasonals[i] = sum / seasons;
  }

  let level = seasonAverages[0];
  let trend = seasons > 1
    ? (seasonAverages[1] - seasonAverages[0]) / seasonLength
    : 0;

  const fitted = new Array(n);

  for (let t = 0; t < n; t += 1) {
    const value = series[t];
    const seasonIndex = t % seasonLength;
    const seasonComponent = seasonals[seasonIndex];
    if (seasonComponent === 0) {
      return null;
    }

    const fittedValue = (level + trend) * seasonComponent;
    fitted[t] = fittedValue;

    const lastLevel = level;
    level = alpha * (value / seasonComponent) + (1 - alpha) * (lastLevel + trend);
    trend = beta * (level - lastLevel) + (1 - beta) * trend;
    seasonals[seasonIndex] = gamma * (value / level) + (1 - gamma) * seasonComponent;
  }

  const forecast = [];
  for (let h = 1; h <= horizon; h += 1) {
    const seasonIndex = (n + h - 1) % seasonLength;
    forecast.push((level + h * trend) * seasonals[seasonIndex]);
  }

  return { fitted, forecast };
}

function holtWintersAdditive(series, seasonLength, horizon, alpha = 0.35, beta = 0.15, gamma = 0.35) {
  if (!Array.isArray(series) || series.length < seasonLength * 2) {
    return null;
  }

  const n = series.length;
  const seasonals = new Array(seasonLength).fill(0);
  const seasonAverages = [];
  const numSeasons = Math.floor(n / seasonLength);

  if (numSeasons < 2) {
    return null;
  }

  for (let season = 0; season < numSeasons; season += 1) {
    let sum = 0;
    for (let i = 0; i < seasonLength; i += 1) {
      const value = series[season * seasonLength + i];
      if (!Number.isFinite(value)) {
        return null;
      }
      sum += value;
    }
    seasonAverages.push(sum / seasonLength);
  }

  for (let i = 0; i < seasonLength; i += 1) {
    let sum = 0;
    for (let season = 0; season < numSeasons; season += 1) {
      sum += series[season * seasonLength + i] - seasonAverages[season];
    }
    seasonals[i] = sum / numSeasons;
  }

  let level = seasonAverages[0];
  let trend = (seasonAverages[1] - seasonAverages[0]) / seasonLength;
  const fitted = new Array(n);

  for (let t = 0; t < n; t += 1) {
    const value = series[t];
    const seasonIndex = t % seasonLength;
    const season = seasonals[seasonIndex];
    const fittedValue = level + trend + season;
    fitted[t] = fittedValue;

    const lastLevel = level;
    level = alpha * (value - season) + (1 - alpha) * (lastLevel + trend);
    trend = beta * (level - lastLevel) + (1 - beta) * trend;
    seasonals[seasonIndex] = gamma * (value - level) + (1 - gamma) * season;
  }

  const forecast = [];
  for (let h = 1; h <= horizon; h += 1) {
    const seasonIndex = (n + h - 1) % seasonLength;
    forecast.push(level + h * trend + seasonals[seasonIndex]);
  }

  return {
    fitted,
    forecast
  };
}

function seasonalNaive(series, seasonLength, horizon) {
  if (!Array.isArray(series) || seasonLength <= 0 || series.length < seasonLength) {
    return null;
  }
  const forecast = [];
  for (let h = 1; h <= horizon; h += 1) {
    const index = series.length - seasonLength + ((h - 1) % seasonLength);
    forecast.push(series[index]);
  }
  return forecast;
}

function driftForecast(series, horizon) {
  if (!Array.isArray(series) || series.length < 2) {
    return null;
  }
  const n = series.length;
  const lastValue = series[n - 1];
  const firstValue = series[0];
  const slope = (lastValue - firstValue) / (n - 1);
  const forecast = [];
  for (let h = 1; h <= horizon; h += 1) {
    forecast.push(lastValue + h * slope);
  }
  return forecast;
}

function meanAbsoluteError(actual, predicted) {
  const n = Math.min(actual.length, predicted.length);
  if (!n) return null;
  let sum = 0;
  for (let i = 0; i < n; i += 1) {
    sum += Math.abs(actual[i] - predicted[i]);
  }
  return sum / n;
}

function meanAbsolutePercentageError(actual, predicted) {
  const n = Math.min(actual.length, predicted.length);
  if (!n) return null;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < n; i += 1) {
    if (actual[i] !== 0) {
      sum += Math.abs((actual[i] - predicted[i]) / actual[i]);
      count += 1;
    }
  }
  return count ? (sum / count) * 100 : null;
}

function rootMeanSquaredError(actual, predicted) {
  const n = Math.min(actual.length, predicted.length);
  if (!n) return null;
  let sum = 0;
  for (let i = 0; i < n; i += 1) {
    const diff = actual[i] - predicted[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum / n);
}

async function loadMonthlyRevenue() {
  const sql = `
    SELECT
      date_trunc('month', created_at) AS month_start,
      SUM(total_amount)::numeric AS revenue
    FROM orders
    WHERE LOWER(status) NOT IN ('cancelled', 'canceled')
    GROUP BY month_start
    ORDER BY month_start;
  `;

  const { rows } = await executeSql(sql);

  return rows.map((row) => {
    const monthDate = row.month_start instanceof Date ? row.month_start : new Date(row.month_start);
    return {
      monthDate,
      label: formatMonthLabel(monthDate),
      revenue: Number(row.revenue)
    };
  });
}

function splitData(points) {
  const training = [];
  const test = [];
  const cutoffDate = new Date(Date.UTC(2024, 11, 31, 23, 59, 59));

  points.forEach((point) => {
    if (point.monthDate <= cutoffDate) {
      training.push(point);
    } else {
      test.push(point);
    }
  });

  return { training, test };
}

async function evaluateModels() {
  const points = await loadMonthlyRevenue();
  if (!points.length) {
    console.log('No revenue data available.');
    return;
  }

  const { training, test } = splitData(points);
  if (training.length < 24 || !test.length) {
    console.log('Not enough data to evaluate (need ≥24 training months and at least 1 test month).');
    return;
  }

  const seasonLength = 12;
  const trainSeries = training.map((item) => item.revenue);
  const testSeries = test.map((item) => item.revenue);
  const horizon = testSeries.length;

  const models = [];

  const hwMultiplicative = holtWintersMultiplicative(trainSeries, seasonLength, horizon);
  if (hwMultiplicative && Array.isArray(hwMultiplicative.forecast)) {
    models.push({
      name: 'Holt-Winters (multiplicative)',
      forecast: hwMultiplicative.forecast
    });
  }

  const hwAdditive = holtWintersAdditive(trainSeries, seasonLength, horizon);
  if (hwAdditive && Array.isArray(hwAdditive.forecast)) {
    models.push({
      name: 'Holt-Winters (additive)',
      forecast: hwAdditive.forecast
    });
  }

  const seasonalNaiveForecast = seasonalNaive(trainSeries, seasonLength, horizon);
  if (seasonalNaiveForecast) {
    models.push({
      name: 'Seasonal Naïve',
      forecast: seasonalNaiveForecast
    });
  }

  const drift = driftForecast(trainSeries, horizon);
  if (drift) {
    models.push({
      name: 'Drift (trend extrapolation)',
      forecast: drift
    });
  }

  const evaluation = models.map((model) => {
    const forecast = model.forecast.map((value) => Math.max(0, Number(value)));
    return {
      Model: model.name,
      MAE: meanAbsoluteError(testSeries, forecast)?.toFixed(0) ?? 'n/a',
      RMSE: rootMeanSquaredError(testSeries, forecast)?.toFixed(0) ?? 'n/a',
      MAPE: meanAbsolutePercentageError(testSeries, forecast)?.toFixed(2) ?? 'n/a'
    };
  });

  console.log('\nTraining window: Jan 2022 – Dec 2024');
  console.log(`Test window: ${test[0].label} – ${test[test.length - 1].label}`);
  console.log('\nEvaluation metrics (lower is better):');
  console.table(evaluation);

  evaluation.sort((a, b) => parseFloat(a.MAPE) - parseFloat(b.MAPE));
  const best = evaluation.find((row) => row.MAPE !== 'n/a');
  if (best) {
    console.log(`\nBest model by MAPE: ${best.Model} (MAPE ${best.MAPE}%)`);
  } else {
    console.log('\nNo valid forecasts produced.');
  }
}

evaluateModels().then(() => process.exit(0)).catch((error) => {
  console.error('Evaluation failed:', error);
  process.exit(1);
});

