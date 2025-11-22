# Keep Render Backend Awake with UptimeRobot (Free)

## 🎯 Goal
Use UptimeRobot's free monitoring service to ping your Render backend every 14 minutes, preventing it from sleeping on the free tier.

**Cost:** FREE (50 monitors on free plan)

---

## 🚀 Step-by-Step Setup

### Step 1: Create UptimeRobot Account

1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Click **"Sign Up"** or **"Get Started Free"**
3. Fill in:
   - **Email:** Your email address
   - **Password:** Create a password
   - **Username:** Choose a username
4. Click **"Create Account"**
5. Verify your email (check inbox)

---

### Step 2: Log In to UptimeRobot

1. Go to [uptimerobot.com/login](https://uptimerobot.com/login)
2. Log in with your credentials

---

### Step 3: Add New Monitor

1. In UptimeRobot Dashboard, click **"+ Add New Monitor"** button (top right)
2. Or click **"Monitors"** in the left sidebar → **"Add New Monitor"**

---

### Step 4: Configure Monitor

Fill in the form:

**Monitor Type:**
- Select: **HTTP(s)**
- This will ping your API endpoint

**Friendly Name:**
- Enter: `Yohanns API` or `Render Backend`
- This is just for your reference

**URL (or IP):**
- Enter your Render backend health check URL:
  ```
  https://yohanns-api.onrender.com/health
  ```
  Replace `yohanns-api.onrender.com` with your actual Render URL

**Monitoring Interval:**
- Select: **5 minutes** (closest to 14 minutes)
- Note: Free plan only has 5-minute intervals (not 14 minutes)
- **Don't worry!** 5 minutes is even better - keeps it awake more reliably
- Paid plans have 1-minute intervals, but 5 minutes is fine

**Alert Contacts:**
- Leave default or select your email
- You'll get alerts if API goes down
- You can skip this if you don't want alerts

---

### Step 5: Save Monitor

1. Click **"Create Monitor"** button at the bottom
2. Your monitor is now active! ✅

---

### Step 6: Verify It's Working

**In UptimeRobot Dashboard:**
1. You should see your monitor listed
2. Status should show **"Up"** (green)
3. Last check time should update every 5 minutes

**In Render Dashboard:**
1. Go to your Render service
2. Check **"Logs"** tab
3. You should see GET requests to `/health` every 5 minutes
4. Looks like: `GET /health 200 ...`

---

## 🔍 How It Works

**What happens:**
1. UptimeRobot sends HTTP GET request to `https://yohanns-api.onrender.com/health` every 5 minutes
2. Render backend responds with `{"ok":true}`
3. This counts as activity, so Render keeps your service awake
4. No cold starts! 🎉

**Timeline:**
- **Every 5 minutes:** UptimeRobot pings your API
- **Render stays awake:** Because there's constant activity
- **Users experience:** Fast response (no 30-60 second delays)

---

## ⚙️ Advanced Configuration (Optional)

### Change Monitor Interval (If You Have Paid Plan)

If you upgrade UptimeRobot Pro:
- Can set to **1-minute intervals** (faster checks)
- Or set to **exactly 14 minutes** if you want
- Free plan only has 5-minute intervals (which is fine!)

### Add Multiple Monitors

You can add monitors for:
- Health check: `/health`
- Main API: `/api/products` (or any endpoint)
- Each monitor pings every 5 minutes

**Recommended:** Just use `/health` endpoint - it's enough to keep it awake.

---

## 📊 Monitoring Dashboard

**What you'll see in UptimeRobot:**

**Overview:**
- Monitor status (Up/Down)
- Uptime percentage
- Last check time
- Response time

**Logs:**
- All check history
- Response times
- Any downtime incidents

**Benefits:**
- Know if your API goes down
- Track uptime percentage
- See response times

---

## 🐛 Troubleshooting

### Monitor Shows "Down" (Red)

**Possible causes:**
1. **Render service is sleeping:**
   - Wait for first check after monitor starts
   - It should wake up and show "Up" after first ping

2. **Wrong URL:**
   - Check your Render URL is correct
   - Make sure `/health` endpoint exists
   - Test manually: Visit `https://yohanns-api.onrender.com/health`

3. **API endpoint not working:**
   - Check Render logs for errors
   - Verify `/health` route exists in your code

**Fix:**
- Verify URL is correct
- Test manually in browser
- Check Render service status

### Monitor Not Pinging

**Check:**
1. Monitor is enabled (status should be "Paused" if disabled)
2. Monitor interval is set correctly
3. Account is not suspended

**Fix:**
- Click on monitor → **"Edit"** → Verify settings
- Make sure monitor is **"Active"** (not paused)

### Render Still Sleeping

**Possible causes:**
1. **Monitor not active yet:**
   - Wait 5-10 minutes for first check
   - Render needs time to recognize activity

2. **Render hasn't detected activity:**
   - Check Render logs - should show requests
   - Verify UptimeRobot is sending requests

**Fix:**
- Wait 15-20 minutes
- Check Render logs for incoming requests
- Verify monitor is working in UptimeRobot

---

## 💡 Pro Tips

### Tip 1: Use Health Check Endpoint

**Best practice:** Use `/health` endpoint (not main API route)
- Lightweight response
- Fast check
- Doesn't log unnecessary requests in your API

### Tip 2: Monitor Multiple Endpoints (Optional)

You can add multiple monitors:
1. `/health` - Health check
2. `/api/products` - Actual API endpoint
3. Each pings every 5 minutes

**Note:** One monitor is enough! But multiple monitors provide redundancy.

### Tip 3: Set Up Email Alerts

**Benefits:**
- Know immediately if API goes down
- Track uptime issues
- Debug problems faster

**How to:**
- In monitor settings, add email alert contact
- You'll get emails when API goes down/up

### Tip 4: Check Response Times

**In UptimeRobot Dashboard:**
- Monitor response times
- If response time increases, may indicate:
  - Render is sleeping (first request slow)
  - API is slow (performance issue)
  - Network issues

**Normal response time:**
- Render awake: 100-500ms
- Render waking up: 5-60 seconds (first request after sleep)

---

## 📝 UptimeRobot Free Plan Limits

**Free Plan Includes:**
- ✅ 50 monitors
- ✅ 5-minute check intervals
- ✅ Email alerts
- ✅ 2-month log history
- ✅ 60-second alert intervals
- ✅ Unlimited SMS alerts (requires credits)

**Free Plan Limits:**
- ⚠️ 5-minute intervals (not 1 minute)
- ⚠️ 2-month log retention
- ⚠️ 50 monitors max

**For your use case:**
- ✅ 5-minute intervals are perfect (keeps Render awake)
- ✅ 50 monitors is more than enough (you only need 1)
- ✅ Free plan is sufficient!

---

## 🔄 Alternative Monitoring Services

If UptimeRobot doesn't work for you, here are alternatives:

### 1. **Cron-Job.org** (Free)
- Schedule HTTP requests
- Can set exact intervals
- Free tier available
- Website: [cron-job.org](https://cron-job.org)

### 2. **EasyCron** (Free tier)
- Cron job scheduler
- HTTP requests
- Free tier available
- Website: [easycron.com](https://easycron.com)

### 3. **Healthchecks.io** (Free tier)
- Monitoring service
- HTTP checks
- Free tier available
- Website: [healthchecks.io](https://healthchecks.io)

### 4. **GitHub Actions** (Free)
- Use GitHub Actions workflow
- Scheduled HTTP requests
- 100% free
- More complex setup

**Recommendation:** UptimeRobot is easiest and most reliable for this purpose!

---

## ✅ Quick Checklist

- [ ] UptimeRobot account created
- [ ] Logged in to dashboard
- [ ] New monitor added
- [ ] Monitor type: HTTP(s)
- [ ] URL: `https://yohanns-api.onrender.com/health`
- [ ] Interval: 5 minutes
- [ ] Monitor saved and active
- [ ] Status shows "Up" in dashboard
- [ ] Render logs show incoming requests
- [ ] API stays awake (no cold starts)

---

## 🎯 Expected Results

**Before UptimeRobot:**
- ❌ Render sleeps after 15 minutes of inactivity
- ❌ First user waits 30-60 seconds
- ❌ Poor user experience

**After UptimeRobot:**
- ✅ Render stays awake 24/7
- ✅ All users get fast response
- ✅ No cold start delays
- ✅ Great user experience

---

## 📊 Monitoring Your Setup

**Check if it's working:**

1. **UptimeRobot Dashboard:**
   - Status: Should show "Up" (green)
   - Last check: Updates every 5 minutes
   - Response time: Should be <1 second when awake

2. **Render Dashboard:**
   - Logs: Should show GET requests to `/health` every 5 minutes
   - Service status: Should be "Live" (not sleeping)
   - Response times: Fast (no 30-60 second delays)

3. **Test Manually:**
   - Visit `https://yohanns-api.onrender.com/health`
   - Should respond instantly (<1 second)
   - If slow, Render may have just woken up (wait and try again)

---

## 🎉 You're Done!

Once UptimeRobot is set up:
- Your Render backend will stay awake
- No more cold start delays
- Users get fast response times
- All for FREE! 🚀

**Next Steps:**
- Monitor UptimeRobot dashboard for a day to verify it's working
- Check Render logs to see the pings coming in
- Enjoy your always-awake API!

---

**Need Help?** 
- UptimeRobot Docs: [docs.uptimerobot.com](https://docs.uptimerobot.com)
- Render Docs: [render.com/docs](https://render.com/docs)











