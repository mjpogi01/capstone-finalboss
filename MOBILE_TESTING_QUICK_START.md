# Mobile Testing - Quick Start

## 🎯 Enable Mobile Testing in 3 Steps

### Step 1: Edit Config File
**Open:** `src/config/api.js`

**Change line 12 from:**
```javascript
export const API_URL = DEFAULT_API_URL;
```

**To:**
```javascript
// export const API_URL = DEFAULT_API_URL;  // Comment this out
```

**And uncomment line 21:**
```javascript
export const API_URL = `http://${COMPUTER_IP}:4000`;  // Enable this
```

### Step 2: Restart Servers
Double-click: `RESTART-SERVERS.bat`

### Step 3: Access on Mobile
**On your mobile device:**
- Connect to **same Wi-Fi** as your computer
- Open browser
- Go to: `http://192.168.254.100:3000`

---

## ✅ Done! You can now test:
- Checkout on mobile (with alerts!) ✅
- Review submission on mobile (with alerts!) ✅
- All features on real mobile device ✅

---

## 🔄 Switch Back to Desktop Testing

**Edit:** `src/config/api.js`

**Change line 12 back to:**
```javascript
export const API_URL = DEFAULT_API_URL;  // Uncomment
```

**Comment line 21:**
```javascript
// export const API_URL = `http://${COMPUTER_IP}:4000`;  // Comment out
```

**Restart servers:** `RESTART-SERVERS.bat`

---

## 📱 Your URLs

| Type | URL |
|------|-----|
| **Mobile Frontend** | `http://192.168.254.100:3000` |
| **Mobile Backend** | `http://192.168.254.100:4000` |
| **Desktop Frontend** | `http://localhost:3000` |
| **Desktop Backend** | `http://localhost:4000` |

---

## 🔍 Verify It's Working

**Check Backend Server Window:**
```
API listening on http://localhost:4000
📱 Mobile access: http://192.168.254.100:4000
```

**Check Mobile Browser Console (F12 or Remote Debug):**
```
🔗 API URL: http://192.168.254.100:4000
📱 Mobile Device: true
```

**No More Errors:**
```
✅ No ERR_CONNECTION_REFUSED
✅ Orders load
✅ Checkout works
✅ Reviews work
```

---

## 🚨 Troubleshooting

**Problem:** Still getting `ERR_CONNECTION_REFUSED`

**Quick Fixes:**
1. ✅ Backend running? Check terminal window
2. ✅ Same Wi-Fi network? Check phone settings
3. ✅ Config file saved? Check `src/config/api.js`
4. ✅ Servers restarted? Run `RESTART-SERVERS.bat`
5. ✅ Windows Firewall? Add exception for ports 3000 & 4000

---

**Full Guide:** See `MOBILE_TESTING_GUIDE.md`  
**Status:** ✅ Ready  
**Your IP:** 192.168.254.100


































