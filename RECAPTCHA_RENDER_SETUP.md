# Google reCAPTCHA Domain Settings for Render

## 🌐 Your Render URL

Your Render URL is:
```
https://yohanns-sportswear.onrender.com
```

---

## 📋 Google reCAPTCHA Domain Configuration

### Step 1: Go to Google reCAPTCHA Admin Console

1. **Visit:** [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
2. **Sign in** with your Google account
3. **Select your reCAPTCHA site** (the one using key: `6LdUzg8sAAAAAM-2lXxMP1LeK8hYonnF0qC1CF1u`)

---

### Step 2: Add Domains

**Go to:** Your reCAPTCHA Site → **Settings** → **Domains**

**Add these domains (one per line):**

```
yohanns-sportswear.onrender.com
localhost
127.0.0.1
```

**Important:**
- ✅ Add ONLY the domain name (no `https://`, no `/`, no port numbers)
- ✅ For Render: Add `yohanns-sportswear.onrender.com`
- ✅ Keep `localhost` and `127.0.0.1` for local development
- ✅ Don't include protocol (`http://` or `https://`)
- ✅ Don't include paths (`/` or `/auth/callback`)

---

### Step 3: Save Changes

1. Click **Save** at the bottom
2. Wait a few minutes for changes to propagate
3. Test reCAPTCHA on your Render site

---

## ✅ Quick Reference

| Domain Type | What to Add |
|-------------|-------------|
| **Render Production** | `yohanns-sportswear.onrender.com` |
| **Local Development** | `localhost` |
| **Local IP** | `127.0.0.1` |

---

## 🧪 Testing

1. **Visit your Render site:**
   ```
   https://yohanns-sportswear.onrender.com
   ```

2. **Test reCAPTCHA:**
   - Go to Sign In page
   - reCAPTCHA should load and work correctly ✅
   - If it shows "reCAPTCHA unavailable", the domain might not be added yet

---

## 🔍 Finding Your reCAPTCHA Site Key

Your current reCAPTCHA site key is:
```
6LdUzg8sAAAAAM-2lXxMP1LeK8hYonnF0qC1CF1u
```

**To find your site in Google Console:**
1. Go to [reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
2. Look for a site with this key
3. If you can't find it, you may need to check your site key in:
   - `.env` file (variable: `REACT_APP_RECAPTCHA_SITE_KEY`)
   - Render Dashboard → Environment Variables
   - `src/components/customer/SignInModal.js` (default fallback)

---

## 🚨 Troubleshooting

**reCAPTCHA not showing on Render:**
- ✅ Make sure `yohanns-sportswear.onrender.com` is added to domains
- ✅ Wait 5-10 minutes for changes to propagate
- ✅ Check browser console for errors
- ✅ Verify site key is correct in environment variables

**"reCAPTCHA unavailable" error:**
- Check that domain is added in Google Console
- Verify site key matches in both Google Console and your app
- Clear browser cache and try again
- Wait for domain changes to propagate

**Local development works but Render doesn't:**
- Make sure Render domain is added (not just localhost)
- Check environment variables in Render Dashboard
- Verify `REACT_APP_RECAPTCHA_SITE_KEY` is set in Render

---

## 📝 Environment Variables in Render

Make sure this is set in Render Dashboard → Environment:

```env
REACT_APP_RECAPTCHA_SITE_KEY=6LdUzg8sAAAAAM-2lXxMP1LeK8hYonnF0qC1CF1u
```

**To Update:**
1. Go to Render Dashboard → Your Service
2. Click **Environment** tab
3. Add/Update `REACT_APP_RECAPTCHA_SITE_KEY`
4. Click **Save Changes** (auto-redeploys)

---

## ✅ Checklist

- [ ] `yohanns-sportswear.onrender.com` added to reCAPTCHA domains
- [ ] `localhost` added to reCAPTCHA domains (for development)
- [ ] `REACT_APP_RECAPTCHA_SITE_KEY` set in Render environment variables
- [ ] Site key matches in Google Console and environment variables
- [ ] reCAPTCHA tested on Render production URL
- [ ] reCAPTCHA tested on localhost (still works)

---

**Need help?** Check Google reCAPTCHA docs: https://developers.google.com/recaptcha/docs/domain_validation

