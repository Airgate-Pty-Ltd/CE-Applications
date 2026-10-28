# Railway Deployment Guide
## 21 CFR Part 11 / ALCOA++ Data Integrity Toolkit v1.0
**© 2026 Conform-Edge Quality Consulting LLC**

---

## Overview

Railway serves the `artifact/index.html` as a static site. No build process, no Node.js server, no environment variables needed. The entire application is a single HTML file.

**Estimated deploy time:** 5 minutes from GitHub push to live URL.

---

## Prerequisites

- GitHub account with the repository pushed (`conform-edge/cfr-part11-toolkit`)
- Railway account at railway.app (free Hobby plan: $5/month)
- Custom domain (optional): `toolkit.conform-edge.com` or `tools.conform-edge.com`

---

## Step-by-Step Deployment

### Step 1: Push to GitHub
Follow instructions in `GITHUB-READY.md`. The repo must have `artifact/index.html` at the repository root level.

### Step 2: Create Railway Project
1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Authorize Railway to access your GitHub account if prompted
5. Select `conform-edge/cfr-part11-toolkit`

### Step 3: Configure Static Site
Railway auto-detects static sites. If it doesn't:
1. In project settings → "Build & Deploy"
2. Set **Root Directory**: `artifact`
3. Set **Build Command**: (leave blank — no build required)
4. Set **Start Command**: (leave blank for static)

If Railway prompts for a framework, select "Static" or "None."

### Step 4: Deploy
Click "Deploy Now" (or Railway auto-deploys on first setup).

Railway will:
1. Clone your repository
2. Serve the `artifact/` folder as a static site
3. Assign a URL: `https://cfr-part11-toolkit-<random-hash>.railway.app`

**Deployment typically completes in under 60 seconds.**

### Step 5: Verify Deployment
Open the Railway-assigned URL in a browser.
- Check: Application header shows "Conform-Edge Quality Consulting LLC"
- Check: Section 1 questions are visible
- Check: Demo mode loads (click "Load Demo")
- Check: CSV export downloads a file
- Check: Print dialog opens

### Step 6: Custom Domain (Optional)
1. In Railway project → Settings → Custom Domains
2. Click "Add Domain"
3. Enter: `toolkit.conform-edge.com`
4. Railway provides: CNAME record value (e.g., `cfr-part11-toolkit.railway.app`)
5. In your DNS provider (Cloudflare, GoDaddy, etc.), add:
   ```
   Type: CNAME
   Name: toolkit
   Value: cfr-part11-toolkit.railway.app
   TTL: Auto
   ```
6. Wait 5–15 minutes for DNS propagation
7. Railway auto-provisions SSL certificate (Let's Encrypt)

---

## Environment Variables

None required. This is a fully static application.

If you later add Supabase (v1.1+), add:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

---

## Continuous Deployment

Railway auto-deploys on every push to the `main` branch. No manual deploy required after the first setup.

To deploy a new version:
```bash
git add artifact/index.html
git commit -m "v1.1: Add assessment history feature"
git push origin main
```

Railway detects the push and redeploys within ~30 seconds.

---

## Cost

| Plan | Price | Suitable For |
|------|-------|-------------|
| Railway Hobby | $5/month | MVP, testing, low-traffic launch |
| Railway Pro | $20/month | Production, custom domain, priority support |

For a static HTML file with <1,000 monthly visitors, the Hobby plan is more than sufficient. Bandwidth costs for a single HTML file are negligible.

---

## Rollback

If a deployment causes issues:
1. Go to Railway project → Deployments tab
2. Find the previous successful deployment
3. Click "Rollback" → Railway re-deploys the previous version within 30 seconds

---

## Monitoring

Railway provides built-in deployment logs. For production monitoring:
- Add: UptimeRobot (free) to monitor `toolkit.conform-edge.com` and alert on downtime
- No error logging service needed for a static file (no server-side errors possible)

---

© 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
