# Hostinger Deployment Guide - Separate Frontend & Backend

This guide explains how to deploy your React frontend and Express backend separately on Hostinger.

## 📋 Prerequisites

- Hostinger hosting account (Premium plan or higher recommended)
- Domain name configured
- FTP access or cPanel/hPanel access
- Node.js hosting enabled (for backend)

## 🏗️ Architecture

```
Frontend (React) → Static Hosting → https://yourdomain.com
Backend (Express) → Node.js Hosting → https://api.yourdomain.com (or subdomain)
```

## 🚀 Step 1: Deploy Backend (Express API)

### Option A: Using Hostinger Node.js Hosting

1. **Access Hostinger Control Panel**
   - Log in to hPanel
   - Go to "Node.js" section

2. **Create Node.js Application**
   - Click "Create Node.js App"
   - Set application name (e.g., "yohanns-api")
   - Choose Node.js version (18.x or higher)
   - Set startup file: `server/index.js`

3. **Upload Backend Files**
   - Upload via FTP or File Manager:
     - `server/` folder
     - `package.json`
     - `.env` file (or set environment variables in hPanel)

4. **Set Environment Variables in hPanel**
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

5. **Install Dependencies**
   - In hPanel Node.js section, run: `npm install`
   - Or via SSH: `cd /path/to/app && npm install`

6. **Start Application**
   - Click "Start" in hPanel Node.js section
   - Your API will be available at: `https://api.yourdomain.com` (or assigned URL)

### Option B: Using VPS/Cloud Hosting

1. **SSH into your VPS**
2. **Clone your repository or upload files**
3. **Install Node.js and npm**
4. **Navigate to project directory**
5. **Install dependencies**: `npm install --production`
6. **Set environment variables** (create `.env` file)
7. **Use PM2 to run the server**:
   ```bash
   npm install -g pm2
   pm2 start server/index.js --name yohanns-api
   pm2 save
   pm2 startup
   ```

## 🎨 Step 2: Deploy Frontend (React App)

### Method 1: Static Hosting (Recommended)

1. **Build React App Locally**
   ```bash
   npm run build
   ```
   This creates a `build/` folder with optimized production files.

2. **Update API URL**
   - Create `.env.production` file in project root:
     ```
     REACT_APP_API_URL=https://api.yourdomain.com
     ```
   - Rebuild: `npm run build`

3. **Upload Build Files**
   - Connect via FTP or use File Manager
   - Upload **contents** of `build/` folder to:
     - `public_html/` (main domain)
     - Or `public_html/subdomain/` (subdomain)

4. **Configure .htaccess** (for React Router)
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

### Method 2: Using Subdomain

1. **Create Subdomain in hPanel**
   - Go to "Subdomains"
   - Create: `app.yourdomain.com`
   - Point to: `public_html/app/`

2. **Upload build files** to `public_html/app/`

3. **Add .htaccess** (same as above)

## 🔧 Step 3: Configure CORS

Update `server/index.js` to allow your frontend domain:

```javascript
const allowedOrigins = [
  'https://yourdomain.com',
  'https://www.yourdomain.com',
  'http://localhost:3000' // for local testing
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

## ✅ Step 4: Verify Deployment

1. **Test Backend**
   - Visit: `https://api.yourdomain.com/health`
   - Should return: `{"ok":true}`

2. **Test Frontend**
   - Visit: `https://yourdomain.com`
   - Should load your React app
   - Check browser console for API connection

3. **Test API Connection**
   - Open browser DevTools → Network tab
   - Check if API calls go to: `https://api.yourdomain.com/api/*`

## 🔒 Step 5: Security Considerations

1. **SSL Certificates**
   - Enable SSL for both frontend and backend domains
   - Hostinger usually provides free SSL via Let's Encrypt

2. **Environment Variables**
   - Never commit `.env` files
   - Use hPanel environment variables or secure file permissions

3. **Firewall Rules**
   - Restrict backend access if needed
   - Allow only frontend domain to access API

## 🐛 Troubleshooting

### Frontend shows "Cannot connect to API"
- Check CORS configuration
- Verify `REACT_APP_API_URL` is set correctly
- Check browser console for CORS errors

### Backend not starting
- Check Node.js version (needs 18+)
- Verify all environment variables are set
- Check logs in hPanel or via SSH

### React Router routes return 404
- Ensure `.htaccess` is configured correctly
- Verify mod_rewrite is enabled on Apache

### Build files not loading
- Check file permissions (should be 644 for files, 755 for folders)
- Verify files are in correct directory
- Clear browser cache

## 📝 File Structure on Hostinger

```
Backend (Node.js App):
/path/to/nodejs/app/
  ├── server/
  │   ├── index.js
  │   ├── routes/
  │   └── ...
  ├── package.json
  └── .env (or use hPanel env vars)

Frontend (Static Files):
public_html/
  ├── index.html
  ├── static/
  │   ├── css/
  │   ├── js/
  │   └── media/
  └── .htaccess
```

## 💡 Tips

1. **Use PM2** for backend process management (keeps server running)
2. **Enable auto-restart** in hPanel Node.js settings
3. **Monitor logs** regularly for errors
4. **Set up backups** for both frontend and backend
5. **Use CDN** (Cloudflare) for faster frontend delivery

## 🔄 Updating Your App

**Frontend:**
1. Make changes locally
2. Run `npm run build`
3. Upload new `build/` contents via FTP

**Backend:**
1. Make changes locally
2. Upload changed files via FTP/SSH
3. Restart Node.js app in hPanel (or `pm2 restart yohanns-api`)

---

**Need Help?** Check Hostinger documentation or contact their support.


