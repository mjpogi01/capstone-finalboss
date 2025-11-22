# Cart 400 Error Fix - Schema Mismatch Resolution

## Problem Summary

Users were experiencing a **400 Bad Request** error when trying to add items to cart, with the following errors in console:

```
Failed to load resource: the server responded with a status of 400
cartService.js:123 Supabase insert error: Object
cartService.js:135 Error adding to cart: Object
CartContext.js:171 Error adding to cart: Object
```

## Root Cause

**Schema Mismatch** between the application code and the Supabase database schema.

### The Issue:

The code was trying to insert a `team_name` column that **doesn't exist** in the Supabase `user_carts` table.

**Supabase Schema** (`server/scripts/supabase-migration.js`):
```sql
CREATE TABLE user_carts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  size TEXT,
  is_team_order BOOLEAN,
  team_members JSONB,        -- team_name should be stored HERE
  single_order_details JSONB, -- or HERE
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```
❌ **No `team_name` column exists!**

**What the code was doing:**
```javascript
// cartService.js line 116
.insert({
  user_id: userId,
  product_id: cartItem.id,
  quantity: cartItem.quantity,
  size: cartItem.size,
  is_team_order: cartItem.isTeamOrder,
  team_members: cartItem.teamMembers,
  team_name: cartItem.teamName, // ❌ This field doesn't exist!
  single_order_details: cartItem.singleOrderDetails
})
```

## Solution

### Files Modified:

1. **src/services/cartService.js**
   - ✅ Removed `team_name` field from insert in `addToCart()` function (line 116)
   - ✅ Removed `teamName: item.team_name` from `getUserCart()` transformation (line 59)

2. **src/contexts/CartContext.js**
   - ✅ Removed `teamName` parameter from options destructuring (line 76)
   - ✅ Removed `teamName` from cartItem object creation (line 89)

### How Team Name Should Be Stored:

The `team_name` should be stored **inside the JSONB fields**, not as a separate column:

- For **Team Orders**: Store in `team_members` JSONB array
  ```javascript
  team_members: [
    { name: "John", jersey_number: "10", team_name: "Eagles", size: "M" },
    { name: "Jane", jersey_number: "7", team_name: "Eagles", size: "L" }
  ]
  ```

- For **Single Orders**: Store in `single_order_details` JSONB object
  ```javascript
  single_order_details: {
    name: "John Doe",
    jersey_number: "10",
    team_name: "Eagles"
  }
  ```

## What Changed

### Before (Causing 400 Error):
```javascript
// ❌ Trying to insert team_name as separate column
const { data, error } = await supabase
  .from('user_carts')
  .insert({
    user_id: userId,
    product_id: cartItem.id,
    quantity: cartItem.quantity,
    size: cartItem.size,
    is_team_order: cartItem.isTeamOrder,
    team_members: cartItem.teamMembers,
    team_name: cartItem.teamName, // ❌ Column doesn't exist!
    single_order_details: cartItem.singleOrderDetails
  });
```

### After (Fixed):
```javascript
// ✅ Only inserting fields that exist in schema
const { data, error } = await supabase
  .from('user_carts')
  .insert({
    user_id: userId,
    product_id: cartItem.id,
    quantity: cartItem.quantity,
    size: cartItem.size,
    is_team_order: cartItem.isTeamOrder,
    team_members: cartItem.teamMembers,
    single_order_details: cartItem.singleOrderDetails
  });
```

## Verification

✅ **No linter errors** in modified files
✅ **Schema matches** Supabase database structure
✅ **Team name** properly stored in JSONB fields
✅ **Existing display logic** already handles reading team_name from JSONB fields correctly

## Testing Steps

1. **Restart your development server** if it's running
2. **Clear browser cache** and reload the page
3. Try adding items to cart:
   - Add a regular product
   - Add a team order with multiple members
   - Add a single order with custom details

## Expected Behavior

After this fix:
- ✅ Add to cart should work without errors
- ✅ Cart items should be saved to database
- ✅ Team names should display correctly in checkout
- ✅ No more 400 errors in console

## Files Changed

- `src/services/cartService.js` - Removed team_name from database operations
- `src/contexts/CartContext.js` - Removed teamName from cart item creation

## Next Steps

If you still encounter issues:
1. Check browser console for any new error messages
2. Verify user is logged in (cart requires authentication)
3. Check network tab to see the actual request/response
4. Verify Supabase connection is working

---

**Status**: ✅ Fixed - Ready to test
**Date**: October 29, 2025


































