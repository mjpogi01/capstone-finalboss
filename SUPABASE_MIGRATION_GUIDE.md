# Supabase Database Migration Guide

This guide will help you migrate your entire Supabase infrastructure to a new Supabase project when you've reached your limits.

## 📋 Prerequisites

Before starting, make sure you have:

1. ✅ **New Supabase Project Created**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Click "New Project"
   - Choose a plan (Free tier is fine for migration)
   - Wait for project to be ready (2-3 minutes)

2. ✅ **Old Supabase Credentials**
   - Old `SUPABASE_URL`
   - Old `SUPABASE_SERVICE_ROLE_KEY`
   - Old `SUPABASE_ANON_KEY`
   - Old `DATABASE_URL` (postgresql://...)

3. ✅ **New Supabase Credentials**
   - New `SUPABASE_URL`
   - New `SUPABASE_SERVICE_ROLE_KEY`
   - New `SUPABASE_ANON_KEY`
   - New `DATABASE_URL` (postgresql://...)

4. ✅ **PostgreSQL Tools Installed** (Optional but recommended)
   - Download from: https://www.postgresql.org/download/windows/
   - Or use: `choco install postgresql` (if you have Chocolatey)
   - Needed for `pg_dump` and `psql` commands

## 🚀 Migration Methods

### Method 1: Automated Script (Recommended)

The easiest way is to use our automated migration script:

```bash
node server/scripts/migrate-supabase-database.js
```

**What it does:**
1. Exports all schema and data from old database
2. Imports everything to new database
3. Provides instructions for Auth users migration
4. Verifies the migration
5. Shows you what environment variables to update

**Follow the prompts:**
- Enter old Supabase credentials when asked
- Enter new Supabase credentials when asked
- Confirm the migration
- Wait for the process to complete

---

### Method 2: Manual Migration via Supabase Dashboard

If the automated script doesn't work, you can migrate manually:

#### Step 1: Export from Old Database

1. Go to old Supabase project dashboard
2. Navigate to **Settings** → **Database**
3. Scroll to **Backups** section
4. Click **Download backup** (if available)
   - Or use **Point-in-time recovery** (if on Pro plan)

**Alternative: Use pg_dump**

```bash
# Windows PowerShell
$env:PGPASSWORD="your-old-database-password"
pg_dump "postgresql://postgres:password@db.old-project.supabase.co:5432/postgres" --no-owner --no-acl -F p > old-database-backup.sql
```

#### Step 2: Import to New Database

1. Go to new Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Open your backup file
5. Copy and paste the SQL content
6. Click **Run** (or press Ctrl+Enter)

**Alternative: Use psql**

```bash
# Windows PowerShell
$env:PGPASSWORD="your-new-database-password"
psql "postgresql://postgres:password@db.new-project.supabase.co:5432/postgres" < old-database-backup.sql
```

#### Step 3: Migrate Supabase Auth Users

⚠️ **Important:** Supabase Auth users cannot be easily exported/imported via SQL. You have several options:

**Option A: Manual Recreation (Simplest)**
- Users will need to sign up again
- Or you can manually create users in the new Supabase Auth dashboard

**Option B: Supabase CLI (Advanced)**
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link old project
supabase link --project-ref old-project-ref

# Export auth schema
supabase db dump --schema auth > auth-export.sql

# Link new project
supabase link --project-ref new-project-ref

# Import auth schema
supabase db restore < auth-export.sql
```

**Option C: Use Supabase Management API**
- Requires custom script to export/import users
- More complex but preserves all user data

---

### Method 3: Using Backup Script + Manual Import

1. **Create backup from old database:**
   ```bash
   node server/scripts/backup-database.js
   ```
   This creates a backup file in `backups/` directory.

2. **Import to new database:**
   - Go to new Supabase project → SQL Editor
   - Copy contents of the backup file
   - Paste and run in SQL Editor

---

## 🔄 Step-by-Step: Complete Migration Process

### Phase 1: Preparation

1. **Create new Supabase project**
   - Go to https://app.supabase.com
   - Click "New Project"
   - Fill in project details
   - Wait for provisioning (2-3 minutes)

2. **Gather credentials**
   - Old project: Settings → API → Copy all keys
   - New project: Settings → API → Copy all keys
   - Old project: Settings → Database → Connection String → URI
   - New project: Settings → Database → Connection String → URI

3. **Backup old database** (safety first!)
   ```bash
   node server/scripts/backup-database.js
   ```

### Phase 2: Data Migration

**Option A: Automated (Recommended)**
```bash
node server/scripts/migrate-supabase-database.js
```

**Option B: Manual**
1. Export from old database (see Method 2 above)
2. Import to new database (see Method 2 above)

### Phase 3: Auth Users Migration

Choose one of the methods from Step 3 above (Method 2).

### Phase 4: Update Environment Variables

Update all `.env` files and deployment platforms:

**Files to update:**
- `.env` (root directory)
- `server/.env`
- Render Dashboard → Environment Variables
- Railway Dashboard → Environment Variables
- Hostinger environment variables (if applicable)

**Variables to update:**
```env
# Old → New
SUPABASE_URL=https://old-project.supabase.co
SUPABASE_URL=https://new-project.supabase.co

SUPABASE_SERVICE_ROLE_KEY=old_service_role_key
SUPABASE_SERVICE_ROLE_KEY=new_service_role_key

SUPABASE_ANON_KEY=old_anon_key
SUPABASE_ANON_KEY=new_anon_key

DATABASE_URL=postgresql://postgres:old-password@db.old-project.supabase.co:5432/postgres
DATABASE_URL=postgresql://postgres:new-password@db.new-project.supabase.co:5432/postgres
```

### Phase 5: Testing

1. **Test locally:**
   ```bash
   # Update .env files
   npm start
   # Test all features: login, orders, products, etc.
   ```

2. **Test deployed environments:**
   - Update Render/Railway environment variables
   - Redeploy or restart services
   - Test production features

3. **Verify data:**
   - Check that all tables exist
   - Verify row counts match
   - Test critical features

### Phase 6: Cleanup (Optional)

Once everything is working:

1. **Keep old project for 30 days** (in case of issues)
2. **Update documentation** with new project details
3. **Delete old project** (only after confirming everything works)

---

## 🔍 Verification Checklist

After migration, verify:

- [ ] All tables exist in new database
- [ ] Row counts match between old and new
- [ ] Users can sign up/login (if Auth users migrated)
- [ ] Products display correctly
- [ ] Orders can be created
- [ ] Admin dashboard works
- [ ] Artist dashboard works
- [ ] Customer features work
- [ ] File uploads work (Cloudinary should be unaffected)
- [ ] Email notifications work
- [ ] All API endpoints respond correctly

---

## 🐛 Troubleshooting

### "pg_dump: command not found"
- Install PostgreSQL client tools
- Or use the SQL export fallback in the script

### "Connection refused" or "Authentication failed"
- Check your `DATABASE_URL` format
- Verify password is correct
- Make sure you're using direct connection (port 5432), not connection pooling

### "SSL certificate" errors
- The script handles this automatically
- If issues persist, check network/firewall settings

### "Table already exists" errors
- The new database might have default tables
- The script uses `--clean --if-exists` flags to handle this
- If manual import, drop existing tables first or use `CREATE TABLE IF NOT EXISTS`

### Auth users not working
- Auth users need to be migrated separately (see Step 3 above)
- Users may need to sign up again
- Or use Supabase CLI to migrate auth schema

### Environment variables not updating
- Make sure you update ALL `.env` files
- Restart your development server after updating
- Clear browser cache if frontend issues persist
- Redeploy on Render/Railway after updating environment variables

---

## 📝 Important Notes

1. **Backup First:** Always backup your old database before migration
2. **Test Locally:** Test with new database locally before updating production
3. **Auth Users:** Auth users migration is separate and more complex
4. **Storage:** Supabase Storage buckets are NOT migrated automatically
   - You'll need to manually copy files or use Supabase Storage API
5. **Edge Functions:** Edge Functions need to be redeployed to new project
6. **Realtime:** Realtime subscriptions will need to reconnect
7. **API Keys:** All API keys change, so update everywhere
8. **Downtime:** Plan for some downtime during migration

---

## 🆘 Need Help?

If you encounter issues:

1. Check the backup file was created successfully
2. Verify all credentials are correct
3. Check Supabase project status (both old and new)
4. Review error messages carefully
5. Try manual migration method if automated fails

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Documentation](https://supabase.com/docs/reference/cli)
- [PostgreSQL pg_dump Documentation](https://www.postgresql.org/docs/current/app-pgdump.html)
- [PostgreSQL psql Documentation](https://www.postgresql.org/docs/current/app-psql.html)

---

## ✅ Migration Complete!

Once migration is complete and verified:

1. ✅ All data migrated
2. ✅ Auth users handled
3. ✅ Environment variables updated
4. ✅ Application tested
5. ✅ Production deployed

**Congratulations! Your Supabase infrastructure has been successfully migrated! 🎉**











