# SKU Regeneration Guide

## Overview
This guide explains how to handle existing SKUs after updating the SKU generation format to:
- **Exactly 10 characters** (previously variable length)
- **No product name** included (previously included product name)

## Current Status
- **New products**: Will automatically get the new 10-character format
- **Existing products**: Keep their current SKUs (unless regenerated)

## Options

### Option 1: Keep Existing SKUs (Recommended for Production)
**Pros:**
- No disruption to existing data
- No need to update external systems or labels
- Safe and non-destructive

**Cons:**
- Mixed SKU formats in database
- Old format may be longer than 10 characters

**Action Required:** None - existing SKUs remain unchanged.

### Option 2: Regenerate All SKUs
**Pros:**
- Consistent 10-character format across all products
- Clean, standardized SKU system
- No product name in SKUs

**Cons:**
- All existing SKUs will change
- May need to update external systems, labels, or documents
- Potential disruption if SKUs are referenced elsewhere

## Regenerating All SKUs

### Step 1: Backup Your Database
Before regenerating SKUs, **always backup your database**:

```sql
-- In Supabase SQL Editor, export a backup or:
-- Use Supabase Dashboard → Database → Backups
```

### Step 2: Preview What Will Change
Check which products will be affected:

```sql
-- View all products with their current SKUs
SELECT id, name, category, sku, 
       CASE 
         WHEN LENGTH(sku) > 10 THEN 'Will be regenerated (too long)'
         WHEN sku IS NULL THEN 'Will be generated (missing)'
         ELSE 'Will keep existing (10 chars)'
       END as status
FROM products
ORDER BY category, name;
```

### Step 3: Regenerate Missing SKUs Only (Safest)
Only generate SKUs for products that don't have one yet:

```bash
cd server/scripts
node regenerate-all-skus.js
```

This will:
- ✅ Generate SKUs for products without SKUs
- ⏭️ Skip products that already have SKUs

### Step 4: Regenerate All SKUs (Force Update)
**⚠️ WARNING: This will overwrite ALL existing SKUs!**

```bash
cd server/scripts
node regenerate-all-skus.js --force
```

Or use the shorthand:

```bash
node regenerate-all-skus.js -f
```

This will:
- ✅ Regenerate ALL SKUs (including existing ones)
- ⏭️ Skip nothing - all products get new SKUs

## SKU Format Examples

### New Format (10 characters):
- **Trophy (Large)**: `TRP1234LAR` (10 chars)
- **Ball (Size 5)**: `BAL5678500` (10 chars)  
- **Jersey (Apparel)**: `JRS9012000` (10 chars)

### Old Format (variable length):
- `TRP-ABC123-LARGE` (15 chars)
- `BAL-DEF456-5` (11 chars)
- `JRS-GHI789` (10 chars)

## What Happens After Regeneration

1. **All products** will have exactly 10-character SKUs
2. **SKUs are unique** - collision detection ensures no duplicates
3. **Format breakdown**:
   - On-stock products: `CAT(3) + ID(4) + SIZE(3) = 10`
   - Apparel products: `CAT(3) + ID(4) + 000(3) = 10`

## Verification

After regeneration, verify the results:

```sql
-- Check all SKUs are 10 characters
SELECT id, name, sku, LENGTH(sku) as sku_length
FROM products
WHERE LENGTH(sku) != 10
   OR sku IS NULL;

-- Should return 0 rows if all SKUs are correctly formatted

-- Check for duplicates
SELECT sku, COUNT(*) as count
FROM products
WHERE sku IS NOT NULL
GROUP BY sku
HAVING COUNT(*) > 1;

-- Should return 0 rows if all SKUs are unique
```

## Rollback

If you need to rollback after regeneration:

1. Restore database from backup (created in Step 1)
2. Or manually restore specific SKUs if you have them documented

## Notes

- The script processes products sequentially to avoid race conditions
- Collision detection ensures unique SKUs even if multiple products have similar attributes
- The script shows progress and a summary at the end
- Errors for individual products won't stop the entire process

## Support

If you encounter issues:
1. Check the console output for specific error messages
2. Verify database connection and permissions
3. Ensure the `generate-skus.js` module is up to date
4. Check that the `sku` column exists in the products table




