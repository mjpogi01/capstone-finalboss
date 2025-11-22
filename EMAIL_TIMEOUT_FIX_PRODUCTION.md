# Email Connection Timeout Fix - Production Deployment

## 🔴 The Issue

In production (Render), you're getting connection timeouts when trying to send order confirmation emails:

```
❌ Failed to send order confirmation email: Error: Connection timeout
code: 'ETIMEDOUT'
command: 'CONN'
```

**This means the connection to Gmail SMTP is timing out before it even connects.**

## 🎯 Root Causes

1. **Render/Cloud providers block SMTP ports** - Many free tier hosting providers block outbound SMTP connections (ports 465, 587)
2. **Network latency** - Production environments have slower network connections
3. **Gmail SMTP restrictions** - Gmail may restrict connections from certain IP ranges
4. **Connection pooling issues** - Reusing stale connections can cause problems

## ✅ Solutions Implemented

### 1. Made Email Completely Non-Blocking

**Before**: Order creation waited for email (could delay response)
**After**: Email runs in background, order responds immediately

- Orders are **never blocked** by email failures
- Users get instant confirmation even if email fails
- Email errors are logged but don't affect order creation

### 2. Increased Retries and Timeouts

- **Retries**: Up to 3 attempts (was 2)
- **Timeout per attempt**: 120 seconds in production (was 90s)
- **Connection timeout**: 60 seconds (was 10s)
- **Socket timeout**: 180 seconds (was 10s)
- **Recreates transporter** on retry for fresh connection

### 3. Improved TLS/SMTP Configuration

- **Uses STARTTLS** (port 587) instead of direct SSL (port 465) - better firewall compatibility
- **Modern TLS settings**: TLSv1.2+ with secure ciphers
- **Disabled connection pooling** to avoid stale connections
- **Better error detection** for CONN command timeouts

### 4. Better Error Handling

- **Non-blocking email sending** - fires and forgets
- **Detailed logging** in development, concise in production
- **Graceful degradation** - order succeeds even if email fails

## 📋 What Happens Now

### Order Creation Flow:

1. User places order ✅
2. Order saved to database ✅
3. **API responds immediately** ✅ (doesn't wait for email)
4. Email sending starts **in background** (non-blocking)
5. **If email succeeds**: Logged as success ✅
6. **If email fails**: Logged as warning, order still created ✅

### Email Retry Flow (in background):

1. **Attempt 1**: Try to connect (120s timeout)
   - **Success** → Send email → Done ✅
   - **Timeout** → Wait 2s, recreate transporter, retry

2. **Attempt 2**: Retry with fresh connection (120s timeout)
   - **Success** → Send email → Done ✅
   - **Timeout** → Wait 4s, recreate transporter, retry

3. **Attempt 3**: Final attempt (120s timeout)
   - **Success** → Send email → Done ✅
   - **Timeout** → Log failure, continue (order already created)

## 🔧 If SMTP Is Still Blocked

If you continue to get connection timeouts, **Render may be blocking SMTP ports**. Here are your options:

### Option 1: Use SendGrid (Recommended)

SendGrid is a dedicated email service that works well with cloud providers:

1. **Sign up**: https://sendgrid.com (free tier: 100 emails/day)
2. **Get API Key**: Dashboard → Settings → API Keys → Create Key
3. **Update `server/lib/emailService.js`**:

```javascript
this.transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  secure: false,
  auth: {
    user: 'apikey', // Literally the string 'apikey'
    pass: process.env.SENDGRID_API_KEY // Your SendGrid API key
  },
  connectionTimeout: 60000,
  greetingTimeout: 30000,
  socketTimeout: 180000
});
```

4. **Add to environment variables**:
   ```
   SENDGRID_API_KEY=your_api_key_here
   ```

### Option 2: Use Mailgun

Similar to SendGrid:

1. **Sign up**: https://mailgun.com (free tier: 100 emails/day for 3 months)
2. **Get API credentials**: Dashboard → Sending → Domain Settings
3. **Update configuration** similar to SendGrid

### Option 3: Use SMTP Relay Service

Services like **AWS SES**, **Postmark**, or **SparkPost** also work well.

### Option 4: Check Render Network Settings

Some Render plans allow SMTP:
- Check Render dashboard → Your Service → Settings
- Look for "Network" or "Firewall" settings
- Verify outbound SMTP (ports 587, 465) is allowed
- Free tier may restrict this

## 🧪 Testing After Fix

After deploying, test an order and check logs:

**Success:**
```
📧 Order confirmation email sent for order ORD-xxx
```

**Retry (normal):**
```
⚠️ Email send attempt 1/3 failed (ETIMEDOUT: Connection timeout). Retrying in 2s...
📧 Order confirmation email sent for order ORD-xxx
```

**Final failure (after retries):**
```
⚠️ Email send attempt 1/3 failed (ETIMEDOUT: Connection timeout). Retrying in 2s...
⚠️ Email send attempt 2/3 failed (ETIMEDOUT: Connection timeout). Retrying in 4s...
⚠️ Email send attempt 3/3 failed (ETIMEDOUT: Connection timeout).
❌ Failed to send order confirmation email for order ORD-xxx: ETIMEDOUT: Connection timeout
```

**Important**: Even if all retries fail, **the order is still created successfully!**

## 📊 Expected Behavior

- ✅ **Order creation**: Always succeeds, never blocked by email
- ✅ **Email sending**: Happens in background (non-blocking)
- ✅ **User experience**: Instant order confirmation
- ✅ **Retry logic**: Up to 3 attempts with exponential backoff
- ✅ **Error logging**: Detailed in dev, concise in production

## 💡 Recommendations

1. **Monitor email success rate** in production logs
2. **If timeouts persist**: Consider switching to SendGrid/Mailgun
3. **Set up alerts** if email failures exceed 50% (might indicate SMTP blocking)
4. **Test email service** after each deployment
5. **Keep credentials secure** - never commit to git

## 🔒 Security Notes

- ✅ Email credentials stored in environment variables
- ✅ Non-blocking email prevents DoS via slow SMTP
- ✅ Modern TLS configuration (TLSv1.2+)
- ✅ Error messages don't expose sensitive details

---

**Next Steps**: Deploy and monitor logs. If connection timeouts persist after 3 retries, Render likely blocks SMTP - switch to SendGrid or Mailgun.


