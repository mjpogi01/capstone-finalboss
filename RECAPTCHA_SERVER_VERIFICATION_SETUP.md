# reCAPTCHA Server-Side Verification Setup

This guide explains how to set up server-side verification for reCAPTCHA to fix the "We detected that your site is not verifying reCAPTCHA solutions" error.

## ✅ What Was Fixed

1. **Backend Verification Endpoint**: Created `/api/auth/verify-recaptcha` endpoint that verifies reCAPTCHA tokens with Google's API
2. **Frontend Integration**: Updated `SignInModal.js` to verify reCAPTCHA tokens on the server before allowing login
3. **Proper Error Handling**: Added comprehensive error handling for verification failures

## 🔧 Required Setup

### Step 1: Your reCAPTCHA Keys

**Site Key (for frontend):** `6LdUzg8sAAAAAM-2lXxMP1LeK8hYonnF0qC1CF1u`  
**Secret Key (for backend):** `6LdUzg8sAAAAAIWwmQnZ2dzSVYzFSyHETkBjE6bg`

The Site Key is already configured in the frontend code. The Secret Key needs to be added to your server environment variables.

### Step 2: Add Secret Key to Server Environment Variables

#### For Local Development:

✅ **Already added!** The secret key has been added to `server/.env`:
```
RECAPTCHA_SECRET_KEY=6LdUzg8sAAAAAIWwmQnZ2dzSVYzFSyHETkBjE6bg
```

If you need to add it manually:
1. Open `server/.env` file
2. Add the following line:
   ```
   RECAPTCHA_SECRET_KEY=6LdUzg8sAAAAAIWwmQnZ2dzSVYzFSyHETkBjE6bg
   ```

#### For Production (Render):

1. Go to your Render dashboard
2. Select your backend service
3. Go to **Environment** tab
4. Click **Add Environment Variable**
5. Add:
   - **Key**: `RECAPTCHA_SECRET_KEY`
   - **Value**: `6LdUzg8sAAAAAIWwmQnZ2dzSVYzFSyHETkBjE6bg`
6. Save and redeploy your service

### Step 3: Verify Setup

1. Start your server locally or wait for Render to redeploy
2. Try signing in with the reCAPTCHA widget
3. The server should now verify the reCAPTCHA token before allowing login
4. Check server logs for any verification errors

## 📝 How It Works

1. **User completes reCAPTCHA**: When user checks the reCAPTCHA box, a token is generated
2. **Frontend sends token**: The token is sent to `/api/auth/verify-recaptcha` endpoint
3. **Server verifies with Google**: Backend sends token to Google's verification API with your secret key
4. **Google responds**: Google validates the token and returns success/failure
5. **Login proceeds**: If verification succeeds, user can proceed with login

## 🔍 Troubleshooting

### Error: "reCAPTCHA secret key not configured"
- **Solution**: Make sure `RECAPTCHA_SECRET_KEY` is set in your server environment variables

### Error: "reCAPTCHA verification failed"
- **Possible causes**:
  - Wrong secret key
  - Token expired (reCAPTCHA tokens expire after 2 minutes)
  - Domain mismatch (make sure your domain is added in Google reCAPTCHA console)

### Verification always fails
- **Check**: Ensure the Secret Key matches the Site Key pair in Google reCAPTCHA console
- **Verify**: Your domain is added to the reCAPTCHA site settings

## 📚 Additional Resources

- [Google reCAPTCHA Documentation](https://developers.google.com/recaptcha/docs/verify)
- [reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)

## ✅ Verification Checklist

- [ ] `RECAPTCHA_SECRET_KEY` added to `server/.env` (local)
- [ ] `RECAPTCHA_SECRET_KEY` added to Render environment variables (production)
- [ ] Server restarted/redeployed after adding environment variable
- [ ] Test sign-in with reCAPTCHA
- [ ] Check server logs for verification success/failure messages
- [ ] Verify Google reCAPTCHA console shows verification activity

