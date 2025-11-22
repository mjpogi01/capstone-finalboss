# Hostinger VPS Setup Guide - Node.js Deployment

## Step 1: Choose Operating System ✅

**Select: Ubuntu 22.04 LTS** (or latest Ubuntu LTS with star ⭐)

Ubuntu is the best choice for Node.js apps:
- ✅ Best Node.js support
- ✅ Easy package management (apt)
- ✅ Huge community & tutorials
- ✅ Well-documented

**Alternative:** If Ubuntu isn't available, choose **Debian** (also has a star ⭐)

---

## Step 2: After VPS is Created

### Connect via SSH

You'll receive VPS credentials from Hostinger. Then connect:

```powershell
ssh root@your-vps-ip
# or
ssh u302669616@your-vps-ip
```

Replace `your-vps-ip` with the IP address Hostinger provides.

---

## Step 3: Update System

```bash
sudo apt update
sudo apt upgrade -y
```

---

## Step 4: Install Node.js 20.x

```bash
# Install Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

You should see:
```
v20.x.x
10.x.x
```

---

## Step 5: Install Git

```bash
sudo apt install git -y
git --version
```

---

## Step 6: Clone Your Repository

```bash
# Create directory for your app
sudo mkdir -p /var/www
cd /var/www

# Clone your repository
sudo git clone https://github.com/mjpogi01/capstone2.git
sudo chown -R $USER:$USER capstone2
cd capstone2
```

---

## Step 7: Install Dependencies & Build

```bash
# Install npm packages
npm install

# Build React app
npm run build
```

This will take a few minutes.

---

## Step 8: Create .env File

```bash
nano .env
```

Add all your environment variables:

```env
NODE_ENV=production
PORT=4000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
CLIENT_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

Save: Press `Ctrl + X`, then `Y`, then `Enter`

---

## Step 9: Install PM2 (Process Manager)

PM2 keeps your Node.js app running even after you disconnect:

```bash
sudo npm install -g pm2

# Start your app
pm2 start server/index.js --name yohanns-app

# Make PM2 start on server reboot
pm2 save
pm2 startup

# Follow the instructions that appear
# It will show a command like:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u your-username --hp /home/your-username
# Copy and run that command
```

Check if app is running:
```bash
pm2 status
pm2 logs yohanns-app
```

---

## Step 10: Install Nginx (Reverse Proxy)

Nginx will route traffic from port 80/443 to your Node.js app on port 4000:

```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## Step 11: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/yourdomain.com
```

Add this configuration (replace `yourdomain.com` with your actual domain):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Save and exit: `Ctrl + X`, `Y`, `Enter`

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t
```

If test passes, restart Nginx:
```bash
sudo systemctl restart nginx
```

---

## Step 12: Set Up SSL Certificate (HTTPS)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts:
- Enter your email
- Agree to terms
- Choose whether to redirect HTTP to HTTPS (recommended: Yes)

SSL certificate will be installed automatically!

---

## Step 13: Configure Firewall

```bash
# Allow HTTP, HTTPS, and SSH
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## Step 14: Test Your Deployment

1. **Check Backend:** Visit `http://yourdomain.com/health` → Should return `{"ok":true}`
2. **Check Frontend:** Visit `http://yourdomain.com` → Should load your React app
3. **Check API:** Open browser console, check if API calls work

---

## 🔄 Updating Your App

When you make changes:

```bash
cd /var/www/capstone2
git pull origin main
npm install
npm run build
pm2 restart yohanns-app
```

---

## 📝 Useful Commands

### PM2 Commands
```bash
pm2 status              # Check app status
pm2 logs yohanns-app    # View logs
pm2 restart yohanns-app # Restart app
pm2 stop yohanns-app    # Stop app
pm2 delete yohanns-app  # Remove from PM2
```

### Nginx Commands
```bash
sudo systemctl status nginx   # Check Nginx status
sudo systemctl restart nginx  # Restart Nginx
sudo nginx -t                 # Test Nginx config
```

### View Logs
```bash
pm2 logs yohanns-app                    # App logs
sudo tail -f /var/log/nginx/error.log  # Nginx error logs
sudo journalctl -u nginx -f            # Nginx system logs
```

---

## 🐛 Troubleshooting

### App not accessible
- Check PM2 status: `pm2 status`
- Check Nginx status: `sudo systemctl status nginx`
- Check firewall: `sudo ufw status`
- Check app logs: `pm2 logs yohanns-app`

### 502 Bad Gateway
- App might not be running: `pm2 restart yohanns-app`
- Check if port 4000 is correct in Nginx config
- Verify app is listening: `sudo netstat -tlnp | grep 4000`

### SSL certificate issues
- Make sure domain points to VPS IP
- Check DNS settings in Hostinger
- Re-run: `sudo certbot --nginx -d yourdomain.com`

### Permission errors
- Make sure user owns files: `sudo chown -R $USER:$USER /var/www/capstone2`
- Check file permissions: `ls -la /var/www/capstone2`

---

## ✅ Quick Checklist

- [ ] Selected Ubuntu 22.04 LTS
- [ ] VPS created and SSH access works
- [ ] Node.js 20.x installed
- [ ] Git installed
- [ ] Repository cloned
- [ ] Dependencies installed (`npm install`)
- [ ] React app built (`npm run build`)
- [ ] .env file created with all variables
- [ ] PM2 installed and app started
- [ ] Nginx installed and configured
- [ ] SSL certificate installed
- [ ] Firewall configured
- [ ] App accessible at your domain

---

**Need Help?** Check Hostinger VPS documentation or contact their support!











