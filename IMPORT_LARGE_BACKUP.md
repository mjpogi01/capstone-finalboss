# How to Import Large Backup Files to Supabase

When your backup file is too large for Supabase SQL Editor, use one of these methods:

## Method 1: Use the Import Script (Recommended) ✅

The import script connects directly to your database, bypassing the SQL Editor size limit.

```bash
node server/scripts/import-backup-to-supabase.js
```

**What it does:**
- Connects directly to your database (not through SQL Editor)
- Handles large files efficiently
- Shows progress
- Verifies the import

**Steps:**
1. Run the script
2. Select your backup file (or it auto-selects if only one)
3. Enter your new DATABASE_URL
4. Wait for import to complete (may take 5-15 minutes for large files)

---

## Method 2: Use psql Command Line

If you have PostgreSQL client tools installed:

### Windows (PowerShell)

```powershell
# Set password as environment variable
$env:PGPASSWORD="your-database-password"

# Import the backup
psql "postgresql://postgres:password@db.PROJECT_ID.supabase.co:5432/postgres" -f "backups\migration-backup-2025-11-20T18-53-25.sql"
```

### Install PostgreSQL Tools (if needed)

1. Download from: https://www.postgresql.org/download/windows/
2. Or use Chocolatey: `choco install postgresql`
3. Make sure `psql` is in your PATH

---

## Method 3: Split the Backup File

If the above methods don't work, you can split the backup into smaller chunks:

### Using PowerShell

```powershell
# Split into files of 10,000 lines each
$lines = Get-Content "backups\migration-backup-2025-11-20T18-53-25.sql"
$chunkSize = 10000
$chunkNumber = 1

for ($i = 0; $i -lt $lines.Count; $i += $chunkSize) {
    $chunk = $lines[$i..([Math]::Min($i + $chunkSize - 1, $lines.Count - 1))]
    $chunk | Out-File "backups\chunk-$chunkNumber.sql"
    $chunkNumber++
}
```

Then import each chunk via SQL Editor or the import script.

---

## Method 4: Use Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Import backup
supabase db restore < backups/migration-backup-2025-11-20T18-53-25.sql
```

---

## Troubleshooting

### "Connection timeout"
- Large imports take time, be patient
- The script shows progress

### "Out of memory"
- The script automatically splits into batches
- If still fails, use Method 2 (psql) or Method 3 (split file)

### "Table already exists"
- This is normal if importing multiple times
- The script handles these warnings automatically

### "Foreign key constraint violation"
- Make sure you're importing to an empty database
- Or import in the correct order (tables first, then data)

---

## Recommended Approach

**For your 52MB backup file:**

1. ✅ **Use Method 1** (Import Script) - Easiest and most reliable
   ```bash
   node server/scripts/import-backup-to-supabase.js
   ```

2. If that doesn't work, try **Method 2** (psql command line)

3. As last resort, use **Method 3** (split file) and import chunks

---

## After Import

1. ✅ Verify tables in Supabase Dashboard → Table Editor
2. ✅ Check row counts match
3. ✅ Test your application
4. ✅ Update environment variables

---

## Need Help?

- Check that your Supabase project is active (not paused)
- Verify DATABASE_URL is correct (direct connection, not pooler)
- Make sure you have enough database quota in your Supabase plan











