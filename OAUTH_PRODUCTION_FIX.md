# Fix Google OAuth Redirect to Localhost in Production

This guide will help you fix the issue where Google OAuth redirects to localhost instead of your production URL.

## 🔴 The Problem

When you try to sign in with Google on your **deployed production app**, you're being redirected to `http://localhost:3000` instead of your production URL. This happens because:

1. **Supabase Auth Site URL** is set to `http://localhost:3000` in the dashboard
2. **Google OAuth credentials** only have localhost redirect URIs configured
3. **Environment variables** might not be set in your deployment platform

## ✅ Solution (4 Steps)

### Step 1: Update Supabase Auth Settings

1. **Go to Supabase Dashboard**
   - Visit: https://app.supabase.com
   - Select your project

2. **Navigate to Authentication → URL Configuration**
   - Go to: **Authentication** → **URL Configuration**

3. **Update Site URL**
   - **Site URL**: Change to your **production URL** (e.g., `https://your-app.onrender.com`)
   - **DO NOT** use `http://localhost:3000` here for production

4. **Update Redirect URLs**
   - **Redirect URLs**: Add **both** localhost AND production URLs:
     ```
     https://your-production-url.com/auth/callback
     https://your-production-url.com/**
     http://localhost:3000/auth/callback
     http://localhost:3000/**
     ```
   - Replace `your-production-url.com` with your actual production domain
   - Keep localhost URLs for local development

5. **Save Changes**

### Step 2: Update Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com
   - Select your project

2. **Navigate to APIs & Services → Credentials**
   - Go to: **APIs & Services** → **Credentials**

3. **Find your OAuth 2.0 Client ID**
   - Look for the OAuth client used by Supabase
   - Click to edit it

4. **Update Authorized redirect URIs**
   - Add these redirect URIs (you need **all three**):
     ```
     https://xnuzdzjfqhbpcnsetjif.supabase.co/auth/v1/callback
     https://your-production-url.com/auth/callback
     http://localhost:3000/auth/callback
     ```
   
   **Important Notes:**
   - The Supabase callback URL format is: `https://[YOUR_PROJECT_REF].supabase.co/auth/v1/callback`
   - Your project ref is: `xnuzdzjfqhbpcnsetjif` (from your supabase.js file)
   - Replace `your-production-url.com` with your actual production domain
   - Keep localhost for local development

5. **Save Changes**

### Step 3: Set Environment Variables in Your Deployment Platform

**Important:** React apps need environment variables to be available at **build time**. 

#### For Render:
1. Go to **Render Dashboard** → Your Service → **Environment**
2. Add these variables:
   ```
   REACT_APP_CLIENT_URL=https://your-production-url.com
   ```
3. **IMPORTANT:** After adding, you MUST **redeploy** your app because React environment variables are embedded at build time

#### For Railway:
1. Go to **Railway Dashboard** → Your Project → **Variables**
2. Add:
   ```
   REACT_APP_CLIENT_URL=https://your-production-url.com
   ```
3. **Redeploy** after adding

#### For Other Platforms:
- Set `REACT_APP_CLIENT_URL` to your production URL
- **Always redeploy** after adding React environment variables

**Why REACT_APP_ prefix?**
- React apps only have access to environment variables that start with `REACT_APP_`
- These variables are embedded into the JavaScript bundle at build time
- This is why you need to redeploy after adding them

### Step 4: Redeploy Your Application

After updating environment variables, you **MUST** redeploy:

1. **Trigger a new deployment** in your platform
2. **Wait for build to complete**
3. **Test Google sign-in** on your production URL

## 🔍 Verify Your Configuration

### Check 1: Supabase Dashboard
- [ ] Site URL = Your production URL (not localhost)
- [ ] Redirect URLs include both production and localhost

### Check 2: Google Cloud Console
- [ ] All three redirect URIs are added:
  - Supabase callback URL
  - Production callback URL  
  - Localhost callback URL

### Check 3: Environment Variables
- [ ] `REACT_APP_CLIENT_URL` is set to your production URL
- [ ] App has been **redeployed** after adding the variable

### Check 4: Browser Console
1. Open your production site
2. Open browser DevTools → Console
3. Click "Sign in with Google"
4. Look for log messages like:
   ```
   🔗 Using environment URL for OAuth redirect: https://your-production-url.com
   🔐 Initiating google OAuth with redirect to: https://your-production-url.com/auth/callback
   ```

## 🧪 Testing

1. **Clear Browser Cache**
   - Clear cookies and cache for your production site

2. **Test Google Sign In**
   - Go to your production URL (not localhost)
   - Click "Sign in with Google"
   - You should be redirected to Google, then back to **your production URL** (not localhost)

3. **Verify Redirect**
   - After Google login, you should land on: `https://your-production-url.com/auth/callback`
   - NOT on `http://localhost:3000`

## 🚨 Troubleshooting

### Still redirecting to localhost?

**Problem:** The code is using `window.location.origin` but Supabase is overriding it.

**Solution:**
1. **Check Supabase Site URL** - This is the most common issue!
   - Make sure Site URL is your production URL, NOT localhost
   - Supabase uses this as a fallback if redirectTo fails

2. **Verify Environment Variable**
   - Check browser console for the log message
   - If it says "Using current origin" instead of "Using environment URL", the variable isn't set correctly
   - Make sure you redeployed after adding `REACT_APP_CLIENT_URL`

3. **Check Google OAuth Redirect URIs**
   - Make sure production URL is in the list
   - Google will reject redirects to URLs not in the list

### Getting "redirect_uri_mismatch" error?

This means Google doesn't recognize your redirect URI.

**Solution:**
1. Check that your production URL is **exactly** in Google's Authorized redirect URIs
2. Make sure there are no typos (including `https://` vs `http://`)
3. Wait a few minutes after updating - Google can take time to propagate changes

### Environment variable not working?

**Problem:** `REACT_APP_CLIENT_URL` is set but code still uses localhost.

**Solution:**
1. React env vars are embedded at **build time**
2. You must **rebuild and redeploy** after adding/updating them
3. Check the built JavaScript to see if the variable is present

## 📝 Quick Checklist

- [ ] Supabase Site URL = Production URL (not localhost)
- [ ] Supabase Redirect URLs = Both production and localhost
- [ ] Google OAuth URIs = All three (Supabase, production, localhost)
- [ ] `REACT_APP_CLIENT_URL` = Production URL (in deployment platform)
- [ ] App **redeployed** after adding environment variable
- [ ] Browser cache cleared
- [ ] Tested Google sign-in on production URL

## 💡 Key Points to Remember

1. **Supabase Site URL** is the #1 cause of this issue - make sure it's your production URL!
2. **React environment variables** must be set with `REACT_APP_` prefix
3. **You must redeploy** after adding React environment variables (they're embedded at build time)
4. **Keep localhost URLs** in both Supabase and Google for local development
5. **The code now logs** which URL it's using - check browser console for debugging

---

**Need Help?** 
- Check browser console for the redirect URL being used
- Verify Supabase Site URL is correct (most common issue)
- Make sure you redeployed after adding environment variables

