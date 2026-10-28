# Railway Deployment Guide

## What is Railway?

Railway is a simple, modern platform for deploying web apps. Perfect for static sites (like ours). No DevOps knowledge needed.

**Why Railway for SQ Risk Scorecard:**
- ✅ Deploy in 2 minutes (zero configuration)
- ✅ Free tier available (test before paying)
- ✅ Custom domains included
- ✅ Auto-HTTPS (all traffic encrypted)
- ✅ Git integration (push code → auto-deploy)

---

## Step 1: Create Railway Account

1. Go to **railway.app**
2. Sign up with GitHub (easiest) or email
3. Create a new project
4. Connect your GitHub repository

---

## Step 2: Configure Railway Project

### In Railway Dashboard:
1. **Project Name:** `Supplier Quality Risk Scorecard`
2. **Environment:** Production
3. **Build Command:** (leave blank — static site, no build needed)
4. **Start Command:** (leave blank)
5. **Root Directory:** `.` (entire repo is the app)

---

## Step 3: Deploy

1. Click **"Deploy"** in Railway
2. Wait 2–3 minutes for build to complete
3. You'll receive a URL: `https://supplier-quality-risk-scorecard-prod.railway.app`
4. Click URL to verify app loads ✓

---

## Step 4: Custom Domain (Optional)

### Add Your Domain
1. In Railway: **Settings** → **Custom Domains**
2. Enter: `scorecard.conform-edge.com` (or your domain)
3. Follow Railway's DNS instructions (add CNAME record to your DNS provider)
4. Test: Visit `https://scorecard.conform-edge.com` → should load your app

---

## Step 5: Set Up Auto-Deploys

1. In Railway: **Settings** → **GitHub Integration**
2. Select your `supplier-quality-risk-scorecard` repository
3. Enable **"Auto-deploy on push"**
4. Now every time you push to GitHub, Railway auto-deploys in 2 minutes

---

## Step 6: Monitoring

### Health Check
Railway will regularly ping your app to ensure it's online.
- **Health Check Path:** `/` (your index.html)
- **Interval:** Every 60 seconds
- **Expected Response:** 200 OK + page loads

### Logs
Click **"Logs"** in Railway dashboard to see:
- Deploy logs (successful? errors?)
- Runtime logs (any JavaScript errors?)
- Traffic logs (who's visiting?)

---

## Step 7: Backup & Rollback

### If Deploy Goes Wrong
1. In Railway: **Deployments** → **View History**
2. Find the previous working version
3. Click **"Rollback"** to restore previous version
4. App will restart with old code immediately

### Disaster Recovery
- Your code is on GitHub (primary backup)
- Railway stores 30-day deployment history
- User data is in their browser (not on our servers)

---

## Environment Variables (Future Use)

If v2.0 adds cloud sync, you'll need secrets:

1. In Railway: **Settings** → **Environment Variables**
2. Add:
   - `DATABASE_URL=your-database-connection-string`
   - `API_KEY=your-secret-key`
   - `ENVIRONMENT=production`
3. Code will read from `process.env.DATABASE_URL` etc.

For MVP (v1.0), **no environment variables needed**.

---

## Performance Tips

### Reduce Load Time
- Compress CSS/JS (minify) — not critical for MVP
- Optimize images — no images in MVP
- Enable gzip compression — Railway does this automatically

### Monitor Performance
- Railway shows response times in logs
- Target: < 1 second page load
- If slow, check browser console for JavaScript errors

---

## Security Checklist

- [ ] App is served over HTTPS (automatic on Railway)
- [ ] No sensitive data in code (passwords, API keys) → use env variables
- [ ] No third-party APIs that expose data (v1.0 doesn't have any)
- [ ] CORS headers are safe (app is same-origin only)

**For v1.0: No security issues. App stores data locally in user's browser.**

---

## Pricing

### Free Tier (Good for MVP testing)
- $5 credit per month
- Enough for small traffic
- Perfect for: beta testing, first 100 users

### Paid Tier
- Pay-as-you-go (starts $0/month)
- ≈ $0.50–$2/month for typical SaaS usage
- Predictable pricing: no surprises

**For SQ Risk Scorecard:** Estimate $2–5/month (very low compute since it's static HTML + JavaScript).

---

## Troubleshooting

### "App won't load"
1. Check Railway logs for errors
2. Verify HTML file exists: `artifact/index.html`
3. Check GitHub repo is public (if private, Railway needs access)
4. Restart deployment: **Redeploy** button in Railway

### "404 Not Found on landing page"
1. Verify you have `landing.html` in root directory (if deploying it)
2. Railway will serve `index.html` by default
3. If you want `landing.html` as homepage, add a redirect in Railway

### "CSV import/export not working"
1. Not a deployment issue — this is browser functionality
2. Check browser console (F12 → Console tab) for errors
3. Verify user has read/write permissions on their device

### "Page loads slow after deploy"
1. Railway might be starting up container (first 10 seconds)
2. Refresh page after 10 seconds
3. If still slow, Railway logs will show if there's a problem

---

## Deployment Checklist

Before going live:

- [ ] Code pushed to GitHub
- [ ] GitHub repo is public (or Railway has access)
- [ ] Railway project created
- [ ] Deploy successful (check Railway logs)
- [ ] Health check passes (page loads in < 2 sec)
- [ ] Custom domain configured (optional)
- [ ] Auto-deploy enabled (optional, but recommended)
- [ ] Logs monitored (check daily for first week)

---

## Post-Launch Monitoring (First 30 Days)

**Daily:**
- [ ] Check Railway dashboard for any errors
- [ ] Check app is still online (visit URL)

**Weekly:**
- [ ] Review logs for error patterns
- [ ] Monitor response times (target < 1 sec)
- [ ] Check Gumroad for customer issues

**Monthly:**
- [ ] Review deployment history
- [ ] Plan v1.1 deployment (if applicable)
- [ ] Update custom domain cert (auto-renews, no action needed)

---

## Scaling Beyond MVP

**If you get 10,000+ daily users:**
1. Static site will still work fine (Railway handles this)
2. Only issue: if v2.0 adds backend (cloud sync), you'll need database
3. At that point: add Railway PostgreSQL service ($15/mo)

**For MVP (v1.0):** No scaling needed. App is 100% client-side.

---

## Documentation

- **Railway Docs:** https://docs.railway.app
- **Deployment Help:** Railway support chat (in dashboard)
- **Custom Domain Help:** Railway's domain setup guide

---

## Summary

**Deploy Supplier Quality Risk Scorecard to Railway in 5 steps:**
1. Create Railway account (1 min)
2. Connect GitHub repo (30 sec)
3. Click Deploy (2–3 min)
4. Get URL (`railway.app/...`) (instant)
5. Add custom domain (5 min, optional)

**Total time: 10 minutes. Cost: $0–5/month. Reliability: 99.9% uptime.**

Ready to go live?
