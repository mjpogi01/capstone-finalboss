# Email Marketing Setup - Complete Guide

## ✅ Yes, Email Marketing Will Work After Running the Database Script!

But you need to configure the email service first. Here's everything you need to know:

## 📧 Email Service Used

### **Nodemailer + SMTP (Gmail)**

The system uses:
- ✅ **Nodemailer** - Node.js email library
- ✅ **SMTP** - Gmail SMTP server (default)
- ✅ **Gmail App Password** - For authentication

**Location**: `server/lib/emailService.js`

```javascript
const nodemailer = require('nodemailer');

// Gmail SMTP Configuration
this.transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,      // Your Gmail address
    pass: process.env.EMAIL_PASSWORD   // Gmail App Password
  }
});
```

## 🔧 What You Need to Configure

### Step 1: Database Setup ✅
**Status**: Run the SQL script (you're doing this now)
- Creates `newsletter_subscriptions` table
- Sets up indexes and security policies

### Step 2: Gmail Account Setup ⚠️ REQUIRED

1. **Create a Gmail Account** (or use existing)
   - Recommended: `yohanns.orders@gmail.com` or similar
   - This will be the "from" address for all marketing emails

2. **Enable 2-Factor Authentication**
   - Go to Google Account → Security
   - Enable 2-Step Verification

3. **Generate App Password**
   - Google Account → Security → 2-Step Verification
   - Scroll down to "App passwords"
   - Select "Mail" and "Other (Custom name)"
   - Name it: "Yohanns Email Marketing"
   - Copy the 16-character password (you'll need this!)

### Step 3: Environment Variables ⚠️ REQUIRED

Add these to your `server/.env` file:

```env
# Email Configuration (REQUIRED for email marketing)
EMAIL_USER=yohanns.orders@gmail.com
EMAIL_PASSWORD=your_16_character_app_password_here

# Client URL (for email links)
CLIENT_URL=https://yohanns-sportswear.onrender.com
```

**Important**: 
- `EMAIL_USER` = Your Gmail address
- `EMAIL_PASSWORD` = The 16-character app password (NOT your regular Gmail password)
- `CLIENT_URL` = Your website URL (for links in emails)

### Step 4: Restart Server ⚠️ REQUIRED

After adding environment variables:
```bash
# Stop your server (Ctrl+C)
# Then restart it
npm start
```

## ✅ Checklist: Will It Work?

After running the database script, check:

- [x] **Database Table Created** ✅ (SQL script does this)
- [ ] **Gmail Account Set Up** ⚠️ (You need to do this)
- [ ] **App Password Generated** ⚠️ (You need to do this)
- [ ] **Environment Variables Added** ⚠️ (You need to do this)
- [ ] **Server Restarted** ⚠️ (You need to do this)

## 🧪 Test Email Marketing

### 1. Test Email Service Connection

The server will automatically verify the email connection on startup. Check your server logs:

```
✅ Email service ready to send messages
```

If you see:
```
❌ Email service configuration error: ...
```

Then your `EMAIL_USER` or `EMAIL_PASSWORD` is incorrect.

### 2. Test Newsletter Subscription

1. Go to your website's newsletter section
2. Enter an email and subscribe
3. Check Supabase → Table Editor → `newsletter_subscriptions`
4. You should see the new subscriber
5. Subscriber should receive a welcome email

### 3. Test Marketing Email

1. Log in as **Owner**
2. Go to **Admin Dashboard** → **Accounts** → **Email Marketing** tab
3. Create a test marketing email:
   - Title: "Test Email"
   - Message: "This is a test"
   - Click "Send to All Subscribers"
4. Check your email inbox

## 🔍 How It Works

### Flow Diagram:

```
1. Customer subscribes
   ↓
2. Email saved to newsletter_subscriptions table
   ↓
3. Welcome email sent (via nodemailer → Gmail SMTP)
   ↓
4. Owner creates marketing campaign
   ↓
5. System fetches all active subscribers from database
   ↓
6. Sends email to each subscriber (via nodemailer → Gmail SMTP)
```

### Code Flow:

1. **Frontend**: `src/components/admin/EmailMarketing.js`
   - Owner creates campaign
   - Calls API: `POST /api/newsletter/send-marketing`

2. **Backend**: `server/routes/newsletter.js`
   - Fetches subscribers from `newsletter_subscriptions` table
   - Loops through each subscriber
   - Calls `emailService.sendMarketingEmail()`

3. **Email Service**: `server/lib/emailService.js`
   - Uses `nodemailer` to send via Gmail SMTP
   - Creates HTML email template
   - Sends email using `EMAIL_USER` and `EMAIL_PASSWORD`

## ⚠️ Common Issues

### Issue 1: "Email service configuration error"
**Cause**: Wrong `EMAIL_USER` or `EMAIL_PASSWORD`
**Fix**: 
- Double-check Gmail address
- Make sure you're using App Password (not regular password)
- Regenerate App Password if needed

### Issue 2: "Failed to send marketing email"
**Cause**: Gmail rate limits or authentication failed
**Fix**:
- Check server logs for specific error
- Verify App Password is correct
- Wait a few minutes (Gmail has rate limits)

### Issue 3: "No subscribers found"
**Cause**: Table is empty or `is_active = false`
**Fix**:
- Check Supabase → `newsletter_subscriptions` table
- Make sure `is_active = true` for subscribers

## 🔄 Alternative Email Providers

If you don't want to use Gmail, you can modify `server/lib/emailService.js`:

### Outlook/Hotmail:
```javascript
service: 'hotmail',
auth: {
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASSWORD
}
```

### Custom SMTP:
```javascript
host: 'smtp.your-provider.com',
port: 587,
secure: false,
auth: {
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASSWORD
}
```

## 📊 Summary

| Component | Status | Action Required |
|-----------|--------|----------------|
| Database Table | ✅ Ready | Run SQL script |
| Email Service Code | ✅ Ready | Already implemented |
| Nodemailer Library | ✅ Ready | Already installed |
| Gmail Setup | ⚠️ **YOU NEED TO DO THIS** | Create account + App Password |
| Environment Variables | ⚠️ **YOU NEED TO DO THIS** | Add to `.env` file |
| Server Restart | ⚠️ **YOU NEED TO DO THIS** | Restart after `.env` update |

## ✅ Final Answer

**Will email marketing work after running the script?**

**Partially** - The database will be ready, but you still need to:
1. ✅ Run the database script (you're doing this)
2. ⚠️ Set up Gmail account + App Password
3. ⚠️ Add environment variables to `.env`
4. ⚠️ Restart your server

**Once all steps are complete, email marketing will work!** 🎉

---

**Next Steps:**
1. Run the database script ✅
2. Set up Gmail App Password
3. Add environment variables
4. Restart server
5. Test the feature!

