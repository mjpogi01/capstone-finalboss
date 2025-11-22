# Fix Google OAuth "localhost not reachable" Error

This guide will help you fix the Google OAuth redirect issue when deploying to production.

## 🔴 The Problem

When you try to sign in with Google on your deployed app, you get an error saying "localhost is not reachable". This happens because:

1. **Supabase Auth** is configured with localhost redirect URLs
2. **Google OAuth** credentials are set to localhost
3. The code doesn't specify the production redirect URL

## ✅ Solution (3 Steps)

### Step 1: Update Supabase Auth Settings

1. **Go to Supabase Dashboard**
   - Visit: https://app.supabase.com
   - Select your project

2. **Navigate to Authentication → URL Configuration**
   - Go to: **Authentication** → **URL Configuration**

3. **Update Site URL**
   - **Site URL**: `https://your-app.onrender.com` (your production URL)
   - **Redirect URLs**: Add these:
     ```
     https://your-app.onrender.com/auth/callback
     https://your-app.onrender.com/**
     http://localhost:3000/auth/callback
     http://localhost:3000/**
     ```

4. **Save Changes**

### Step 2: Update Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com
   - Select your project (or create one)

2. **Navigate to APIs & Services → Credentials**
   - Go to: **APIs & Services** → **Credentials**

3. **Find your OAuth 2.0 Client ID**
   - Look for the OAuth client used by Supabase
   - Click to edit it

4. **Update Authorized redirect URIs**
   - Add these redirect URIs:
     ```
     https://your-project-ref.supabase.co/auth/v1/callback
     https://your-app.onrender.com/auth/callback
     http://localhost:3000/auth/callback
     ```
   
   **Note**: The Supabase callback URL format is:
   ```
   https://[YOUR_PROJECT_REF].supabase.co/auth/v1/callback
   ```
   You can find your project ref in Supabase Dashboard → Settings → API

5. **Save Changes**

### Step 3: Update Environment Variables in Render

1. **Go to Render Dashboard**
   - Visit: https://dashboard.render.com
   - Select your service

2. **Go to Environment Tab**
   - Click **Environment** in the sidebar

3. **Add/Update These Variables:**
   ```
   CLIENT_URL=https://your-app.onrender.com
   REACT_APP_CLIENT_URL=https://your-app.onrender.com
   ```

4. **Redeploy**
   - Render will auto-redeploy when you save
   - Or manually: **Manual Deploy** → **Deploy latest commit**

## 🧪 Testing

1. **Clear Browser Cache**
   - Clear cookies and cache for your production site

2. **Test Google Sign In**
   - Go to your production site
   - Click "Sign in with Google"
   - Should redirect to Google, then back to your app

3. **Check Browser Console**
   - Open DevTools → Console
   - Look for any errors

## 🔍 Troubleshooting

### Still seeing localhost error?

1. **Check Supabase Site URL**
   - Make sure it's set to your production URL (not localhost)

2. **Verify Redirect URLs**
   - In Supabase: Check that production URL is in the list
   - In Google Cloud: Check that Supabase callback URL is added

3. **Check Environment Variables**
   - Verify `CLIENT_URL` is set correctly in Render
   - Rebuild and redeploy if needed

4. **Wait for Propagation**
   - Google OAuth changes can take a few minutes to propagate
   - Supabase changes are usually instant

### Getting CORS errors?

- Make sure your production URL is in Supabase's allowed origins
- Check that `FRONTEND_URL` or `CLIENT_URL` is set in backend environment variables

### Redirect goes to wrong page?

- The callback route `/auth/callback` should handle the redirect
- Check that the route is added in `App.js`
- Verify the `AuthCallback` component exists

## 📝 Quick Checklist

- [ ] Supabase Site URL updated to production URL
- [ ] Supabase Redirect URLs include production callback
- [ ] Google OAuth redirect URIs updated
- [ ] Supabase callback URL added to Google OAuth
- [ ] `CLIENT_URL` set in Render environment variables
- [ ] App redeployed after changes
- [ ] Browser cache cleared
- [ ] Tested Google sign in

## 🎯 What Changed in the Code

1. **`src/services/authService.js`**
   - Added `redirectTo` option to OAuth sign-in
   - Uses `window.location.origin` for automatic detection

2. **`src/pages/customer/AuthCallback.js`** (NEW)
   - Handles OAuth callback
   - Redirects users based on their role

3. **`src/App.js`**
   - Added `/auth/callback` route

## 💡 Pro Tips

- **Keep localhost URLs** in both Supabase and Google for local development
- **Test locally first** before deploying
- **Use environment variables** for different environments
- **Monitor Supabase logs** for auth errors

---

**Need Help?** Check Supabase docs: https://supabase.com/docs/guides/auth/social-login


