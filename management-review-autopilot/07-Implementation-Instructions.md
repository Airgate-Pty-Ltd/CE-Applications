# Implementation Instructions (Brian)

## 1. Test locally (10 min)
1. Copy `artifact/app/` out of OneDrive to a local dev folder (avoid sync churn).
2. `cd app` → `npm install` (no deps; instant) → `npm start`
3. Open http://localhost:3000 — run `tests/smoke-test.md`.
4. Health check: http://localhost:3000/health → `{"status":"ok"}`.

## 2. GitHub (5 min)
Follow `GITHUB-READY.md` (repo name, .gitignore, commands provided).

## 3. Railway (10 min)
Follow `RAILWAY-DEPLOYMENT.md`. No env vars required for MVP; PORT is auto-injected.

## 4. Go live (Brian-only actions — HARD LIMITS kept these staged)
- [ ] Create GitHub repo + push
- [ ] Create/verify Railway project + connect repo
- [ ] Add domain (mra.annexquality.com or conform-edge.com/mra)
- [ ] Create Stripe payment links ($39/$79/$199)
- [ ] Put landing copy (artifact/customer-facing-copy.md) on the AQ site
- [ ] Announce to QMS/LinkedIn network; cross-link from the 6 self-assessment tools
