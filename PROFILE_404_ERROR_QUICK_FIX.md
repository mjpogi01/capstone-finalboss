# Quick Fix: Profile 404 Error

## 🚨 The Error You're Seeing

```
404 (Not Found)
Could not find the table 'public.user_profiles' in the schema cache
Error saving profile
```

## ⚡ Quick Fix (2 Minutes)

### 1️⃣ Open Supabase
- Go to: https://supabase.com/dashboard
- Select your project

### 2️⃣ Open SQL Editor
- Click **"SQL Editor"** in left sidebar
- Click **"+ New Query"**

### 3️⃣ Copy & Paste This SQL

```sql
-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  phone VARCHAR(20),
  gender VARCHAR(10),
  date_of_birth DATE,
  address TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX idx_user_profiles_user_id ON public.user_profiles(user_id);

-- Enable security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their profiles
CREATE POLICY "Users can manage their profile"
  ON public.user_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.user_profiles TO authenticated;
```

### 4️⃣ Click "Run" or Press Ctrl+Enter

### 5️⃣ Refresh Your App
- Press `Ctrl+Shift+R` (hard refresh)
- Try saving your profile again
- **It should work now!** ✅

---

## 🎯 What This Does

Creates a table to store user profile information:
- Name
- Phone number
- Address
- Profile picture
- Other user data

---

## ✅ Success Check

After running the SQL:
- ✅ No more 404 errors
- ✅ Profile saves successfully
- ✅ Phone number updates work
- ✅ Address updates work

---

## 📚 More Details

For complete documentation, see:
- `FIX_USER_PROFILES_TABLE.md` - Full explanation
- `FIX_USER_PROFILES_VISUAL_GUIDE.md` - Step-by-step with pictures
- `server/scripts/create-user-profiles-supabase.sql` - Complete SQL script

---

**That's it!** Your profile should save successfully now! 🎉

