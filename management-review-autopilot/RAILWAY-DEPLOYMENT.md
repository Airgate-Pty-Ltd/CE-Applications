# Railway Deployment Guide — Management Review Autopilot

- **Recommended Railway project name:** `mra-conform-edge`
- **Build command:** none required (Nixpacks auto-detects Node from package.json; no build step)
- **Start command:** `npm start` (also pinned in `railway.json`)
- **Environment variables:** none. Railway injects `PORT`; server reads it. Do NOT set PORT manually.
- **Health check path:** `/health` (pinned in `railway.json`, 60s timeout)

## Deploy steps
1. Push the repo to GitHub first (see GITHUB-READY.md).
2. Railway dashboard → New Project → "Deploy from GitHub repo" → select `mra-app`.
3. If the app folder is not repo root, set Root Directory to `app/` in service settings.
4. Deploy. Watch build logs — expect "MRA listening on :<port>".
5. Settings → Networking → Generate Domain → public URL issued
   (`https://mra-conform-edge-production.up.railway.app` or similar).

## Public URL behavior
Serves the SPA at `/`, static assets at `/styles.css`, JSON at `/health`.
HTTPS is automatic (required for the clipboard-copy feature).

## Deployment verification
1. `curl https://<url>/health` → 200 + `{"status":"ok",...}`
2. Open the URL, run smoke-test rows 3–14.
3. Confirm Railway health check shows passing in the service dashboard.

## Rollback notes
Railway keeps prior deployments: service → Deployments → select previous → Redeploy.
No database/state on the server (all client-side), so rollback is risk-free.

## Expected MVP limitations on Railway
- Free/hobby tier may sleep on inactivity — first request slow. Acceptable pre-revenue.
- No custom domain until Brian attaches one (annexquality.com subdomain recommended).
- No server-side persistence — nothing to back up; also nothing to migrate later
  except adding a database when v1.2 storage ships.
