# Fix reCAPTCHA Domain Configuration

## 🎯 The Problem

The error message shows the **wrong domain** (`yohanns-sportswear.onrender.com`), but your **frontend is on Hostinger**, not Render!

**reCAPTCHA domains must match where your FRONTEND runs**, not the backend.

---

## ✅ The Solution

### Step 1: Add Your Hostinger Domain to Google reCAPTCHA

**You need to add your Hostinger domain, not the Render domain!**

1. **Go to Google reCAPTCHA Console:**
   - Visit [google.com/recaptcha/admin](https://www.google.com/recaptcha/admin)
   - Sign in with your Google account

2. **Select Your reCAPTCHA Site:**
   - Find your site (the one with key `6LdUzg8sAAAAAM-2lXxMP1LeK8hYonnF0qC1CF1u`)
   - Click on it to edit

3. **Add Your Hostinger Domain:**
   - Scroll to **"Domains"** section
   - Click **"Add Domain"** or **"+"**
   - Add your Hostinger domain:
     - `yourdomain.com` (e.g., `yohanns.com`)
     - `www.yourdomain.com` (if you use www)
     - `*.yourdomain.com` (if you have subdomains)

4. **Save Changes:**
   - Click **"Submit"** or **"Save"**
   - Wait 1-2 minutes for changes to propagate

---

## 📝 Which Domain to Add

### ✅ CORRECT: Add Hostinger Domain

**Since your frontend runs on Hostinger, add:**
- `yourdomain.com` (your actual Hostinger domain)
- `www.yourdomain.com` (if you use www)
- `localhost` (for local development)

**Example:**
- If your Hostinger domain is `yohanns-sportswear.com`, add:
  - `yohanns-sportswear.com`
  - `www.yohanns-sportswear.com`
  - `localhost` (for testing)

### ❌ WRONG: Don't Add Render Domain

**Don't add:**
- ❌ `yohanns-api.onrender.com` (backend domain - not needed!)
- ❌ `yohanns-sportswear.onrender.com` (old/wrong domain)

**Why:**
- reCAPTCHA runs in the **browser (frontend)**
- Your frontend is on **Hostinger**, not Render
- Render domain is only for API calls (doesn't need reCAPTCHA)

---

## 🔧 Updated Code Fix

I've updated the error message in `SignInModal.js` to show the **correct domain** (your actual Hostinger domain) instead of the hardcoded Render domain.

**The error message will now dynamically show:**
- Your actual Hostinger domain (e.g., `yohanns-sportswear.com`)
- Not the hardcoded Render domain

**To apply this fix:**
1. The code is already updated in `src/components/customer/SignInModal.js`
2. Rebuild your app:
   ```powershell
   cd C:\capstone2\capstone2
   npm run build
   ```
3. Upload new `build/` contents to Hostinger

---

## 📊 Domain Architecture

### Your Setup:

```
Frontend (React) on Hostinger:
└── https://yourdomain.com           ← reCAPTCHA runs here!
    └── reCAPTCHA widget loads here

Backend (Express) on Render:
└── https://yohanns-api.onrender.com  ← API calls here (no reCAPTCHA needed)
```

**reCAPTCHA needs to be configured for:**
- ✅ Hostinger domain (where users see the reCAPTCHA widget)
- ❌ NOT Render domain (backend doesn't need it)

---

## ✅ Complete Checklist

### 1. Add Domain to Google reCAPTCHA
- [ ] Go to [google.com/recaptcha/admin](https://www.google.com/recaptcha/admin)
- [ ] Select your reCAPTCHA site
- [ ] Add your Hostinger domain (e.g., `yourdomain.com`)
- [ ] Add `www.yourdomain.com` (if you use www)
- [ ] Add `localhost` (for local testing)
- [ ] Save changes

### 2. Update Code (Optional)
- [ ] Code is already updated (shows correct domain)
- [ ] Rebuild app: `npm run build`
- [ ] Upload new build to Hostinger

### 3. Test
- [ ] Wait 1-2 minutes for Google changes to propagate
- [ ] Visit your site: `https://yourdomain.com`
- [ ] Open login modal
- [ ] reCAPTCHA should now load correctly! ✅

---

## 🐛 Troubleshooting

### reCAPTCHA Still Not Working?

**Check these:**

1. **Domain added correctly:**
   - Verify domain is added in Google reCAPTCHA console
   - Check spelling (exact match required)
   - Include `www.` version if you use it

2. **Wait for propagation:**
   - Google changes can take 1-5 minutes
   - Clear browser cache after adding domain

3. **Check site key:**
   - Verify site key in code matches Google console
   - Site key: `6LdUzg8sAAAAAM-2lXxMP1LeK8hYonnF0qC1CF1u`

4. **Test locally:**
   - Add `localhost` to reCAPTCHA domains
   - Test on localhost first

5. **Check browser console:**
   - Press `F12` → Console tab
   - Look for reCAPTCHA errors
   - Common errors:
     - "Invalid domain" → Domain not added
     - "Invalid site key" → Wrong site key

---

## 📝 Summary

**The fix:**

1. **Add your Hostinger domain** to Google reCAPTCHA (not Render domain)
   - Go to [google.com/recaptcha/admin](https://www.google.com/recaptcha/admin)
   - Add: `yourdomain.com`, `www.yourdomain.com`, `localhost`

2. **Code is already fixed** (shows correct domain in error message)
   - Rebuild and re-upload if you want updated error message

3. **Wait 1-2 minutes** for Google changes to propagate

4. **Test** - reCAPTCHA should work! ✅

**Remember:**
- Frontend = Hostinger → Needs reCAPTCHA domain
- Backend = Render → Doesn't need reCAPTCHA domain

---

**That's it!** Add your Hostinger domain to Google reCAPTCHA and it should work! 🎉











