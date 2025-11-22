# Hostinger Deployment Solutions - Full-Stack Node.js App

## 📋 Your Situation

Your app is **full-stack** (Node.js/Express backend + React frontend). Hostinger **Cloud plans do NOT support Node.js runtime** - they only support static files (HTML, CSS, JS) and PHP.

## ✅ Solution Options

You have **3 main options**:

---

## 🚀 Option 1: Separate Deployment (Recommended & Free)

**Deploy frontend to Hostinger Cloud + Backend to free Node.js hosting**

### Frontend (Hostinger Cloud)
- Build React app locally → Upload static files to Hostinger
- Free and works with your current Hostinger plan

### Backend (Free Node.js Platform)
- Deploy Express API to Railway, Render, or similar
- Free tiers available

**Cost:** $0/month (if using free tiers)

---

## 🚀 Option 2: Upgrade to Hostinger VPS

**Deploy everything on Hostinger VPS**

- Upgrade your Hostinger plan to **VPS** (supports Node.js)
- Deploy both frontend and backend together
- Full control over the server

**Cost:** ~$4-10/month (Hostinger VPS pricing)

---

## 🚀 Option 3: Deploy Everything Elsewhere

**Deploy both frontend and backend to a Node.js platform**

- Deploy to Railway, Render, Heroku, etc.
- They support full-stack Node.js apps
- Some have free tiers

**Cost:** $0/month (free tiers) or ~$5-20/month (paid)

---

## 📝 Detailed Instructions for Each Option

---

# Option 1: Separate Deployment (Frontend on Hostinger + Backend on Railway)

## ✅ Step 1: Deploy Backend to Railway (Free Tier Available)

### 1.1 Install Railway CLI
```powershell
npm install -g @railway/cli
```

### 1.2 Login and Initialize
```powershell
railway login
cd C:\capstone2\capstone2
railway init
```

### 1.3 Set Environment Variables
```powershell
railway variables set NODE_ENV=production
railway variables set PORT=4000
railway variables set SUPABASE_URL=your_supabase_url
railway variables set SUPABASE_SERVICE_ROLE_KEY=your_key
railway variables set SUPABASE_ANON_KEY=your_anon_key
railway variables set CLOUDINARY_CLOUD_NAME=your_cloud_name
railway variables set CLOUDINARY_API_KEY=your_api_key
railway variables set CLOUDINARY_API_SECRET=your_secret
railway variables set EMAIL_USER=your_email@gmail.com
railway variables set EMAIL_PASSWORD=your_app_password
railway variables set CLIENT_URL=https://yourdomain.com
railway variables set FRONTEND_URL=https://yourdomain.com
```

Or set them in Railway Dashboard → Your Project → Variables

### 1.4 Update railway.json
Create or update `railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node server/index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**IMPORTANT:** Since backend only serves API (not React), we need to:
- **Remove or comment out** the React build serving code in `server/index.js`
- Or create a separate backend-only version

### 1.5 Deploy
```powershell
railway up
```

Your backend will be available at: `https://your-app.railway.app`

---

## ✅ Step 2: Deploy Frontend to Hostinger Cloud

### 2.1 Build React App Locally

**Update API URL for production:**

Create `.env.production` in your project root:
```
REACT_APP_API_URL=https://your-app.railway.app
```

Build the app:
```powershell
cd C:\capstone2\capstone2
npm install
npm run build
```

This creates a `build/` folder with production files.

### 2.2 Upload to Hostinger

**Option A: Via File Manager (hPanel)**
1. Log into hPanel
2. Go to **"Files"** → **"File Manager"**
3. Navigate to `public_html/`
4. **Delete all existing files** (if any)
5. Upload **ALL contents** of your `build/` folder to `public_html/`

**Option B: Via FTP**
1. Use FileZilla or WinSCP
2. Connect to your Hostinger server
3. Navigate to `public_html/`
4. Upload all files from `build/` folder

### 2.3 Create .htaccess for React Router

In `public_html/`, create `.htaccess` file:
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

### 2.4 Update CORS in Backend

Make sure your Railway backend allows your Hostinger domain:

In `server/index.js`, update CORS:
```javascript
const allowedOrigins = [
  'https://yourdomain.com',
  'https://www.yourdomain.com',
  'http://localhost:3000' // for local testing
];
```

---

## ✅ Step 3: Update Backend to NOT Serve React

Since frontend is on Hostinger, backend should only serve API:

### Option A: Keep Current Setup (Simpler)
Your current `server/index.js` already checks for `build/` folder. Just make sure the `build/` folder doesn't exist on Railway, and it will only serve API routes.

### Option B: Create API-Only Version
Create `server/index-api-only.js` for Railway deployment:

```javascript
// Same as server/index.js but remove React serving code
// Only keep API routes
```

Then update `railway.json`:
```json
{
  "deploy": {
    "startCommand": "node server/index-api-only.js"
  }
}
```

**Actually, your current setup is fine!** The React serving code only runs if `build/` folder exists. Since Railway won't have it, it will only serve APIs.

---

## ✅ Testing

1. **Backend:** Visit `https://your-app.railway.app/health` → Should return `{"ok":true}`
2. **Frontend:** Visit `https://yourdomain.com` → Should load your React app
3. **API Calls:** Open browser console, check if API calls go to Railway backend

---

# Option 2: Upgrade to Hostinger VPS

## Step 1: Upgrade Your Hostinger Plan

1. Log into Hostinger
2. Upgrade to **VPS plan** (starts around $4-10/month)
3. Wait for VPS provisioning

## Step 2: SSH into VPS

```powershell
ssh u302669616@your-vps-ip
```

## Step 3: Install Node.js

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

## Step 4: Clone Repository

```bash
cd /var/www
sudo git clone https://github.com/mjpogi01/capstone2.git
sudo chown -R $USER:$USER capstone2
cd capstone2
```

## Step 5: Install Dependencies & Build

```bash
npm install
npm run build
```

## Step 6: Create .env File

```bash
nano .env
```

Add all your environment variables.

## Step 7: Install PM2

```bash
sudo npm install -g pm2
pm2 start server/index.js --name yohanns-app
pm2 save
pm2 startup
```

## Step 8: Configure Nginx (Reverse Proxy)

```bash
sudo nano /etc/nginx/sites-available/yourdomain.com
```

Add:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 9: Set Up SSL (Let's Encrypt)

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

# Option 3: Deploy Everything to Railway/Render (Easiest)

## Option 3A: Railway (Recommended)

### Step 1: Install Railway CLI
```powershell
npm install -g @railway/cli
```

### Step 2: Initialize & Deploy
```powershell
railway login
cd C:\capstone2\capstone2
railway init
```

### Step 3: Set Environment Variables
Set all your environment variables in Railway Dashboard.

### Step 4: Update railway.json
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build"
  },
  "deploy": {
    "startCommand": "npm run start:production",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### Step 5: Deploy
```powershell
railway up
```

Your full app will be at: `https://your-app.railway.app`

**Note:** Railway will:
1. Install dependencies
2. Build React app (`npm run build`)
3. Start server (`npm run start:production`)
4. Serve both frontend and backend together

---

## Option 3B: Render

1. Go to [render.com](https://render.com)
2. Create new **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start:production`
5. Add environment variables
6. Deploy

---

## 🎯 Recommended Approach

**For Quick & Free:** Use **Option 1** (Frontend on Hostinger + Backend on Railway)
- Keeps your existing Hostinger plan
- Backend on free Railway tier
- Total cost: $0/month

**For Simple All-in-One:** Use **Option 3** (Everything on Railway)
- Easiest deployment
- Free tier available
- Both frontend and backend in one place

**For Full Control:** Use **Option 2** (Hostinger VPS)
- Complete server control
- Requires VPS upgrade ($4-10/month)

---

## 📝 Summary

| Option | Cost | Difficulty | Best For |
|--------|------|------------|----------|
| Option 1: Separate | $0/month | Medium | Keep Hostinger, add free backend |
| Option 2: VPS | $4-10/month | Hard | Full server control |
| Option 3: Railway/Render | $0-20/month | Easy | Quickest deployment |

**My Recommendation:** Start with **Option 1** or **Option 3A (Railway)** - both are free and easier to set up!











