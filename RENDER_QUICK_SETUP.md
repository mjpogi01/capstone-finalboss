# Render Quick Setup Checklist

## 🚀 Complete Setup in 5 Minutes

### **Step 1: Connect Repository**
1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Select your repository

### **Step 2: Configure Service**

**Basic Settings:**
- **Name:** `yohanns-backend` (or your preferred name)
- **Environment:** `Node`
- **Region:** Choose closest to your users
- **Branch:** `main` (or your main branch)

**Build & Start:**
- **Root Directory:** (leave empty)
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm run start:production`

**Health Check:**
- **Health Check Path:** `/health`

### **Step 3: Add Environment Variables**

Click **Environment** tab and add:

**Required:**
```
SUPABASE_URL=https://kjqcswjljgavigyfzauj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
FRONTEND_URL=https://your-frontend-domain.com
CLIENT_URL=https://your-frontend-domain.com
NODE_ENV=production
```

**Optional:**
```
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
GROQ_API_KEY=your-groq-api-key
```

### **Step 4: Deploy**

1. Click **Create Web Service**
2. Wait for deployment (2-5 minutes)
3. Check logs for any errors

### **Step 5: Verify**

✅ Health check: `https://your-app.onrender.com/health`
✅ API test: `https://your-app.onrender.com/api/products`
✅ Frontend: `https://your-app.onrender.com`

---

## 📋 Quick Reference

| Setting | Value |
|---------|-------|
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm run start:production` |
| **Health Check** | `/health` |
| **Environment** | `Node` |
| **Port** | Auto-set by Render ✅ |

---

## 📚 Full Guides

- **Environment Variables:** `RENDER_ENV_SETUP_GUIDE.md`
- **Build/Start Commands:** `RENDER_BUILD_START_COMMANDS.md`
- **Quick Reference:** `RENDER_ENV_QUICK_REFERENCE.md`

---

**That's it! Your app should be live! 🎉**

