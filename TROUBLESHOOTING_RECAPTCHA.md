# Troubleshooting reCAPTCHA Verification Error

If you're still seeing the error **"We detected that your site is not verifying reCAPTCHA solutions"**, follow these steps:

## 🔍 Step 1: Check Server Configuration

### For Local Development:

1. **Verify the secret key is in `server/.env`:**
   ```powershell
   Get-Content server\.env | Select-String -Pattern "RECAPTCHA_SECRET_KEY"
   ```
   Should show: `RECAPTCHA_SECRET_KEY=6LdUzg8sAAAAAIWwmQnZ2dzSVYzFSyHETkBjE6bg`

2. **Test the configuration endpoint:**
   - Start your server: `npm run server` or `npm run server:dev`
   - Visit: `http://localhost:4000/api/auth/verify-recaptcha/test`
   - Should return: `{"configured": true, "hasSecretKey": "Yes (hidden)"}`

3. **Check server logs:**
   - When you complete reCAPTCHA, you should see:
     - `🔍 reCAPTCHA verification request received`
     - `✅ RECAPTCHA_SECRET_KEY is configured, verifying with Google...`
     - `✅ reCAPTCHA verification successful`

### For Production (Render):

1. **Add Environment Variable in Render:**
   - Go to https://dashboard.render.com
   - Select your **backend service** (not frontend)
   - Click **Environment** tab
   - Add new variable:
     - **Key**: `RECAPTCHA_SECRET_KEY`
     - **Value**: `6LdUzg8sAAAAAIWwmQnZ2dzSVYzFSyHETkBjE6bg`
   - Click **Save Changes** (this will redeploy)

2. **Test after redeploy:**
   - Visit: `https://your-app.onrender.com/api/auth/verify-recaptcha/test`
   - Should return: `{"configured": true}`

3. **Wait for Google to update:**
   - It can take 24-48 hours for Google to recognize verification activity
   - The error message may persist until Google detects successful verifications

## 🔍 Step 2: Verify the Endpoint is Being Called

1. **Open browser DevTools:**
   - Press F12
   - Go to **Network** tab
   - Filter by `verify-recaptcha`

2. **Complete reCAPTCHA on sign-in:**
   - Fill in email/password
   - Check the reCAPTCHA box
   - You should see a request to `/api/auth/verify-recaptcha`

3. **Check the response:**
   - Should show `200 OK` with `{"success": true}`

## 🔍 Step 3: Check Browser Console

1. **Open DevTools Console:**
   - Press F12
   - Go to **Console** tab

2. **Look for errors:**
   - `Failed to verify reCAPTCHA` - means verification endpoint failed
   - `Network error` - means endpoint is not reachable
   - `CORS error` - means CORS is blocking the request

## 🔍 Step 4: Check Server Logs

### Local Development:
Look in the terminal where your server is running for:
- ✅ `✅ reCAPTCHA verification successful` - Working!
- ❌ `⚠️ RECAPTCHA_SECRET_KEY is not set` - Missing environment variable
- ❌ `❌ reCAPTCHA verification failed` - Verification failed

### Production (Render):
1. Go to Render dashboard
2. Select your backend service
3. Click **Logs** tab
4. Look for verification messages

## 🚨 Common Issues

### Issue 1: "RECAPTCHA_SECRET_KEY is not set"

**Solution:**
- Local: Make sure `server/.env` has the key and server was restarted
- Production: Add the environment variable in Render and redeploy

### Issue 2: "Network error" or CORS error

**Solution:**
- Check that your API URL is correct in `src/config/api.js`
- For production, make sure `REACT_APP_API_URL` is set correctly
- Check CORS settings in `server/index.js`

### Issue 3: Verification endpoint not being called

**Solution:**
- Check browser Network tab to see if request is sent
- Verify `handleCaptchaChange` is being triggered in `SignInModal.js`
- Check for JavaScript errors in console

### Issue 4: Error persists in Google Console

**Solution:**
- Google needs to see successful verifications over time
- Complete several sign-ins with reCAPTCHA
- Wait 24-48 hours for Google to update statistics
- The message may persist even if verification is working correctly

## ✅ Verification Checklist

- [ ] `RECAPTCHA_SECRET_KEY` is in `server/.env` (local)
- [ ] `RECAPTCHA_SECRET_KEY` is in Render environment variables (production)
- [ ] Server has been restarted after adding environment variable
- [ ] Test endpoint `/api/auth/verify-recaptcha/test` returns `{"configured": true}`
- [ ] Browser Network tab shows request to `/api/auth/verify-recaptcha` when reCAPTCHA is completed
- [ ] Server logs show `✅ reCAPTCHA verification successful`
- [ ] No errors in browser console
- [ ] Completed multiple sign-ins with reCAPTCHA verification

## 📞 Still Having Issues?

1. **Check the test endpoint:**
   - Local: `http://localhost:4000/api/auth/verify-recaptcha/test`
   - Production: `https://your-app.onrender.com/api/auth/verify-recaptcha/test`

2. **Check server logs for errors**

3. **Verify the secret key is correct:**
   - Go to https://www.google.com/recaptcha/admin
   - Find your site key: `6LdUzg8sAAAAAM-2lXxMP1LeK8hYonnF0qC1CF1u`
   - Confirm the secret key matches: `6LdUzg8sAAAAAIWwmQnZ2dzSVYzFSyHETkBjE6bg`

4. **Wait 24-48 hours:**
   - Google may take time to update verification statistics
   - The error message may persist even if verification is working

