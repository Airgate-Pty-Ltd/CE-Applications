# GitHub Readiness — Management Review Autopilot

- **Suggested repository name:** `mra-app` (org: `Airgate-Pty-Ltd`), private initially
- **Recommended branch:** `main`
- **Files to commit:** entire `artifact/app/` folder as repo root
  (README.md, package.json, server.js, railway.json, .env.example, src/, tests/)

## .gitignore contents
```
node_modules/
.env
*.log
.DS_Store
Thumbs.db
```

## Initial commit message
```
[OPPORTUNITY] Management Review Autopilot v1.0 — $268k/<$300

Scanner run: 2026-07-08
Estimated value: $268k/yr
Startup cost: <$300
Automation level: High
First step: deploy to Railway + attach Stripe link
Vault ref: Personal/07-Outputs/Opportunity-Scans/Automated/builds/2026-07-08-management-review-autopilot
```

## Commands (run manually — scanner does not push)
```bash
# from a LOCAL copy of artifact/app (outside OneDrive)
git init -b main
git add .
git commit -m "[OPPORTUNITY] Management Review Autopilot v1.0 — \$268k/<\$300"
# after creating the private repo on github.com:
git remote add origin https://github.com/Airgate-Pty-Ltd/mra-app.git
git push -u origin main
```

## Versioning notes
- Tag releases: `v1.0.0` now; `v1.1.0` for Stripe gate; `v2.0.0` for M-AI kernel tier.
- Standard packs are data — pack-only changes are minor versions.
- Keep `railway.json` in repo root so Railway config is versioned.
