# 🎯 5-Year Mock Order Data - Complete Guide

## 🚀 Quick Start

### What Was Generated?
A comprehensive dataset of **2,502+ realistic orders** spanning **January 2020 to October 2025** for the Yohanns company's e-commerce system. This includes:

✅ Team orders (80%) with 8-15 players each
✅ Single orders (20%) for individual purchases
✅ Realistic Philippine names for all players
✅ Detailed player information (name, jersey number, size)
✅ Authentic product mix (70% sublimation, 20% apparel, 10% accessories)
✅ Realistic pricing based on actual products
✅ Distributed across all 9 company branches
✅ Seasonal patterns with unpredictable variations
✅ ~10% cancellation rate for realistic churn

### Key Statistics

| Metric | Value |
|--------|-------|
| **Total Orders** | 2,502+ |
| **Date Range** | Jan 2020 - Oct 2025 |
| **Average Orders/Month** | ~42 |
| **Completed Orders** | ~80% |
| **Cancelled Orders** | ~10% |
| **Branches Covered** | 9/9 |
| **Peak Season** | Mar-Aug (Summer + Youth Week) |

## 📊 Data Characteristics

### Product Distribution

```
Sublimation Jerseys ............... 70%
  ├─ Full Set (70%)
  ├─ Upper Only (30%)
  ├─ Basketball (50%)
  └─ Volleyball (50%)

Long Sleeves, Hoodies, T-Shirts .. 20%
  ├─ Long Sleeve: ₱500-650
  ├─ Hoodie: ₱700-900
  └─ T-Shirt: ₱300-400

Accessories ........................ 10%
  └─ Various: ₱100-200
```

### Pricing Structure

#### Sublimation Jersey Prices
- **Kids Full Set**: ₱850
- **Adult Full Set**: ₱1,050
- **Kids Upper Only**: ₱450
- **Adult Upper Only**: ₱650

#### Sizing Options
- **Kids**: S6, S8, S10, S12, S14
- **Adult**: S, M, L, XL, XXL

### Team Orders

- **Team Size**: 8-15 players per team
- **Mix**: 30% kids, 70% adults
- **Sports**: 50% Basketball, 50% Volleyball
- **Duration**: Mix of full sets (70%) and upper-only (30%)

### Geographic Distribution

Orders randomly distributed across all 9 branches:
1. 🏢 SAN PASCUAL (MAIN BRANCH)
2. 🏢 CALAPAN BRANCH
3. 🏢 MUZON BRANCH
4. 🏢 LEMERY BRANCH
5. 🏢 BATANGAS CITY BRANCH
6. 🏢 BAUAN BRANCH
7. 🏢 CALACA BRANCH
8. 🏢 PINAMALAYAN BRANCH
9. 🏢 ROSARIO BRANCH

## 🌍 Seasonality Pattern

### Peak Season (March - August)
- 60% daily order probability
- 2-5 orders per day
- Represents Summer and pre-August 12 Youth Week

### Off-Season (September - February)
- 30% daily order probability
- 0-2 orders per day

### Unpredictability Factor
- ±7.5% random variation added for realism
- Weekend effect: 20% lower probability on weekends
- Ensures analytics remain valuable

## 🔧 How to Use

### Running the Data Generation

```bash
# From project root
node server/scripts/generate-5-years-mock-data.js
```

**Requirements:**
- ✅ Server `.env` file with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- ✅ Supabase project initialized with `orders` table
- ✅ At least one user in Supabase authentication

**Output:**
```
🚀 Generating 5 years of mock order data...

✅ Generated 2502 orders over 5 years
📊 Average orders per month: 42

👤 Using user ID: dc2e1b68-9af9-4c19-ad38-594b922e2095

✅ Inserted 100/2502 orders
...
🎉 Successfully inserted 2502 orders!
```

### Querying the Data

See `MOCK_DATA_QUERIES.md` for 20+ pre-written SQL queries including:

**Basic Analysis:**
- Total orders and summary statistics
- Orders by status
- Orders by branch
- Monthly revenue trends

**Advanced Analysis:**
- Seasonal peak vs off-season
- Day-of-week patterns
- Product mix distribution
- Year-over-year comparisons
- Cancellation rate analysis
- Customer lifetime value

**Dashboard Queries:**
- Real-time summary metrics
- Performance benchmarks
- Order size distribution

## 📈 Sample Data Structure

```json
{
  "id": "41097366-dc2e-40d8-9e51-5dd162120782",
  "user_id": "dc2e1b68-9af9-4c19-ad38-594b922e2095",
  "order_number": "ORD-1761060609385-0-24",
  "status": "picked_up_delivered",
  "shipping_method": "pickup",
  "pickup_location": "SAN PASCUAL (MAIN BRANCH)",
  "total_amount": "11550.00",
  "total_items": 11,
  "order_notes": "Team order",
  "created_at": "2020-03-01T16:00:00.000Z",
  "order_items": [
    {
      "productName": "Sublimation Jersey (Full Set) - basketball",
      "category": "sublimation",
      "sport": "basketball",
      "quantity": 11,
      "pricePerUnit": 1050,
      "totalPrice": 11550,
      "details": [
        {
          "playerName": "Carlos Gonzalez",
          "jerseyNo": 1,
          "size": "L"
        },
        {
          "playerName": "Victoria Flores",
          "jerseyNo": 2,
          "size": "M"
        },
        // ... 9 more players
      ]
    }
  ]
}
```

## 🎨 Use Cases

This mock data is perfect for:

### 📊 Analytics & Reporting
- Revenue forecasting models
- Seasonal trend analysis
- Branch performance comparison
- Customer behavior insights

### 🧪 Testing & Development
- Dashboard functionality
- Report generation
- Export features
- Data visualization

### 📱 Product Features
- Sales analytics page
- Revenue reports
- Seasonal pattern analysis
- Branch performance metrics

### 🔍 Data Analysis
- Understand typical order patterns
- Identify peak periods
- Calculate average order values
- Analyze product popularity

## 📁 Files Related to Mock Data

| File | Purpose |
|------|---------|
| `server/scripts/generate-5-years-mock-data.js` | Main generation script |
| `MOCK_DATA_GENERATION_SUMMARY.md` | Detailed generation information |
| `MOCK_DATA_QUERIES.md` | 20+ SQL query examples |
| `MOCK_DATA_README.md` | This file |

## 🛠️ Customization

### Modify Generation Parameters

Edit `generate-5-years-mock-data.js`:

```javascript
// Change date range
const startDate = new Date(2020, 0, 1);  // Start date
const endDate = new Date(2025, 9, 31);   // End date

// Adjust peak season months
function isSeasonPeak(date) {
  const month = date.getMonth() + 1;
  return month >= 3 && month <= 8;  // Change these numbers
}

// Modify order probability
let baseProbability = 0.3;  // Non-peak day probability
if (isPeak) baseProbability = 0.6;  // Peak day probability
```

### Adjust Product Mix

```javascript
// Change sublimation percentage
const isSublimation = Math.random() < 0.7;  // 70% = sublimation, 30% = other

// Change team order percentage
const isTeamOrder = Math.random() > 0.2;  // 80% = team, 20% = single

// Change cancellation rate
const isCancelled = Math.random() < 0.1;  // 10% cancellation rate
```

## ✅ Data Integrity Checks

All generated data includes:
- ✅ Valid Supabase UUIDs for all IDs
- ✅ Proper date formats (ISO 8601)
- ✅ Accurate numeric calculations
- ✅ Valid enum values for status/shipping_method
- ✅ Realistic price ranges
- ✅ Proper JSONB format for nested data
- ✅ FK references to valid branches
- ✅ Consistent data types

## 🚨 Known Limitations

1. **Single User**: All orders belong to the first user in Supabase auth
2. **Pickup Only**: All orders use pickup shipping method
3. **No Design Files**: order_items.design_files array is empty
4. **Simplified Statuses**: Only uses `picked_up_delivered` and `cancelled`
5. **No Returns**: No order_tracking data included (delivery status tracking)

## 📝 Future Enhancements

Potential improvements for the data generation:
- [ ] Multiple users with varied purchasing patterns
- [ ] Different shipping methods (COD, delivery)
- [ ] Design file uploads included
- [ ] Full production workflow statuses
- [ ] Geolocation-based ordering patterns
- [ ] Seasonal product popularity changes
- [ ] Supplier and inventory tracking
- [ ] Customer retention patterns

## 🎓 Learning Resources

### Understanding the Data

1. Start with `MOCK_DATA_QUERIES.md` for common queries
2. Review sample data structure in this README
3. Explore the `orders` table schema
4. Analyze patterns using provided SQL queries

### Extending the System

1. Read `MOCK_DATA_GENERATION_SUMMARY.md` for technical details
2. Study the generation algorithm in the script
3. Understand the seasonality model
4. Customize for your specific needs

## 🤝 Support

### Common Questions

**Q: How do I regenerate the data?**
A: Simply run the script again. It will insert new orders (duplicates are possible but unlikely given the timestamp-based order numbers).

**Q: Can I delete the old data?**
A: Yes, delete orders by user_id before regenerating:
```sql
DELETE FROM orders WHERE user_id = 'dc2e1b68-9af9-4c19-ad38-594b922e2095';
```

**Q: How accurate is the seasonality?**
A: The model accurately reflects Philippine sports seasons (Youth Week in August, summer camps Mar-May) with added randomness for realism.

**Q: Why are some days empty?**
A: That's intentional! Not every day has orders - it follows realistic business patterns.

## 📞 Troubleshooting

### Script Fails to Run

**Error**: "Missing Supabase credentials"
- ✅ Check server `.env` file exists
- ✅ Ensure `SUPABASE_URL` is set
- ✅ Ensure `SUPABASE_SERVICE_ROLE_KEY` is set

**Error**: "No users found in authentication"
- ✅ Create at least one user in Supabase auth
- ✅ Use the Supabase dashboard to add a test user

**Error**: "Could not insert orders"
- ✅ Check `orders` table exists in Supabase
- ✅ Verify table has proper schema
- ✅ Check for FK constraint violations

## 📄 License & Attribution

This mock data generation system was created for testing and development purposes for the Yohanns company e-commerce platform.

---

**Last Updated**: October 2025
**Data Generated**: 2,502+ orders (5 years)
**Status**: ✅ Production Ready
