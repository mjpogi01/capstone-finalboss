# Diagnosing 500 Internal Server Error

## Main Causes of 500 Errors

Based on your error logs, here are the most likely causes:

### 1. **Server Not Running** ⚠️ MOST COMMON
The backend server at `http://localhost:4000` might not be running.

**Check:**
```bash
# In the server directory
cd server
npm start
# or
node index.js
```

**Solution:** Start the server before accessing the frontend.

---

### 2. **Missing Database Tables**
The queries might be failing because required tables don't exist.

**Check if tables exist:**
- `products` table
- `branches` table  
- `order_reviews` table (for review stats calculation)

**Solution:** Run database migrations or create missing tables.

---

### 3. **Supabase Query Limits**
If you have many products, the `calculateProductReviewStats` function might be hitting query limits or timing out.

**Symptoms:**
- Works with few products
- Fails with many products
- Timeout errors in server logs

**Solution:** Add pagination or optimize the query.

---

### 4. **Server Crash on Startup**
The server might be crashing when loading the routes.

**Check server logs:**
```bash
# Look for errors when starting the server
cd server
node index.js
```

**Common causes:**
- Syntax errors in route files
- Missing dependencies
- Environment variable issues (but we verified these are OK)

---

## Quick Diagnostic Steps

### Step 1: Verify Server is Running
```bash
# Test if server responds
curl http://localhost:4000/api/products/test
# Should return: {"message":"Backend is working!","timestamp":"..."}
```

### Step 2: Check Server Logs
When you make a request, check the terminal where the server is running for error messages.

### Step 3: Test Direct Database Access
```bash
cd server
node check-env.js
# This will test Supabase connection
```

### Step 4: Test Individual Endpoints
```bash
# Test products endpoint
curl http://localhost:4000/api/products

# Test branches endpoint  
curl http://localhost:4000/api/branches
```

---

## Most Likely Solution

Based on the error pattern, **the server is probably not running**.

### To Fix:

1. **Open a new terminal**
2. **Navigate to server directory:**
   ```bash
   cd server
   ```
3. **Start the server:**
   ```bash
   npm start
   # or
   node index.js
   ```
4. **Keep this terminal open** - the server needs to keep running
5. **In another terminal, start the frontend:**
   ```bash
   npm start
   ```

---

## If Server is Running But Still Getting 500 Errors

### Check Server Console Output
Look for specific error messages like:
- `Supabase error: ...`
- `Error fetching products: ...`
- `Error calculating product review stats: ...`

### Common Issues:

1. **Missing `order_reviews` table:**
   - The `calculateProductReviewStats` function queries this table
   - If it doesn't exist, the query will fail
   - **Solution:** Create the table or make the query optional

2. **Large dataset causing timeout:**
   - If you have thousands of products, the review stats calculation might timeout
   - **Solution:** Add error handling or optimize the query

3. **Database connection issues:**
   - Network problems connecting to Supabase
   - **Solution:** Check internet connection and Supabase status

---

## Quick Fix: Make Review Stats Optional

If the issue is with `calculateProductReviewStats`, you can temporarily make it fail gracefully:

The function already has try-catch, but you can add a timeout or make it optional:

```javascript
// In server/routes/products.js, line 247
const reviewStats = await Promise.race([
  calculateProductReviewStats(productIds),
  new Promise((resolve) => setTimeout(() => resolve(new Map()), 5000)) // 5 second timeout
]);
```

---

## Next Steps

1. ✅ **Check if server is running** - Most common issue
2. ✅ **Check server console for specific errors**
3. ✅ **Verify database tables exist**
4. ✅ **Test with fewer products** (if applicable)

If the server is running and you're still getting errors, **share the server console output** - that will show the exact error message.


