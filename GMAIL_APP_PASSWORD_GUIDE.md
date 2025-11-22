# How to Generate Gmail App Password - Step by Step

## 📍 Where to Find "Select Mail → Generate"

Follow these exact steps:

---

## 🚀 Step-by-Step Instructions

### Step 1: Go to Google Account
1. Open your web browser
2. Go to: **https://myaccount.google.com**
3. Sign in with your Gmail account (the one you want to use for email marketing)

### Step 2: Navigate to Security Settings
1. In the left sidebar, click **"Security"**
   - Or go directly to: **https://myaccount.google.com/security**

### Step 3: Enable 2-Step Verification (If Not Already Enabled)
1. Scroll down to **"How you sign in to Google"** section
2. Find **"2-Step Verification"**
3. If it says **"Off"**, click on it
4. Follow the prompts to enable 2-Step Verification
   - You'll need your phone number
   - Google will send a verification code
5. Complete the setup

**⚠️ Important**: You **MUST** enable 2-Step Verification first. App Passwords won't appear until this is enabled.

### Step 4: Generate App Password
1. After 2-Step Verification is enabled, go back to **Security** page
2. Scroll down to **"How you sign in to Google"** section
3. You should now see **"App passwords"** (it appears after enabling 2-Step Verification)
4. Click on **"App passwords"**
   - Direct link: **https://myaccount.google.com/apppasswords**

### Step 5: Select App and Device
1. You'll see a dropdown menu: **"Select app"**
2. Click the dropdown and select **"Mail"**
3. You'll see another dropdown: **"Select device"**
4. Click the dropdown and select **"Other (Custom name)"**
5. Type a name like: **"Yohanns Email Marketing"**
6. Click **"Generate"** button

### Step 6: Copy the Password
1. Google will show you a **16-character password**
   - Format: `xxxx xxxx xxxx xxxx` (with spaces)
   - Or: `xxxxxxxxxxxxxxxx` (without spaces - both work)
2. **Copy this password immediately** - you can only see it once!
3. Paste it into your `server/.env` file as `EMAIL_PASSWORD`

---

## 📸 Visual Guide (What You'll See)

### After Clicking "App passwords", you'll see:

```
┌─────────────────────────────────────────┐
│  App passwords                          │
├─────────────────────────────────────────┤
│                                         │
│  Select app: [Dropdown ▼]              │
│  ┌───────────────────────────────────┐  │
│  │ Mail                              │  │ ← Select this
│  │ Calendar                          │  │
│  │ Contacts                          │  │
│  │ Other (Custom name)               │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Select device: [Dropdown ▼]           │
│  ┌───────────────────────────────────┐  │
│  │ Windows Computer                  │  │
│  │ Mac                                │  │
│  │ iPhone                             │  │
│  │ Other (Custom name)                │  │ ← Select this
│  └───────────────────────────────────┘  │
│                                         │
│  Custom name: [Yohanns Email Marketing] │ ← Type this
│                                         │
│  [Generate]                             │ ← Click this
└─────────────────────────────────────────┘
```

### After Clicking "Generate", you'll see:

```
┌─────────────────────────────────────────┐
│  Your app password                     │
├─────────────────────────────────────────┤
│                                         │
│  xxxx xxxx xxxx xxxx                   │ ← Copy this!
│                                         │
│  [Done]                                 │
└─────────────────────────────────────────┘
```

---

## 🔗 Direct Links

### Quick Access:
- **Security Page**: https://myaccount.google.com/security
- **App Passwords**: https://myaccount.google.com/apppasswords
- **2-Step Verification**: https://myaccount.google.com/signinoptions/two-step-verification

---

## ⚠️ Troubleshooting

### Problem: "App passwords" option doesn't appear
**Solution**: 
- Make sure 2-Step Verification is **enabled**
- Wait a few minutes after enabling (sometimes it takes time to appear)
- Refresh the page

### Problem: "App passwords" is grayed out
**Solution**:
- You need to be signed in with a Google Account (not a Workspace account)
- Some Workspace accounts have this disabled by admin
- Try using a personal Gmail account instead

### Problem: Can't find "Mail" in the dropdown
**Solution**:
- Make sure you're on the App Passwords page
- Try refreshing the page
- If "Mail" isn't there, select "Other (Custom name)" and type "Mail"

### Problem: Password doesn't work
**Solution**:
- Make sure you copied the **entire** 16-character password
- Remove spaces when pasting (or keep them - both work)
- Generate a new password if needed

---

## ✅ After You Get the Password

1. **Copy the 16-character password**
2. **Add it to your `server/.env` file**:
   ```env
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
   ```
3. **Restart your server**

---

## 🎯 Quick Checklist

- [ ] Signed in to Google Account
- [ ] Enabled 2-Step Verification
- [ ] Went to App Passwords page
- [ ] Selected "Mail" from dropdown
- [ ] Selected "Other (Custom name)" for device
- [ ] Typed "Yohanns Email Marketing"
- [ ] Clicked "Generate"
- [ ] Copied the 16-character password
- [ ] Added to `server/.env` file

---

**That's it!** Once you have the App Password, add it to your `.env` file and restart your server. 🎉

