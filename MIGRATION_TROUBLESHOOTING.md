# Migration Troubleshooting Guide

## Common Errors and Solutions

### Error: `getaddrinfo ENOTFOUND db.*.supabase.co`

**What it means:** The script cannot find/resolve the database hostname.

**Possible causes:**
1. ❌ **Supabase project is paused** (most common)
2. ❌ **Wrong connection URL format**
3. ❌ **Using connection pooler URL instead of direct connection**
4. ❌ **Network/DNS issues**

**Solutions:**

#### 1. Check if Project is Paused

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Check your project status
3. If it shows "Paused" or "Inactive", click **"Resume"** or **"Restore"**
4. Wait 1-2 minutes for the project to be active
5. Try the migration again

#### 2. Get the Correct Connection URL

**Step-by-step:**

1. Go to Supabase Dashboard → Your Project
2. Click **Settings** (⚙️ icon) in left sidebar
3. Click **"Database"** in settings menu
4. Scroll to **"Connection string"** section
5. **IMPORTANT:** Click the **"URI"** tab (NOT "Connection Pooling")
6. Copy the connection string
7. It should look like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.PROJECT_ID.supabase.co:5432/postgres
   ```
8. Replace `[YOUR-PASSWORD]` with your actual database password

**❌ Wrong (Connection Pooling):**
```
postgresql://postgres:password@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
```

**✅ Correct (Direct Connection - URI):**
```
postgresql://postgres:password@db.PROJECT_ID.supabase.co:5432/postgres
```

#### 3. Get Your Database Password

If you don't know your database password:

1. Go to Settings → Database
2. Scroll to **"Database password"** section
3. Click **"Reset database password"**
4. Copy the new password
5. Use it in your connection string

#### 4. Test Connection Manually

You can test if the connection works:

**Using Node.js:**
```javascript
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:password@db.PROJECT_ID.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});
pool.query('SELECT 1').then(() => console.log('✅ Connected!')).catch(err => console.error('❌ Failed:', err));
```

---

### Error: `pg_dump is not recognized`

**Solution:** This is fine! The script automatically uses SQL export method instead. No action needed.

---

### Error: `Invalid URL` or `Invalid DATABASE_URL format`

**What it means:** The connection string format is incorrect.

**Solution:**
- Make sure it starts with `postgresql://` or `postgres://`
- Format: `postgresql://user:password@host:port/database`
- Example: `postgresql://postgres:mypassword@db.abc123.supabase.co:5432/postgres`

---

### Error: `Password authentication failed`

**Solution:**
1. Go to Supabase Dashboard → Settings → Database
2. Check or reset your database password
3. Update your `DATABASE_URL` with the correct password

---

### Error: `Connection timeout` or `Connection refused`

**Possible causes:**
1. Project is paused
2. Firewall blocking connection
3. Wrong port (should be 5432)

**Solutions:**
1. Resume project if paused
2. Check firewall settings
3. Verify port is 5432 in connection string

---

## Quick Checklist

Before running migration, verify:

- [ ] Supabase project is **active** (not paused)
- [ ] Using **direct connection URL** (URI tab, not Connection Pooling)
- [ ] Connection string format is correct: `postgresql://user:password@host:port/database`
- [ ] Database password is correct
- [ ] Hostname is `db.PROJECT_ID.supabase.co` (not `pooler.supabase.com`)
- [ ] Port is `5432`

---

## Still Having Issues?

1. **Double-check your connection string:**
   - Go to Supabase Dashboard
   - Settings → Database → Connection string → URI tab
   - Copy exactly as shown
   - Replace `[YOUR-PASSWORD]` with actual password

2. **Test connection separately:**
   - Try connecting with a simple Node.js script first
   - Or use a PostgreSQL client like pgAdmin

3. **Check project status:**
   - Make sure project is not paused
   - Free tier projects pause after inactivity

4. **Try the backup script instead:**
   ```bash
   node server/scripts/backup-database.js
   ```
   This uses your existing `.env` file and might work better.

---

## Alternative: Manual Migration via Supabase Dashboard

If automated migration keeps failing:

1. **Export from old project:**
   - Go to old Supabase project
   - Settings → Database → Backups
   - Download backup (if available)

2. **Import to new project:**
   - Go to new Supabase project
   - SQL Editor → New Query
   - Paste backup SQL
   - Run query

3. **Update environment variables:**
   ```bash
   node server/scripts/update-env-variables.js
   ```

---

## Need More Help?

- Check Supabase project status in dashboard
- Verify connection string format
- Test connection with a simple script first
- Use manual migration method if automated fails











