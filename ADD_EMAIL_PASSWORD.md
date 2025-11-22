# How to Add Your Gmail App Password

## ✅ Your App Password
```
gngz bzen vyln sdjy
```

---

## 📝 Step-by-Step: Add to `.env` File

### Step 1: Open Your `.env` File
1. Navigate to: `server/.env`
2. Open it in a text editor (Notepad, VS Code, etc.)

### Step 2: Add or Update These Lines

Add these lines to your `server/.env` file:

```env
# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=gngz bzen vyln sdjy

# Client URL (for email links)
CLIENT_URL=https://yohanns-sportswear.onrender.com
```

**Important Notes:**
- Replace `your-email@gmail.com` with **your actual Gmail address**
- The password can be **with spaces** (`gngz bzen vyln sdjy`) or **without spaces** (`gngzbzenvylnsdjy`) - both work!
- Make sure there are **no quotes** around the password

### Step 3: Example `.env` File

Your `server/.env` file should look something like this:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Email Configuration
EMAIL_USER=yohanns.orders@gmail.com
EMAIL_PASSWORD=gngz bzen vyln sdjy

# Client URL
CLIENT_URL=https://yohanns-sportswear.onrender.com

# Other environment variables...
```

### Step 4: Save the File
- Save the `.env` file
- Make sure it's saved in the `server/` folder

### Step 5: Restart Your Server
**IMPORTANT**: You must restart your server for changes to take effect!

```bash
# Stop your server (Ctrl+C if running)
# Then restart:
npm start
```

---

## ✅ Verify It's Working

After restarting, check your server logs. You should see:

```
✅ Email service ready to send messages
```

If you see:
```
❌ Email service configuration error: ...
```

Then check:
- Is `EMAIL_USER` your correct Gmail address?
- Is `EMAIL_PASSWORD` correct (the one you copied)?
- Did you save the `.env` file?
- Did you restart the server?

---

## 🔒 Security Reminder

⚠️ **Important**: You've shared your App Password publicly. For security:

1. **Consider generating a new App Password** if this is a production account
2. **Never commit `.env` files to Git** (they should be in `.gitignore`)
3. **Keep your App Passwords private**

To generate a new password:
- Go back to: https://myaccount.google.com/apppasswords
- Generate a new one
- Update your `.env` file

---

## 🧪 Test Your Email Setup

After restarting your server, you can test it:

1. **Check server logs** for: `✅ Email service ready to send messages`
2. **Test newsletter subscription** on your website
3. **Send a test marketing email** from Admin Dashboard → Accounts → Email Marketing

---

## ✅ Checklist

- [ ] Opened `server/.env` file
- [ ] Added `EMAIL_USER=your-email@gmail.com`
- [ ] Added `EMAIL_PASSWORD=gngz bzen vyln sdjy`
- [ ] Added `CLIENT_URL=https://yohanns-sportswear.onrender.com`
- [ ] Saved the file
- [ ] Restarted the server
- [ ] Checked server logs for success message

---

**Once you've done this, your email marketing feature will be ready to use!** 🎉

