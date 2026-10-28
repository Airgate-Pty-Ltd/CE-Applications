# Railway Deployment Troubleshooting

## Problem: Push succeeds but Railway doesn't deploy

If `git push` works but Railway doesn't deploy, check these:

## 1. Verify Push Actually Reached GitHub

**Check GitHub directly:**
1. Go to: https://github.com/Airgate-Pty-Ltd/EDCAT-Administrator
2. Check if you see the latest commit "Trigger: Force Railway redeploy"
3. Check the commit history - it should show the new commit

**Or run this command:**
```bash
git fetch origin main
git log origin/main --oneline -5
```

If the commit isn't there, the push didn't actually work.

## 2. Check Railway Service Configuration

### A. Verify Railway is Connected to GitHub
1. Go to Railway dashboard
2. Click on your service
3. Go to **Settings** → **Source**
4. Verify:
   - ✅ Repository is connected: `Airgate-Pty-Ltd/EDCAT-Administrator`
   - ✅ Branch is set to: `main` (not `master` or another branch)

### B. Check Service Status
1. Go to Railway dashboard
2. Check if service shows:
   - ✅ **Active** (should be green/running)
   - ❌ **Paused** (needs to be unpaused)
   - ❌ **Stopped** (needs to be started)

### C. Verify Webhook Configuration
1. Go to Railway dashboard → Service → Settings
2. Check **Deployments** tab
3. Look for "Webhook URL" - this should be configured
4. Check if there's a "Webhook" section showing recent deployments

## 3. Check Railway Branch Watch

Railway might be watching a different branch:
1. Railway Dashboard → Your Service → Settings
2. Look for "Branch" or "Production Branch"
3. Should be set to: `main`
4. If it's set to something else, change it to `main`

## 4. Manual Trigger Test

**Try manually triggering deployment:**
1. Go to Railway dashboard
2. Click on your service
3. Look for **"Redeploy"** or **"Deploy"** button
4. Click it to manually trigger a deployment
5. This will confirm Railway can deploy (even if auto-deploy isn't working)

## 5. Check Railway Logs

1. Go to Railway dashboard → Your Service
2. Click **"Logs"** or **"Deployments"** tab
3. Look for:
   - Recent deployment attempts
   - Error messages
   - Webhook failures

## 6. Verify Repository Connection

**Check if Railway has access:**
1. Railway Dashboard → Project Settings
2. Look for **"GitHub"** or **"Repositories"**
3. Verify `EDCAT-Administrator` is listed
4. If not, you need to reconnect the repository

## 7. Check GitHub Webhook

Railway creates a webhook in GitHub:
1. Go to: https://github.com/Airgate-Pty-Ltd/EDCAT-Administrator/settings/hooks
2. Look for a webhook from Railway
3. Check recent deliveries - see if they're failing
4. If webhook is missing or failing, Railway won't auto-deploy

## 8. Force Railway to Redeploy

If auto-deploy isn't working, manually trigger:

**Option A: Railway Dashboard**
1. Railway Dashboard → Your Service
2. Click **"Redeploy"** or **"Deploy Latest"**
3. This forces a deployment from the latest commit

**Option B: Railway CLI** (if installed)
```bash
railway up
```

## 9. Common Issues

### Issue: Service is Paused
**Solution:** Unpause the service in Railway dashboard

### Issue: Wrong Branch
**Solution:** Change Railway to watch `main` branch (Settings → Source → Branch)

### Issue: Webhook Not Configured
**Solution:** Reconnect repository in Railway (Settings → Source → Connect Repository)

### Issue: Service Not Active
**Solution:** Make sure service is running (not stopped/paused)

## Quick Checklist

- [ ] Commit exists on GitHub (check repo directly)
- [ ] Railway service is **Active** (not paused/stopped)
- [ ] Railway is watching **`main`** branch
- [ ] Repository is connected in Railway
- [ ] Try manual "Redeploy" button in Railway
- [ ] Check Railway logs for errors

## Next Steps

1. **Verify push reached GitHub** - Check GitHub website directly
2. **Check Railway service status** - Should be Active
3. **Verify branch configuration** - Should be `main`
4. **Try manual redeploy** - Click "Redeploy" button in Railway
5. **Check Railway logs** - Look for deployment errors

---

**Most Common Issue:** Railway service is paused or watching wrong branch. Check Railway dashboard!

