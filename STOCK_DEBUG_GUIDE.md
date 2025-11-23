# Stock Debugging Guide

## Issue: Stocks showing even after setting all to zero

### Possible Causes:

1. **Multiple Product Records**: There might be duplicate product records with the same name and category in different branches that weren't all updated.

2. **Inventory Aggregation**: The inventory page sums stocks from all branches. If some branch products weren't updated, they'll still show stocks.

3. **Update Not Applied**: Some branch products might not have been updated during the edit operation.

### How to Debug:

1. **Check Browser Console**: Look for logs starting with `📦 [AddProductModal]` and `📦 [Inventory]` to see:
   - Which products are being found
   - Which branches are being updated
   - Where stocks are coming from when aggregating

2. **Check Database Directly**: Query the products table to see all products with the same name:
   ```sql
   SELECT id, name, category, branch_id, stock_quantity, size_stocks 
   FROM products 
   WHERE name = 'YOUR_PRODUCT_NAME' AND category = 'YOUR_CATEGORY'
   ORDER BY branch_id;
   ```

3. **Verify All Branches Updated**: When editing, check the console logs to see if all selected branches were processed.

### Recent Fixes Applied:

1. **All Selected Branches Processed**: Now processes ALL selected branches, even if stock is 0
2. **Better Product Loading**: Loads all products with matching name/category, regardless of stock values
3. **Debug Logging**: Added console logs to track where stocks come from in inventory aggregation
4. **Update All Branch Products**: Improved logic to update or create products in all selected branches

### Next Steps:

1. Open browser console (F12)
2. Edit the product and set all stocks to 0
3. Check console logs to see:
   - How many products were found
   - Which branches were updated
   - If any errors occurred
4. After saving, check inventory page console logs to see where remaining stocks are coming from

### If Stocks Still Appear:

1. Check if there are duplicate products in the database that weren't updated
2. Verify the product name and category match exactly (case-sensitive)
3. Check if there are products in branches that weren't selected during edit
4. Look for products with different IDs but same name/category that might be old duplicates




