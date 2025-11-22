# Render Environment Variables - Quick Reference

## 🚀 Quick Setup Checklist

### Step 1: Go to Render Dashboard
1. Visit [dashboard.render.com](https://dashboard.render.com)
2. Click on your **Web Service** (backend)
3. Click **Environment** in left sidebar

### Step 2: Add These Variables

Copy and paste each variable, then fill in your actual values:

---

## ✅ REQUIRED Variables

```bash
# Supabase Database & Auth
SUPABASE_URL=https://kjqcswjljgavigyfzauj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Cloudinary Image Storage
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Frontend URLs (for CORS)
FRONTEND_URL=https://your-frontend-domain.com
CLIENT_URL=https://your-frontend-domain.com

# Environment
NODE_ENV=production
```

---

## ⚙️ OPTIONAL Variables (Recommended)

```bash
# Email Service (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com

# AI Service (Groq)
GROQ_API_KEY=your-groq-api-key
```

---

## 📍 Where to Get Values

| Variable | Where to Get It |
|----------|----------------|
| `SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → service_role key |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Dashboard → Settings → Account Details |
| `CLOUDINARY_API_KEY` | Cloudinary Dashboard → Settings → Account Details |
| `CLOUDINARY_API_SECRET` | Cloudinary Dashboard → Settings → Account Details |
| `RESEND_API_KEY` | Resend Dashboard → API Keys |
| `RESEND_FROM_EMAIL` | Your verified email domain in Resend |
| `GROQ_API_KEY` | Groq Dashboard → API Keys |
| `FRONTEND_URL` | Your frontend deployment URL |
| `CLIENT_URL` | Same as FRONTEND_URL |

---

## 🔍 After Adding Variables

1. ✅ Click **Save Changes**
2. ✅ Wait for automatic deployment (2-5 minutes)
3. ✅ Check logs for errors
4. ✅ Test: `https://your-backend.onrender.com/health`

---

## ⚠️ Important Notes

- **No quotes needed** - Render adds them automatically
- **No spaces** - Make sure values don't have leading/trailing spaces
- **Case sensitive** - Variable names must match exactly
- **Service role key** - Keep this secret! Never commit to Git.

---

**Full guide:** See `RENDER_ENV_SETUP_GUIDE.md` for detailed instructions.

