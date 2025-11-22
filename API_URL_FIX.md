# Fix API URL - Frontend Calling Wrong Domain

## 🚨 Problem

Your frontend is trying to call the API on your Hostinger domain (`yohhanssportswear.com`) instead of your Render backend (`yohanns-api.onrender.com`).

**Error:**
```
🔐 Verifying reCAPTCHA at: https://yohhanssportswear.com/api/auth/verify-recaptcha
Error: Unexpected token '<', "<!doctype "... is not valid JSON
```

**What's happening:**
- Frontend is using: `https://yohhanssportswear.com/api/...` ❌ (Wrong!)
- Backend is at: `https://yohanns-api.onrender.com/api/...` ✅ (Correct!)
- Hostinger doesn't have your API → Returns HTML 404 page → Error!

---

## ✅ Solution: Set REACT_APP_API_URL

**The frontend needs to know where your Render backend is!**

### Step 1: Create `.env.production` File

**Create this file in your project root:**

**Location:** `C:\capstone2\capstone2\.env.production` (NOT in `server/` folder!)

**Content:**
```env
REACT_APP_API_URL=https://yohanns-api.onrender.com
```

**Replace `yohanns-api.onrender.com` with your actual Render backend URL!**

### Step 2: Rebuild Your React App

```powershell
cd C:\capstone2\capstone2
npm run build
```

**This bakes the API URL into your React build!**

### Step 3: Upload New Build to Hostinger

1. **Delete old files from Hostinger `public_html/`**
2. **Upload new `build/` contents to Hostinger**
3. **Clear browser cache:** `Ctrl + Shift + R`
4. **Test again** - API calls should now go to Render! ✅

---

## 📊 What's Happening Now vs. After Fix

### Current (Wrong):

**Your code in `src/config/api.js`:**
```javascript
// Without REACT_APP_API_URL set:
if (process.env.REACT_APP_API_URL) {
  return process.env.REACT_APP_API_URL;  // Not set ❌
}
// Falls back to:
return origin;  // Returns Hostinger domain ❌
```

**Result:**
- Frontend calls: `https://yohhanssportswear.com/api/...` ❌
- Hostinger returns: HTML 404 page
- Error: "Unexpected token '<'" (trying to parse HTML as JSON)

---

### After Fix (Correct):

**With `.env.production` set:**
```env
REACT_APP_API_URL=https://yohanns-api.onrender.com
```

**Your code:**
```javascript
if (process.env.REACT_APP_API_URL) {
  return process.env.REACT_APP_API_URL;  // ✅ Set to Render URL!
}
```

**Result:**
- Frontend calls: `https://yohanns-api.onrender.com/api/...` ✅
- Render backend returns: JSON response
- Everything works! ✅

---

## 🔍 Why This Happens

**Looking at your `src/config/api.js`:**

```javascript
const getApiUrl = () => {
  // If REACT_APP_API_URL is explicitly set, use it (highest priority)
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;  // ✅ This should be used!
  }
  
  // Falls back to checking window.location
  if (hostname === 'localhost') {
    return 'http://localhost:4000';
  }
  
  // For production, uses same origin (WRONG for your setup!)
  return origin;  // ❌ This is what's happening now!
}
```

**Without `REACT_APP_API_URL` set:**
- Code falls back to using `window.location.origin` (Hostinger domain)
- Frontend tries to call API on Hostinger → 404 error

**With `REACT_APP_API_URL` set:**
- Code uses the Render backend URL
- Frontend calls Render backend → Works! ✅

---

## ✅ Complete Fix Steps

### 1. Create `.env.production` File

**File location:** `C:\capstone2\capstone2\.env.production` (project root, NOT in `server/`)

**File content:**
```env
REACT_APP_API_URL=https://yohanns-api.onrender.com
```

**Important:**
- Replace `yohanns-api.onrender.com` with your actual Render backend URL
- Must have `REACT_APP_` prefix (React requirement)
- Must be in project root (not in `server/` folder)

### 2. Verify Your Render Backend URL

**Check your Render Dashboard:**
- Visit [dashboard.render.com](https://dashboard.render.com)
- Find your web service (backend)
- Copy the URL (should be like `https://yohanns-api.onrender.com`)
- Use this exact URL in `.env.production`

### 3. Rebuild Your App

```powershell
cd C:\capstone2\capstone2
npm run build
```

**Wait for build to complete!**

### 4. Upload New Build to Hostinger

1. **Log into hPanel** → **Files** → **File Manager**
2. **Navigate to `public_html/`**
3. **Delete old files** (select all → delete)
4. **Upload new build contents:**
   - Upload ALL files from `C:\capstone2\capstone2\build\`
   - Upload to `public_html/` directory
   - Make sure `index.html` is directly in `public_html/`

5. **Verify `.htaccess` exists:**
   - Should still be in `public_html/`
   - If missing, recreate it

### 5. Clear Cache and Test

1. **Hard refresh:** `Ctrl + Shift + R`
2. **Or clear cache:** `Ctrl + Shift + Delete` → Clear cached files
3. **Visit:** `https://yohhanssportswear.com`
4. **Open browser console:** `F12`
5. **Try login:**
   - Click "Sign In"
   - Check console - should see:
     ```
     🔐 Verifying reCAPTCHA at: https://yohanns-api.onrender.com/api/auth/verify-recaptcha
     ```
   - ✅ Should work now!

---

## 🧪 How to Verify It's Fixed

### Before Fix:
```
Console shows:
🔐 Verifying reCAPTCHA at: https://yohhanssportswear.com/api/auth/verify-recaptcha
Error: Unexpected token '<', "<!doctype "... is not valid JSON
```

### After Fix:
```
Console shows:
🔗 API URL: https://yohanns-api.onrender.com
🔐 Verifying reCAPTCHA at: https://yohanns-api.onrender.com/api/auth/verify-recaptcha
✅ Should work without errors!
```

---

## 📝 Checklist

**To fix the API URL issue:**

- [ ] Create `.env.production` file in project root
- [ ] Add: `REACT_APP_API_URL=https://yohanns-api.onrender.com`
- [ ] Verify Render backend URL is correct
- [ ] Rebuild: `npm run build`
- [ ] Delete old files from Hostinger
- [ ] Upload new `build/` contents to Hostinger
- [ ] Clear browser cache: `Ctrl + Shift + R`
- [ ] Test login - should work! ✅

---

## 🐛 Troubleshooting

### Still Getting Same Error?

**Check these:**

1. **Did you rebuild?**
   - Make sure you ran `npm run build` after creating `.env.production`
   - The build process reads `.env.production` and bakes the values into the code

2. **Is `.env.production` in the right location?**
   - Should be: `C:\capstone2\capstone2\.env.production`
   - NOT: `C:\capstone2\capstone2\server\.env.production`

3. **Is the Render URL correct?**
   - Check Render Dashboard for your exact backend URL
   - Should be: `https://[your-service-name].onrender.com`
   - Include `https://` in the URL

4. **Did you upload new build?**
   - Delete old files from Hostinger first
   - Upload new `build/` contents
   - Clear browser cache

5. **Check browser console:**
   - After fix, should see: `🔗 API URL: https://yohanns-api.onrender.com`
   - NOT: `🔗 API URL: https://yohhanssportswear.com`

---

## 💡 Why This is Important

**Your setup:**
- Frontend: Hostinger (`yohhanssportswear.com`)
- Backend: Render (`yohanns-api.onrender.com`)

**They're on different domains!**

**Without `.env.production`:**
- React doesn't know where backend is
- Falls back to using Hostinger domain
- Tries to call API on Hostinger → 404 error ❌

**With `.env.production`:**
- React knows backend is on Render
- Calls API on Render → Works! ✅

---

## 🎯 Quick Summary

**The Problem:**
- Frontend calling: `https://yohhanssportswear.com/api/...` ❌
- Should call: `https://yohanns-api.onrender.com/api/...` ✅

**The Fix:**
1. Create `.env.production` with `REACT_APP_API_URL=https://yohanns-api.onrender.com`
2. Rebuild: `npm run build`
3. Upload new build to Hostinger
4. Clear cache and test

**After fix:**
- API calls will go to Render backend ✅
- reCAPTCHA verification will work ✅
- Everything should work! ✅

---

**Create `.env.production` now and rebuild - this will fix the API URL issue!** 🚀











