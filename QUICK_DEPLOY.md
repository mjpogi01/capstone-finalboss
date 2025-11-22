# Quick Deployment Guide - Combined Frontend + Backend

## ✅ What's Ready

Your app is configured to deploy frontend and backend together! The Express server will serve your React app automatically.

## 🚀 Deploy in 3 Steps

### Step 1: Choose Your Platform

**Recommended: Railway** (easiest, good free tier)
- Go to [railway.app](https://railway.app)
- Sign up with GitHub
- Click "New Project" → "Deploy from GitHub repo"
- Select your repository

**Alternative: Render** (free tier available)
- Go to [render.com](https://render.com)
- Sign up with GitHub
- Click "New +" → "Web Service"
- Connect your repository

### Step 2: Set Environment Variables

Add these in your platform's dashboard:

**Required:**
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
CLIENT_URL=https://your-app-domain.com
```

**Optional:**
```
REACT_APP_GOOGLE_MAPS_API_KEY=your_key
REACT_APP_EMAILJS_SERVICE_ID=your_service_id
REACT_APP_EMAILJS_TEMPLATE_ID=your_template_id
REACT_APP_EMAILJS_PUBLIC_KEY=your_public_key
```

### Step 3: Deploy!

**Railway:**
- Platform auto-detects configuration
- Just click "Deploy"
- Your app will be live in minutes!

**Render:**
- Build Command: `npm install && npm run build`
- Start Command: `npm run start:production`
- Health Check Path: `/health`
- Click "Create Web Service"

## 🧪 Test Locally First

**Windows (PowerShell):**
```powershell
# Build the app
npm run build

# Set production mode
$env:NODE_ENV="production"

# Start server
npm run start:production

# Visit http://localhost:4000
```

**Windows (Command Prompt):**
```cmd
# Build the app
npm run build

# Set production mode
set NODE_ENV=production

# Start server
npm run start:production

# Visit http://localhost:4000
```

**Mac/Linux:**
```bash
# Build the app
npm run build

# Set production mode
export NODE_ENV=production

# Start server
npm run start:production

# Visit http://localhost:4000
```

## 📝 Files Already Created

- ✅ `Procfile` - For Heroku
- ✅ `railway.json` - For Railway
- ✅ `render.yaml` - For Render
- ✅ Server configured to serve React build
- ✅ API routes protected

## 🎉 That's It!

Your app will be live at the URL provided by your platform. Both frontend and backend will work together on the same domain!

## ❓ Troubleshooting

**Build fails?**
- Check Node.js version (needs v16+)
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`

**API not working?**
- Verify all environment variables are set
- Check Supabase credentials
- Check CORS settings (should be fine for combined deployment)

**React app not loading?**
- Make sure `npm run build` completed successfully
- Check that `NODE_ENV=production` is set
- Verify the `build/` folder exists

For more details, see `DEPLOYMENT_GUIDE.md`

