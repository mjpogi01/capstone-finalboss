# Sales Forecasting Module (Admin Analytics)

This note captures the design of the forecasting logic that powers the **Sales Forecast** card and chart in the admin analytics dashboard (`src/pages/admin/Analytics.js`). The implementation lives in `server/routes/analytics.js` under the `/api/analytics/sales-forecast` endpoint.

## Dataset

- Source: `orders` table (Supabase).
- Status filter: excludes `cancelled` / `canceled`.
- Granularity: monthly revenue (`date_trunc('month', created_at)`).
- Coverage: **January 2022 up to the last completed month** (the current month is ignored because it is partial).
- Branch-aware: results are passed through `buildBranchFilterClause(...)` so branch admins only see their own orders.

## Processing Pipeline

1. **Fetch & Normalize**
   - Query monthly revenue and order counts.
   - Convert each month to ISO-first-of-month date and label (`formatMonthLabel`).
   - Build `displayHistorical`, padding any missing months (so the chart shows continuous history from Jan 2022).

2. **Feature Engineering**
   - `monthsBetween(start, current)` → numeric index per month since the first observation.
   - Fourier basis (`sin`/`cos` harmonics up to K=6) to represent yearly seasonality.
   - Recency weights bias the regression toward the most recent year (`recencyDecay = 0.55`, minimum weight `0.35`).
   - Log-transform (`log(revenue + 1)`) keeps positive predictions and stabilizes variance.
   - Ridge regularization (`solveLinearSystem` adds a tiny epsilon to the diagonal) prevents singular matrices.

3. **Model Fit**
   - Weighted linear regression on the Fourier features ⇒ multiplicative-style seasonal model.
   - Confidence baseline derived from residual volatility / MAPE (converted to 0–100% with tapering for future months).
   - Fallback: if regression fails, we use a seasonal naïve forecast (copy values from the same month last year).

4. **Forecast Generation**
   - Forecast ranges:
     - `nextMonth` → next 1 month
     - `restOfYear` → remaining months in the current year
     - `nextYear` → 12 months beginning with the current month
   - For each forecast month:
     - Predict revenue (inverse log transform), clamp to ≥ 0.
     - Estimate orders using historical average order value.
     - Compute month-over-month growth vs. the previous point.
     - Confidence decays gently as the horizon extends.

5. **Response Payload**
   - `historical`: padded history suitable for plotting.
   - `forecast`: per-month projections with revenue, orders, confidence, growth rate.
   - `combined`: convenience merge of historical + forecast for the chart.
   - `summary`: projected total revenue/orders, baseline (recent average × horizon), expected growth %, confidence.

## Evaluation Script

`server/scripts/evaluate-forecast-models.js` lets us back-test candidate models. It currently compares:

- Holt–Winters (additive)
- Holt–Winters (multiplicative)
- Seasonal naïve
- Trend drift

Training window: Jan 2022 – Dec 2024  
Validation window: actual months in 2025  
Metrics: MAE, RMSE, MAPE (lower is better)

Use it to quantify improvements whenever you tweak the forecasting logic:

```bash
node server/scripts/evaluate-forecast-models.js
```

## Key Tunables

| Variable | Description | Current Default |
| --- | --- | --- |
| `harmonics` | Number of Fourier seasonal pairs | 6 |
| `recencyDecay` | Weighting per 12 months; lower values emphasise recent data | 0.55 |
| `minWeight` | Floor to prevent old months being entirely ignored | 0.35 |
| `seasonLength` | Months per season | 12 |
| `baseline` | Baseline revenue for growth calc | average of last 12 months |

Adjust these constants in `fitWeightedFourierRegression(...)` / `/sales-forecast` to tune responsiveness or smoothness.

## Frontend Consumption

`src/pages/admin/Analytics.js`:

- Requests `/api/analytics/sales-forecast?range=...`.
- Renders the `historical` and `forecast` series with ECharts (SVG renderer).
- Uses `summary` for the three KPI cards above the chart.
- Buttons (`Next Month`, `Rest of Year`, `Next 12 Months`) simply change the `range` parameter.

## Future Enhancements

- Add SARIMA/Prophet/ML forecasts into the evaluation script and blend/compare.
- Introduce event/holiday regressors (intramurals, school calendar).
- Persist forecasts for audit instead of live computation on every request.


