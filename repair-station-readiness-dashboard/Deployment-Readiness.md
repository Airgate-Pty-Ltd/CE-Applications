# Deployment Readiness — Repair Station Readiness Dashboard
**Date:** 2026-07-07

## Checklist

| Artifact | Status | Notes |
|---|---|---|
| README.md | ✅ Created 2026-07-07 | Quick start, file map, deploy steps |
| Production HTML | ✅ artifact/index-v2-fsa.html | Self-contained, no external deps |
| Demo data | ✅ Inline in production HTML | 5 demo stations |
| Landing/sales copy | ✅ artifact/customer-facing-copy.md (created 2026-07-07) | Landing, emails, LinkedIn |
| Pricing docs | ✅ 03-Buyer-and-Pricing.md (created 2026-07-07) | |
| Railway/static deploy guide | ✅ Below | Static hosting — trivial |
| GitHub guide | ✅ Below | |
| .env.example | N/A (static, no secrets) | Required at v1.1 (refresh pipeline) |
| Health check | N/A (static) | Uptime monitor on the URL suffices |
| Smoke test | ⚠️ Manual checklist below; formal UI test plan due v1.1 | |
| Screenshots | ❌ Open — capture at deploy time | |
| Payment link | ❌ Blocked on portfolio Decision #1 (Gumroad) | |
| Legal (privacy/ToS/disclaimer) | ❌ Portfolio-level blocker (Decision #4, Aug 10 sprint) | |

## Deploy — Static (10 minutes)
1. New GitHub repo `repair-station-readiness` (private until launch).
2. Copy `artifact/index-v2-fsa.html` → `index.html` in repo root; move old v1 file to `/archive`.
3. Railway: New Project → Deploy from GitHub → static site (or Vercel: `vercel --prod`). No build step, no env vars.
4. Custom domain + HTTPS (automatic on both platforms).
5. Add uptime monitor (UptimeRobot free tier) as the health check.

## Smoke Test (run after every deploy)
- [ ] Page loads < 2s; no console errors
- [ ] All 5 demo stations selectable; alert counts update
- [ ] Severity filter works (critical/warning/info)
- [ ] Each alert expands to show the seven-question breakdown
- [ ] "Take Action" interactions respond
- [ ] Print view renders legibly (Ctrl+P)
- [ ] Renders on mobile viewport (375px) without horizontal scroll

## Go/No-Go
**Technically deployable today.** Commercial launch gated only on the two portfolio blockers (payment platform, legal docs) — both already scheduled per PORTFOLIO-DEPLOYMENT-READY-2026-07-04.md.
