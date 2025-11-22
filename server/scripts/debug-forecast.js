const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const analytics = require('../routes/analytics');

(async () => {
  try {
    const data = await analytics.computeSalesForecast({ requestedRange: 'nextYear', branchContext: null });
    console.log('Historical points:', data.historical.length);
    console.log('Forecast points:', data.forecast.length);
    console.log('First forecast point:', data.forecast[0]);
    console.log('Summary:', data.summary);
  } catch (error) {
    console.error('Failed to compute sales forecast:', error);
  }
})();
