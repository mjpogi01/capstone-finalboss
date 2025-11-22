# My Deployment URLs

## 🚀 Backend (Render)

**Backend URL:** `https://yohanns-api.onrender.com`

### Test Endpoints:
- Health Check: `https://yohanns-api.onrender.com/health`
- API Products: `https://yohanns-api.onrender.com/api/products`
- API Root: `https://yohanns-api.onrender.com/`

---

## 📋 Environment Variables to Set in Render

When setting up your backend on Render, use these URLs:

### **For CORS Configuration:**
```
FRONTEND_URL=https://your-frontend-domain.com
CLIENT_URL=https://your-frontend-domain.com
```

**Replace `your-frontend-domain.com` with your actual frontend URL!**

### **For Frontend (if deploying separately):**
```
REACT_APP_API_URL=https://yohanns-api.onrender.com
```

---

## ✅ Quick Verification

After deployment, test these URLs:

1. **Health Check:**
   ```
   https://yohanns-api.onrender.com/health
   ```
   Should return: `{"ok":true}`

2. **API Test:**
   ```
   https://yohanns-api.onrender.com/api/products
   ```
   Should return: Product data (JSON)

3. **Frontend (if served from backend):**
   ```
   https://yohanns-api.onrender.com/
   ```
   Should show: Your React app

---

## 📝 Notes

- Backend is deployed at: `yohanns-api.onrender.com`
- Make sure to set `FRONTEND_URL` and `CLIENT_URL` to match your frontend domain
- If frontend is on the same service, use: `https://yohanns-api.onrender.com`
- If frontend is separate, use your frontend's actual domain

---

**Last Updated:** Now
**Backend Service:** Render Web Service
**Service Name:** `yohanns-app` (from render.yaml)

