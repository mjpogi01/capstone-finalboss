# How to Subscribe to Newsletter - Get Your First Subscriber!

## 📍 Where to Find the Newsletter Subscription Form

The newsletter subscription form is located on your **homepage** (customer-facing website).

### Step 1: Go to Your Website
1. Open your website in a browser
2. Navigate to the **homepage** (usually the main landing page)
3. Scroll down to find the **Newsletter section**

### Step 2: Look for the Newsletter Section
The newsletter section has:
- Title: **"LEVEL UP YOUR GAME WITH YOHANN'S"**
- Subtitle: **"New heat. Fresh fits. More teams on deck. Big drops coming - don't miss out."**
- Description: **"Be the first to know about our latest product drops and exclusive offers."**
- Email input field
- **"SUBSCRIBE"** button

### Step 3: Subscribe with Your Email
1. Enter your email address (e.g., `22-01071@g.batstate-u.edu.ph`)
2. Click **"SUBSCRIBE"** button
3. Wait for success message: **"✓ Successfully subscribed! Check your email for a welcome message."**

---

## ✅ Verify Subscription

### Option 1: Check Supabase Database
1. Go to **Supabase Dashboard**
2. Click **Table Editor**
3. Open `newsletter_subscriptions` table
4. You should see your email with:
   - `is_active = true`
   - `subscribed_at = [current timestamp]`

### Option 2: Check Your Email
- You should receive a **welcome email** from Yohanns
- Subject: **"Welcome to Yohanns Newsletter! 🏀"**

### Option 3: Check Admin Dashboard
1. Log in as **Owner**
2. Go to **Admin Dashboard** → **Accounts** → **Email Marketing** tab
3. You should see: **"X Active Subscribers"** (where X is the number)

---

## 🧪 Test with Multiple Emails

To test the email marketing feature, you can subscribe with multiple emails:

1. **Your email**: `22-01071@g.batstate-u.edu.ph`
2. **Test email 2**: Use another email you have access to
3. **Test email 3**: Use a third email

**Note**: Each email can only subscribe once (unique constraint).

---

## 🔍 Troubleshooting

### Problem: "Failed to subscribe"
**Possible causes:**
- Database table not created (run the SQL script first!)
- Server not running
- Network error

**Solution:**
1. Make sure you ran the database script
2. Make sure server is running
3. Check browser console for errors

### Problem: No welcome email received
**Possible causes:**
- Email service not configured
- Wrong `EMAIL_USER` or `EMAIL_PASSWORD` in `.env`
- Email went to spam folder

**Solution:**
1. Check server logs for: `✅ Email service ready to send messages`
2. Check spam/junk folder
3. Verify `.env` file has correct email credentials

### Problem: Can't find newsletter section
**Possible causes:**
- Newsletter component not rendered on homepage
- Scrolled past it

**Solution:**
- Scroll down on the homepage
- Look for the section with sports images and email form

---

## 📝 Quick Steps Summary

1. ✅ **Run database script** (if not done)
2. ✅ **Configure email in `.env`** (if not done)
3. ✅ **Restart server** (if not done)
4. 🌐 **Go to your website homepage**
5. 📧 **Enter email in newsletter form**
6. 🔘 **Click "SUBSCRIBE"**
7. ✅ **Verify in Supabase or Admin Dashboard**

---

## 🎯 After Subscribing

Once you have at least 1 subscriber:

1. **Log in as Owner**
2. **Go to Admin Dashboard** → **Accounts** → **Email Marketing**
3. **Create a marketing email:**
   - Title: "Test Email"
   - Message: "This is a test marketing email"
   - Click **"Send to All Subscribers"**
4. **Check your email inbox** for the marketing email!

---

**That's it!** Subscribe to your own newsletter first, then you can test the email marketing feature! 🎉

