# How to Get Supabase API Keys

This guide shows you exactly where to find all your Supabase credentials.

## 🔑 Where to Find Supabase Keys

### Step 1: Go to Supabase Dashboard

1. Visit [https://app.supabase.com](https://app.supabase.com)
2. **Sign in** to your account
3. Select your **project** from the dashboard

### Step 2: Navigate to Project Settings

1. Click on the **⚙️ Settings** icon in the left sidebar (or click on your project name)
2. Select **"API"** from the settings menu

### Step 3: Find Your Keys

You'll see a page with several sections:

#### 📍 **Project URL** (SUPABASE_URL)
```
https://your-project-id.supabase.co
```
- This is your `SUPABASE_URL`
- Copy the entire URL

#### 🔐 **anon public** key (SUPABASE_ANON_KEY)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
- This is your `SUPABASE_ANON_KEY`
- Click the **👁️ eye icon** to reveal it
- Click **📋 Copy** to copy it

#### 🔒 **service_role secret** key (SUPABASE_SERVICE_ROLE_KEY)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
- This is your `SUPABASE_SERVICE_ROLE_KEY`
- ⚠️ **IMPORTANT:** This key has admin privileges - keep it secret!
- Click the **👁️ eye icon** to reveal it
- Click **📋 Copy** to copy it
- **Never commit this to Git or share it publicly!**

---

## 📋 Quick Reference: What Each Key Is For

| Key | Variable Name | Purpose | Security |
|-----|--------------|---------|----------|
| Project URL | `SUPABASE_URL` | Your Supabase project endpoint | Public |
| anon public | `SUPABASE_ANON_KEY` | Client-side operations (browser) | Public (but rate-limited) |
| service_role secret | `SUPABASE_SERVICE_ROLE_KEY` | Server-side admin operations | **SECRET** - Never expose! |

---

## 🗄️ How to Get DATABASE_URL

### Option 1: From API Settings (Connection String)

1. Go to **Settings** → **API**
2. Scroll down to **"Connection string"** section
3. Select **"URI"** tab (not "Connection Pooling")
4. Copy the connection string:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.your-project-id.supabase.co:5432/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with your actual database password

### Option 2: From Database Settings

1. Go to **Settings** → **Database**
2. Scroll to **"Connection string"** section
3. Click **"URI"** tab
4. Copy the connection string
5. Replace `[YOUR-PASSWORD]` with your database password

### Option 3: If You Don't Know Your Database Password

1. Go to **Settings** → **Database**
2. Scroll to **"Database password"** section
3. Click **"Reset database password"** (if needed)
4. Copy the new password
5. Use it in your `DATABASE_URL`

---

## 📸 Visual Guide

### Step-by-Step Screenshots Location:

1. **Dashboard** → Click your project
2. **Left Sidebar** → Click **⚙️ Settings** (gear icon)
3. **Settings Menu** → Click **"API"**
4. **API Page** shows:
   - Project URL (top)
   - anon public key (middle)
   - service_role secret key (bottom)

---

## 🔍 For Both Old and New Projects

When migrating, you need keys from **BOTH** projects:

### Old Project (Source)
1. Go to old project dashboard
2. Settings → API
3. Copy all keys

### New Project (Destination)
1. Go to new project dashboard
2. Settings → API
3. Copy all keys

---

## ⚠️ Important Security Notes

### SUPABASE_SERVICE_ROLE_KEY
- **NEVER** expose this in client-side code
- **NEVER** commit to Git repositories
- **ONLY** use in server-side code (backend)
- This key bypasses Row Level Security (RLS)
- Has full admin access to your database

### SUPABASE_ANON_KEY
- Safe to use in client-side code (React, etc.)
- Still should not be committed to public repos
- Respects Row Level Security (RLS) policies
- Rate-limited by Supabase

### DATABASE_URL
- Contains your database password
- **NEVER** commit to Git
- **ONLY** use in server-side code
- Keep in `.env` files (which are gitignored)

---

## ✅ Verification Checklist

After getting your keys, verify:

- [ ] `SUPABASE_URL` starts with `https://` and ends with `.supabase.co`
- [ ] `SUPABASE_ANON_KEY` starts with `eyJ` (JWT token)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` starts with `eyJ` (JWT token)
- [ ] `DATABASE_URL` starts with `postgresql://` and contains your password
- [ ] All keys are from the correct project (old vs new)

---

## 🆘 Troubleshooting

### "I can't see the service_role key"
- Make sure you're logged in as project owner/admin
- Click the **👁️ eye icon** to reveal hidden keys
- Some projects may require you to be the owner to see service_role key

### "The keys look the same"
- anon key and service_role key both start with `eyJ` (they're both JWT tokens)
- They are different - copy them carefully
- Double-check you're copying the right one

### "I don't have a database password"
- Go to Settings → Database
- Click "Reset database password"
- Copy the new password
- Use it in your `DATABASE_URL`

### "Connection string has [YOUR-PASSWORD] placeholder"
- Replace `[YOUR-PASSWORD]` with your actual database password
- The password is shown in Settings → Database → Database password

---

## 📝 Example .env File

After getting all keys, your `.env` should look like:

```env
# Supabase Configuration
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODk2NzIwMCwiZXhwIjoxOTU0NTQzMjAwfQ.example
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjM4OTY3MjAwLCJleHAiOjE5NTQ1NDMyMDB9.example
DATABASE_URL=postgresql://postgres:your-actual-password@db.abcdefghijklmnop.supabase.co:5432/postgres
```

**Note:** Replace `example` and `your-actual-password` with real values!

---

## 🎯 Quick Links

- [Supabase Dashboard](https://app.supabase.com)
- [Supabase Documentation - API Keys](https://supabase.com/docs/guides/api)
- [Supabase Documentation - Database Connection](https://supabase.com/docs/guides/database/connecting-to-postgres)

---

## ✅ You're All Set!

Once you have all four values:
1. ✅ `SUPABASE_URL`
2. ✅ `SUPABASE_ANON_KEY`
3. ✅ `SUPABASE_SERVICE_ROLE_KEY`
4. ✅ `DATABASE_URL`

You can proceed with the migration! 🚀











