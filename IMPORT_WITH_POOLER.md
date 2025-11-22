# Import Backup Using Connection Pooler (IPv4 Compatible)

If direct connection doesn't support IPv4, use the connection pooler instead.

## 🚀 Quick Start

### Option 1: Use Pooler-Specific Import Script

```bash
node server/scripts/import-backup-pooler.js
```

This script is specifically designed for connection pooler and handles IPv4 connections.

### Option 2: Use Regular Script with Pooler URL

```bash
node server/scripts/import-backup-to-supabase.js
```

When prompted, enter the **Connection Pooling** URL instead of the direct URI.

---

## 📝 How to Get Connection Pooler URL

1. Go to Supabase Dashboard → Your Project
2. Click **Settings** → **Database**
3. Scroll to **"Connection string"** section
4. Click **"Connection Pooling"** tab (NOT "URI")
5. Copy the connection string
6. It should look like:
   ```
   postgresql://postgres.xnuzdzjfqhbpcnsetjif:[YOUR-PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
   ```
7. Replace `[YOUR-PASSWORD]` with your actual database password

**Key differences:**
- Pooler URL: `pooler.supabase.com` or `aws-*.pooler.supabase.com`
- Direct URL: `db.*.supabase.co`

---

## ⚠️ Important Notes

### Connection Pooler Limitations

- **Slower** than direct connection (but works with IPv4)
- **Transaction mode** is used by default
- **Smaller batch sizes** needed for large imports
- **May take longer** (10-20 minutes for 50MB files)

### Direct Connection Advantages

- **Faster** imports
- **Better for large files**
- **But doesn't support IPv4** in some regions

---

## 🔄 Which One to Use?

| Scenario | Use |
|----------|-----|
| IPv4 network / Direct connection fails | **Connection Pooler** |
| IPv6 available / Direct connection works | **Direct Connection (URI)** |
| Large file (>100MB) | **Direct Connection** (if available) |
| Small file (<10MB) | Either works fine |

---

## 📋 Step-by-Step: Using Pooler

1. **Get pooler connection string:**
   - Supabase Dashboard → Settings → Database
   - Connection string → **Connection Pooling** tab
   - Copy the connection string

2. **Run the pooler import script:**
   ```bash
   node server/scripts/import-backup-pooler.js
   ```

3. **Select backup file** (usually the largest one)

4. **Enter pooler DATABASE_URL** when prompted

5. **Wait for import** (10-20 minutes for 50MB)

---

## 🐛 Troubleshooting

### "Connection timeout"
- Pooler imports take longer, be patient
- The script shows progress every 200 statements

### "Too many errors"
- Some errors are expected (e.g., "already exists")
- If you see many real errors, check your connection string

### "Still getting ENOTFOUND"
- Make sure you're using the **pooler** URL (not direct)
- Check that project is active (not paused)
- Verify the connection string format

---

## ✅ After Import

1. Verify tables in Supabase Dashboard
2. Check row counts match
3. Test your application
4. Update environment variables

---

## 💡 Alternative: Manual Import via Supabase Dashboard

If both methods fail, you can:

1. **Split the backup file** into smaller chunks
2. **Import each chunk** via SQL Editor
3. Or use **Supabase CLI** if available

---

## 🎯 Recommended Approach

For your situation (IPv4 network):

1. ✅ Use **Connection Pooler** import script
2. ✅ Get pooler URL from Supabase Dashboard
3. ✅ Run: `node server/scripts/import-backup-pooler.js`
4. ✅ Wait patiently (it takes longer but works!)

The pooler script is optimized for IPv4 connections and handles large files in smaller, manageable batches.











