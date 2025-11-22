# Render Environment Variables Setup Guide

This guide will help you configure all required environment variables for your application on Render.

## 📋 Required Environment Variables

### 🔐 **Supabase Configuration** (REQUIRED)
These are essential for database and authentication:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**How to get these:**
1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the **Project URL** → Use as `SUPABASE_URL`
4. Copy the **service_role** key (⚠️ Keep this secret!) → Use as `SUPABASE_SERVICE_ROLE_KEY`

---

### 📧 **Email Service (Resend)** (OPTIONAL but recommended)
Required for sending order confirmation emails and notifications:

```
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

**Alternative names (also supported):**
- `EMAIL_FROM` (can be used instead of `RESEND_FROM_EMAIL`)
- `EMAIL_USER` (can be used instead of `RESEND_FROM_EMAIL`)

**How to get these:**
1. Sign up at [resend.com](https://resend.com)
2. Create an API key in the dashboard
3. Verify your domain and set up the from email address

---

### ☁️ **Cloudinary** (REQUIRED for image uploads)
Required for product images, design uploads, and file storage:

```
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

**How to get these:**
1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Go to your dashboard
3. Copy the **Cloud Name**, **API Key**, and **API Secret**

---

### 🤖 **AI Service (Groq)** (OPTIONAL)
Required for AI analytics features:

```
GROQ_API_KEY=your-groq-api-key
```

**How to get this:**
1. Sign up at [groq.com](https://groq.com)
2. Create an API key in the dashboard

---

### 🌐 **Frontend/Client URLs** (REQUIRED for production)
Required for CORS and frontend communication:

```
FRONTEND_URL=https://your-frontend-domain.com
CLIENT_URL=https://your-frontend-domain.com
```

**Examples:**
- If your frontend is on Render: `https://your-app.onrender.com`
- If your frontend is on Hostinger: `https://yourdomain.com`
- If your frontend is on Vercel: `https://your-app.vercel.app`

---

### 🔧 **Node Environment** (REQUIRED)
Set this to production for deployed environments:

```
NODE_ENV=production
```

---

### 🚪 **Port** (OPTIONAL - Render sets this automatically)
Render automatically sets the PORT, but you can override if needed:

```
PORT=4000
```

---

## 📝 Step-by-Step Setup in Render

### **Step 1: Navigate to Your Service**
1. Log in to [Render Dashboard](https://dashboard.render.com)
2. Click on your **Web Service** (backend service)

### **Step 2: Open Environment Variables**
1. In your service dashboard, click on **Environment** in the left sidebar
2. Click **Add Environment Variable** button

### **Step 3: Add Each Variable**
Add the following variables one by one:

#### **Essential Variables (Must Have):**
```
SUPABASE_URL=https://kjqcswjljgavigyfzauj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.com
CLIENT_URL=https://your-frontend-domain.com
```

#### **Optional Variables (Recommended):**
```
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
GROQ_API_KEY=your-groq-api-key
```

### **Step 4: Save and Deploy**
1. After adding all variables, click **Save Changes**
2. Render will automatically trigger a new deployment
3. Wait for the deployment to complete (usually 2-5 minutes)

---

## 🔍 Verification Checklist

After deployment, verify your setup:

### ✅ **Check 1: Backend Health**
Visit: `https://your-backend.onrender.com/health`
- Should return: `{"ok":true}`

### ✅ **Check 2: API Endpoints**
Visit: `https://your-backend.onrender.com/api/products`
- Should return product data (not errors)

### ✅ **Check 3: Check Logs**
1. Go to **Logs** tab in Render dashboard
2. Look for:
   - ✅ `✅ Resend email client initialized` (if email is configured)
   - ✅ `✅ Server listening on http://localhost:4000`
   - ❌ No errors about missing environment variables

---

## 🚨 Common Issues & Solutions

### **Issue 1: "SUPABASE_URL is not defined"**
**Solution:** Make sure you added `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Render

### **Issue 2: "CORS errors"**
**Solution:** 
- Add `FRONTEND_URL` and `CLIENT_URL` with your actual frontend domain
- Make sure there's no trailing slash: `https://yourdomain.com` ✅ (not `https://yourdomain.com/` ❌)

### **Issue 3: "Email service not working"**
**Solution:**
- Verify `RESEND_API_KEY` is correct
- Verify `RESEND_FROM_EMAIL` matches your verified domain in Resend
- Check Resend dashboard for any errors

### **Issue 4: "Image uploads failing"**
**Solution:**
- Verify all three Cloudinary variables are set:
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
- Check Cloudinary dashboard for usage limits

---

## 📋 Quick Reference: All Variables

Copy-paste this list and fill in your values:

```bash
# Supabase (REQUIRED)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Cloudinary (REQUIRED)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Email Service (OPTIONAL)
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# AI Service (OPTIONAL)
GROQ_API_KEY=

# Frontend URLs (REQUIRED)
FRONTEND_URL=
CLIENT_URL=

# Environment (REQUIRED)
NODE_ENV=production
```

---

## 🔐 Security Best Practices

1. **Never commit `.env` files to Git** ✅ (Already in `.gitignore`)
2. **Use Render's environment variables** - Don't hardcode secrets
3. **Rotate keys regularly** - Update API keys every 90 days
4. **Use different keys for dev/prod** - Never use production keys in development
5. **Limit service role key access** - Only use service role key on backend, never in frontend

---

## 📞 Need Help?

If you encounter issues:
1. Check Render logs for specific error messages
2. Verify all required variables are set
3. Make sure there are no typos in variable names
4. Ensure values don't have extra spaces or quotes

---

## 🎯 Next Steps

After setting up environment variables:
1. ✅ Deploy your backend service
2. ✅ Update frontend to use the backend URL
3. ✅ Test all features (login, orders, uploads)
4. ✅ Monitor logs for any errors

**Your backend should now be fully configured! 🚀**

