# Supabase Database Backup Guide

This guide explains multiple methods to backup your Supabase database.

## Quick Start

### Method 1: Using the Backup Script (Recommended)

Run the automated backup script:

```bash
node server/scripts/backup-database.js
```

This will:
- Try to use `pg_dump` (fastest, most complete)
- Fall back to SQL export if `pg_dump` is not available
- Save backup to `backups/supabase-backup-[timestamp].sql`

### Method 2: Using Supabase Dashboard

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Settings** → **Database**
4. Scroll to **Backups** section
5. Click **Download backup** or use **Point-in-time recovery** (if available on your plan)

### Method 3: Using pg_dump Command Line

If you have PostgreSQL tools installed:

```bash
# Windows (PowerShell)
$env:PGPASSWORD="your-database-password"
pg_dump "postgresql://postgres:password@db.xnuzdzjfqhbpcnsetjif.supabase.co:5432/postgres" --no-owner --no-acl -F p > backup.sql

# Or using connection string from .env
pg_dump $env:DATABASE_URL --no-owner --no-acl -F p > backup.sql
```

**Note:** You need to install PostgreSQL client tools:
- Download from: https://www.postgresql.org/download/windows/
- Or use: `choco install postgresql` (if you have Chocolatey)

### Method 4: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link your project
supabase link --project-ref xnuzdzjfqhbpcnsetjif

# Create backup
supabase db dump -f backup.sql
```

## Restoring a Backup

### Using psql

```bash
psql "your-connection-string" < backups/supabase-backup-[timestamp].sql
```

### Using Supabase Dashboard

1. Go to **SQL Editor** in Supabase Dashboard
2. Copy and paste the SQL from your backup file
3. Run the query

## Automated Backups

### Windows Task Scheduler

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger (e.g., daily at 2 AM)
4. Action: Start a program
5. Program: `node`
6. Arguments: `C:\capstone2\capstone2\server\scripts\backup-database.js`
7. Start in: `C:\capstone2\capstone2`

### Using a Batch File

Create `backup-database.bat`:

```batch
@echo off
cd /d C:\capstone2\capstone2
node server\scripts\backup-database.js
echo Backup completed at %date% %time%
pause
```

## Backup File Locations

Backups are saved to: `backups/supabase-backup-[timestamp].sql`

Example: `backups/supabase-backup-2024-01-15T10-30-00.sql`

## Important Notes

1. **Database Password**: Make sure your `DATABASE_URL` in `.env` is correct
2. **Large Databases**: For very large databases, pg_dump is recommended
3. **Storage**: Keep backups in a safe location (not just locally)
4. **Frequency**: Backup regularly (daily for production, weekly for development)
5. **Test Restores**: Periodically test that your backups can be restored

## Troubleshooting

### "pg_dump: command not found"
- Install PostgreSQL client tools (see Method 3 above)
- Or the script will automatically fall back to SQL export

### "Connection refused" or "Authentication failed"
- Check your `DATABASE_URL` in `.env` file
- Verify password is correct in Supabase Dashboard
- Make sure you're using the direct connection (port 5432), not connection pooling

### "SSL certificate" errors
- The script handles this automatically
- If issues persist, check your network/firewall settings

## Best Practices

1. **Automate**: Set up scheduled backups
2. **Store Offsite**: Don't keep backups only on your local machine
3. **Version Control**: Keep multiple backup versions (last 7 days, last 4 weeks, etc.)
4. **Encrypt**: Consider encrypting backup files if they contain sensitive data
5. **Test**: Regularly test restore procedures

## Your Current Setup

- **Supabase URL**: `https://xnuzdzjfqhbpcnsetjif.supabase.co`
- **Connection**: Using `DATABASE_URL` from `.env`
- **Backup Script**: `server/scripts/backup-database.js`



