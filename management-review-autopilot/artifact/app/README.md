# Management Review Autopilot (MRA) v1.0

**Purpose:** Turn raw QMS data into an audit-defensible management review package —
input coverage check, agenda, pre-populated minutes, executive summary, and output-action
register — for ISO 9001:2015, AS9100D, AS9110C, and ISO 13485:2016.

**Target customer:** Quality Managers / Management Representatives at certified
organizations; QMS consultants (multi-client tier).

## Local setup
```bash
cd app
npm install        # zero dependencies — completes instantly
npm start          # serves on http://localhost:3000
```
> Tip: copy the `app/` folder out of OneDrive before running to avoid sync churn.

## Run the UI
Open http://localhost:3000 — work tabs 1→4. All data stays in the browser (localStorage).

## Health check
- Local: http://localhost:3000/health → `{"status":"ok","app":"management-review-autopilot","version":"1.0.0"}`
- Automated: with the server running, `npm test` (exit 0 = healthy).

## Testing
`tests/smoke-test.md` — 15-row manual checklist; `../..`/`UI-TEST-PLAN.md` for the full plan.

## GitHub deployment steps
See `GITHUB-READY.md` in the build folder root. Summary: init repo, commit the `app/`
folder, push to `main`.

## Railway deployment steps
See `RAILWAY-DEPLOYMENT.md`. Summary: New Project → Deploy from GitHub repo →
Railway detects Node via package.json → `railway.json` sets `npm start` +
`/health` health check → public URL issued. No env vars needed.

## Environment variables
None required. `PORT` optional locally (see `.env.example`); Railway injects it.

## Known limitations (v1.0)
- Data is browser-local (localStorage): clearing site data erases entries; no multi-user.
- No authentication or payment gate — Stripe link goes in front of the URL for MVP.
- 4 standard packs; ISO 14001/IATF/45001 are roadmap items.
- Markdown/print export only (no PDF/docx generation in-app).
- Advisory only: does not certify compliance; top management owns the review.

## Commercial launch gaps
1. Stripe payment link + license gate (v1.1)
2. Custom domain on Railway
3. Landing page copy live on annexquality.com / conform-edge site
4. Privacy statement page (even though no data is transmitted)
5. Cross-links from the six existing Conform-Edge self-assessment tools
