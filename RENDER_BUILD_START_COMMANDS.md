# Render Build & Start Commands Guide

This guide explains the correct build and start commands for deploying your application on Render.

## 📋 Understanding Your Project Structure

Your project is a **monorepo** with:
- **Frontend (React)**: Root directory
- **Backend (Node.js/Express)**: `server/` directory
- Both share the same `package.json` at root

---

## 🎯 Deployment Scenarios

### **Scenario 1: Single Service (Backend + Frontend Together)** ✅ Recommended

Deploy both frontend and backend as one service. The backend serves the React build.

#### **Build Command:**
```bash
npm install && npm run build
```

#### **Start Command:**
```bash
npm run start:production
```

**What this does:**
1. `npm install` - Installs all dependencies
2. `npm run build` - Builds React frontend into `build/` folder
3. `npm run start:production` - Starts the Express server which serves the React build

**Render Configuration:**
- **Root Directory:** `/` (project root)
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm run start:production`
- **Environment:** `Node`
- **Health Check Path:** `/health`

---

### **Scenario 2: Backend Only Service** (If deploying frontend separately)

If you're deploying the frontend on Vercel/Netlify/Hostinger separately.

#### **Build Command:**
```bash
npm install
```

#### **Start Command:**
```bash
node server/index.js
```

**Or using npm script:**
```bash
npm run server
```

**Render Configuration:**
- **Root Directory:** `/` (project root)
- **Build Command:** `npm install`
- **Start Command:** `node server/index.js`
- **Environment:** `Node`
- **Health Check Path:** `/health`

---

### **Scenario 3: Frontend Only Service** (If deploying backend separately)

If you're deploying the backend separately and only need to build the frontend.

#### **Build Command:**
```bash
npm install && npm run build
```

#### **Start Command:**
```bash
npx serve -s build -l 3000
```

**Or using a static file server:**
```bash
npm install -g serve && serve -s build -l 3000
```

**Render Configuration:**
- **Root Directory:** `/` (project root)
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npx serve -s build -l 3000`
- **Environment:** `Node`
- **Health Check Path:** `/` (or create a simple health endpoint)

---

## 📝 Available npm Scripts

From your `package.json`:

```json
{
  "scripts": {
    "start": "react-scripts start",              // Dev: Start React dev server
    "server": "node server/index.js",            // Start backend only
    "server:dev": "nodemon server/index.js",    // Dev: Start backend with auto-reload
    "dev:all": "concurrently \"npm start\" \"npm run server:dev\"",  // Dev: Start both
    "build": "react-scripts build",              // Build React frontend
    "start:production": "node server/index.js",  // Production: Start backend (serves build)
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  }
}
```

---

## 🚀 Recommended Setup for Render

### **Option A: Single Service (Recommended)** ✅

**Best for:** Simple deployment, everything in one place

**Render Settings:**
```
Name: yohanns-backend
Environment: Node
Root Directory: (leave empty - uses root)
Build Command: npm install && npm run build
Start Command: npm run start:production
Health Check Path: /health
```

**What happens:**
1. Render runs `npm install && npm run build`
   - Installs dependencies
   - Builds React app to `build/` folder
2. Render runs `npm run start:production`
   - Starts Express server on port 4000
   - Server serves React build for all non-API routes
   - API routes work normally

---

### **Option B: Separate Services** (Advanced)

**Backend Service:**
```
Name: yohanns-api
Environment: Node
Root Directory: (leave empty)
Build Command: npm install
Start Command: node server/index.js
Health Check Path: /health
```

**Frontend Service:**
```
Name: yohanns-frontend
Environment: Static Site
Root Directory: (leave empty)
Build Command: npm install && npm run build
Publish Directory: build
```

**Or Frontend as Web Service:**
```
Name: yohanns-frontend
Environment: Node
Root Directory: (leave empty)
Build Command: npm install && npm run build
Start Command: npx serve -s build -l $PORT
Health Check Path: /
```

---

## 🔧 Current render.yaml Configuration

Your current `render.yaml`:

```yaml
services:
  - type: web
    name: yohanns-app
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm run start:production
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 4000
    healthCheckPath: /health
```

**This is correct!** ✅

This configuration:
- Builds the React frontend
- Starts the Express backend
- Serves both from one service

---

## ⚙️ Manual Configuration in Render Dashboard

If not using `render.yaml`, configure manually:

### **Step 1: Go to Your Service**
1. Open Render Dashboard
2. Click on your service
3. Go to **Settings** tab

### **Step 2: Configure Build & Start**

**Build Command:**
```
npm install && npm run build
```

**Start Command:**
```
npm run start:production
```

**Environment:**
```
Node
```

**Root Directory:**
```
(leave empty - uses project root)
```

---

## 🐛 Troubleshooting

### **Issue 1: "Build folder not found"**
**Error:** `❌ React app build NOT found at: .../build`

**Solution:**
- Make sure build command includes `npm run build`
- Check build logs for errors
- Verify `react-scripts` is installed

### **Issue 2: "Port already in use"**
**Error:** `EADDRINUSE: address already in use`

**Solution:**
- Render sets `PORT` automatically - don't hardcode it
- Your code already uses `process.env.PORT || 4000` ✅

### **Issue 3: "Module not found"**
**Error:** `Cannot find module '...'`

**Solution:**
- Make sure `npm install` runs in build command
- Check if dependencies are in `package.json`
- Verify root directory is correct

### **Issue 4: "API routes return 404"**
**Error:** API calls fail after deployment

**Solution:**
- Verify `FRONTEND_URL` and `CLIENT_URL` are set correctly
- Check CORS configuration in `server/index.js`
- Ensure API routes are defined before static file serving

---

## 📊 Build Process Flow

### **Single Service Deployment:**

```
1. Git Push → Render detects changes
2. Build Phase:
   ├─ npm install (installs all dependencies)
   └─ npm run build (creates build/ folder)
3. Start Phase:
   └─ npm run start:production
      └─ node server/index.js
         ├─ Express server starts
         ├─ Serves /api/* routes
         └─ Serves React app for all other routes
4. Health Check:
   └─ GET /health → Returns {"ok":true}
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Build completes without errors
- [ ] Health check passes: `https://your-app.onrender.com/health`
- [ ] Frontend loads: `https://your-app.onrender.com`
- [ ] API works: `https://your-app.onrender.com/api/products`
- [ ] No "build folder not found" errors in logs
- [ ] Port is set correctly (Render sets automatically)

---

## 🎯 Quick Reference

| Scenario | Build Command | Start Command |
|----------|--------------|---------------|
| **Single Service** (Recommended) | `npm install && npm run build` | `npm run start:production` |
| **Backend Only** | `npm install` | `node server/index.js` |
| **Frontend Only** | `npm install && npm run build` | `npx serve -s build -l $PORT` |

---

## 📝 Summary

**For your project, use:**

✅ **Build Command:** `npm install && npm run build`
✅ **Start Command:** `npm run start:production`
✅ **Health Check:** `/health`
✅ **Environment:** `Node`
✅ **Port:** Auto-set by Render (your code handles this)

This will deploy both frontend and backend together, with the backend serving the React build. Perfect for a monorepo setup! 🚀

