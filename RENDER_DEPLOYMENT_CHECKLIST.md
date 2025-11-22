# Render Backend Deployment Checklist

## ✅ Quick Checklist - What You Need to Do

Follow these steps to deploy your backend to Render:

---

## 📋 Pre-Deployment Checklist

### ✅ Before You Start

- [ ] Your code is pushed to GitHub (`mjpogi01/capstone2`)
- [ ] Your GitHub repository is accessible (public or Render has access)
- [ ] You have all your environment variables ready (Supabase, Cloudinary, etc.)
- [ ] You know your Hostinger domain URL (for CORS configuration)

---

## 🚀 Step 1: Create Render Account (2 minutes)

1. **Go to:** [render.com](https://render.com)
2. **Click:** "Get Started" or "Sign Up"
3. **Sign up with:**
   - GitHub (recommended - easier to connect repo)
   - OR Google
   - OR Email
4. **Verify your email** (if needed)
5. **✅ Done!** You're logged in to Render Dashboard

---

## 🚀 Step 2: Create New Web Service (5 minutes)

### 2.1 Connect GitHub Repository

1. In Render Dashboard, click **"New +"** button (top right)
2. Click **"Web Service"**
3. **Connect GitHub:**
   - Click **"Connect GitHub"** or **"Connect Repository"**
   - If first time, authorize Render to access your GitHub
   - Select your account or organization
   - Find and select: **`mjpogi01/capstone2`**
   - Click **"Connect"**

---

### 2.2 Configure Service Settings

Fill in these fields:

**Basic Settings:**
- **Name:** `yohanns-api` (or any name you want)
- **Region:** Choose closest to you (e.g., `Oregon (US West)`)
- **Branch:** `main` (make sure this matches your repo branch)
- **Root Directory:** Leave **empty** ⚠️ (important - don't change this)

**Build & Deploy:**
- **Runtime:** `Node` (should auto-detect)
- **Build Command:** Leave **empty** (or use `npm install`)
- **Start Command:** `node server/index.js` ⚠️ (this is important!)

**Auto-Deploy:**
- **Auto-Deploy:** `Yes` ✅ (recommended - auto-deploys on git push)

---

### 2.3 Add Environment Variables

**Click "Advanced" → Scroll to "Environment Variables" section**

Click **"Add Environment Variable"** for each one:

**Required Environment Variables:**

```
NODE_ENV = production
PORT = 4000
SUPABASE_URL = your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY = your_service_role_key_here
SUPABASE_ANON_KEY = your_anon_key_here
CLOUDINARY_CLOUD_NAME = your_cloudinary_cloud_name
CLOUDINARY_API_KEY = your_cloudinary_api_key
CLOUDINARY_API_SECRET = your_cloudinary_api_secret
EMAIL_USER = your_email@gmail.com
EMAIL_PASSWORD = your_email_app_password
CLIENT_URL = https://yourdomain.com
FRONTEND_URL = https://yourdomain.com
```

**Important:**
- Replace ALL `your_...` values with actual credentials
- Replace `yourdomain.com` with your actual Hostinger domain
- Get these values from:
  - Supabase Dashboard (for Supabase vars)
  - Cloudinary Dashboard (for Cloudinary vars)
  - Your email provider (for email vars)

**How to add each variable:**
1. Click **"+ Add Environment Variable"**
2. **Key:** Enter the variable name (e.g., `SUPABASE_URL`)
3. **Value:** Enter the actual value (e.g., `https://xxxxx.supabase.co`)
4. Click **"Add"** or press Enter
5. Repeat for all variables

---

### 2.4 Create the Service

1. **Review all settings** (especially Start Command and Environment Variables)
2. Scroll to bottom
3. Click **"Create Web Service"** button
4. ⏳ **Wait 2-5 minutes** for deployment

---

## 🚀 Step 3: Wait for Deployment

**What happens:**
1. Render clones your repository
2. Installs dependencies (`npm install`)
3. Starts your server (`node server/index.js`)
4. Your service becomes live

**You'll see:**
- Build logs in real-time
- Progress indicators
- Status changes from "Building" → "Deploying" → "Live"

**⚠️ First deployment takes 3-5 minutes!**

---

## 🚀 Step 4: Get Your Backend URL

**After deployment completes:**

1. You'll see a URL like: `https://yohanns-api.onrender.com`
2. **Copy this URL** - you'll need it for:
   - Frontend configuration
   - Testing your API
   - CORS setup

**Your backend URL format:**
```
https://[your-service-name].onrender.com
```

Example: `https://yohanns-api.onrender.com`

---

## 🚀 Step 5: Test Your Backend

### 5.1 Health Check

1. Visit: `https://yohanns-api.onrender.com/health`
2. Should return: `{"ok":true}`

**If it works:** ✅ Your backend is live!

**If it doesn't work:**
- Check Render logs (Dashboard → Your Service → "Logs" tab)
- Check environment variables are set correctly
- Check Start Command is correct: `node server/index.js`

### 5.2 Test API Endpoint

1. Visit: `https://yohanns-api.onrender.com/api/products` (or any API route)
2. Should return JSON data or appropriate response

---

## 🚀 Step 6: Update CORS (If Needed)

### 6.1 Check Your CORS Configuration

Your `server/index.js` already has CORS setup that reads from environment variables:

```javascript
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
  // ... other origins
];
```

**This should already work!** As long as you set:
- `FRONTEND_URL` = your Hostinger domain
- `CLIENT_URL` = your Hostinger domain

### 6.2 If CORS Issues Occur

If you get CORS errors, add your domain explicitly in `server/index.js`:

```javascript
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
  'https://yourdomain.com',        // Your Hostinger domain
  'https://www.yourdomain.com',    // www version
  'http://localhost:3000'          // Local development
].filter(Boolean);
```

Then commit and push:
```powershell
git add server/index.js
git commit -m "Update CORS for production"
git push origin main
```

Render will auto-deploy the changes!

---

## 🚀 Step 7: Keep Backend Awake (Optional but Recommended)

**Render free tier sleeps after 15 minutes of inactivity!**

**Solution:** Set up UptimeRobot (free) to ping your API every 5 minutes.

**Quick Setup:**
1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Sign up (free)
3. Add new monitor:
   - Type: `HTTP(s)`
   - URL: `https://yohanns-api.onrender.com/health`
   - Interval: `5 minutes`
4. Save monitor

**Result:** Your backend stays awake 24/7! 🎉

**See:** `UPTIMEROBOT_KEEP_RENDER_AWAKE.md` for detailed guide.

---

## 📝 Complete Checklist

### Pre-Deployment
- [ ] Render account created
- [ ] GitHub repository ready
- [ ] Environment variables list prepared

### Deployment
- [ ] Web Service created
- [ ] GitHub repository connected
- [ ] Service name: `yohanns-api`
- [ ] Runtime: `Node`
- [ ] Start Command: `node server/index.js`
- [ ] All environment variables added
- [ ] Service deployed successfully

### Post-Deployment
- [ ] Backend URL copied
- [ ] Health check works: `/health` returns `{"ok":true}`
- [ ] API endpoint tested
- [ ] CORS configured (if needed)
- [ ] UptimeRobot set up (optional but recommended)

---

## 🔧 Common Issues & Solutions

### ❌ Build Fails

**Check:**
- Build Command should be empty or `npm install`
- Start Command is correct: `node server/index.js`
- All dependencies in `package.json`

**Fix:**
- Check Render logs for specific error
- Make sure `package.json` has all required dependencies

### ❌ Service Won't Start

**Check:**
- Start Command is correct: `node server/index.js`
- All environment variables are set
- Check Render logs for errors

**Fix:**
- Verify Start Command in service settings
- Check all required env vars are present
- Review logs for specific error messages

### ❌ 503 Service Unavailable

**Cause:** Service is sleeping (free tier)

**Fix:**
- Wait 30-60 seconds (cold start)
- Set up UptimeRobot to keep it awake
- Or upgrade to paid plan

### ❌ CORS Errors

**Check:**
- `FRONTEND_URL` and `CLIENT_URL` env vars are set correctly
- Domain matches your Hostinger domain exactly

**Fix:**
- Update environment variables in Render
- Restart service (or wait for auto-deploy)

---

## 🎯 Next Steps After Backend is Live

1. **Update Frontend:**
   - Create `.env.production` with:
     ```
     REACT_APP_API_URL=https://yohanns-api.onrender.com
     ```
   - Rebuild: `npm run build`
   - Upload to Hostinger

2. **Set Up UptimeRobot:**
   - Keep backend awake (prevent cold starts)
   - Monitor uptime

3. **Test Everything:**
   - Frontend can connect to backend
   - API calls work
   - Authentication works
   - File uploads work

---

## 📚 Helpful Links

- **Render Dashboard:** [dashboard.render.com](https://dashboard.render.com)
- **Render Docs:** [render.com/docs](https://render.com/docs)
- **Your Backend URL:** `https://yohanns-api.onrender.com` (after deployment)

---

## ✅ You're Done!

Once all steps are complete:
- ✅ Your backend is live on Render
- ✅ Frontend can connect to it
- ✅ API endpoints work
- ✅ Ready for production! 🚀

**Time to complete:** 10-15 minutes

**Total cost:** $0 (free tier)











