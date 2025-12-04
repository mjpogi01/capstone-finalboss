# Inventory SKU Implementation

## Overview

This document describes the implementation of SKU (Stock Keeping Unit) numbers for the inventory system. SKUs replace product images in the inventory display and provide unique identifiers for each product.

**Important**: 
- **All products** (both on-stock and apparel) receive SKUs
- **On-stock products** (trophies, balls, medals): SKU includes size variation (different SKU per size)
- **Apparel products** (jerseys, uniforms, etc.): SKU does NOT include size variation (one SKU per product, regardless of available sizes)

## Changes Made

### 1. Database Schema

**File**: `server/scripts/add-sku-column.sql`

- Added `sku` column to `products` table (TEXT type)
- Added unique index on SKU (allows NULL for existing products)
- SKU format: `CATEGORY-PRODUCTID-SIZE` (e.g., `TRP-001234-13IN`, `BAL-ABCDEF-NONE`)

**To apply**: Run the SQL script in Supabase SQL Editor

```sql
-- Run: server/scripts/add-sku-column.sql
```

### 2. SKU Generation Logic

**File**: `server/scripts/generate-skus.js`

- Automatic SKU generation based on:
  - **Category prefix**: 3-letter code (TRP=trophies, BAL=balls, MED=medals, JRS=jerseys, etc.)
  - **Product ID**: 6-character identifier derived from product name
  - **Size suffix** (on-stock products only): 4-8 character code for size

**SKU Format Examples**:
- Trophy, 13" (on-stock): `TRP-001234-13IN` - includes size
- Trophy, 16" (on-stock): `TRP-001234-16IN` - different SKU per size
- Ball (on-stock): `BAL-ABCDEF-NONE` - includes size (or NONE)
- Jersey (apparel): `JRS-001234` - NO size suffix, same SKU for all sizes
- T-shirt (apparel): `TSH-ABCDEF` - NO size suffix, one SKU per product

**Key Difference**:
- On-stock products: Same product with different sizes = different SKUs
- Apparel products: Same product with different sizes = same SKU

### 3. Product Routes Integration

**File**: `server/routes/products.js`

- Auto-generates SKU during product creation
- Auto-generates SKU for existing products without SKU during updates
- Handles products with sizes (uses first size for SKU generation)
- Validates SKU uniqueness

**SKU Generation Triggers**:
- Creating a new product (auto-generates if not provided)
- Updating an existing product without SKU (generates if missing)
- Manual SKU can be provided in request body (will be validated)

### 4. Inventory UI Updates

**File**: `src/pages/admin/Inventory.js`

**Changes**:
- ✅ Removed product image display
- ✅ Added SKU column in desktop table
- ✅ Added SKU display in mobile card layout
- ✅ Removed unused `faImage` icon import

**File**: `src/pages/admin/Inventory.css`

**Changes**:
- ✅ Replaced `.product-image-cell` with `.product-sku-cell`
- ✅ Added `.sku-code` styling (monospace font, badge-like appearance)
- ✅ Added `.no-sku` styling for products without SKU
- ✅ Updated mobile card header to show SKU instead of image

### 5. SKU Backfill Script

**File**: `server/scripts/generate-skus.js`

Script to backfill SKUs for existing products:

```bash
node server/scripts/generate-skus.js
```

**What it does**:
- Fetches all products without SKU
- Generates unique SKUs for each product
- Handles products with sizes (uses first size)
- Updates products in database

**Note**: Products with multiple sizes currently get one SKU (based on first size). In future rework, each size should be a separate product record with its own SKU.

## Usage

### For New Products

SKUs are automatically generated when creating products via the API. No manual action required.

### For Existing Products

Run the backfill script:

```bash
node server/scripts/generate-skus.js
```

### Manual SKU Assignment

You can manually provide SKU when creating/updating products:

```javascript
{
  "name": "Championship Trophy",
  "category": "trophies",
  "sku": "TRP-CUSTOM-13IN",  // Optional - auto-generated if not provided
  ...
}
```

## SKU Requirements

1. **Uniqueness**: Each SKU must be unique across all products
2. **Format**: Category prefix + Product ID + Size suffix
3. **Size Variants**: Same product with different sizes should have different SKUs
   - Currently: One SKU per product record (uses first size)
   - Future: One product record per size = one SKU per size

## Category Prefixes

| Category | Prefix |
|----------|--------|
| Trophies | TRP |
| Balls | BAL |
| Medals | MED |
| Jerseys | JRS |
| Uniforms | UNF |
| T-shirts | TSH |
| Long Sleeves | LGS |
| Hoodies | HOD |
| Jackets | JKT |
| Accessories | ACC |
| Hats | HAT |
| Other | First 3 letters of category (uppercase) |

## Future Enhancements

1. **Per-Size Products**: When reworking inventory system, create separate product records for each size variant
2. **SKU Search**: Add SKU search/filter in inventory page
3. **Barcode Integration**: Link SKUs with barcode scanning
4. **SKU History**: Track SKU changes/updates
5. **Bulk SKU Update**: Admin tool to regenerate/update SKUs in bulk

## Testing Checklist

- [x] Database migration script created
- [x] SKU generation logic implemented
- [x] Product creation with auto-SKU generation
- [x] Product update with SKU generation for missing SKUs
- [x] Inventory UI updated (desktop table)
- [x] Inventory UI updated (mobile cards)
- [x] CSS styling for SKU display
- [ ] Run database migration (SQL script)
- [ ] Test product creation (verify SKU auto-generation)
- [ ] Test product update (verify SKU generation for existing products)
- [ ] Run backfill script for existing products
- [ ] Verify SKU display in inventory page
- [ ] Test with products that have multiple sizes

## Notes

- **Apparel Products**: Apparel (jerseys, uniforms, etc.) are made-to-order and don't have finished inventory. They may not need SKUs in the same way as on-hand products (balls, trophies, medals).
- **Size Handling**: Currently, products with multiple sizes get one SKU. In the reworked system, each size should be a separate product record with its own unique SKU.
- **Backward Compatibility**: Existing products without SKU will show "No SKU" in the inventory. Run the backfill script to populate them.

---

*Last Updated: [Current Date]*

