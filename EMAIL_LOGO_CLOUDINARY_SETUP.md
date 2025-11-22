# Email Logo Cloudinary Setup Guide

## 📧 Using Cloudinary for Email Logo

The email templates now use Cloudinary CDN for the logo, which provides:
- ✅ Better email deliverability
- ✅ Faster image loading
- ✅ More reliable than self-hosted images
- ✅ Works better with Gmail and other email clients

## 🚀 Setup Options

### Option 1: Auto-Detection (Recommended)

If you have `CLOUDINARY_CLOUD_NAME` set in your environment variables, the logo URL will be automatically constructed as:
```
https://res.cloudinary.com/{CLOUDINARY_CLOUD_NAME}/image/upload/yohanns-logo.png
```

**Steps:**
1. Upload your logo to Cloudinary with the public ID: `yohanns-logo.png`
2. Make sure `CLOUDINARY_CLOUD_NAME` is set in Render environment variables
3. The email templates will automatically use the Cloudinary URL

### Option 2: Custom Logo URL

If you want to use a specific Cloudinary URL or a different CDN:

1. **Set Environment Variable in Render:**
   - Go to Render Dashboard → Your Backend Service → Environment
   - Add: `EMAIL_LOGO_URL=https://res.cloudinary.com/your-cloud-name/image/upload/v1234567890/yohanns-logo.png`
   - Click **Save Changes**

2. **The email templates will use this URL directly**

### Option 3: Fallback to Self-Hosted

If neither `EMAIL_LOGO_URL` nor `CLOUDINARY_CLOUD_NAME` is set, it will fallback to:
```
https://yohanns-sportswear.onrender.com/yohanns-logo.png
```

## 📤 Uploading Logo to Cloudinary

### Method 1: Cloudinary Dashboard

1. Go to [Cloudinary Dashboard](https://cloudinary.com/console)
2. Navigate to **Media Library**
3. Click **Upload** → **Upload files**
4. Upload `yohanns-logo.png`
5. After upload, rename it to `yohanns-logo` (or note the public ID)
6. Copy the URL or public ID

### Method 2: Using Cloudinary API

You can upload via the backend API endpoint:
```bash
POST /api/upload/single
```

Or use the Cloudinary SDK directly in a script.

## 🔍 Finding Your Cloudinary Logo URL

After uploading to Cloudinary, your logo URL will be:
```
https://res.cloudinary.com/{your-cloud-name}/image/upload/{public-id}.png
```

**Example:**
```
https://res.cloudinary.com/demo/image/upload/yohanns-logo.png
```

## ✅ Verification

1. **Check Environment Variables:**
   - `CLOUDINARY_CLOUD_NAME` should be set
   - Or `EMAIL_LOGO_URL` should be set to your Cloudinary URL

2. **Test Email:**
   - Send a test marketing email
   - Check if the logo loads correctly
   - Verify in Gmail (may need to enable images)

3. **Check Logs:**
   - Look for any image loading errors
   - Verify the logo URL is correct

## 🎯 Recommended Setup

**Best Practice:**
1. Upload logo to Cloudinary with public ID: `yohanns-logo`
2. Set `CLOUDINARY_CLOUD_NAME` in Render environment
3. Let the system auto-construct the URL

**Alternative:**
- If you need a specific transformation or version, set `EMAIL_LOGO_URL` directly

## 📝 Environment Variables

**Required for Auto-Detection:**
```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
```

**Optional (overrides auto-detection):**
```env
EMAIL_LOGO_URL=https://res.cloudinary.com/your-cloud-name/image/upload/yohanns-logo.png
```

## 🔧 Troubleshooting

**Logo not showing in emails:**
- ✅ Verify logo is uploaded to Cloudinary
- ✅ Check public ID matches: `yohanns-logo.png`
- ✅ Verify `CLOUDINARY_CLOUD_NAME` is set correctly
- ✅ Check Cloudinary URL is accessible in browser
- ✅ Make sure images are enabled in email client

**Using custom transformations:**
If you want to add Cloudinary transformations (resize, optimize, etc.):
```env
EMAIL_LOGO_URL=https://res.cloudinary.com/your-cloud-name/image/upload/w_200,h_auto,c_limit,q_auto/yohanns-logo.png
```

## 📚 Resources

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Cloudinary Image Transformations](https://cloudinary.com/documentation/image_transformations)

