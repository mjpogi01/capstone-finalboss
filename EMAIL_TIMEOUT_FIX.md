# Fix Email Timeout Error in Production

This guide explains the email timeout fix for production deployments (Render, Railway, etc.).

## 🔴 The Problem

When deploying to production, order confirmation emails were failing with:
```
❌ Failed to send order confirmation email: Error: Connection timeout
code: 'ETIMEDOUT'
command: 'CONN'
```

This happens because:
1. **Production networks are slower** - Connections take longer than development
2. **SMTP timeouts were too short** - 10 seconds isn't enough for production
3. **No retry logic** - Single failure caused email to fail completely
4. **Network instability** - Production environments can have intermittent connectivity issues

## ✅ Solution Implemented

### 1. Increased Timeout Settings for Production

The email service now uses different timeout values for production vs development:

**Development:**
- Connection Timeout: 10 seconds
- Greeting Timeout: 10 seconds  
- Socket Timeout: 10 seconds

**Production:**
- Connection Timeout: **60 seconds** (6x longer)
- Greeting Timeout: **30 seconds** (3x longer)
- Socket Timeout: **120 seconds** (12x longer)

### 2. Added Retry Logic with Exponential Backoff

- **Automatic retries**: Failed emails now retry up to 2 times
- **Exponential backoff**: Waits 2 seconds after first failure, 4 seconds after second
- **Smart error detection**: Only retries on timeout/connection errors

### 3. Connection Pooling in Production

- **Pooled connections**: Reuses connections for better performance
- **Max connections**: Up to 5 concurrent connections in production
- **Rate limiting**: Prevents overwhelming the SMTP server

### 4. Better Error Handling

- **Detailed error logging**: Logs specific error codes and messages
- **User-friendly messages**: Returns clear error descriptions
- **Non-blocking**: Email failures don't stop order creation

## 📝 Changes Made

### File: `server/lib/emailService.js`

1. **Updated transporter configuration**:
   - Increased timeouts based on `NODE_ENV`
   - Enabled connection pooling in production
   - Added rate limiting configuration

2. **Added `_sendEmailWithRetry()` method**:
   - Wraps all email sending operations
   - Implements retry logic with exponential backoff
   - Handles timeout errors gracefully

3. **Updated all email methods**:
   - `sendOrderConfirmation()` - Uses retry logic
   - `sendOrderStatusUpdate()` - Uses retry logic
   - `sendCustomDesignConfirmation()` - Uses retry logic
   - `sendVerificationCode()` - Uses retry logic
   - `sendMarketingEmail()` - Uses retry logic
   - `sendNewsletterWelcomeEmail()` - Uses retry logic
   - `sendTestEmail()` - Uses retry logic

## 🧪 Testing

After deploying, monitor your logs for:

**Success:**
```
✅ Order confirmation email sent successfully: <message-id>
```

**Retry (normal):**
```
⚠️ Email send attempt 1/2 failed (ETIMEDOUT). Retrying in 2s...
✅ Order confirmation email sent successfully: <message-id>
```

**Final failure (if retries exhausted):**
```
❌ Failed to send order confirmation email: { message: '...', code: 'ETIMEDOUT' }
```

**Note**: Even if email fails, **the order is still created successfully**. Email is non-blocking.

## 🔍 Troubleshooting

### Still getting timeouts?

1. **Check environment variables**:
   ```bash
   # In Render/Railway dashboard, verify:
   NODE_ENV=production
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   ```

2. **Verify Gmail App Password**:
   - Make sure you're using an **App Password**, not your regular password
   - Check that 2FA is enabled on the Gmail account
   - Regenerate App Password if needed

3. **Check network/firewall**:
   - Some hosting providers block SMTP ports
   - Gmail SMTP uses ports 465 (SSL) or 587 (TLS)
   - Verify your hosting provider allows outbound SMTP

4. **Try alternative email provider**:
   - If Gmail continues to fail, consider using:
     - SendGrid (recommended for production)
     - Mailgun
     - Amazon SES
     - Outlook/Hotmail SMTP

### Connection refused errors?

This usually means:
- SMTP port is blocked by firewall
- Email credentials are incorrect
- Gmail account is locked/suspended

**Solution**: 
- Verify App Password is correct
- Check Gmail account security settings
- Consider switching to a dedicated email service (SendGrid, Mailgun)

## 📊 Expected Behavior

### Order Creation Flow:

1. User places order ✅
2. Order saved to database ✅
3. Email sending starts (non-blocking) ✅
4. **If email succeeds**: Order created, email sent ✅
5. **If email fails**: Order created, email logged as failed ✅
6. User sees success message regardless ✅

### Email Retry Flow:

1. Attempt 1: Try to send email
   - **Success** → Done ✅
   - **Timeout** → Wait 2s, retry

2. Attempt 2: Retry sending email
   - **Success** → Done ✅
   - **Timeout** → Log failure, continue (order still created)

## 🎯 Key Points

- ✅ **Orders are never blocked by email failures**
- ✅ **Automatic retries** improve success rate
- ✅ **Longer timeouts** handle slow production networks
- ✅ **Connection pooling** improves performance
- ✅ **Detailed logging** helps debug issues

## 💡 Best Practices

1. **Monitor email success rate** in production logs
2. **Set up alerts** if email failures exceed threshold
3. **Consider dedicated email service** (SendGrid, Mailgun) for high volume
4. **Test email service** after deployment
5. **Keep App Password secure** - never commit to git

---

**Note**: The order processing modal will still show even if email fails. This is intentional - email sending is asynchronous and doesn't block the order creation process.


