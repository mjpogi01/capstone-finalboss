# Deploy Frontend (React Build) to Hostinger

## ✅ Overview

Hostinger Cloud hosting supports **static files only**, so you need to:
1. **Build your React app locally** (creates `build/` folder)
2. **Upload `build/` contents to Hostinger** `public_html/` directory

---

## 🚀 Step-by-Step Guide

### Step 1: Update API URL for Production

Before building, make sure your frontend knows where your Render backend is.

**Option A: Create `.env.production` file** (Recommended)

Create a file `.env.production` in your project root (`C:\capstone2\capstone2\.env.production`):

```env
REACT_APP_API_URL=https://yohanns-api.onrender.com
```

Replace `yohanns-api.onrender.com` with your actual Render backend URL!

**Option B: Check if API URL is configured**

Check your frontend code (usually in `src/index.js` or `src/config/api.js`) to see how it gets the API URL. Make sure it will use the production URL.

**Common patterns:**
```javascript
// In src/index.js or similar
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

// Or check your axios/fetch configuration
```

---

### Step 2: Build React App Locally

**On your local machine:**

```powershell
# Navigate to project directory
cd C:\capstone2\capstone2

# Install dependencies (if not already done)
npm install

# Build the React app
npm run build
```

**This creates a `build/` folder with production-ready files.**

**What happens:**
- React compiles your code
- Optimizes and minifies files
- Creates static HTML, CSS, and JS files
- Outputs everything to `build/` folder

**Time:** 1-3 minutes depending on your app size

**You should see:**
```
Compiled successfully!

File sizes after gzip:
...
```

---

### Step 3: Check Build Folder

**After build completes:**

1. Navigate to: `C:\capstone2\capstone2\build\`
2. You should see files like:
   ```
   build/
   ├── index.html
   ├── static/
   │   ├── css/
   │   ├── js/
   │   └── media/
   └── ...
   ```

**Important files:**
- `index.html` - Main HTML file
- `static/css/*.css` - Compiled CSS files
- `static/js/*.js` - Compiled JavaScript files
- `static/media/*` - Images and other media files

---

### Step 4: Connect to Hostinger

**You have 3 options:**

#### Option A: File Manager (Easiest - No FTP needed)

1. **Log into hPanel:**
   - Go to [hpanel.hostinger.com](https://hpanel.hostinger.com)
   - Login with your credentials

2. **Open File Manager:**
   - Click **"Files"** in the sidebar
   - Click **"File Manager"**
   - Navigate to `public_html/` (this is your website root)

3. **Delete old files (IMPORTANT):**
   - Select **ALL files and folders** in `public_html/`
   - Click **"Delete"** button or right-click → **"Delete"**
   - **Confirm deletion** when prompted
   - ⚠️ **This clears the old failed deployment files**
   - ✅ **You should see an empty or minimal `public_html/` folder**

4. **Upload build folder contents (IMPORTANT):**
   - Click **"Upload"** button
   - Navigate to your local `build/` folder
   - **⚠️ IMPORTANT: Select ALL files and folders INSIDE `build/` folder**
   - ✅ Select: `index.html`, `static/` folder, and any other files/folders
   - ❌ DO NOT select the `build/` folder itself
   - Click **"Open"** or **"Upload"**
   - Wait for upload to complete

**Why?**
- Your `index.html` must be directly in `public_html/` (web root)
- NOT in `public_html/build/` (that won't work!)
- Uploading contents puts files in the correct location

---

#### Option B: FTP Client (FileZilla, WinSCP, etc.)

1. **Get FTP credentials from Hostinger:**
   - Go to hPanel → **"Files"** → **"FTP Accounts"**
   - Note your FTP host, username, and password

2. **Connect via FTP:**
   - **Host:** Your FTP host (e.g., `ftp.yourdomain.com`)
   - **Username:** Your FTP username
   - **Password:** Your FTP password
   - **Port:** `21` (or `22` for SFTP)

3. **Upload files:**
   - Navigate to `public_html/` on the server
   - Navigate to your local `build/` folder
   - **⚠️ IMPORTANT: Select ALL files and folders INSIDE `build/`**
   - ✅ Select: `index.html`, `static/` folder, and any other files
   - ❌ DO NOT drag the `build/` folder itself
   - Drag and drop selected files to `public_html/`

---

#### Option C: SSH/SCP (If you have SSH access)

```powershell
# Upload entire build folder
scp -r "C:\capstone2\capstone2\build\*" u302669616@my-kul-web2088.main-hosting.eu:/home/u302669616/domains/yourdomain.com/public_html/

# Or upload individual files
scp -r "C:\capstone2\capstone2\build"/* u302669616@my-kul-web2088.main-hosting.eu:/path/to/public_html/
```

---

### Step 5: Create .htaccess for React Router

**Important:** React Router needs special configuration to handle routes properly.

**In hPanel File Manager:**

1. Navigate to `public_html/`
2. Click **"New File"**
3. Name it: `.htaccess` (note the dot at the start!)
4. Open the file and paste this **EXACTLY as shown** (including line breaks):

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

5. **Save** the file

**Important Notes:**
- ✅ Paste it **exactly as is** (including all line breaks and spacing)
- ✅ Keep the exact formatting (indentation, line breaks)
- ✅ The file name MUST be `.htaccess` (with the dot at the start)
- ✅ This is Apache configuration code - paste it as-is, don't modify it

**What this does:**
- Redirects all requests to `index.html`
- Allows React Router to handle routing
- Prevents 404 errors when refreshing pages

**Alternative: Upload .htaccess file locally**

Create `.htaccess` file in your local `build/` folder with the same content, then upload it along with other files.

---

### Step 6: Verify File Structure

**Your `public_html/` should look like:**

```
public_html/
├── index.html
├── .htaccess
├── static/
│   ├── css/
│   │   └── main.[hash].css
│   ├── js/
│   │   └── main.[hash].js
│   └── media/
│       └── [images and other files]
└── [other files from build folder]
```

**Important:**
- ✅ `index.html` is in `public_html/` (not in a subfolder)
- ✅ `static/` folder is in `public_html/` (not in a subfolder)
- ✅ `.htaccess` file is in `public_html/`

---

### Step 7: Set File Permissions (If needed)

**In File Manager:**

1. Select all files and folders
2. Right-click → **"Change Permissions"**
3. Set permissions:
   - **Files:** `644`
   - **Folders:** `755`
4. Click **"Change"**

**Or via SSH:**
```bash
cd /home/u302669616/domains/yourdomain.com/public_html
chmod 644 * -R
find . -type d -exec chmod 755 {} \;
find . -type f -exec chmod 644 {} \;
```

---

### Step 8: Test Your Deployment

1. **Visit your website:**
   - Go to `https://yourdomain.com`
   - Your React app should load!

2. **Check browser console:**
   - Press `F12` to open DevTools
   - Go to **"Console"** tab
   - Check for errors
   - Look for API calls - they should go to your Render backend

3. **Test API connection:**
   - Open **"Network"** tab in DevTools
   - Perform an action that makes an API call (login, load products, etc.)
   - Check if API calls go to: `https://yohanns-api.onrender.com/api/...`

4. **Test React Router:**
   - Navigate to different pages
   - Refresh the page - should still work (not 404)
   - Direct URL access should work

---

## 🔄 Updating Your Frontend

**When you make changes to your React app:**

1. **Make changes locally**
2. **Rebuild:**
   ```powershell
   npm run build
   ```

3. **Upload new `build/` contents to Hostinger:**
   - Option A: File Manager - Upload new files (overwrite old ones)
   - Option B: FTP - Upload new files
   - Option C: SSH - Upload via SCP

4. **Clear browser cache:**
   - Users may need to hard refresh (`Ctrl + F5`)
   - Or clear browser cache

---

## 🐛 Troubleshooting

### ❌ Website shows blank page

**Check:**
- `index.html` is in `public_html/` (not in a subfolder)
- Browser console for errors (F12)
- File permissions (should be 644 for files, 755 for folders)

**Fix:**
- Verify file structure
- Check browser console for specific errors
- Make sure all files uploaded correctly

---

### ❌ API calls failing (CORS errors)

**Check:**
- `REACT_APP_API_URL` is set correctly in `.env.production`
- Frontend is calling the correct Render backend URL
- Backend CORS allows your Hostinger domain

**Fix:**
- Rebuild with correct `REACT_APP_API_URL`
- Check Render backend CORS configuration
- Verify `FRONTEND_URL` and `CLIENT_URL` in Render env vars

---

### ❌ 404 errors when refreshing pages

**Check:**
- `.htaccess` file exists in `public_html/`
- `.htaccess` content is correct
- `mod_rewrite` is enabled on Apache

**Fix:**
- Create/update `.htaccess` file
- Contact Hostinger support to enable `mod_rewrite`
- Or request them to enable it via hPanel

---

### ❌ Images or assets not loading

**Check:**
- Files are in `static/media/` folder
- File paths are correct
- File permissions are correct

**Fix:**
- Verify all files uploaded
- Check file paths in browser console
- Update file permissions if needed

---

### ❌ Build fails

**Check:**
- All dependencies installed (`npm install`)
- No errors in console
- Check `package.json` for issues

**Fix:**
- Run `npm install` again
- Check for missing dependencies
- Review build errors in console

---

## 📝 Complete Deployment Checklist

### Pre-Build
- [ ] `.env.production` created with `REACT_APP_API_URL`
- [ ] Dependencies installed (`npm install`)
- [ ] Code is ready for production

### Build
- [ ] `npm run build` completed successfully
- [ ] `build/` folder exists with files
- [ ] No build errors

### Deployment
- [ ] Connected to Hostinger (File Manager, FTP, or SSH)
- [ ] `public_html/` directory accessed
- [ ] Old files deleted (if any)
- [ ] All `build/` contents uploaded to `public_html/`
- [ ] `.htaccess` file created in `public_html/`

### Post-Deployment
- [ ] Website loads at `https://yourdomain.com`
- [ ] No errors in browser console
- [ ] API calls working (Network tab)
- [ ] React Router working (can refresh pages)
- [ ] Images/assets loading correctly

---

## 🎯 Quick Summary

1. **Build locally:** `npm run build`
2. **Upload `build/` contents** to Hostinger `public_html/`
3. **Create `.htaccess`** file for React Router
4. **Test website** - should work! ✅

**Time:** 10-15 minutes  
**Cost:** $0 (using existing Hostinger plan)

---

## 💡 Pro Tips

1. **Keep `.env.production` in project:**
   - Add to version control
   - Easy to rebuild with correct API URL

2. **Use build folder in `.gitignore`:**
   - Don't commit `build/` folder to Git
   - Always rebuild before deployment

3. **Test locally after build:**
   ```powershell
   npm install -g serve
   serve -s build
   ```
   Test at `http://localhost:3000` before uploading

4. **Monitor API calls:**
   - Check browser Network tab
   - Verify all API calls go to Render backend
   - Watch for CORS errors

---

**That's it!** Your React frontend is now live on Hostinger! 🚀

