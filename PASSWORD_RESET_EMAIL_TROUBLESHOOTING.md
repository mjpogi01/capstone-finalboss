# Password Reset Email Troubleshooting

## Quick Checks

### 1. Check Environment Variables

Make sure these are set in your `server/.env` file:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

**To verify:**
```bash
# In your server directory
node -e "require('dotenv').config(); console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'SET' : 'NOT SET'); console.log('RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL || 'NOT SET');"
```

### 2. Check Server Logs

When you request a password reset, look for these log messages:

**✅ Success logs:**
```
✅ Resend email client initialized
🔗 Generating recovery link for: user@example.com
✅ Recovery link generated: https://...
📧 Attempting to send password reset email to: user@example.com
✅ Custom password reset email sent successfully to: user@example.com
📧 Email Details:
   - Recipient: user@example.com
   - Subject: Reset Your Password - Yohanns
   - Message ID: xxxxx
```

**❌ Error logs to watch for:**
```
⚠️ Email service not configured: RESEND_API_KEY not set
⚠️ Email service not configured: RESEND_FROM_EMAIL not set
❌ Failed to generate recovery link: ...
❌ Failed to send custom password reset email: ...
```

### 3. Test Email Service Directly

Create a test file `server/test-email.js`:

```javascript
require('dotenv').config({ path: '.env' });
const emailService = require('./lib/emailService');

async function testEmail() {
  console.log('Testing email service...');
  console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'SET' : 'NOT SET');
  console.log('RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL || 'NOT SET');
  
  const result = await emailService.sendPasswordResetEmail(
    'your-test-email@example.com',
    'https://example.com/auth/reset-password?token=test',
    'Test User'
  );
  
  console.log('Result:', result);
}

testEmail();
```

Run it:
```bash
node server/test-email.js
```

### 4. Check Resend Dashboard

1. Go to [Resend Dashboard](https://resend.com/emails)
2. Check if emails are being sent
3. Check for any errors or bounces
4. Verify your domain is verified (if using custom domain)

### 5. Common Issues

#### Issue: "Email service not configured"
**Solution:** Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in `.env` file

#### Issue: "Failed to generate recovery link"
**Solution:** Check Supabase service role key is correct

#### Issue: Email sent but not received
**Solutions:**
- Check spam folder
- Verify email address is correct
- Check Resend dashboard for delivery status
- Verify domain is verified in Resend

#### Issue: "getUserByEmail is not a function"
**Solution:** This is handled with fallback to `listUsers()` - should not block email sending

### 6. Debug Steps

1. **Check if endpoint is being called:**
   - Look for: `POST /api/auth/reset-password` in server logs

2. **Check if user exists:**
   - Look for: `User found` or `User not found` in logs

3. **Check if link is generated:**
   - Look for: `✅ Recovery link generated` in logs

4. **Check if email is sent:**
   - Look for: `✅ Custom password reset email sent successfully` in logs

5. **Check Resend response:**
   - Look for: `Message ID: xxxxx` in logs
   - Verify in Resend dashboard

### 7. Fallback Behavior

If custom email fails, the system will:
1. Try to send Supabase's default email as fallback
2. Log: `⚠️ Falling back to resetPasswordForEmail`
3. You should receive Supabase's email instead

### 8. Manual Test

Test the endpoint directly:

```bash
curl -X POST http://localhost:4000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com"}'
```

Check server logs for detailed output.

