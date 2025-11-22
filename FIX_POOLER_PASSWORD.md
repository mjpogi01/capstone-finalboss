# Fix: Password Authentication Failed with Connection Pooler

## Error: `password authentication failed for user "postgres"`

This happens because **connection pooler uses a different username format** than direct connection.

## ✅ Solution: Use Correct Pooler Username Format

### The Problem

**Direct connection (URI):**
```
postgresql://postgres:password@db.PROJECT_ID.supabase.co:5432/postgres
```
Username: `postgres`

**Connection pooler:**
```
postgresql://postgres.PROJECT_ID:password@aws-*.pooler.supabase.com:5432/postgres
```
Username: `postgres.PROJECT_ID` (with dot!)

### How to Get Correct Pooler Connection String

1. Go to Supabase Dashboard → Your Project
2. Click **Settings** → **Database**
3. Scroll to **"Connection string"** section
4. Click **"Connection Pooling"** tab
5. Copy the **exact** connection string shown
6. It should already have the correct format: `postgres.PROJECT_ID`

**Example format:**
```
postgresql://postgres.kjqcswjljgavigyfzauj:YOUR_PASSWORD@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
```

**Key points:**
- Username: `postgres.kjqcswjljgavigyfzauj` (with your project ID)
- Host: `aws-*.pooler.supabase.com` (not `db.*.supabase.co`)
- Port: `5432`

## 🔍 Verify Your Connection String

Check these in your connection string:

- ✅ Username contains a dot: `postgres.PROJECT_ID`
- ✅ Host contains `pooler.supabase.com`
- ✅ Password is correct (get from Settings → Database → Database password)
- ✅ Project ID matches your project

## 📝 Step-by-Step Fix

1. **Get the correct pooler connection string:**
   - Supabase Dashboard → Settings → Database
   - Connection string → **Connection Pooling** tab
   - Copy the entire string

2. **If it shows `[YOUR-PASSWORD]` placeholder:**
   - Go to Settings → Database → Database password
   - Copy your password (or reset it)
   - Replace `[YOUR-PASSWORD]` in the connection string

3. **Verify the format:**
   ```
   postgresql://postgres.YOUR_PROJECT_ID:YOUR_PASSWORD@aws-*.pooler.supabase.com:5432/postgres
   ```

4. **Run the import script again:**
   ```bash
   node server/scripts/import-backup-pooler.js
   ```

5. **Paste the complete connection string** when prompted

## 🐛 Common Mistakes

### ❌ Wrong: Using direct connection username
```
postgresql://postgres:password@pooler.supabase.com:5432/postgres
```
Username should be `postgres.PROJECT_ID`, not just `postgres`

### ✅ Correct: Using pooler username format
```
postgresql://postgres.kjqcswjljgavigyfzauj:password@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
```

### ❌ Wrong: Missing project ID in username
```
postgresql://postgres:password@...
```
Should be: `postgres.PROJECT_ID:password@...`

### ❌ Wrong: Using wrong password
- Make sure you're using the **database password**, not API keys
- Get it from: Settings → Database → Database password

## 🔑 Get Your Database Password

If you don't know your password:

1. Go to Supabase Dashboard → Settings → Database
2. Scroll to **"Database password"** section
3. Click **"Reset database password"** (if needed)
4. Copy the password
5. Use it in your connection string

## ✅ Quick Test

Test your connection string:

```powershell
# Replace with your actual connection string
node -e "const {Pool}=require('pg');const p=new Pool({connectionString:'postgresql://postgres.PROJECT_ID:password@aws-*.pooler.supabase.com:5432/postgres',ssl:{rejectUnauthorized:false}});p.query('SELECT 1').then(()=>console.log('✅ Connected!')).catch(e=>console.error('❌ Failed:',e.message));"
```

If it says "✅ Connected!", your connection string is correct!

## 📋 Checklist

Before running import:

- [ ] Using **pooler connection string** (not direct URI)
- [ ] Username is `postgres.PROJECT_ID` format (with dot)
- [ ] Host is `pooler.supabase.com` (not `db.*.supabase.co`)
- [ ] Password is correct (database password, not API key)
- [ ] Connection string copied exactly from Supabase Dashboard

---

## 🎯 Your Project Details

Based on your error, your project ID is: `kjqcswjljgavigyfzauj`

Your pooler connection string should be:
```
postgresql://postgres.kjqcswjljgavigyfzauj:YOUR_PASSWORD@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
```

Replace `YOUR_PASSWORD` with your actual database password!











