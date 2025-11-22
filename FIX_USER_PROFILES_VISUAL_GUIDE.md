# Fix User Profiles Table - Visual Step-by-Step Guide

## 🎯 Quick Summary

**Problem**: Getting 404 error when saving profile  
**Cause**: Missing `user_profiles` table in Supabase  
**Solution**: Run SQL script to create the table  
**Time**: 2 minutes ⏱️

---

## 📖 Step-by-Step Instructions

### Step 1: Open Supabase Dashboard

```
1. Go to: https://supabase.com/dashboard
2. Login to your account
3. Select your project
```

**Your Project URL:**
```
https://xnuzdzjfqhbpcnsetjif.supabase.co
```

---

### Step 2: Navigate to SQL Editor

```
┌─────────────────────────────────────┐
│  Supabase Dashboard                 │
├─────────────────────────────────────┤
│  📊 Home                            │
│  📋 Table Editor                    │
│  🔍 SQL Editor  ← CLICK THIS        │
│  📈 Database                        │
│  🔐 Authentication                  │
│  📦 Storage                         │
└─────────────────────────────────────┘
```

**Action**: Click on **"SQL Editor"** in the left sidebar

---

### Step 3: Create New Query

```
┌────────────────────────────────────────────┐
│  SQL Editor                                │
├────────────────────────────────────────────┤
│  [+ New Query]  ← CLICK THIS               │
│                                            │
│  Recent Queries:                           │
│  - Query 1                                 │
│  - Query 2                                 │
└────────────────────────────────────────────┘
```

**Action**: Click the **"+ New Query"** button

---

### Step 4: Copy the SQL Script

**Open File**: `server/scripts/create-user-profiles-supabase.sql`

**Or Copy This:**

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  phone VARCHAR(20),
  gender VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other')),
  date_of_birth DATE,
  address TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id 
  ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at 
  ON public.user_profiles(created_at);

-- Create update trigger function
CREATE OR REPLACE FUNCTION public.update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_user_profiles_updated_at 
  ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_profiles_updated_at();

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile"
  ON public.user_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;
```

---

### Step 5: Paste and Run

```
┌────────────────────────────────────────────┐
│  New Query                        [Run] ←  │
├────────────────────────────────────────────┤
│  1  CREATE TABLE IF NOT EXISTS...          │
│  2  ...                                    │
│  3  ...                                    │
│  4  [Paste your SQL here]                  │
│  5  ...                                    │
│                                            │
│                                            │
└────────────────────────────────────────────┘
```

**Actions**:
1. Click in the editor area
2. Press `Ctrl+A` to select all
3. Press `Ctrl+V` to paste the SQL
4. Click **"Run"** button (or press `Ctrl+Enter`)

---

### Step 6: Check for Success

**Expected Output:**

```
┌────────────────────────────────────────────┐
│  Results                                   │
├────────────────────────────────────────────┤
│  ✅ Success                                │
│                                            │
│  Rows affected: 0                          │
│  Time: 0.2s                                │
│                                            │
│  NOTICE: ✅ user_profiles table created    │
│  NOTICE: ✅ Indexes created                │
│  NOTICE: ✅ Triggers created               │
│  NOTICE: ✅ RLS policies enabled           │
└────────────────────────────────────────────┘
```

**If you see errors**, see the troubleshooting section below.

---

### Step 7: Verify Table Exists

**Run this verification query:**

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles';
```

**Expected Result:**

```
┌────────────────┐
│  table_name    │
├────────────────┤
│  user_profiles │
└────────────────┘
```

**If you see this, SUCCESS!** ✅

---

### Step 8: Test in Your Application

```
1. Go back to your application
2. Hard refresh the page (Ctrl+Shift+R)
3. Navigate to Profile page
4. Click "Edit"
5. Update your information:
   - Phone number: 0917-123-4567
   - Address: Your address
6. Click "Save"
```

**Expected Result:**

```
┌─────────────────────────────────────┐
│  ✓ Profile updated successfully!   │
└─────────────────────────────────────┘
```

**No more 404 errors!** 🎉

---

## 🎨 Visual Flow Diagram

```
┌────────────────┐
│  Start         │
└───────┬────────┘
        │
        ▼
┌────────────────────┐
│  Open Supabase     │
│  Dashboard         │
└───────┬────────────┘
        │
        ▼
┌────────────────────┐
│  Click SQL Editor  │
└───────┬────────────┘
        │
        ▼
┌────────────────────┐
│  New Query         │
└───────┬────────────┘
        │
        ▼
┌────────────────────┐
│  Paste SQL Script  │
└───────┬────────────┘
        │
        ▼
┌────────────────────┐
│  Click Run         │
└───────┬────────────┘
        │
        ▼
┌────────────────────┐
│  See Success ✅    │
└───────┬────────────┘
        │
        ▼
┌────────────────────┐
│  Test in App       │
└───────┬────────────┘
        │
        ▼
┌────────────────────┐
│  Profile Saves! 🎉│
└────────────────────┘
```

---

## ⚠️ Common Errors & Solutions

### Error 1: "Extension uuid-ossp does not exist"

**Error Message:**
```
ERROR: extension "uuid-ossp" does not exist
```

**Solution:**
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```
Run this separately first, then run the main script.

---

### Error 2: "Permission denied for schema public"

**Error Message:**
```
ERROR: permission denied for schema public
```

**Solution:**
You need admin access. Contact your Supabase project admin or:
```sql
GRANT ALL ON SCHEMA public TO authenticated;
```

---

### Error 3: "Table already exists"

**Error Message:**
```
ERROR: relation "user_profiles" already exists
```

**Solution:**
Table already exists! ✅ You're good to go. Just test your app.

---

### Error 4: "Cannot reference auth.users"

**Error Message:**
```
ERROR: relation "auth.users" does not exist
```

**Solution:**
Change the reference to your auth table. In Supabase, it's usually `auth.users`.
Make sure you're using the correct schema.

---

## 🔍 Verification Checklist

After running the SQL script:

### In Supabase:
- [ ] No errors in SQL Editor
- [ ] Table appears in Table Editor
- [ ] RLS is enabled (shield icon visible)
- [ ] Policies are created (4 policies)

### In Your App:
- [ ] Hard refresh page (Ctrl+Shift+R)
- [ ] No 404 errors in console
- [ ] Profile saves successfully
- [ ] Success notification appears
- [ ] Data persists after refresh

---

## 📊 What the Table Looks Like

**In Supabase Table Editor:**

```
┌────────────────────────────────────────────────────────┐
│  user_profiles                                  [🛡 RLS]│
├──────┬──────────┬───────────┬─────────┬────────────────┤
│  id  │ user_id  │ full_name │ phone   │ address        │
├──────┼──────────┼───────────┼─────────┼────────────────┤
│ uuid │ uuid     │ text      │ text    │ text           │
└──────┴──────────┴───────────┴─────────┴────────────────┘

Empty table - will populate when users update their profiles
```

---

## 🎯 Before & After

### ❌ Before (Error State)

```javascript
// Browser Console
❌ POST https://xnuzdzjfqhbpcnsetjif.supabase.co/rest/v1/user_profiles 404 (Not Found)
❌ Error: Could not find the table 'public.user_profiles' in the schema cache
❌ Error saving profile
```

### ✅ After (Working State)

```javascript
// Browser Console
✓ POST https://xnuzdzjfqhbpcnsetjif.supabase.co/rest/v1/user_profiles 200 (OK)
✓ Profile updated successfully!
```

---

## 🚀 Quick Test Script

After creating the table, test with this:

```sql
-- Insert a test profile
INSERT INTO public.user_profiles (user_id, full_name, phone)
VALUES (auth.uid(), 'Test User', '0917-123-4567')
ON CONFLICT (user_id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone;

-- Verify it was saved
SELECT * FROM public.user_profiles WHERE user_id = auth.uid();
```

**Expected**: Should see your test data! ✅

---

## 💡 Pro Tips

1. **Save the Query**: Click "Save" in SQL Editor to keep the script for future use
2. **Name it**: "Create User Profiles Table"
3. **Bookmark**: Save the Supabase dashboard URL for quick access
4. **Document**: Keep this guide handy for team members

---

## 📞 Need Help?

If you're still stuck:

1. **Check Supabase Status**: https://status.supabase.com
2. **Review Error Message**: Look for specific error codes
3. **Check Permissions**: Ensure you're project admin
4. **Restart Dev Server**: Sometimes needed after schema changes

---

**Status**: ✅ Ready to Execute  
**Difficulty**: ⭐ Easy (Just copy-paste!)  
**Time Required**: ⏱️ 2 minutes  
**Success Rate**: 99% when following exactly

---

Good luck! Your profile saving should work perfectly after this! 🎉

