# Deploy Backend Only to Render

## ✅ Yes, You Can Deploy Only Your Backend to Render!

This is perfect for your setup:
- **Frontend (React):** Hostinger Cloud (static files)
- **Backend (Express API):** Render (Node.js hosting)

**Cost:** FREE (Render free tier available)

---

## 🚀 Step-by-Step: Deploy Backend to Render

### Step 1: Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up for free account (GitHub, Google, or email)
3. Verify your email if needed

---

### Step 2: Create New Web Service

1. In Render Dashboard, click **"New +"**
2. Select **"Web Service"**
3. Connect your GitHub repository:
   - Click **"Connect GitHub"** or **"Connect Repository"**
   - Authorize Render to access your GitHub
   - Find and select: `mjpogi01/capstone2`

---

### Step 3: Configure Web Service

Fill in the settings:

**Basic Settings:**
- **Name:** `yohanns-api` or `capstone2-backend`
- **Region:** Choose closest to your users (e.g., `Oregon (US West)`)
- **Branch:** `main`
- **Root Directory:** Leave **empty** (or leave as default)

**Build & Deploy:**
- **Environment:** `Node`
- **Build Command:** Leave **empty** (we'll configure this)
- **Start Command:** `node server/index.js`

**Advanced Settings (Optional):**
- **Auto-Deploy:** `Yes` (automatically deploys on git push)

---

### Step 4: Set Environment Variables

Click **"Advanced"** → **"Environment"** and add these variables:

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

**Important Notes:**
- Replace all `your_...` values with actual credentials
- Render will provide a PORT automatically, but set it to 4000 for consistency
- `CLIENT_URL` and `FRONTEND_URL` should be your Hostinger domain

---

### Step 5: Modify Backend for API-Only (Optional)

Since you're only serving API (not React frontend), you can optimize your `server/index.js`. However, your current code already handles this correctly - it only serves React if `build/` folder exists.

**Current code is fine!** It will:
- ✅ Serve API routes (`/api/*`)
- ✅ Skip React serving if `build/` folder doesn't exist

If you want to be explicit, you can modify `server/index.js` to remove React serving entirely. But it's not necessary - Render won't have the `build/` folder, so it won't try to serve React.

---

### Step 6: Create render.yaml (Optional but Recommended)

Create `render.yaml` in your project root for easier configuration:

```yaml
services:
  - type: web
    name: yohanns-api
    env: node
    plan: free
    buildCommand: npm install
    startCommand: node server/index.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 4000
      # Add your other environment variables here
      # Or add them in Render Dashboard instead
```

**Note:** You can add env vars here or in the Dashboard. Dashboard is easier.

---

### Step 7: Deploy

1. Click **"Create Web Service"**
2. Render will:
   - Clone your repository
   - Install dependencies (`npm install`)
   - Start your server (`node server/index.js`)
3. Wait 2-5 minutes for deployment
4. You'll get a URL like: `https://yohanns-api.onrender.com`

---

### Step 8: Update CORS for Your Frontend

Update your `server/index.js` CORS configuration to allow your Hostinger domain:

```javascript
const allowedOrigins = [
  'https://yourdomain.com',           // Your Hostinger domain
  'https://www.yourdomain.com',       // www version
  'http://localhost:3000'             // for local testing
].filter(Boolean);

// Your existing CORS code already handles this!
```

---

### Step 9: Test Your Backend

1. **Health Check:**
   Visit: `https://yohanns-api.onrender.com/health`
   Should return: `{"ok":true}`

2. **API Endpoint Test:**
   Visit: `https://yohanns-api.onrender.com/api/products` (or any API endpoint)
   Should return JSON data

---

### Step 10: Update Frontend to Use Render Backend

On your local machine, create `.env.production` in your project root:

```env
REACT_APP_API_URL=https://yohanns-api.onrender.com
```

Then rebuild your React app:

```powershell
cd C:\capstone2\capstone2
npm run build
```

Upload the new `build/` folder contents to Hostinger `public_html/`.

---

## 📝 Render Free Tier Limitations

**Free tier includes:**
- ✅ 512 MB RAM
- ✅ 0.1 CPU
- ✅ HTTPS automatically
- ✅ Custom domain support
- ✅ Auto-deploy from GitHub

**Free tier limitations:**
- ⚠️ Service sleeps after 15 minutes of inactivity
- ⚠️ First request after sleep takes ~30 seconds (cold start)
- ⚠️ 750 hours/month free (enough for always-on if only one service)

**To keep it always awake:**
- Upgrade to paid plan ($7/month for always-on)
- Or use a free monitoring service (like UptimeRobot) to ping your API every 14 minutes

---

## 🔄 Updating Your Backend

**Easy updates:**

1. Make changes to your code locally
2. Commit and push to GitHub:
   ```powershell
   git add .
   git commit -m "Update backend"
   git push origin main
   ```
3. Render **auto-deploys** (if enabled)
4. Wait 2-5 minutes
5. Changes are live! 🎉

---

## 🔧 Useful Render Commands & Features

### View Logs
- In Render Dashboard → Your Service → **"Logs"** tab
- Real-time logs available
- Great for debugging!

### Manual Deploy
- Dashboard → Your Service → **"Manual Deploy"** → **"Deploy latest commit"**

### Environment Variables
- Dashboard → Your Service → **"Environment"** tab
- Add/edit/delete environment variables
- Changes apply on next deploy

### Custom Domain
- Dashboard → Your Service → **"Settings"** → **"Custom Domain"**
- Add your domain: `api.yourdomain.com`
- Render provides DNS instructions

---

## 🐛 Troubleshooting

### Deployment Fails

**Check logs in Render Dashboard:**
1. Go to your service
2. Click **"Logs"** tab
3. Look for error messages

**Common issues:**
- **Missing environment variables:** Check all env vars are set
- **Build errors:** Check if `npm install` works locally
- **Start command wrong:** Verify `startCommand` is `node server/index.js`
- **Port issues:** Render sets PORT automatically, don't hardcode it

### API Not Accessible

**Check:**
- Service status in Dashboard (should be "Live")
- CORS configuration allows your frontend domain
- Environment variables are set correctly
- Backend logs for errors

### 503 Service Unavailable

**Free tier:** Service might be sleeping
- First request takes ~30 seconds to wake up
- Subsequent requests are fast
- Consider upgrading to paid plan or use monitoring service

---

## ✅ Quick Checklist

- [ ] Render account created
- [ ] GitHub repository connected
- [ ] Web Service created
- [ ] Name: `yohanns-api`
- [ ] Environment: `Node`
- [ ] Start Command: `node server/index.js`
- [ ] All environment variables added
- [ ] Service deployed successfully
- [ ] Health check works: `/health` returns `{"ok":true}`
- [ ] CORS configured for your Hostinger domain
- [ ] Frontend updated with Render backend URL

---

## 📊 Complete Architecture

```
Frontend (React):
Hostinger Cloud → https://yourdomain.com
  ├── Static files (build folder)
  └── Makes API calls to Render

Backend (Express API):
Render → https://yohanns-api.onrender.com
  ├── /api/* routes
  ├── Database (Supabase)
  ├── File storage (Cloudinary)
  └── Email service (Nodemailer)
```

---

## 💡 Pro Tips

1. **Keep Render Awake (Free):**
   - Use [UptimeRobot](https://uptimerobot.com) (free)
   - Set up HTTP monitor to ping `https://yohanns-api.onrender.com/health` every 14 minutes
   - Prevents cold starts

2. **Custom Domain:**
   - Use `api.yourdomain.com` instead of `yohanns-api.onrender.com`
   - Looks more professional
   - Render provides free SSL

3. **Monitoring:**
   - Check Render logs regularly
   - Set up alerts for deployment failures
   - Monitor API response times

4. **Environment Variables:**
   - Use Render's environment variables (don't commit .env to Git)
   - Keep secrets secure
   - Use different env vars for staging/production

---

**That's it!** Your backend will be live on Render, and your frontend on Hostinger will communicate with it. This is a solid, free deployment setup! 🚀











