# Fix Blank/White Page on Hostinger - Troubleshooting Guide

## 🚨 Problem: Website Shows White/Blank Page

Your React app should load but shows nothing. Let's fix it!

---

## 🔍 Step 1: Check Browser Console for Errors (Most Important!)

**This is the FIRST thing to check!**

1. **Open your website:** `https://yourdomain.com`
2. **Press `F12`** (or right-click → Inspect)
3. **Go to "Console" tab**
4. **Look for errors** (red text)

**Common errors and fixes:**

### Error: "Failed to load resource"
- **Cause:** Files not uploaded correctly
- **Fix:** Re-upload build folder contents

### Error: "CORS policy"
- **Cause:** Backend CORS not configured
- **Fix:** Update `FRONTEND_URL` in Render

### Error: "Cannot find module" or "Unexpected token"
- **Cause:** Build files corrupted or incomplete
- **Fix:** Rebuild and re-upload

### Error: "Network request failed" or "fetch failed"
- **Cause:** API URL wrong or backend not reachable
- **Fix:** Check `.env.production` and backend URL

### Error: "API URL" or "Cannot connect to API"
- **Cause:** Frontend trying to connect to wrong backend
- **Fix:** Create `.env.production` with correct API URL

---

## ✅ Quick Fixes (Try These First)

### Fix 1: Clear Browser Cache

**The problem might be cached files!**

1. **Hard Refresh:** Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. **Or clear cache:**
   - Press `Ctrl + Shift + Delete`
   - Clear "Cached images and files"
   - Refresh page

### Fix 2: Check File Structure in Hostinger

**Verify files are in the right place:**

1. **Log into hPanel** → **Files** → **File Manager**
2. **Navigate to `public_html/`**
3. **Verify structure:**
   ```
   public_html/
   ├── index.html          ← MUST be here (not in subfolder!)
   ├── static/
   │   ├── css/
   │   ├── js/
   │   └── media/
   └── .htaccess
   ```

**❌ WRONG:**
```
public_html/
└── build/                 ← Wrong! index.html is inside build/
    ├── index.html
    └── static/
```

**✅ CORRECT:**
```
public_html/
├── index.html            ← Directly here!
├── static/               ← Directly here!
└── .htaccess
```

**If wrong:**
- Delete everything in `public_html/`
- Upload build folder CONTENTS (not the build folder itself)
- Make sure `index.html` is directly in `public_html/`

---

### Fix 3: Check Browser Console

**Look for specific errors:**

1. **Open DevTools:** `F12`
2. **Console tab:** Look for red errors
3. **Network tab:** Check if files are loading (200 = OK, 404 = missing)

**What to look for:**
- ✅ `index.html` → Should load (200)
- ✅ `static/js/main.[hash].js` → Should load (200)
- ✅ `static/css/main.[hash].css` → Should load (200)
- ❌ Any 404 errors → Files missing!

---

### Fix 4: Create/Verify .htaccess File

**React Router needs this for routing to work:**

1. **In hPanel File Manager:**
   - Navigate to `public_html/`
   - Check if `.htaccess` exists
   - If not, create it!

2. **Create `.htaccess` file:**
   - Click **"New File"**
   - Name: `.htaccess` (with the dot!)
   - Paste this content:
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   ```
   - Save file

3. **Verify file exists:**
   - File should be named `.htaccess` (not `htaccess` or `.htaccess.txt`)
   - Should be in `public_html/` directory

---

### Fix 5: Check API URL Configuration

**If your app crashes trying to connect to backend:**

1. **Open browser console (F12)**
2. **Look for API URL logged:**
   ```
   🔗 API URL: ...
   ```
   - What does it say?
   - Should be: `https://yohanns-api.onrender.com`
   - If it's `http://localhost:4000` or wrong URL → Need to fix!

3. **Create `.env.production` file (if not exists):**
   - Location: `C:\capstone2\capstone2\.env.production`
   - Content:
     ```env
     REACT_APP_API_URL=https://yohanns-api.onrender.com
     ```
   - Replace with your actual Render backend URL

4. **Rebuild and re-upload:**
   ```powershell
   cd C:\capstone2\capstone2
   npm run build
   ```
   - Upload new `build/` contents to Hostinger
   - Replace old files

---

## 🔍 Detailed Troubleshooting

### Step 1: Check Browser Console (MUST DO!)

**This tells you exactly what's wrong:**

1. **Visit your site:** `https://yourdomain.com`
2. **Open DevTools:** Press `F12`
3. **Console tab:** Check for errors
4. **Network tab:** Check if files are loading

**Common console errors:**

#### Error: "Failed to load resource: 404"
- **Meaning:** Files not found on server
- **Fix:** Files not uploaded correctly, re-upload

#### Error: "Uncaught SyntaxError"
- **Meaning:** JavaScript file corrupted or incomplete
- **Fix:** Rebuild and re-upload

#### Error: "CORS policy blocked"
- **Meaning:** Backend CORS not allowing your domain
- **Fix:** Update `FRONTEND_URL` in Render environment variables

#### Error: "Cannot read property 'X' of undefined"
- **Meaning:** App crashed during initialization
- **Fix:** Check console for specific error, might be API connection issue

---

### Step 2: Verify File Upload

**Make sure all files uploaded correctly:**

1. **In hPanel File Manager:**
   - Go to `public_html/`
   - Check if these exist:
     - ✅ `index.html`
     - ✅ `static/` folder
     - ✅ `.htaccess` file

2. **Check file sizes:**
   - `index.html` should be small (few KB)
   - `static/js/main.[hash].js` should be larger (hundreds of KB)
   - `static/css/main.[hash].css` should exist

3. **Check file permissions:**
   - Files should be `644`
   - Folders should be `755`
   - Right-click → **"Change Permissions"** if needed

---

### Step 3: Test index.html Directly

**Verify the HTML file loads:**

1. **Visit:** `https://yourdomain.com/index.html`
2. **Should see:** Your React app (even if blank, HTML should load)
3. **If 404:** `index.html` not in `public_html/`
4. **If blank:** JavaScript not loading (check console)

---

### Step 4: Check Network Tab

**See what files are loading:**

1. **Open DevTools:** `F12`
2. **Network tab**
3. **Refresh page:** `F5`
4. **Look for:**
   - ✅ `index.html` → Status 200
   - ✅ `main.[hash].js` → Status 200
   - ✅ `main.[hash].css` → Status 200
   - ❌ Any 404 errors → Files missing!

**If files are 404:**
- Files not uploaded correctly
- Wrong file paths
- Need to re-upload

**If files are 200 but page blank:**
- JavaScript error (check Console)
- API connection issue
- App crashed during load

---

### Step 5: Test in Different Browser/Incognito

**Rule out cache issues:**

1. **Try incognito/private mode:**
   - `Ctrl + Shift + N` (Chrome)
   - Visit your site
   - If works in incognito → Cache issue!

2. **Try different browser:**
   - Chrome, Firefox, Edge
   - If works in other browser → Browser-specific issue

---

### Step 6: Check Backend Connection

**If app loads but shows blank (API issues):**

1. **Open browser console (F12)**
2. **Look for:**
   ```
   🔗 API URL: https://yohanns-api.onrender.com
   ```
   - Is the URL correct?
   - Is it trying to connect to localhost?

3. **Test backend directly:**
   - Visit: `https://yohanns-api.onrender.com/health`
   - Should return: `{"ok":true}`
   - If 404/error → Backend not deployed or wrong URL

4. **Check Network tab:**
   - Try to use your app (login, view products, etc.)
   - Look for API calls
   - Are they going to Render backend?
   - Or to wrong URL (localhost, Hostinger domain)?

---

## 🚀 Complete Fix Procedure

### If page is completely blank:

1. **Clear browser cache:** `Ctrl + Shift + R`

2. **Check file structure:**
   - `index.html` must be in `public_html/` (not in subfolder)
   - Re-upload if wrong

3. **Check browser console (F12):**
   - What errors do you see?
   - Share the error messages

4. **Verify .htaccess exists:**
   - Create if missing
   - Verify content is correct

5. **Check API URL:**
   - Create `.env.production` with correct backend URL
   - Rebuild and re-upload

6. **Test backend:**
   - Visit Render backend URL
   - Should return data

---

## 📝 Step-by-Step Re-Upload (If Needed)

**If files are corrupted or incomplete:**

1. **Delete old files from Hostinger:**
   - hPanel → File Manager → `public_html/`
   - Delete all files

2. **Rebuild locally:**
   ```powershell
   cd C:\capstone2\capstone2
   npm run build
   ```

3. **Verify build folder:**
   - Check `build/` folder exists
   - Should contain: `index.html`, `static/` folder

4. **Upload to Hostinger:**
   - Upload ALL contents of `build/` folder
   - To `public_html/` directory
   - Make sure `index.html` is directly in `public_html/`

5. **Create .htaccess:**
   - Create `.htaccess` file in `public_html/`
   - With React Router configuration

6. **Clear cache and test:**
   - Hard refresh: `Ctrl + Shift + R`
   - Check browser console for errors

---

## 🎯 Most Common Causes & Fixes

| Problem | Symptom | Fix |
|---------|---------|-----|
| **Files in wrong location** | Blank page | Move `index.html` to `public_html/` directly |
| **JavaScript error** | Console shows error | Check console, fix error, rebuild |
| **API URL wrong** | App loads but blank | Create `.env.production`, rebuild |
| **CORS error** | Console shows CORS | Update `FRONTEND_URL` in Render |
| **Cache issue** | Old files loading | Hard refresh or clear cache |
| **Missing .htaccess** | 404 on refresh | Create `.htaccess` file |
| **Backend down** | API calls fail | Check Render backend status |

---

## ✅ Quick Diagnostic Checklist

**Answer these to identify the problem:**

- [ ] What do you see in browser console? (F12 → Console)
- [ ] Are files loading? (F12 → Network tab)
- [ ] Is `index.html` in `public_html/` (not in subfolder)?
- [ ] Does `.htaccess` file exist?
- [ ] What's the API URL logged in console?
- [ ] Is backend accessible? (`https://yohanns-api.onrender.com/health`)
- [ ] Did you try hard refresh? (`Ctrl + Shift + R`)

---

## 🔧 Quick Fixes Summary

**Most likely fixes (in order):**

1. **Hard refresh:** `Ctrl + Shift + R` (might be cache)
2. **Check console:** `F12` → Look for errors
3. **Verify file structure:** `index.html` must be in `public_html/`
4. **Check .htaccess:** Create if missing
5. **Verify API URL:** Create `.env.production`, rebuild
6. **Re-upload files:** Delete old, rebuild, upload new

---

## 🆘 Still Not Working?

**Share these details:**

1. **Browser console errors** (F12 → Console tab)
2. **Network tab status** (which files are loading/failing)
3. **File structure in Hostinger** (screenshot of `public_html/`)
4. **API URL logged** (what does console show for API URL?)

**With this info, I can help you fix it specifically!**

---

**Most common fix:** Check browser console first - it tells you exactly what's wrong! 🔍











