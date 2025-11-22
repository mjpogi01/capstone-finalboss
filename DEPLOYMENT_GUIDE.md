# Deployment Guide

This guide will help you deploy your React + Express.js application to production.

## 🎯 Combined Deployment (Recommended)

**Your application is now configured to deploy frontend and backend together!** The Express server will automatically serve your React app in production. This is the simplest deployment approach.

### ✅ What's Already Configured

- ✅ Server updated to serve React build files in production
- ✅ API routes protected (won't be served as static files)
- ✅ React routing handled (all non-API routes serve React app)
- ✅ Production scripts added to `package.json`

### 🚀 Quick Deploy (Choose One Platform)

#### **Option A: Railway (Easiest - Recommended)**

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and Initialize:**
   ```bash
   railway login
   railway init
   ```

3. **Set Environment Variables:**
   ```bash
   railway variables set SUPABASE_URL=your_url
   railway variables set SUPABASE_SERVICE_ROLE_KEY=your_key
   railway variables set CLOUDINARY_CLOUD_NAME=your_cloud_name
   # ... add all other variables
   ```
   Or set them in Railway Dashboard → Your Project → Variables

4. **Deploy:**
   ```bash
   railway up
   ```

5. **Done!** Your app will be live at `https://your-app.railway.app`

**Note:** The `railway.json` file is already configured for you!

---

#### **Option B: Render (Free Tier Available)**

1. **Connect GitHub Repository:**
   - Go to [render.com](https://render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

2. **Configure:**
   - **Name:** yohanns-app
   - **Environment:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start:production`
   - **Health Check Path:** `/health`

3. **Add Environment Variables:**
   - Add all your environment variables in the Render dashboard

4. **Deploy:**
   - Click "Create Web Service"
   - Render will automatically build and deploy

**Note:** The `render.yaml` file is already configured for you!

---

#### **Option C: Heroku**

1. **Install Heroku CLI:**
   ```bash
   npm install -g heroku
   ```

2. **Login and Create App:**
   ```bash
   heroku login
   heroku create your-app-name
   ```

3. **Set Environment Variables:**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set SUPABASE_URL=your_url
   heroku config:set SUPABASE_SERVICE_ROLE_KEY=your_key
   # ... add all other variables
   ```

4. **Deploy:**
   ```bash
   git push heroku main
   ```

**Note:** The `Procfile` is already configured for you!

---

#### **Option D: DigitalOcean App Platform**

1. **Create `app.yaml`:**
   ```yaml
   name: yohanns-app
   services:
     - name: web
       github:
         repo: your-username/your-repo
         branch: main
       build_command: npm install && npm run build
       run_command: npm run start:production
       environment_slug: node-js
       instance_count: 1
       instance_size_slug: basic-xxs
       envs:
         - key: NODE_ENV
           value: production
         # Add all other environment variables
   ```

2. **Deploy via DigitalOcean Dashboard:**
   - Connect GitHub repository
   - DigitalOcean will auto-detect the configuration

---

### 🧪 Test Combined Deployment Locally

Before deploying, test that everything works together:

```bash
# 1. Build the React app
npm run build

# 2. Set NODE_ENV to production
set NODE_ENV=production  # Windows
# or
export NODE_ENV=production  # Mac/Linux

# 3. Start the server
npm run start:production

# 4. Visit http://localhost:4000
# You should see your React app, and API calls should work!
```

---

## 📋 Prerequisites

Before deploying, ensure you have:
- ✅ Node.js installed (v16 or higher)
- ✅ npm or yarn package manager
- ✅ Git repository set up
- ✅ All environment variables configured
- ✅ Supabase project set up
- ✅ Cloudinary account configured
- ✅ Email service configured (Nodemailer or EmailJS)

## 🔐 Environment Variables

Create a `.env` file in the root directory with the following variables:

### Required Environment Variables

```env
# Server Configuration
PORT=4000
NODE_ENV=production

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_ANON_KEY=your_supabase_anon_key

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Email Configuration (Nodemailer)
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
CLIENT_URL=https://your-production-domain.com

# Frontend API URL (for combined deployment, use same domain or leave empty)
# If deploying separately, set this to your backend URL
# If deploying together, you can omit this or set to same domain
REACT_APP_API_URL=
```

### Optional Environment Variables

```env
# Google Maps API (if using maps)
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# EmailJS (if using EmailJS instead of Nodemailer)
REACT_APP_EMAILJS_SERVICE_ID=your_service_id
REACT_APP_EMAILJS_TEMPLATE_ID=your_template_id
REACT_APP_EMAILJS_PUBLIC_KEY=your_public_key
```

## 🏗️ Build Process

### 1. Build the React Frontend

```bash
npm run build
```

This creates an optimized production build in the `build/` directory.

### 2. Test the Build Locally

```bash
# Install serve globally (optional)
npm install -g serve

# Serve the build
serve -s build -l 3000
```

## 🚀 Deployment Options

### Option 1: Deploy to Vercel (Recommended for Frontend)

**Frontend Deployment:**

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

3. **Configure Environment Variables:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add all `REACT_APP_*` variables

4. **Create `vercel.json` in root:**
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "package.json",
         "use": "@vercel/static-build",
         "config": {
           "distDir": "build"
         }
       }
     ],
     "routes": [
       {
         "src": "/static/(.*)",
         "headers": {
           "cache-control": "public, max-age=31536000, immutable"
         }
       },
       {
         "src": "/(.*)",
         "dest": "/index.html"
       }
     ]
   }
   ```

**Backend Deployment (Separate):**
- Deploy backend to Railway, Render, or Heroku (see Option 2)

---

### Option 2: Deploy to Railway (Full Stack)

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login:**
   ```bash
   railway login
   ```

3. **Initialize:**
   ```bash
   railway init
   ```

4. **Create `railway.json`:**
   ```json
   {
     "$schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "npm run server",
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 10
     }
   }
   ```

5. **Configure Environment Variables:**
   - Add all environment variables in Railway Dashboard

6. **Deploy:**
   ```bash
   railway up
   ```

**Note:** For full-stack deployment, you may need to:
- Serve React build from Express server
- Update `server/index.js` to serve static files

---

### Option 3: Deploy to Render (Full Stack)

1. **Create `render.yaml` in root:**
   ```yaml
   services:
     - type: web
       name: yohanns-backend
       env: node
       buildCommand: npm install
       startCommand: npm run server
       envVars:
         - key: NODE_ENV
           value: production
         - key: PORT
           value: 4000
         # Add all other environment variables
   ```

2. **Deploy:**
   - Connect your GitHub repository to Render
   - Render will automatically detect and deploy

**For Frontend (Separate Service):**
- Create a new Static Site service
- Build command: `npm run build`
- Publish directory: `build`

---

### Option 4: Deploy to Heroku (Full Stack)

1. **Install Heroku CLI:**
   ```bash
   npm install -g heroku
   ```

2. **Login:**
   ```bash
   heroku login
   ```

3. **Create App:**
   ```bash
   heroku create your-app-name
   ```

4. **Create `Procfile` in root:**
   ```
   web: npm run server
   ```

5. **Update `package.json` scripts:**
   ```json
   {
     "scripts": {
       "start": "node server/index.js",
       "heroku-postbuild": "npm run build"
     }
   }
   ```

6. **Update `server/index.js` to serve React build:**
   ```javascript
   // Add this before your API routes
   if (process.env.NODE_ENV === 'production') {
     app.use(express.static(path.join(__dirname, '../build')));
     app.get('*', (req, res) => {
       res.sendFile(path.join(__dirname, '../build/index.html'));
     });
   }
   ```

7. **Set Environment Variables:**
   ```bash
   heroku config:set SUPABASE_URL=your_url
   heroku config:set SUPABASE_SERVICE_ROLE_KEY=your_key
   # ... add all other variables
   ```

8. **Deploy:**
   ```bash
   git push heroku main
   ```

---

### Option 5: Deploy to DigitalOcean App Platform

1. **Create `app.yaml`:**
   ```yaml
   name: yohanns-app
   services:
     - name: api
       github:
         repo: your-username/your-repo
         branch: main
       run_command: npm run server
       environment_slug: node-js
       instance_count: 1
       instance_size_slug: basic-xxs
       envs:
         - key: NODE_ENV
           value: production
         # Add all other environment variables
   ```

2. **Deploy via DigitalOcean Dashboard:**
   - Connect GitHub repository
   - Configure build and run commands
   - Set environment variables

---

## 🔧 Backend Configuration for Production

### Update `server/index.js` to Serve React Build

Add this code to serve the React build in production:

```javascript
// Add after middleware setup, before API routes
if (process.env.NODE_ENV === 'production') {
  // Serve static files from React build
  app.use(express.static(path.join(__dirname, '../build')));
  
  // Handle React routing - return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build/index.html'));
  });
}
```

### Update CORS for Production

Update CORS configuration in `server/index.js`:

```javascript
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-production-domain.com']
    : true,
  credentials: true
};
app.use(cors(corsOptions));
```

## 📱 Frontend Configuration

### Update API URL for Production

Update `src/config/api.js`:

```javascript
const DEFAULT_API_URL = process.env.REACT_APP_API_URL || 
                        (process.env.NODE_ENV === 'production' 
                          ? 'https://your-backend-api.com'
                          : 'http://localhost:4000');
```

## ✅ Pre-Deployment Checklist

- [ ] All environment variables are set
- [ ] Database migrations are applied in Supabase
- [ ] Cloudinary is configured and tested
- [ ] Email service is configured and tested
- [ ] Frontend build completes without errors (`npm run build`)
- [ ] Backend server starts without errors
- [ ] API endpoints are tested
- [ ] CORS is configured for production domain
- [ ] SSL/HTTPS is enabled (most platforms do this automatically)
- [ ] Error logging is set up
- [ ] Database backups are configured

## 🧪 Testing After Deployment

1. **Test API Health:**
   ```bash
   curl https://your-api.com/health
   ```

2. **Test Frontend:**
   - Visit your production URL
   - Test all major features
   - Check browser console for errors

3. **Test Database Connection:**
   - Verify Supabase connection
   - Test CRUD operations

4. **Test File Uploads:**
   - Test image uploads to Cloudinary
   - Verify files are accessible

5. **Test Email:**
   - Send test emails
   - Verify email delivery

## 🔍 Monitoring & Logs

### Recommended Tools:
- **Vercel Analytics** (if using Vercel)
- **Sentry** (error tracking)
- **LogRocket** (session replay)
- **Supabase Dashboard** (database monitoring)

## 🚨 Troubleshooting

### Common Issues:

1. **Build Fails:**
   - Check Node.js version compatibility
   - Clear `node_modules` and reinstall
   - Check for TypeScript/ESLint errors

2. **API Not Connecting:**
   - Verify `REACT_APP_API_URL` is set correctly
   - Check CORS configuration
   - Verify backend is running

3. **Database Connection Issues:**
   - Verify Supabase credentials
   - Check network connectivity
   - Verify RLS policies

4. **File Upload Issues:**
   - Verify Cloudinary credentials
   - Check file size limits
   - Verify CORS settings on Cloudinary

## 📚 Additional Resources

- [Create React App Deployment](https://create-react-app.dev/docs/deployment/)
- [Express.js Production Best Practices](https://expressjs.com/en/advanced/best-practice-production.html)
- [Supabase Documentation](https://supabase.com/docs)
- [Cloudinary Documentation](https://cloudinary.com/documentation)

## 🎯 Quick Start (Combined Deployment - Recommended)

**For combined deployment (frontend + backend together):**

1. **Choose a platform** (Railway, Render, Heroku, or DigitalOcean)
2. **Set all environment variables** in the platform dashboard
3. **Deploy** using the platform's instructions above
4. **Done!** Your app is live with both frontend and backend! 🎉

**For separate deployment (frontend and backend on different platforms):**

1. **Deploy Frontend to Vercel:**
   ```bash
   npm install -g vercel
   vercel
   ```

2. **Deploy Backend to Railway:**
   ```bash
   npm install -g @railway/cli
   railway login
   railway init
   railway up
   ```

3. **Update Frontend API URL:**
   - Set `REACT_APP_API_URL` in Vercel to your Railway backend URL

4. **Done!** 🎉

---

**Need Help?** Check the troubleshooting section or review the platform-specific documentation.

---

## 📝 Updating Your Deployed App

**Yes, you can edit code while deployed!** Changes go live after you redeploy.

### Quick Update Workflow:

1. **Edit code locally**
2. **Test locally** (optional): `npm run build && npm run start:production`
3. **Commit and push:**
   ```bash
   git add .
   git commit -m "Your update message"
   git push origin main
   ```
4. **Platform auto-deploys** (2-5 minutes)
5. **Changes are live!**

**For detailed update instructions, see `UPDATING_DEPLOYED_APP.md`**

