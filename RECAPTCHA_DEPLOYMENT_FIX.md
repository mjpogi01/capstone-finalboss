# reCAPTCHA Deployment Fix Guide

## 🚨 Issue
reCAPTCHA is showing "failed to load" error on deployment at `https://yohanns-sportswear.onrender.com`

## ✅ Solution Steps

### Step 1: Add Domain to Google reCAPTCHA Console

1. **Go to Google reCAPTCHA Admin:**
   - Visit: https://www.google.com/recaptcha/admin
   - Sign in with your Google account

2. **Find Your reCAPTCHA Site:**
   - Look for the site with key: `6LdUzg8sAAAAAM-2lXxMP1LeK8hYonnF0qC1CF1u`
   - Click on it to open settings

3. **Add Render Domain:**
   - Go to: **Settings** → **Domains**
   - In the "Domains" section, add:
     ```
     yohanns-sportswear.onrender.com
     ```
   - **Important:** Add ONLY the domain name (no `https://`, no `/`, no port)
   - Click **Save**

4. **Wait for Propagation:**
   - Changes can take 5-10 minutes to propagate
   - Clear browser cache and test again

### Step 2: Verify Environment Variable in Render

1. **Go to Render Dashboard:**
   - Navigate to your service: https://dashboard.render.com
   - Select your frontend service

2. **Check Environment Variables:**
   - Go to **Environment** tab
   - Verify `REACT_APP_RECAPTCHA_SITE_KEY` is set to:
     ```
     REACT_APP_RECAPTCHA_SITE_KEY=6LdUzg8sAAAAAM-2lXxMP1LeK8hYonnF0qC1CF1u
     ```

3. **If Missing, Add It:**
   - Click **Add Environment Variable**
   - Key: `REACT_APP_RECAPTCHA_SITE_KEY`
   - Value: `6LdUzg8sAAAAAM-2lXxMP1LeK8hYonnF0qC1CF1u`
   - Click **Save Changes** (will auto-redeploy)

### Step 3: Test After Changes

1. **Wait 5-10 minutes** after adding domain
2. **Clear browser cache** (Ctrl+Shift+Delete or Cmd+Shift+Delete)
3. **Visit:** https://yohanns-sportswear.onrender.com
4. **Test Sign In:**
   - Click Sign In
   - reCAPTCHA should load properly
   - If it still shows "unavailable", wait a bit longer and try again

## 🔧 What Was Fixed in Code

The following improvements were made to handle reCAPTCHA loading better:

1. **Better Script Loading:**
   - Added `render=explicit` parameter to reCAPTCHA script
   - Improved script loading detection
   - Added fallback script loading if initial load fails

2. **Improved Error Handling:**
   - Less alarming error messages
   - Users can still sign in even if reCAPTCHA fails
   - Better visual feedback with warning instead of error

3. **Domain Configuration Help:**
   - Error message now includes helpful domain configuration tip
   - Clear instructions on what domain to add

## 📋 Quick Checklist

- [ ] `yohanns-sportswear.onrender.com` added to Google reCAPTCHA domains
- [ ] `REACT_APP_RECAPTCHA_SITE_KEY` set in Render environment variables
- [ ] Waited 5-10 minutes for changes to propagate
- [ ] Cleared browser cache
- [ ] Tested sign in on production URL
- [ ] reCAPTCHA loads successfully

## 🆘 Still Not Working?

If reCAPTCHA still doesn't work after following these steps:

1. **Double-check domain spelling:**
   - Must be exactly: `yohanns-sportswear.onrender.com`
   - No `https://`, no trailing `/`, no port numbers

2. **Verify site key:**
   - Check that the site key in Google Console matches: `6LdUzg8sAAAAAM-2lXxMP1LeK8hYonnF0qC1CF1u`
   - Check that Render environment variable matches exactly

3. **Check browser console:**
   - Open browser DevTools (F12)
   - Look for reCAPTCHA-related errors
   - Check Network tab for failed requests to `recaptcha/api.js`

4. **Try incognito/private mode:**
   - Sometimes browser extensions or cache can interfere

5. **Contact Support:**
   - If domain is correctly added and still not working, there may be an issue with the reCAPTCHA site configuration
   - Check Google reCAPTCHA documentation: https://developers.google.com/recaptcha/docs/domain_validation

## ✅ Success Indicators

When reCAPTCHA is working correctly:
- ✅ reCAPTCHA widget appears in sign-in modal
- ✅ No error messages about reCAPTCHA failing to load
- ✅ Users can check the reCAPTCHA box
- ✅ Sign in works normally

## 📝 Note

Even if reCAPTCHA fails to load, users can still sign in. The application will show a warning but allow login to proceed. However, it's recommended to fix the domain configuration for proper security.

