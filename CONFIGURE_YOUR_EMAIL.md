# Configure Your Email - Step by Step

## ⚠️ Important Security Note

**You just shared your password publicly!** For security:
1. Consider changing your password after setup
2. Never share passwords in chat/messages
3. Use App Passwords (not your regular password)

---

## 📧 Your Email Configuration

**Email**: `22-01071@g.batstate-u.edu.ph`  
**App Password**: `gngz bzen vyln sdjy` (use this, NOT your regular password!)

**Note**: This is a **Google Workspace** email (university email), not a regular Gmail. It should work the same way.

---

## 📝 Add to Your `.env` File

### Step 1: Open `server/.env`

### Step 2: Add These Lines

```env
# Email Configuration
EMAIL_USER=22-01071@g.batstate-u.edu.ph
EMAIL_PASSWORD=gngz bzen vyln sdjy

# Client URL
CLIENT_URL=https://yohanns-sportswear.onrender.com
```

### Step 3: Save and Restart

1. **Save** the `.env` file
2. **Restart your server** (stop with Ctrl+C, then `npm start`)

---

## ✅ Verify Configuration

After restarting, check your server logs. You should see:

```
✅ Email service ready to send messages
```

If you see an error, it might be because:
- Google Workspace accounts sometimes have App Passwords disabled by admin
- The email format might need different SMTP settings

---

## 🔧 If It Doesn't Work (Google Workspace)

If you get authentication errors, you might need to use custom SMTP settings instead of Gmail service. Let me know and I can help you configure it.

---

## 🧪 Test It

1. **Check server logs** for success message
2. **Test newsletter subscription** on your website
3. **Send test marketing email** from Admin Dashboard

---

## 🔒 Security Reminder

**You shared your password!** Please:
- ✅ Use the **App Password** (`gngz bzen vyln sdjy`) - NOT your regular password
- ⚠️ Consider changing your password after this is set up
- ⚠️ Never share passwords in messages again

---

**Your `.env` file should look like this:**

```env
EMAIL_USER=22-01071@g.batstate-u.edu.ph
EMAIL_PASSWORD=gngz bzen vyln sdjy
CLIENT_URL=https://yohanns-sportswear.onrender.com
```

**Remember**: Use the App Password, not `Jerome*101`!

