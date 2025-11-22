# Verify Database Password for Connection Pooler

## Error: Password Authentication Failed

If you're getting "password authentication failed", the password in your connection string is incorrect.

## ✅ Step-by-Step: Get Correct Password

### Step 1: Go to Supabase Dashboard

1. Visit [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `kjqcswjljgavigyfzauj`

### Step 2: Get Database Password

1. Click **Settings** (⚙️) → **Database**
2. Scroll to **"Database password"** section
3. You'll see one of these:
   - **Password shown**: Copy it
   - **"Reset database password"** button: Click it to set a new password
   - **Password hidden**: Click "Show" or "Reset"

### Step 3: Get Connection Pooler String

1. Still in Settings → Database
2. Scroll to **"Connection string"** section
3. Click **"Connection Pooling"** tab
4. Copy the connection string
5. It will look like:
   ```
   postgresql://postgres.kjqcswjljgavigyfzauj:[YOUR-PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
   ```

### Step 4: Replace Password

- If it shows `[YOUR-PASSWORD]`, replace it with the password from Step 2
- If it shows the actual password, use that

### Step 5: Test Connection

Test if the connection string works:

```powershell
# Replace with your actual connection string
node -e "const {Pool}=require('pg');const p=new Pool({connectionString:'postgresql://postgres.kjqcswjljgavigyfzauj:YOUR_PASSWORD@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres',ssl:{rejectUnauthorized:false}});p.query('SELECT 1').then(()=>console.log('✅ Connected! Password is correct!')).catch(e=>console.error('❌ Failed:',e.message));"
```

If it says "✅ Connected!", your password is correct!

## 🔑 Common Issues

### Issue 1: Using Wrong Password Type

**❌ Wrong:** Using API keys (SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
**✅ Correct:** Using database password (from Settings → Database → Database password)

### Issue 2: Password Has Special Characters

If your password has special characters like `@`, `#`, `%`, etc., they need to be URL-encoded in the connection string:

- `@` becomes `%40`
- `#` becomes `%23`
- `%` becomes `%25`
- etc.

**Example:**
- Password: `My@Pass#123`
- In connection string: `My%40Pass%23123`

### Issue 3: Password Was Reset

If you reset the password, you **must** use the new password. Old passwords won't work.

### Issue 4: Copy-Paste Issues

- Make sure you copied the entire password (no spaces before/after)
- Check for hidden characters
- Try typing the password manually if copy-paste doesn't work

## 🧪 Quick Test

1. **Get password from Supabase Dashboard**
2. **Get pooler connection string from Supabase Dashboard**
3. **Replace `[YOUR-PASSWORD]` with actual password**
4. **Test with the command above**
5. **If test passes, use that connection string in the import script**

## 📋 Your Current Connection String

Based on your input:
```
postgresql://postgres.kjqcswjljgavigyfzauj:Mjpogi012404@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
```

**Check:**
- ✅ Username format: `postgres.kjqcswjljgavigyfzauj` (correct!)
- ✅ Host: `pooler.supabase.com` (correct!)
- ❓ Password: `Mjpogi012404` (verify this is correct in Supabase Dashboard)

## 🎯 Next Steps

1. Go to Supabase Dashboard → Settings → Database
2. Check/Reset database password
3. Get fresh connection string from Connection Pooling tab
4. Replace password in connection string
5. Test connection (command above)
6. Run import script again with verified connection string

---

## 💡 Pro Tip

If you keep having password issues:

1. **Reset the database password** in Supabase Dashboard
2. **Copy the new password immediately**
3. **Get the connection string** from Connection Pooling tab
4. **Replace `[YOUR-PASSWORD]` with the new password**
5. **Use that connection string** in the import script

This ensures you're using the most current password!











