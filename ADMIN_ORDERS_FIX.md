# Admin Orders Not Displaying - Fix Documentation

## Problem

The generated mock orders (2,502+ orders) were not appearing on the admin orders page, even though:
- ✅ Orders were successfully inserted into the database
- ✅ The backend API endpoint was working correctly
- ✅ The admin page component was making the correct API calls

## Root Cause

**Row Level Security (RLS)** was enabled on the `orders` table with policies that only allowed users to see their **own orders**:

```sql
-- Original RLS policies
"Users can view their own orders" → (auth.uid() = user_id)
"Users can update their own orders" → (auth.uid() = user_id)
```

This meant:
- 🔒 Admin users could NOT see all orders
- 🔒 Only customers could see their own orders
- 🔒 Mock orders belonged to a specific test user, not visible to admins

## Solution

Added two new RLS policies to allow admins and owners to view and manage all orders:

### Policy 1: "Enable read for admins and owners"
```sql
CREATE POLICY "Enable read for admins and owners"
  ON public.orders
  FOR SELECT
  USING (
    -- Check if user has admin or owner role
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data->>'role' = 'admin'
        OR auth.users.raw_user_meta_data->>'role' = 'owner'
      )
    )
    OR
    -- Or if they are viewing their own orders
    auth.uid() = user_id
  );
```

### Policy 2: "Enable update for admins and owners"
```sql
CREATE POLICY "Enable update for admins and owners"
  ON public.orders
  FOR UPDATE
  USING (
    -- Same logic as read policy
    EXISTS (...)
    OR auth.uid() = user_id
  );
```

## How It Works

The new policies check the user's `raw_user_meta_data` in the `auth.users` table:

1. **For Admins/Owners**: If user has role `'admin'` or `'owner'` → Can see ALL orders
2. **For Customers**: Only see their own orders (unchanged)
3. **Combined Effect**: Admins bypass the `user_id` check and get access to all orders

## RLS Policies Now in Place

```
1. Authenticated users can insert orders
   - Users: {authenticated}
   
2. Enable read for admins and owners ✨ NEW
   - Checks role and allows access to all orders
   
3. Enable update for admins and owners ✨ NEW
   - Allows admins to update any order
   
4. Users can create their own orders
   - Existing policy
   
5. Users can update their own orders
   - Existing policy (for self-updates)
   
6. Users can view their own orders
   - Existing policy (for customers)
```

## Testing

To verify the fix:

1. **Login as Owner/Admin**:
   - Email: `owner@yohanns.com` (or any user with `role: 'owner'` or `role: 'admin'`)

2. **Navigate to Admin > Orders**:
   - Should now see all 2,502+ generated orders
   - Can sort, filter, and manage orders

3. **API Test**:
   ```bash
   # With admin authentication, should return all orders
   GET http://localhost:4000/api/orders
   # Response: {orders: [...all 2502+ orders...], pagination: {...}}
   ```

## Users Available for Testing

### Owner Account
- **Email**: `owner@yohanns.com`
- **Role**: `owner`
- **Can Access**: All orders

### Customer Accounts
- **Email**: `customer@yohanns.com` (and others)
- **Role**: `customer`
- **Can Access**: Only their own orders

## Verification Query

Check RLS policies with this SQL:

```sql
SELECT 
  policyname,
  permissive,
  roles,
  qual
FROM pg_policies 
WHERE tablename = 'orders' 
ORDER BY policyname;
```

Should show 6 policies including the 2 new admin policies.

## Summary

✅ **Before**: Admins couldn't see any orders
✅ **After**: Admins can see ALL orders (2,502+)
✅ **Customers**: Still only see their own orders (unchanged)
✅ **Security**: Role-based access control properly implemented

The fix is minimal, focused, and maintains security by:
- Using role metadata from `auth.users`
- Preserving customer privacy (they still only see their own orders)
- Allowing proper admin management of all orders

---

**Migration Applied**: `fix_admin_rls_policies_for_orders`
**Date Applied**: October 2025
**Status**: ✅ Ready for use
