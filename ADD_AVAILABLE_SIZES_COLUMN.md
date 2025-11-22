# How to Fix: available_sizes Not Saving

## Problem
The `available_sizes` column doesn't exist in your Supabase database, so the sizes can't be saved.

## Solution: Add the Column in Supabase

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"

### Step 2: Run This SQL Command

```sql
-- Add available_sizes column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS available_sizes TEXT;
```

### Step 3: Verify It Worked
Run this query to check if the column exists:

```sql
-- Check if column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' AND column_name = 'available_sizes';
```

If you see a row with `available_sizes` and `text`, the column was added successfully!

### Step 4: Test It
1. Go back to your admin panel
2. Create or edit a product
3. Select some sizes (for trophies: 10", 12", 15", etc.)
4. Save the product
5. Edit it again - the selected sizes should now appear!

## Debugging

If it still doesn't work, check:

1. **Browser Console** (F12):
   - Look for `📦 [AddProductModal]` logs
   - Check what `available_sizes` is being sent

2. **Server Console**:
   - Look for `📦 [Products API]` logs
   - Check if there are any errors

3. **Common Errors**:
   - If you see "column available_sizes does not exist" → Column wasn't added
   - If you see "permission denied" → Check your Supabase RLS policies
   - If sizes aren't showing when editing → Check if data was saved (look in Supabase table editor)

## Verify Data is Saved

1. Go to Supabase Dashboard
2. Click "Table Editor"
3. Select "products" table
4. Find your product
5. Check if `available_sizes` column shows the sizes (e.g., "10,12,15")






























