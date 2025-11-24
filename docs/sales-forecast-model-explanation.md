# Sales Forecast Predictive Model: Technical Documentation

## Overview

The sales forecasting system uses a **Weighted Fourier Regression** model to predict future monthly revenue based on historical sales data. This document explains what the model is, why it was chosen, and the mathematical computation behind it.

---

## What Model Do We Use?

### Primary Model: Weighted Fourier Regression

The system uses a **Weighted Fourier Regression** model, which is a time series forecasting method that combines:

1. **Fourier Series** - Mathematical functions (sine and cosine) to capture seasonal patterns
2. **Weighted Least Squares Regression** - Statistical method that gives more importance to recent data
3. **Log Transformation** - Converts revenue values to a logarithmic scale for better statistical properties

### Fallback Model: Seasonal Naïve

When insufficient historical data is available (less than 18 months), the system falls back to a **Seasonal Naïve** model, which simply repeats the same month's revenue from the previous year.

---

## Why This Model?

### 1. **Captures Seasonal Patterns**

Sales data often exhibits yearly seasonal patterns (e.g., higher sales during school intramurals, holidays, or specific months). Fourier series excel at modeling these recurring patterns because they can represent any periodic function as a sum of sine and cosine waves.

**Example**: If sales are consistently higher in March and June each year, the Fourier harmonics will detect and model this pattern.

### 2. **Handles Trends Over Time**

The model includes a linear trend component (the `monthIndex` feature) that captures whether sales are generally increasing or decreasing over time, independent of seasonal effects.

### 3. **Emphasizes Recent Data**

Recent months are more predictive of future performance than older data. The weighted regression gives higher weights to recent months (using a decay factor of 0.55 per 12 months) while still using older data (minimum weight of 0.3) to maintain long-term pattern recognition.

**Why this matters**: Business conditions change, so last year's data is more relevant than data from 3 years ago, but we still want to learn from historical patterns.

### 4. **Ensures Positive Predictions**

Revenue cannot be negative. The log transformation (`log(revenue + 1)`) ensures that when we transform predictions back, they remain positive, which is more appropriate for revenue forecasting than linear models that could predict negative values.

### 5. **Stable and Interpretable**

Unlike complex machine learning models (neural networks, etc.), this model is:
- **Fast to compute** - No training time required, predictions are instant
- **Interpretable** - We can understand what patterns the model is detecting
- **Reliable** - Less prone to overfitting with proper regularization

### 6. **Robust to Missing Data**

The model can handle missing months in the historical data by using the continuous time index, making it more resilient than methods that require complete time series.

---

## Mathematical Computation

### Step 1: Data Preparation

For each historical month, we extract:
- **Revenue**: Total sales amount for that month
- **Month Date**: The first day of the month
- **Month Index**: Number of months since the first observation (e.g., January 2022 = 0, February 2022 = 1, etc.)

**Example**:
```
Month: January 2022 → monthIndex = 0, revenue = ₱50,000
Month: February 2022 → monthIndex = 1, revenue = ₱45,000
Month: March 2022 → monthIndex = 2, revenue = ₱60,000
...
```

### Step 2: Feature Engineering (Fourier Features)

For each month, we create a feature vector using Fourier series. The features include:

1. **Constant term**: `1` (intercept)
2. **Linear trend**: `monthIndex` (captures overall growth/decline)
3. **Seasonal harmonics**: For each harmonic `k` from 1 to 6:
   - `sin(2π × k × monthIndex / 12)`
   - `cos(2π × k × monthIndex / 12)`

**Total features**: 2 + (6 × 2) = **14 features**

**Mathematical Formula**:
```
angle = (2π × k × monthIndex) / 12
feature_sin = sin(angle)
feature_cos = cos(angle)
```

**Why 6 harmonics?**
- Each harmonic pair captures a different frequency of seasonal variation
- 6 harmonics can capture complex patterns like:
  - Yearly cycles (1st harmonic)
  - Semi-annual patterns (2nd harmonic)
  - Quarterly patterns (3rd harmonic)
  - And more subtle variations (4th, 5th, 6th harmonics)

**Example for monthIndex = 3 (April 2022)**:
```
Features = [
  1,                    // constant
  3,                    // monthIndex
  sin(2π×1×3/12),      // sin(π/2) = 1.0
  cos(2π×1×3/12),      // cos(π/2) = 0.0
  sin(2π×2×3/12),      // sin(π) = 0.0
  cos(2π×2×3/12),      // cos(π) = -1.0
  ... (continues for k=3,4,5,6)
]
```

### Step 3: Log Transformation

Revenue values are transformed to logarithmic scale:

```
logRevenue = log(revenue + 1)
```

**Why log transformation?**
- Revenue values can vary widely (e.g., ₱10,000 to ₱500,000)
- Log transformation stabilizes variance and makes the relationship more linear
- Ensures predictions remain positive when transformed back
- Better statistical properties for regression

### Step 4: Recency Weighting

Each historical month is assigned a weight based on how recent it is:

```
monthsAgo = totalMonths - 1 - currentIndex
decayFactor = recencyDecay^(monthsAgo / 12)
weight = max(minWeight, decayFactor)
```

**Parameters**:
- `recencyDecay = 0.55` (decay factor per 12 months)
- `minWeight = 0.3` (minimum weight to prevent old data from being ignored)

**Example**:
- Most recent month: `weight ≈ 1.0` (full importance)
- 12 months ago: `weight ≈ 0.55` (55% importance)
- 24 months ago: `weight ≈ 0.30` (30% importance, clamped to minimum)
- 36 months ago: `weight = 0.30` (stays at minimum)

**Why weighting?**
Recent data is more predictive of future trends. A sale from last month is more relevant than a sale from 3 years ago, but we still want to learn from historical patterns.

### Step 5: Weighted Least Squares Regression

We solve a weighted linear regression problem to find coefficients that best fit the historical data.

**The Problem**:
Find coefficients `β₀, β₁, β₂, ..., β₁₃` such that:

```
log(revenue + 1) ≈ β₀ + β₁×monthIndex + β₂×sin₁ + β₃×cos₁ + ... + β₁₃×cos₆
```

**Weighted Normal Equations**:

We build two matrices:
1. **Normal Matrix** (14×14): `XᵀWX`
2. **Normal Vector** (14×1): `XᵀWy`

Where:
- `X` = feature matrix (one row per month, 14 columns)
- `W` = diagonal weight matrix
- `y` = log-transformed revenue values

**Computation**:
```javascript
// For each historical month:
for (let i = 0; i < 14; i++) {
  normalVector[i] += weight × features[i] × logRevenue;
  for (let j = 0; j < 14; j++) {
    normalMatrix[i][j] += weight × features[i] × features[j];
  }
}
```

### Step 6: Ridge Regularization

To prevent overfitting and handle numerical instability, we add a small regularization term (epsilon = 1e-6) to the diagonal of the normal matrix:

```
normalMatrix[i][i] += epsilon
```

This is equivalent to Ridge regression with a very small regularization parameter, which:
- Prevents singular matrices (non-invertible)
- Reduces overfitting
- Improves numerical stability

### Step 7: Solving the Linear System

We solve the system of equations using Gaussian elimination with partial pivoting:

```
normalMatrix × coefficients = normalVector
```

This gives us the 14 coefficients `β₀, β₁, ..., β₁₃` that define our model.

### Step 8: Model Evaluation (Training Metrics)

After fitting, we evaluate the model on historical data:

**Mean Absolute Percentage Error (MAPE)**:
```
MAPE = (1/n) × Σ |actual - predicted| / actual × 100%
```

**Residual Standard Deviation**:
```
residualStd = √(Σ weight × (logActual - logPredicted)² / Σ weight)
```

**Confidence Score**:
```
baseConfidence = clamp(1 - min(MAPE/120, 0.6), 0.45, 0.92)
```

The confidence score ranges from 45% to 92% and reflects how well the model fits historical data.

### Step 9: Forecast Generation

For each future month we want to predict:

1. **Calculate month index**: `monthsIndex = monthsBetween(baseDate, forecastDate)`

2. **Build Fourier features**: Same as step 2, but for the future month

3. **Predict log revenue**:
   ```
   logPrediction = β₀ + β₁×monthIndex + β₂×sin₁ + β₃×cos₁ + ... + β₁₃×cos₆
   ```

4. **Transform back to revenue**:
   ```
   predictedRevenue = max(0, exp(logPrediction) - 1)
   ```

5. **Calculate confidence**: Confidence decreases slightly as we forecast further into the future

**Example Prediction**:
```
For January 2025 (monthIndex = 36):
features = [1, 36, sin(2π×1×36/12), cos(2π×1×36/12), ...]
logPrediction = β₀ + β₁×36 + β₂×sin(6π) + β₃×cos(6π) + ...
predictedRevenue = exp(logPrediction) - 1
```

### Step 10: Order Count Estimation

For each forecasted month, we estimate the number of orders:

```
predictedOrders = predictedRevenue / averageOrderValue
```

Where `averageOrderValue` is calculated from recent historical data.

---

## Complete Mathematical Formula

The full prediction formula is:

```
log(revenue + 1) = β₀ + β₁×t + Σ(k=1 to 6) [β₂ₖ×sin(2πkt/12) + β₂ₖ₊₁×cos(2πkt/12)]
```

Where:
- `t` = month index (0, 1, 2, ...)
- `β₀` = intercept coefficient
- `β₁` = trend coefficient
- `β₂, β₃, ..., β₁₃` = seasonal harmonic coefficients
- `k` = harmonic number (1 to 6)

Then:
```
predictedRevenue = max(0, exp(log(revenue + 1)) - 1)
```

---

## Model Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| `harmonics` | 6 | Number of Fourier harmonic pairs (captures seasonal patterns) |
| `recencyDecay` | 0.55 | Weight decay factor per 12 months (lower = more emphasis on recent data) |
| `minWeight` | 0.3 | Minimum weight for old data (prevents complete exclusion) |
| `epsilon` | 1e-6 | Ridge regularization parameter (prevents overfitting) |
| `seasonLength` | 12 | Months per seasonal cycle (yearly) |

---

## Fallback: Seasonal Naïve Model

When there's insufficient data (< 18 months), the system uses a simpler model:

**Formula**:
```
forecast[month] = historical[month - 12]
```

**Example**: To forecast January 2025, use January 2024's revenue.

**Why this works**: If you don't have enough data to learn complex patterns, the best predictor is often "same as last year."

---

## Model Performance

The model's accuracy is measured using:

1. **Training MAPE** (Mean Absolute Percentage Error): Average percentage error on historical data
   - Lower is better (e.g., 15% MAPE means average error is 15%)
   - Typical range: 10-30% for sales forecasting

2. **Confidence Score**: Model's self-assessed reliability (45-92%)
   - Based on how well it fits historical data
   - Decreases slightly for forecasts further in the future

---

## Advantages of This Approach

1. ✅ **Captures complex seasonal patterns** through Fourier harmonics
2. ✅ **Adapts to trends** through the linear component
3. ✅ **Emphasizes recent data** through weighting
4. ✅ **Fast computation** - no training time, instant predictions
5. ✅ **Interpretable** - coefficients have clear meaning
6. ✅ **Robust** - handles missing data and prevents overfitting
7. ✅ **Always positive predictions** - appropriate for revenue

---

## Limitations

1. ⚠️ **Assumes seasonal patterns repeat** - May not capture structural changes
2. ⚠️ **Linear trend assumption** - Cannot capture accelerating/decelerating growth well
3. ⚠️ **No external factors** - Doesn't account for promotions, events, or market changes
4. ⚠️ **Requires sufficient data** - Needs at least 18 months for reliable forecasts

---

## Future Enhancements

Potential improvements to consider:

1. **External Regressors**: Add features for known events (holidays, school calendar, promotions)
2. **Multiple Models**: Blend predictions from different models (SARIMA, Prophet, etc.)
3. **Product-Level Forecasting**: Forecast individual products, then aggregate
4. **Confidence Intervals**: Provide upper/lower bounds, not just point estimates
5. **Model Persistence**: Store forecasts for audit and comparison with actuals

---

## References

- **Implementation**: `server/routes/analytics.js` - `fitWeightedFourierRegression()` function
- **Documentation**: `docs/sales-forecasting.md`
- **Evaluation Script**: `server/scripts/evaluate-forecast-models.js`

---

*Last Updated: Based on current codebase implementation*

