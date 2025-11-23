# Database Pooler Recommendation: Session Pooler

## ✅ Recommendation: **Session Pooler** (Port 5432)

For your application, **Session Pooler is the better choice**.

---

## 🔍 Why Session Pooler?

### Your Current Setup:
- ✅ Traditional Node.js server (Railway/Render/VPS)
- ✅ Persistent connections with keep-alive (25s intervals)
- ✅ Connection pooling with `pg.Pool` (max 3-5 connections)
- ✅ Complex analytics queries
- ✅ Long-running server process

### Session Pooler Benefits for You:

1. **Prepared Statements Support**
   - `pg` library automatically uses prepared statements
   - Session pooler caches prepared statements per connection
   - Better performance for repeated queries

2. **Connection Reuse**
   - Your keep-alive mechanism works better with session pooling
   - Connections are reused across multiple queries
   - Lower connection overhead

3. **Complex Queries**
   - Your analytics queries benefit from session state
   - Better for multi-step operations
   - Supports temporary tables if needed

4. **Traditional Server Pattern**
   - You're not using serverless functions
   - Connections are long-lived
   - Session pooler is designed for this pattern

---

## 📝 How to Configure Session Pooler

### Step 1: Get Session Pooler Connection String

1. Go to **Supabase Dashboard** → Your Project
2. Click **Settings** → **Database**
3. Scroll to **"Connection string"** section
4. Click **"Connection Pooling"** tab
5. Select **"Session"** mode (NOT Transaction)
6. Copy the connection string

**Format:**
```
postgresql://postgres.PROJECT_ID:YOUR_PASSWORD@aws-*.pooler.supabase.com:5432/postgres?pgbouncer=true
```

**Key Points:**
- Port: **5432** (Session mode)
- Username: `postgres.PROJECT_ID` (with dot!)
- Host: `pooler.supabase.com` or `aws-*.pooler.supabase.com`
- Add `?pgbouncer=true` parameter

---

## ⚙️ Update Your Configuration

### Update `server/.env`:

```env
# Session Pooler (Recommended)
DATABASE_URL=postgresql://postgres.YOUR_PROJECT_ID:YOUR_PASSWORD@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?pgbouncer=true
```

### Your Code Already Supports It!

Your `server/lib/sqlClient.js` already detects pooler:
```javascript
const isPooler = connectionString.includes('pooler.supabase.com');
// Automatically sets max: 3 for pooler (vs 5 for direct)
```

---

## 🔄 Transaction Pooler vs Session Pooler

| Feature | Session Pooler | Transaction Pooler |
|---------|---------------|-------------------|
| **Port** | 5432 | 6543 |
| **Connection Reuse** | ✅ Yes (within session) | ✅ Yes (within transaction) |
| **Prepared Statements** | ✅ Supported | ❌ Not supported |
| **Temporary Tables** | ✅ Supported | ❌ Not supported |
| **Session Variables** | ✅ Supported | ❌ Not supported |
| **Best For** | Traditional servers | Serverless functions |
| **Your Use Case** | ✅ **Perfect fit** | ❌ Not ideal |

---

## 🚀 Quick Migration Steps

1. **Get Session Pooler URL:**
   - Supabase Dashboard → Settings → Database
   - Connection Pooling → **Session** mode
   - Copy connection string

2. **Update `.env`:**
   ```env
   DATABASE_URL=postgresql://postgres.PROJECT_ID:PASSWORD@pooler.supabase.com:5432/postgres?pgbouncer=true
   ```

3. **Restart Server:**
   ```bash
   npm run server
   ```

4. **Verify:**
   - Check logs for "✅ Database pool connected successfully"
   - Your existing code will automatically use pooler settings

---

## ⚠️ Important Notes

### Session Pooler Limitations:
- **Max connections per pool:** Lower than direct connection
- **Connection timeout:** 30-60 seconds idle timeout
- **Your keep-alive:** Already handles this! (25s intervals)

### Your Code Already Handles:
- ✅ Pool termination detection
- ✅ Automatic pool recreation
- ✅ Keep-alive pings
- ✅ Retry logic
- ✅ Lower max connections for pooler (3 vs 5)

---

## 📊 Performance Comparison

### Session Pooler (Your Choice):
- ✅ Better for your use case
- ✅ Prepared statement caching
- ✅ Connection reuse
- ✅ Lower latency for repeated queries

### Transaction Pooler:
- ❌ No prepared statements
- ❌ Better only for serverless
- ❌ Not suitable for your setup

---

## ✅ Summary

**Use Session Pooler** because:
1. You have a traditional server (not serverless)
2. You maintain persistent connections
3. You use `pg.Pool` with keep-alive
4. You have complex analytics queries
5. Your code already supports it!

**Connection String Format:**
```
postgresql://postgres.PROJECT_ID:PASSWORD@pooler.supabase.com:5432/postgres?pgbouncer=true
```

**Port:** 5432 (Session mode)



