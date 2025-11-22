# Frontend Environment Variables Setup

If you're deploying your frontend separately (e.g., on Vercel, Netlify, or Hostinger), you'll need these environment variables.

## 📋 Required Frontend Environment Variables

### **Supabase (REQUIRED)**
```
REACT_APP_SUPABASE_URL=https://kjqcswjljgavigyfzauj.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

**How to get:**
1. Go to Supabase Dashboard → Settings → API
2. Copy **Project URL** → `REACT_APP_SUPABASE_URL`
3. Copy **anon/public** key → `REACT_APP_SUPABASE_ANON_KEY`
   - ⚠️ Use the **anon** key, NOT the service_role key!

### **Backend API URL (REQUIRED)**
```
REACT_APP_API_URL=https://your-backend.onrender.com
```

**Example:**
- If your backend is on Render: `https://your-api.onrender.com`
- If your backend is on another service: `https://api.yourdomain.com`

---

## 🚀 Setup by Platform

### **Vercel**
1. Go to your project → **Settings** → **Environment Variables**
2. Add each variable
3. Select environment (Production, Preview, Development)
4. Redeploy

### **Netlify**
1. Go to **Site settings** → **Environment variables**
2. Add each variable
3. Redeploy

### **Hostinger**
1. Go to **File Manager** → Create `.env.production` file in project root
2. Add variables in format: `REACT_APP_VARIABLE_NAME=value`
3. Rebuild: `npm run build`
4. Upload new build folder

### **Render (Frontend Service)**
1. Go to your frontend service → **Environment**
2. Add each variable
3. Save and redeploy

---

## 📝 Complete Frontend .env Example

Create `.env.production` file:

```env
# Supabase
REACT_APP_SUPABASE_URL=https://kjqcswjljgavigyfzauj.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Backend API
REACT_APP_API_URL=https://your-backend.onrender.com
```

---

## ⚠️ Important Notes

1. **Prefix with `REACT_APP_`** - React only exposes variables starting with this prefix
2. **Rebuild after changes** - Environment variables are baked into the build
3. **Never commit `.env` files** - They're in `.gitignore` for a reason
4. **Use anon key** - Frontend should use the anon/public key, never service_role key

---

## 🔍 Verification

After deployment, check browser console:
- Should see: `🔗 API URL: https://your-backend.onrender.com`
- Should see: `📱 Mobile Device: false/true`
- No errors about missing Supabase configuration

---

**Backend setup:** See `RENDER_ENV_SETUP_GUIDE.md` for backend environment variables.

