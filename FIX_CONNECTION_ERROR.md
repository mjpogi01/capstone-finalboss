# Fix: ENOTFOUND Database Connection Error

## Error: `getaddrinfo ENOTFOUND db.*.supabase.co`

This error means the database hostname cannot be found. Here's how to fix it:

## ✅ Solution 1: Check if Project is Paused (Most Common)

**Free-tier Supabase projects pause after inactivity!**

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Find your project: `kjqcswjljgavigyfzauj`
3. Check the project status:
   - If it shows **"Paused"** or **"Inactive"** → Click **"Resume"** or **"Restore"**
   - Wait 1-2 minutes for the project to become active
4. Try the import again

## ✅ Solution 2: Verify Connection String

Make sure you're using the **correct connection string**:

1. Go to Supabase Dashboard → Your Project
2. Click **Settings** (⚙️) → **Database**
3. Scroll to **"Connection string"** section
4. **IMPORTANT:** Click the **"URI"** tab (NOT "Connection Pooling")
5. Copy the connection string
6. It should look like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.kjqcswjljgavigyfzauj.supabase.co:5432/postgres
   ```
7. Replace `[YOUR-PASSWORD]` with your actual database password

**❌ Wrong (Connection Pooling):**
```
postgresql://postgres:password@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
```

**✅ Correct (Direct Connection - URI):**
```
postgresql://postgres:password@db.kjqcswjljgavigyfzauj.supabase.co:5432/postgres
```

## ✅ Solution 3: Get Your Database Password

If you don't know your database password:

1. Go to Settings → Database
2. Scroll to **"Database password"** section
3. Click **"Reset database password"**
4. Copy the new password
5. Use it in your connection string

## ✅ Solution 4: Verify Project Exists

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Check if project `kjqcswjljgavigyfzauj` exists
3. If it doesn't exist, you need to create a new project first

## 🔍 Quick Test

Test the connection manually:

```powershell
# Test connection (replace with your actual password)
node -e "const {Pool}=require('pg');const p=new Pool({connectionString:'postgresql://postgres:YOUR_PASSWORD@db.kjqcswjljgavigyfzauj.supabase.co:5432/postgres',ssl:{rejectUnauthorized:false}});p.query('SELECT 1').then(()=>console.log('✅ Connected!')).catch(e=>console.error('❌ Failed:',e.message));"
```

## 📋 Checklist

Before running the import again:

- [ ] Supabase project is **active** (not paused)
- [ ] Using **direct connection URL** (URI tab, not Connection Pooling)
- [ ] Connection string format is correct: `postgresql://postgres:password@db.PROJECT_ID.supabase.co:5432/postgres`
- [ ] Database password is correct
- [ ] Hostname is `db.kjqcswjljgavigyfzauj.supabase.co` (not `pooler.supabase.com`)

## 🚀 After Fixing

Once the project is active and you have the correct connection string:

1. Run the import script again:
   ```bash
   node server/scripts/import-backup-to-supabase.js
   ```

2. Enter the correct DATABASE_URL when prompted

3. The import should work!

---

## 💡 Why This Happens

- **Free tier projects pause** after 7 days of inactivity
- **Connection pooler URLs** don't work for direct database connections
- **Wrong password** causes authentication errors
- **Paused projects** return ENOTFOUND errors

---

## 🆘 Still Not Working?

1. Double-check project status in Supabase Dashboard
2. Verify you're using the URI connection string (not pooler)
3. Try resetting the database password
4. Check if the project was deleted or moved











