# Jersey Prices Feature - Implementation Guide

## Overview
Added support for separate pricing for jersey products:
- **Full Set Price** - Price for jersey + shorts
- **Shirt Only Price** - Price for jersey shirt only
- **Shorts Only Price** - Price for shorts only

## Database Migration Required

Before using this feature, you **MUST** run the migration script to add the `jersey_prices` column to the products table.

### Steps:
1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Run the SQL script from: `server/scripts/add-jersey-prices-column.sql`

Or run this SQL directly:

```sql
-- Add jersey_prices JSONB column if it doesn't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS jersey_prices JSONB;

-- Add comment to document the column
COMMENT ON COLUMN products.jersey_prices IS 
'JSON object storing jersey prices: {"fullSet": 1000, "shirtOnly": 600, "shortsOnly": 400}. Only used for Jerseys category products.';
```

## What Changed

### Frontend (`src/components/admin/AddProductModal.js`)
- Added three price input fields when category is "Jerseys"
- Fields: Full Set Price, Shirt Only Price, Shorts Only Price
- All three prices are required for jersey products
- Prices are stored in the `jersey_prices` JSONB column
- The `price` column stores the full set price for backward compatibility

### Backend (`server/routes/products.js`)
- Updated POST and PUT endpoints to handle `jersey_prices` JSONB column
- The `price` column still stores the full set price (for backward compatibility)
- All three prices are stored in the `jersey_prices` JSONB column

## How It Works

1. **Adding a Jersey Product:**
   - Select category "Jerseys"
   - Three price input fields appear
   - Enter all three prices (required)
   - Prices are saved to both `price` (full set) and `jersey_prices` (all three)

2. **Editing a Jersey Product:**
   - If `jersey_prices` exists, all three prices are loaded
   - If not, falls back to using `price` as full set price

3. **Non-Jersey Products:**
   - Continue to use the single `price` field as before
   - No changes needed for existing products

## Data Structure

The `jersey_prices` column stores JSON in this format:
```json
{
  "fullSet": 1000,
  "shirtOnly": 600,
  "shortsOnly": 400
}
```

## Notes

- Only products with category "Jerseys" (exact match, case-insensitive) will show the three price inputs
- Products with categories "Uniforms", "T-Shirts", or "Long Sleeves" continue to use the single price field
- The `price` column maintains backward compatibility by storing the full set price
- Existing jersey products without `jersey_prices` will continue to work, using the `price` column value

## Testing

After running the migration:
1. Add a new product with category "Jerseys"
2. Verify that three price input fields appear
3. Enter all three prices
4. Save the product
5. Edit the product and verify all three prices are loaded correctly































