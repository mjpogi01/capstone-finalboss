# CLIENT_URL vs FRONTEND_URL - Explained

## 🎯 Quick Answer

**Both are your frontend domain URL (where your React app is hosted on Hostinger)**

**Example:**
```
CLIENT_URL = https://yourdomain.com
FRONTEND_URL = https://yourdomain.com
```

**In most cases, they can be the same value!** They're used for slightly different purposes.

---

## 📋 What They Are

### **FRONTEND_URL**
**Purpose:** Used for **CORS configuration** (allowing API requests)

**Where it's used:**
- `server/index.js` - CORS settings to allow requests from your frontend domain
- Tells the backend: "Accept API requests from this domain"

**Example:**
```javascript
// In server/index.js - CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,  // ✅ Your Hostinger domain
  process.env.CLIENT_URL,    // ✅ Also your Hostinger domain
  // ... other origins
];
```

**Why needed:**
- Browser security (CORS) - backend needs to know which frontend domains to allow
- Prevents unauthorized websites from making API requests

---

### **CLIENT_URL**
**Purpose:** Used for **generating links in emails** and other client-facing URLs

**Where it's used:**
- `server/lib/emailService.js` - Email templates (order confirmations, newsletters, etc.)
- `server/routes/newsletter.js` - Newsletter unsubscribe links
- Any emails that need to link back to your website

**Example from email templates:**
```javascript
// In server/lib/emailService.js
const clientUrl = process.env.CLIENT_URL || 'https://yourdomain.com';
// Used for:
<a href="${clientUrl}/orders">View Your Orders</a>
<a href="${clientUrl}/unsubscribe?email=...">Unsubscribe</a>
```

**Why needed:**
- Email links need to point to your website
- Users click links in emails to go to your site
- Must be the actual public URL where your frontend is accessible

---

## 🔄 Why Both Exist?

**Technically, they can be the same value!** They're separate because:

1. **Different contexts:**
   - `FRONTEND_URL` = Backend security (CORS)
   - `CLIENT_URL` = Client-facing links (emails)

2. **Future flexibility:**
   - You might have multiple frontends (web app, mobile app)
   - You might have different domains for API vs website
   - Allows separation if needed

3. **Clear naming:**
   - `FRONTEND_URL` = where the frontend makes API calls FROM
   - `CLIENT_URL` = where users/clients access the website

---

## 💡 What Should You Set Them To?

### **For Your Setup (Frontend on Hostinger, Backend on Render):**

**Both should be your Hostinger domain:**

```
FRONTEND_URL = https://yourdomain.com
CLIENT_URL = https://yourdomain.com
```

**Or if you have www version:**

```
FRONTEND_URL = https://www.yourdomain.com
CLIENT_URL = https://www.yourdomain.com
```

**Or include both (recommended):**

In your code, you can check both. But for environment variables, set:
```
FRONTEND_URL = https://yourdomain.com
CLIENT_URL = https://yourdomain.com
```

---

## 📝 Real-World Examples

### Example 1: Order Confirmation Email

**User receives email after placing order:**
```
Subject: Order Confirmed!

Click here to view your order:
https://yourdomain.com/orders  ← Uses CLIENT_URL
```

The email is sent by the backend, which uses `CLIENT_URL` to generate the link.

---

### Example 2: API Request from Frontend

**React app makes API call:**
```javascript
// Frontend (React) at: https://yourdomain.com
fetch('https://yohanns-api.onrender.com/api/products')
  .then(response => response.json())
```

**Backend checks CORS:**
```javascript
// Backend checks: "Is this request from an allowed origin?"
// Checks if 'https://yourdomain.com' is in allowedOrigins
// Uses FRONTEND_URL to build allowedOrigins list
```

---

### Example 3: Newsletter Unsubscribe Link

**Email sent to subscriber:**
```
Click here to unsubscribe:
https://yourdomain.com/unsubscribe?email=user@example.com  ← Uses CLIENT_URL
```

The backend uses `CLIENT_URL` to generate this link in the email template.

---

## 🎯 For Your Render Deployment

### What to Set in Render Environment Variables:

```
FRONTEND_URL = https://yourdomain.com
CLIENT_URL = https://yourdomain.com
```

**Replace `yourdomain.com` with your actual Hostinger domain!**

**If you don't have a custom domain yet:**
- Use whatever URL Hostinger gives you
- Or set up a custom domain later and update these values

**Examples:**
```
# If your Hostinger domain is yohanns.com
FRONTEND_URL = https://yohanns.com
CLIENT_URL = https://yohanns.com

# If your Hostinger domain is yohanns-sportswear.hostinger.com
FRONTEND_URL = https://yohanns-sportswear.hostinger.com
CLIENT_URL = https://yohanns-sportswear.hostinger.com

# If you have www version too, you can add it in code (handled automatically)
FRONTEND_URL = https://www.yohanns.com
CLIENT_URL = https://www.yohanns.com
```

---

## 🔍 Where They're Used in Your Code

### 1. CORS Configuration (`server/index.js`)

```javascript
const allowedOrigins = [
  process.env.FRONTEND_URL,  // ✅ Used here
  process.env.CLIENT_URL,    // ✅ Also used here
  'https://yohanns-sportswearhouse1.onrender.com',
  'http://localhost:3000'
].filter(Boolean);
```

**Both are checked** - if either matches, the request is allowed.

---

### 2. Email Templates (`server/lib/emailService.js`)

```javascript
const clientUrl = process.env.CLIENT_URL || 'https://yohanns.com';

// Used in email HTML:
<a href="${clientUrl}/orders">View Your Orders</a>
<a href="${clientUrl}/unsubscribe">Unsubscribe</a>
```

**Only CLIENT_URL is used** for email links.

---

### 3. Newsletter Routes (`server/routes/newsletter.js`)

```javascript
ctaLink: ctaLink || process.env.CLIENT_URL || 'https://yohanns.com'
```

**Only CLIENT_URL is used** for newsletter links.

---

## ⚠️ Important Notes

### 1. Must Include Protocol

**✅ Correct:**
```
FRONTEND_URL = https://yourdomain.com
CLIENT_URL = https://yourdomain.com
```

**❌ Wrong:**
```
FRONTEND_URL = yourdomain.com           # Missing https://
CLIENT_URL = www.yourdomain.com         # Missing https://
```

### 2. Must Match Your Actual Domain

**Make sure:**
- The domain you set is exactly where your React app is hosted
- It matches what users see in their browser
- Include `www.` if your site uses it (or handle both)

### 3. Both Can Be the Same

**It's perfectly fine to set them to the same value:**
```
FRONTEND_URL = https://yourdomain.com
CLIENT_URL = https://yourdomain.com
```

**In fact, this is recommended for your setup!**

---

## ✅ Quick Checklist

When deploying to Render, set both:

- [ ] `FRONTEND_URL` = Your Hostinger domain (with https://)
- [ ] `CLIENT_URL` = Your Hostinger domain (with https://)
- [ ] Both should match exactly
- [ ] Include `www.` if your site uses it (or set both versions)

**Example:**
```
FRONTEND_URL = https://yohanns.com
CLIENT_URL = https://yohanns.com
```

---

## 🎯 Summary

| Variable | Purpose | Used For |
|----------|---------|----------|
| **FRONTEND_URL** | CORS configuration | Allowing API requests from frontend |
| **CLIENT_URL** | Email links & client URLs | Generating links in emails, newsletters |

**Both should be set to:** Your Hostinger domain where your React app is hosted!

**Example:**
```
FRONTEND_URL = https://yourdomain.com
CLIENT_URL = https://yourdomain.com
```

**They can be the same value!** This is the most common setup. ✅











