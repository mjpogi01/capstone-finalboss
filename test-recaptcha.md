# Quick Test Guide

## Test reCAPTCHA Verification Endpoint

After restarting your server, you can test the verification endpoint:

### Using curl (PowerShell):
```powershell
# First, you need a valid reCAPTCHA token from the frontend
# Then test with:
curl -X POST http://localhost:4000/api/auth/verify-recaptcha `
  -H "Content-Type: application/json" `
  -d '{"token":"YOUR_TOKEN_HERE"}'
```

### Using Postman or Browser DevTools:
1. Complete reCAPTCHA on sign-in page
2. Open browser DevTools → Network tab
3. Look for the request to `/api/auth/verify-recaptcha`
4. Check the response - should show `"success": true`

## Expected Response (Success):
```json
{
  "success": true,
  "challenge_ts": "2025-01-19T12:00:00Z",
  "hostname": "localhost"
}
```

## Expected Response (Error - No Secret Key):
```json
{
  "success": false,
  "error": "Server configuration error: reCAPTCHA secret key not configured"
}
```

## Check Server Logs

After restart, look for:
- ✅ Server started successfully
- ✅ Environment variables loaded
- ✅ No errors about missing RECAPTCHA_SECRET_KEY

