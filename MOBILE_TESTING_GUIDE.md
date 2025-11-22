# Mobile Device Testing Guide

## Overview
This guide explains how to test your app on a **physical mobile device** (phone/tablet) on the same Wi-Fi network as your development computer.

---

## 🔴 The Problem

When testing on mobile:
- ❌ `http://localhost:4000` = Your phone (doesn't work)
- ✅ `http://192.168.254.100:4000` = Your computer's IP (works!)

**Error you see:**
```
GET http://localhost:4000/api/orders/... net::ERR_CONNECTION_REFUSED
```

---

## ✅ The Solution

### **Step 1: Enable Mobile Access (ONE-TIME SETUP)**

We've already configured your app to support mobile testing! Here's what was changed:

#### **A. Centralized API Configuration**
Created `src/config/api.js` that:
- ✅ Uses `localhost:4000` for desktop testing (default)
- ✅ Can switch to your computer's IP for mobile testing
- ✅ Logs the API URL on startup for debugging

#### **B. Updated Backend Server**
Modified `server/index.js` to:
- ✅ Listen on `0.0.0.0` (accepts connections from other devices)
- ✅ Shows mobile access URL when server starts

#### **C. Updated Order Service**
Modified `src/services/orderService.js` to:
- ✅ Use the centralized API URL configuration
- ✅ No more hardcoded `localhost:4000`

---

## 📱 How to Test on Mobile

### **Option 1: Temporary Mobile Testing (Quick)**

1. **Open:** `src/config/api.js`

2. **Find this line (around line 21):**
   ```javascript
   // For mobile testing, uncomment this line:
   // export const API_URL = `http://${COMPUTER_IP}:4000`;
   ```

3. **Comment out the default and uncomment mobile:**
   ```javascript
   // Default - comment this out:
   // export const API_URL = DEFAULT_API_URL;
   
   // Mobile testing - uncomment this:
   export const API_URL = `http://${COMPUTER_IP}:4000`;
   ```

4. **Save the file** and **restart frontend:**
   ```
   Ctrl+C in frontend terminal
   npm start
   ```

5. **On your mobile device:**
   - Make sure you're on the **same Wi-Fi** as your computer
   - Open browser: `http://192.168.254.100:3000`
   - Test your features!

6. **When done, revert the change** for desktop testing

---

### **Option 2: Environment Variable (Better)**

1. **Create file:** `.env.local` in project root

2. **Add this line:**
   ```
   REACT_APP_API_URL=http://192.168.254.100:4000
   ```

3. **Restart frontend:**
   ```
   Ctrl+C in frontend terminal
   npm start
   ```

4. **On your mobile device:**
   - Open: `http://192.168.254.100:3000`

5. **When done:** Delete `.env.local` or set it back to `localhost:4000`

---

### **Option 3: Two Separate Builds (Advanced)**

Keep two terminal sessions:

**Terminal 1 - Desktop Development:**
```bash
npm start
# Access at: http://localhost:3000
```

**Terminal 2 - Mobile Testing:**
```bash
set REACT_APP_API_URL=http://192.168.254.100:4000 && npm start
# Access at: http://192.168.254.100:3000
```

---

## 🚀 Quick Start (Recommended Method)

### **For MOBILE Testing:**

1. **Start Backend:**
   ```
   Double-click: start-backend.bat
   ```

2. **Edit:** `src/config/api.js` line 21:
   ```javascript
   export const API_URL = `http://${COMPUTER_IP}:4000`;
   ```

3. **Start Frontend:**
   ```
   npm start
   ```

4. **On Mobile Browser:**
   ```
   Open: http://192.168.254.100:3000
   ```

### **For DESKTOP Testing:**

1. **Start Backend:**
   ```
   Double-click: start-backend.bat
   ```

2. **Make sure:** `src/config/api.js` line 12 is active:
   ```javascript
   export const API_URL = DEFAULT_API_URL;
   ```

3. **Start Frontend:**
   ```
   npm start
   ```

4. **On Desktop Browser:**
   ```
   Open: http://localhost:3000
   ```

---

## 🔧 Troubleshooting

### **Problem: Still getting ERR_CONNECTION_REFUSED**

**Solution:**
1. Make sure backend is running: `start-backend.bat`
2. Make sure both devices are on same Wi-Fi network
3. Check Windows Firewall isn't blocking port 4000
4. Verify your IP address is `192.168.254.100`:
   ```bash
   ipconfig | findstr /i "IPv4"
   ```
5. If IP changed, update `src/config/api.js` line 5:
   ```javascript
   const COMPUTER_IP = 'YOUR_NEW_IP_HERE';
   ```

### **Problem: Mobile can't access http://192.168.254.100:3000**

**Solutions:**
- Windows Firewall: Add exception for port 3000
- Try: `http://192.168.254.100:3000` (not https)
- Restart React dev server: `Ctrl+C`, then `npm start`
- Check mobile is on same Wi-Fi network

### **Problem: Mixed Content Error**

If you see `Mixed Content` errors:
- Use `http://` (not `https://`) on mobile
- Some features may not work on mobile without HTTPS (camera, geolocation)

---

## 📊 What You Should See

### **Backend Server (start-backend.bat):**
```
========================================
  YOHANNS BACKEND SERVER
  Starting on http://localhost:4000
========================================

API listening on http://localhost:4000
📱 Mobile access: http://192.168.254.100:4000
Using Supabase for database operations
```

### **Frontend Browser Console:**
```
🔗 API URL: http://192.168.254.100:4000
📱 Mobile Device: true
```

### **No More Errors:**
```
✅ Orders load successfully
✅ Reviews submit successfully
✅ Checkout works properly
✅ All API calls connect
```

---

## 🔐 Security Notes

- ⚠️ **Never commit** `.env.local` with your computer's IP
- ⚠️ Your IP `192.168.254.100` is only accessible on your local network
- ⚠️ Don't share your Supabase keys in public repositories
- ✅ For production, use proper environment variables

---

## 📱 Supported Mobile Browsers

✅ **iOS Safari** (iPhone, iPad)  
✅ **Chrome Mobile** (Android)  
✅ **Firefox Mobile** (Android)  
✅ **Samsung Internet** (Samsung devices)  

---

## 🎯 Testing Checklist

Once mobile testing is enabled, test these features:

- [ ] Login/Signup
- [ ] Browse products
- [ ] Add to cart
- [ ] Checkout process (with alerts working!)
- [ ] Review submission (with alerts working!)
- [ ] View orders
- [ ] Profile management
- [ ] Mobile-specific UI/UX
- [ ] Touch gestures
- [ ] Responsive design

---

## 📝 Quick Reference

| What | Desktop | Mobile |
|------|---------|--------|
| **Frontend URL** | `http://localhost:3000` | `http://192.168.254.100:3000` |
| **Backend URL** | `http://localhost:4000` | `http://192.168.254.100:4000` |
| **API Config** | `DEFAULT_API_URL` | `http://${COMPUTER_IP}:4000` |
| **Network** | Localhost only | Same Wi-Fi required |

---

## 🔄 When Your IP Changes

Your computer's IP (`192.168.254.100`) may change if:
- You restart your router
- You reconnect to Wi-Fi
- Your network DHCP lease expires

**If your IP changes:**
1. Check new IP: `ipconfig | findstr /i "IPv4"`
2. Update `src/config/api.js` line 5
3. Restart backend server
4. Restart frontend server
5. Use new IP on mobile

---

## ✅ Files Modified

- ✅ `src/config/api.js` - Centralized API configuration
- ✅ `src/services/orderService.js` - Uses centralized config
- ✅ `server/index.js` - Accepts connections from local network

---

## 🆘 Need Help?

If you're still having issues:
1. Check both servers are running (backend & frontend)
2. Verify firewall isn't blocking ports 3000 & 4000
3. Ensure both devices on same Wi-Fi network
4. Check browser console for error messages
5. Verify API URL in console log: `🔗 API URL: ...`

---

**Status:** ✅ Ready for Mobile Testing  
**Date:** October 29, 2025  
**Your Computer IP:** 192.168.254.100


































