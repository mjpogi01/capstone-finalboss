# .htaccess Setup Guide

## 📋 What is .htaccess?

`.htaccess` is a configuration file for Apache web servers (used by Hostinger, cPanel, and many shared hosting providers). It allows you to configure your website without accessing the main server configuration.

## 🚀 Quick Setup

### **Step 1: Create the File**
1. The `.htaccess` file is already created in your project root
2. Make sure it's in the same directory as your `index.html` (usually in `build/` folder after building)

### **Step 2: Upload to Hostinger**
1. Build your React app: `npm run build`
2. Upload the entire `build/` folder contents to Hostinger's `public_html/` directory
3. Make sure `.htaccess` is in the `public_html/` root

### **Step 3: Verify**
1. Visit your website
2. Try navigating to different routes (e.g., `/products`, `/about`)
3. All routes should work without 404 errors

---

## ⚙️ Configuration Options

### **1. Client-Side Routing (SPA Support)**
Already configured! This allows React Router to work properly:
```apache
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_URI} !^/api/
RewriteRule . /index.html [L]
```

### **2. Force HTTPS (SSL)**
Uncomment these lines if you have an SSL certificate:
```apache
# RewriteCond %{HTTPS} off
# RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

### **3. Force www or non-www**
Choose one option and uncomment:

**Force www:**
```apache
# RewriteCond %{HTTP_HOST} !^www\. [NC]
# RewriteRule ^(.*)$ https://www.%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

**Force non-www:**
```apache
# RewriteCond %{HTTP_HOST} ^www\.(.*)$ [NC]
# RewriteRule ^(.*)$ https://%1%{REQUEST_URI} [L,R=301]
```

---

## 🔧 What's Included

### ✅ **Client-Side Routing**
- Redirects all requests to `index.html` (except API routes)
- Allows React Router to handle routing

### ✅ **Gzip Compression**
- Compresses files to reduce bandwidth
- Faster page loads

### ✅ **Browser Caching**
- Images cached for 1 year
- CSS/JS cached for 1 month
- HTML not cached (always fresh)

### ✅ **Security Headers**
- X-Frame-Options (prevents clickjacking)
- X-XSS-Protection
- X-Content-Type-Options
- Referrer Policy

### ✅ **File Protection**
- Prevents access to `.htaccess` file
- Blocks access to sensitive files (`.env`, `.git`, etc.)

---

## 🐛 Troubleshooting

### **Issue 1: Routes return 404**
**Solution:**
- Make sure `.htaccess` is in the `public_html/` root
- Verify `mod_rewrite` is enabled on your server
- Check file permissions (should be 644)

### **Issue 2: "Internal Server Error"**
**Solution:**
- Check for syntax errors in `.htaccess`
- Verify Apache modules are enabled:
  - `mod_rewrite`
  - `mod_deflate`
  - `mod_expires`
  - `mod_headers`

### **Issue 3: Compression not working**
**Solution:**
- Verify `mod_deflate` is enabled
- Check if your hosting provider allows compression

### **Issue 4: Caching too aggressive**
**Solution:**
- Adjust cache times in the `mod_expires` section
- Set HTML cache to `0 seconds` (already done)

---

## 📝 File Structure

After building and uploading:

```
public_html/
├── .htaccess          ← Must be here!
├── index.html
├── static/
│   ├── css/
│   ├── js/
│   └── media/
└── ... (other build files)
```

---

## ✅ Verification Checklist

After uploading:

- [ ] `.htaccess` is in `public_html/` root
- [ ] File permissions are 644
- [ ] All routes work (no 404 errors)
- [ ] Images load correctly
- [ ] CSS/JS files load
- [ ] No "Internal Server Error" messages

---

## 🔐 Security Notes

1. **Never commit `.htaccess` with sensitive data**
2. **Keep file permissions at 644** (readable by web server)
3. **Test after any changes** to avoid breaking your site
4. **Backup before modifying** if you have a live site

---

## 📚 Additional Resources

- [Apache .htaccess Documentation](https://httpd.apache.org/docs/current/howto/htaccess.html)
- [React Router Deployment](https://reactrouter.com/en/main/start/overview#deployment)

---

## 🎯 Quick Reference

| Feature | Status | Notes |
|---------|--------|-------|
| SPA Routing | ✅ Enabled | All routes redirect to index.html |
| Gzip Compression | ✅ Enabled | Reduces file sizes |
| Browser Caching | ✅ Enabled | Images: 1 year, CSS/JS: 1 month |
| Security Headers | ✅ Enabled | XSS, Clickjacking protection |
| HTTPS Redirect | ⚠️ Disabled | Uncomment if you have SSL |
| www Redirect | ⚠️ Disabled | Uncomment if needed |

---

**Your `.htaccess` is ready to use! Just upload it with your build files.** 🚀

