# Hostinger Node.js Deployment - Fix for Composer Issue

## ❌ Problem

Hostinger's Git deployment looked for PHP/Composer files but your project is **Node.js/React**. The deployment completed but didn't actually deploy your app.

## ✅ Solution: Use Hostinger Node.js Hosting

Since Git deployment is for PHP, you need to use Hostinger's **Node.js Hosting** feature instead.

---

## 🚀 Option 1: Deploy via Node.js Hosting (Recommended)

### Step 1: Access Node.js in hPanel

1. Log into **hPanel** (https://hpanel.hostinger.com)
2. Look for **"Node.js"** in the menu (usually under "Advanced" or in the sidebar)
3. Click **"Node.js"** or **"Node.js App Manager"**

### Step 2: Create New Node.js Application

1. Click **"Create Node.js App"** or **"Add Application"**
2. Fill in the form:
   - **Application Name**: `yohanns-app` or `capstone2-app`
   - **Node.js Version**: Select **18.x** or **20.x** (latest LTS)
   - **Startup File**: `server/index.js`
   - **Root Directory**: Leave default or set to your deployment path
   - **Port**: `4000` (or the port Hostinger assigns)
   - **Mode**: `Production`

### Step 3: Connect to Git Repository

1. In the Node.js app settings, look for **"Git Repository"** or **"Source"** section
2. Enter your repository URL: `https://github.com/mjpogi01/capstone2.git`
3. Select branch: `main`
4. Click **"Deploy"** or **"Connect"**

### Step 4: Configure Build & Start Commands

In the Node.js app settings, configure:

**Build Command:**
```bash
npm install && npm run build
```

**Start Command:**
```bash
npm run start:production
```

Or if Hostinger doesn't have separate build/start commands, use:
```bash
npm install && npm run build && npm run start:production
```

### Step 5: Set Environment Variables

Go to **"Environment Variables"** in your Node.js app settings and add:

```
NODE_ENV=production
PORT=4000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
CLIENT_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

### Step 6: Deploy

1. Click **"Deploy"** or **"Save & Restart"**
2. Wait for the deployment to complete
3. Your app will be available at the URL Hostinger provides

---

## 🚀 Option 2: Manual Deployment via SSH/FTP

If Node.js hosting isn't available, deploy manually:

### Step 1: Build Your App Locally

On your local machine:

```powershell
cd C:\capstone2\capstone2
npm install
npm run build
```

This creates a `build/` folder with your React app.

### Step 2: Connect via SSH

```powershell
ssh u302669616@my-kul-web2088.main-hosting.eu
```

### Step 3: Navigate to Your Project Directory

```bash
cd /home/u302669616/domains/yourdomain.com/public_html
# or wherever your files were deployed
```

### Step 4: Clone Repository (if not already there)

```bash
git clone https://github.com/mjpogi01/capstone2.git .
```

### Step 5: Install Dependencies

```bash
npm install --production
```

### Step 6: Set Environment Variables

Create `.env` file:

```bash
nano .env
```

Add all your environment variables (same as Step 5 in Option 1).

### Step 7: Build the App

```bash
npm run build
```

### Step 8: Start the Server with PM2

```bash
npm install -g pm2
pm2 start server/index.js --name yohanns-app
pm2 save
pm2 startup
```

### Step 9: Configure Apache/Nginx (if needed)

You might need to set up a reverse proxy to point to your Node.js app on port 4000.

---

## 🚀 Option 3: Separate Frontend & Backend

Deploy frontend and backend separately:

### Frontend (Static Files)

1. **Build locally:**
   ```powershell
   npm run build
   ```

2. **Upload `build/` contents via FTP:**
   - Upload everything inside `build/` folder to `public_html/`
   - Create `.htaccess` in `public_html/` (see HOSTINGER_DEPLOYMENT.md)

### Backend (Node.js App)

1. Use **Node.js Hosting** (Option 1) to deploy just the backend
2. Point it to your API subdomain (e.g., `api.yourdomain.com`)

---

## 🔧 Fixing the Current Git Deployment

If the Git deployment already cloned your files, you can use them:

### Step 1: Connect via SSH

```powershell
ssh u302669616@my-kul-web2088.main-hosting.eu
```

### Step 2: Navigate to Deployed Directory

Find where Hostinger cloned your repository (usually in `public_html/` or a subdirectory).

### Step 3: Install Node.js Dependencies

```bash
cd /path/to/deployed/repo
npm install
npm run build
```

### Step 4: Start with PM2

```bash
npm install -g pm2
pm2 start server/index.js --name yohanns-app
pm2 save
```

### Step 5: Create .htaccess for React Router

Create `.htaccess` in `public_html/`:

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

---

## 📝 Quick Checklist

- [ ] Use **Node.js Hosting** in hPanel (not Git deployment for PHP)
- [ ] Set startup file: `server/index.js`
- [ ] Set build command: `npm install && npm run build`
- [ ] Set start command: `npm run start:production`
- [ ] Add all environment variables
- [ ] Configure Git repository connection (optional)
- [ ] Deploy and test

---

## 🐛 Troubleshooting

### "Node.js Hosting not available"
- Upgrade to **Premium** or **Business** plan
- Contact Hostinger support to enable Node.js

### "App won't start"
- Check logs in hPanel Node.js section
- Verify all environment variables are set
- Check if port is correctly configured

### "Build fails"
- Make sure Node.js version is 18+ or 20+
- Check if all dependencies are in `package.json`
- Review build logs for specific errors

### "404 errors on routes"
- Add `.htaccess` file for React Router
- Ensure `mod_rewrite` is enabled on Apache

---

## 💡 Recommended Approach

**Use Option 1 (Node.js Hosting)** - This is the easiest and most reliable way to deploy Node.js apps on Hostinger. It handles the build process and keeps your app running.

The Git deployment you used is designed for **PHP applications** (WordPress, Laravel, etc.), which is why it looked for Composer files. For Node.js, you need the **Node.js Hosting** feature.











