# Fix: User Profiles Table Missing (404 Error)

## 🐛 Error Description

When trying to save profile information, you get this error:

```
Failed to load resource: the server responded with a status of 404 (Not Found)
Error: Could not find the table 'public.user_profiles' in the schema cache
Hint: Perhaps you meant the table 'public.user_addresses'
```

## 🔍 Root Cause

The **`user_profiles` table doesn't exist** in your Supabase database. The application is trying to save profile data to a table that hasn't been created yet.

## ✅ Solution: Create the Table in Supabase

### Method 1: Using Supabase SQL Editor (RECOMMENDED)

#### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project: `xnuzdzjfqhbpcnsetjif`
3. Click on **SQL Editor** in the left sidebar

#### Step 2: Run the SQL Script
1. Click **"New Query"** button
2. Copy the entire SQL script from `server/scripts/create-user-profiles-supabase.sql`
3. Paste it into the SQL editor
4. Click **"Run"** or press `Ctrl+Enter`

#### Step 3: Verify Success
You should see:
```
✅ user_profiles table created successfully!
✅ Indexes created!
✅ Triggers created!
✅ RLS policies enabled!
```

### Method 2: Quick Copy-Paste SQL

If you prefer, here's the minimal SQL to create the table:

```sql
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
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own profiles
CREATE POLICY "Users can manage their own profile"
  ON public.user_profiles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.user_profiles TO authenticated;
```

## 📋 What This Table Does

The `user_profiles` table stores extended user information:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Reference to auth.users (unique) |
| `full_name` | VARCHAR(255) | User's full name |
| `phone` | VARCHAR(20) | Phone number |
| `gender` | VARCHAR(10) | Gender (Male/Female/Other) |
| `date_of_birth` | DATE | Birth date |
| `address` | TEXT | Full address |
| `avatar_url` | TEXT | Profile picture URL |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

## 🔐 Security Features (RLS)

The table has **Row Level Security (RLS)** enabled, which means:
- ✅ Users can only view/edit **their own** profile
- ✅ Users cannot see other users' profiles
- ✅ Service role (backend) has full access
- ✅ Authenticated users have appropriate permissions

## 🧪 How to Verify It Works

### Step 1: Check if Table Exists
In Supabase SQL Editor, run:
```sql
SELECT * FROM public.user_profiles;
```

If it returns a result (even empty), the table exists! ✅

### Step 2: Test in Your Application
1. Refresh your application page (hard refresh: `Ctrl+Shift+R`)
2. Go to your Profile page
3. Click **"Edit"**
4. Update your phone number or address
5. Click **"Save"**
6. Should save successfully! ✅

### Step 3: Verify Data Was Saved
In Supabase SQL Editor, run:
```sql
SELECT * FROM public.user_profiles ORDER BY created_at DESC;
```

You should see your profile data! 🎉

## 🚨 Alternative: Disable Profile Saving (Not Recommended)

If you don't want to create the table right now, you can temporarily disable profile saving:

### Option A: Use User Metadata Only
This stores data in Supabase Auth's `user_metadata` instead of a separate table.

Modify `src/pages/customer/Profile.js`:

```javascript
// Comment out this line:
// await userProfileService.upsertUserProfile(user.id, profileData);

// And use this instead:
await supabase.auth.updateUser({
  data: {
    full_name: formData.name,
    phone: formData.phone,
    address: formData.address
  }
});
```

**Pros**: No database table needed  
**Cons**: Limited storage, no indexing, harder to query

## 📊 Common Issues After Creating Table

### Issue 1: "Permission denied for table user_profiles"
**Solution**: Run the GRANT permissions command:
```sql
GRANT ALL ON public.user_profiles TO authenticated;
```

### Issue 2: "RLS policy violation"
**Solution**: Make sure RLS policies are created:
```sql
CREATE POLICY "Users can manage their own profile"
  ON public.user_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Issue 3: Still getting 404 after creating table
**Solution**: 
1. Hard refresh your browser (`Ctrl+Shift+R`)
2. Clear Supabase cache in dashboard
3. Restart your development server

## ✅ Quick Checklist

- [ ] Open Supabase Dashboard
- [ ] Go to SQL Editor
- [ ] Run the SQL script from `create-user-profiles-supabase.sql`
- [ ] Verify table exists
- [ ] Hard refresh your application
- [ ] Test saving profile
- [ ] Success! ✅

## 🎯 Expected Result

After creating the table:
- ✅ Profile saves successfully
- ✅ No more 404 errors
- ✅ Phone number updates work
- ✅ Address updates work
- ✅ Profile picture saves correctly
- ✅ All profile data persists

## 📞 Still Having Issues?

If you still get errors after creating the table:

1. **Check browser console** for specific error messages
2. **Verify table exists** in Supabase Table Editor
3. **Check RLS policies** are enabled
4. **Restart your dev server**
5. **Clear browser cache**

## 🎓 Why This Happened

The application code expects a `user_profiles` table to exist, but it wasn't created during initial setup. This is a one-time setup that should have been run when the database was initialized.

---

**Status**: ✅ Ready to Fix  
**Time to Fix**: ~2 minutes  
**Difficulty**: Easy (just copy-paste SQL)  
**Impact**: Fixes all profile saving functionality

