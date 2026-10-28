# Railway Deployment Guide

## Prerequisites

1. Code pushed to GitHub (`iatf16949-tools` repo)
2. Railway.app account (free; sign up at https://railway.app)

---

## Deployment Steps

### Step 1: Log Into Railway
1. Open https://railway.app
2. Click "Sign in with GitHub"
3. Authorize GitHub access
4. You're in Dashboard

### Step 2: Create New Project
1. Click "+ New Project"
2. Select "Deploy from GitHub"
3. Select repo: `iatf16949-tools`
4. Click "Deploy"

Railway auto-starts building. **Takes ~1–2 minutes.**

### Step 3: Configure Service

Once build completes:
1. Click on the service (iatf16949-tools)
2. Go to **Settings** tab
3. **Build Command**: (leave empty — no build needed for static site)
4. **Start Command**: `npx serve artifact/ -l 3000`
5. Click **Save**

### Step 4: Get Your URL

Railway assigns a public URL automatically. Look for:
```
https://iatf16949-tools-production.up.railway.app
```

Copy this URL. Test it in browser.

### Step 5: Custom Domain (Optional)

To use your own domain (e.g., `iatf-tools.conform-edge.com`):
1. Go to **Settings** → **Domain**
2. Click "Add Custom Domain"
3. Enter: `iatf-tools.conform-edge.com`
4. Railway gives you a CNAME record
5. Update your DNS provider to point to Railway

**Example** (if using Route53, GoDaddy, etc.):
```
Name: iatf-tools.conform-edge.com
Type: CNAME
Value: (Railway-provided CNAME)
TTL: 3600
```

---

## Health Check

After deployment:

1. **Load the app**:
   ```
   https://iatf16949-tools-production.up.railway.app
   ```

2. **Verify**:
   - Page loads in < 3 sec
   - All 6 tabs visible
   - Radar chart renders
   - Answer a question → radar updates
   - Export CSV → downloads file
   - No console errors (press F12)

3. **Mobile check**:
   - Open on iPhone (responsive test)
   - Verify layout is readable

---

## Environment Variables

For MVP (no backend), **no env vars needed**.

Future versions (cloud storage, API):
1. Go to **Settings** → **Variables**
2. Add (example):
   ```
   DATABASE_URL=postgresql://user:pass@host/db
   API_KEY=your-secret-key
   ```
3. Restart service

---

## Monitoring & Logs

### View Logs
1. Go to service → **Logs** tab
2. Shows all requests + errors
3. Useful for debugging deployment issues

### Metrics
1. Go to service → **Metrics** tab
2. Track uptime, response time, requests/sec
3. Alert if uptime < 99.9%

---

## Rollback (If Issues Arise)

If the deployment fails or has critical bugs:

1. Go to **Deployments** tab
2. Click on previous successful deployment
3. Click "Rollback"
4. Select commit to revert to
5. Click "Rollback"

Service restarts with previous code. Takes ~30 seconds.

---

## Cost

**Railway pricing** (as of July 2026):
- Free tier: $5/month credit (covers static site + low traffic)
- Pay-as-you-go: $0.000463/GB bandwidth, $0.0000231/GB storage
- **Estimated cost for v1.0**: $0–5/month

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| **Build failed** | Code error or missing dependency | Check Logs tab; fix code; push again |
| **Page loads but blank** | Static site not serving | Check "Start Command": should be `npx serve artifact/ -l 3000` |
| **Very slow load times** | Railway in distant region | Add region preference in Settings (optional, paid feature) |
| **Custom domain not working** | CNAME not updated | Wait 5–10 min for DNS propagation; verify CNAME in DNS provider |
| **Storage errors** | File system is read-only | Railway's filesystem is ephemeral; use cloud storage (v2.0 feature) |

---

## Scaling (If You Hit Limits)

### When to Scale
- If page load time exceeds 5 seconds consistently
- If errors spike during traffic spikes
- If you exceed free tier $5/month credit

### How to Scale
1. Go to **Settings** → **Plan**
2. Upgrade to "Pro" tier (more resources, better performance)
3. Or move to **Replica Sets** for horizontal scaling (auto-load-balance)

For MVP, scaling is unlikely. Monitor metrics monthly.

---

## Migration Path (v2.0)

When you add cloud storage + backend (v2.0):

1. **Current setup** (Railway static): Serves artifact/index.html
2. **v2.0 setup** (Railway + Node.js):
   - Add Express backend for API + database
   - Point frontend to API endpoints
   - Same Railway project; just add a second service (or upgrade existing)
   - No downtime if you use blue-green deployment

---

## Next Steps

1. **Verify health check** (page loads, features work)
2. **Update Gumroad** with Railway URL (instead of local)
3. **Update LinkedIn** post with live URL
4. **Monitor logs** for first week (watch for errors)

