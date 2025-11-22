# 📱 How to Access Your Localhost on Mobile

## Quick Setup (3 Steps)

### Step 1: Find Your Computer's IP Address
Your computer has these IP addresses:
- **172.20.10.3** (likely your Wi-Fi network - use this one)
- **192.168.56.1** (likely a virtual adapter)

**To verify which one to use:**
1. Make sure your phone is connected to the **same Wi-Fi** as your computer
2. Try the IP addresses below until one works

### Step 2: Configure React to Accept Mobile Connections

**Create a file named `.env.local` in your project root** with this content:

```env
# Allow React dev server to accept connections from mobile devices
HOST=0.0.0.0

# Set API URL to your computer's IP (update IP if needed)
REACT_APP_API_URL=http://172.20.10.3:4000
```

**Important:** Update `172.20.10.3` to your actual IP address if it's different.

### Step 3: Start Your Servers

1. **Start Backend:**
   - Double-click `start-backend.bat` OR
   - Run: `npm run server:dev`

2. **Start Frontend:**
   - Run: `npm start`
   - The server will now accept connections from mobile devices

### Step 4: Access on Your Mobile Device

**On your phone/tablet:**
1. Make sure you're on the **same Wi-Fi network** as your computer
2. Open your mobile browser
3. Go to: **`http://172.20.10.3:3000`**

**If that doesn't work, try:**
- `http://192.168.56.1:3000`

---

## 🔍 Verify It's Working

**Check the React dev server terminal:**
- You should see: `On Your Network: http://172.20.10.3:3000`

**Check the backend server terminal:**
- You should see: `📱 Mobile access: http://172.20.10.3:4000`

**On your mobile browser:**
- The app should load without connection errors
- Check the browser console (if available) - you should see: `🔗 API URL: http://172.20.10.3:4000`

---

## 🚨 Troubleshooting

### Problem: Can't connect from mobile

**Solutions:**
1. **Check Windows Firewall:**
   - Open Windows Defender Firewall
   - Allow ports 3000 and 4000 through the firewall
   - Or temporarily disable firewall for testing

2. **Verify IP Address:**
   - Run: `ipconfig` in PowerShell
   - Look for "IPv4 Address" under your Wi-Fi adapter
   - Update `.env.local` with the correct IP

3. **Check Network:**
   - Make sure phone and computer are on the **same Wi-Fi network**
   - Some public Wi-Fi networks block device-to-device communication

4. **Verify Servers are Running:**
   - Backend should show: `Server listening on http://localhost:4000`
   - Frontend should show: `On Your Network: http://[YOUR_IP]:3000`

### Problem: API calls fail (ERR_CONNECTION_REFUSED)

**Solution:**
- Make sure `REACT_APP_API_URL` in `.env.local` matches your computer's IP
- Restart both servers after changing `.env.local`

---

## 🔄 Switch Back to Desktop-Only Testing

**To disable mobile access:**
1. Delete or rename `.env.local` file
2. Restart your frontend server

**Or edit `.env.local` and comment out the lines:**
```env
# HOST=0.0.0.0
# REACT_APP_API_URL=http://172.20.10.3:4000
```

---

## 📝 Your URLs

| Type | URL |
|------|-----|
| **Mobile Frontend** | `http://172.20.10.3:3000` |
| **Mobile Backend** | `http://172.20.10.3:4000` |
| **Desktop Frontend** | `http://localhost:3000` |
| **Desktop Backend** | `http://localhost:4000` |

---

## ✅ Quick Checklist

- [ ] Created `.env.local` file with `HOST=0.0.0.0`
- [ ] Updated `REACT_APP_API_URL` with your computer's IP
- [ ] Backend server is running (`start-backend.bat`)
- [ ] Frontend server is running (`npm start`)
- [ ] Phone is on the same Wi-Fi network
- [ ] Windows Firewall allows ports 3000 and 4000
- [ ] Can access `http://[YOUR_IP]:3000` on mobile

---

**Need help?** Check `MOBILE_TESTING_GUIDE.md` for more detailed information.

