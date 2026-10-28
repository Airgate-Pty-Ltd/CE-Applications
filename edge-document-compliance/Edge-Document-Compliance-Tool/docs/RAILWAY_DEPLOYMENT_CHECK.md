# Railway Deployment Verification & Manual Trigger

## ✅ Git Push Status

**Verified:** Commits are on GitHub
- Latest commit: `a2e52a5` - "docs: Add deployment guide for audit module"
- Previous commit: `898d48a` - "feat: Integrate Audit Tool module into EDC"
- Remote: `https://github.com/Airgate-Pty-Ltd/EDCAT-Administrator.git`
- Branch: `main`

## Railway Deployment Issues

If Railway is not deploying automatically, check:

### 1. Railway Project Connection

**Check if Railway is connected to GitHub:**
1. Go to Railway dashboard: https://railway.app
2. Open your project
3. Go to **Settings** → **Service** → **Source**
4. Verify:
   - ✅ Repository: `Airgate-Pty-Ltd/EDCAT-Administrator`
   - ✅ Branch: `main` (not `master`)
   - ✅ Auto-Deploy: Enabled

**If not connected:**
1. Click **Connect GitHub Repo**
2. Select `Airgate-Pty-Ltd/EDCAT-Administrator`
3. Select branch: `main`
4. Enable **Auto-Deploy**

### 2. Manual Deployment Trigger

**Option A: Via Railway Dashboard**
1. Go to Railway dashboard
2. Open your project
3. Click on the service
4. Click **Deploy** → **Redeploy**
5. Select **Latest Commit** or specific commit

**Option B: Via Railway CLI**
```bash
# Install Railway CLI if not installed
npm i -g @railway/cli

# Login
railway login

# Link to project
railway link

# Trigger redeploy
railway up
```

**Option C: Force Push (if branch mismatch)**
```bash
# If Railway is watching 'master' but we pushed to 'main'
git push origin main:master --force
```

### 3. Check Railway Build Logs

1. Go to Railway dashboard
2. Open your project → Service
3. Click **Deployments** tab
4. Check latest deployment:
   - ✅ Build status
   - ✅ Build logs
   - ✅ Deploy status
   - ✅ Runtime logs

**Common Issues:**
- Build fails → Check build logs for errors
- Deploy fails → Check runtime logs
- Health check fails → Verify `/health` endpoint

### 4. Verify Environment Variables

Railway needs these environment variables:

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT tokens (generate: `openssl rand -hex 32`)
- `PORT` - Usually auto-set by Railway

**To set in Railway:**
1. Go to **Settings** → **Variables**
2. Add/verify:
   - `DATABASE_URL` (from PostgreSQL service)
   - `JWT_SECRET` (generate new one)
   - `JWT_EXPIRES_IN` (optional, default: `7d`)

### 5. Run Migrations After Deployment

After successful deployment, run migrations:

**Via Railway CLI:**
```bash
railway run npm run migrate
```

**Via Railway Dashboard:**
1. Go to **Settings** → **Deploy**
2. Add **Deploy Command**: `npm run migrate && npm start`
3. Or use Railway's **One-Click Deploy** with migrations

**Or manually via SSH:**
```bash
railway shell
npm run migrate
```

### 6. Verify Deployment

**Health Check:**
```bash
curl https://your-app.railway.app/health
# Should return: OK
```

**Database Health:**
```bash
curl https://your-app.railway.app/api/db/health
# Should return: {"status":"ok","pool":"connected",...}
```

**Login Test:**
```bash
curl -X POST https://your-app.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
# Should return JWT token
```

## Quick Fix: Force Redeploy

If nothing else works:

1. **Make a dummy commit to trigger deployment:**
```bash
git commit --allow-empty -m "chore: trigger Railway deployment"
git push origin main
```

2. **Or use Railway's redeploy button:**
   - Dashboard → Service → Deploy → Redeploy

## Troubleshooting

### Railway Not Detecting Changes

**Solution:** Railway might be watching wrong branch
- Check branch in Railway settings
- Ensure it's set to `main` not `master`
- Or push to both: `git push origin main master`

### Build Fails

**Check:**
- `package.json` has correct `start` script
- `railway.toml` is correct
- Dependencies install correctly
- Node version matches (check `engines` in package.json)

### Runtime Errors

**Check:**
- Environment variables are set
- Database connection works
- Port is correct (Railway sets PORT automatically)
- Health check endpoint works

### Migrations Not Running

**Solution:**
- Run manually: `railway run npm run migrate`
- Or add to deploy command in Railway settings

## Next Steps

1. ✅ Verify Railway is connected to GitHub
2. ✅ Check branch is set to `main`
3. ✅ Trigger manual redeploy if needed
4. ✅ Run migrations after deployment
5. ✅ Verify health endpoints
6. ✅ Test login functionality

## Support

If issues persist:
- Check Railway logs: Dashboard → Service → Logs
- Check GitHub: Verify commits are on `main` branch
- Check Railway status: https://status.railway.app
