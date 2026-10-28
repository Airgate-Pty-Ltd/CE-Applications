# Deployment — ISO/IEC 42001 AIMS-in-a-Box

**Updated 2026-07-11:** this doc previously described deploying the single-file static HTML tool. The
current product (`app\`) is a real Node.js/Express service with a SQLite database, so deployment now
means running a persistent server process, not hosting a static file. Railway is actually now a natural
fit (it's built for exactly this), unlike before.

## What's different now

- There's a real backend process (`node server.js`) that must stay running.
- There's a database file (`app/data/aims.db`) that needs a **persistent disk volume** — not ephemeral
  container storage, or the data disappears on every redeploy/restart.
- **SQLite via `node:sqlite` needs a genuine local disk under the DB file.** This was confirmed during
  the 2026-07-11 integration pass: the app failed with a `disk I/O error` when its database file lived on
  a Windows-OneDrive-to-Linux sandbox bridge mount, while the exact same code worked immediately against a
  real local disk path. A standard Railway volume mounted into the container is a normal local disk from
  the container's point of view, so this should not recur there — but confirm with a real deploy before
  assuming it's fine, since this class of failure is specifically about unusual filesystem bridges, not
  about SQLite in general.
- Environment variables now matter: `PORT` (Railway sets this automatically) and `DB_PATH` (point it at
  the mounted volume's path, e.g. `/data/aims.db`).

## Option A — Railway (recommended; this is what Railway is actually for)

1. **Push `app\` to GitHub** first (see `GITHUB-READY.md`).
2. **In Railway:** New Project → Deploy from GitHub repo → select the repo, set the **root directory to
   `app`** (if the repo contains more than just the app).
3. Railway detects Node via Nixpacks, runs `npm install`, then needs a start command — confirm it picks up
   `npm start` from `package.json` (it should; `scripts.start` is `node server.js`).
4. **Add a persistent volume:** Railway project → the service → Settings → Volumes → add a volume, mount
   it at e.g. `/data`.
5. **Set environment variables:** Railway project → Variables →
   - `DB_PATH=/data/aims.db`
   - (leave `PORT` alone — Railway injects it and `server.js` already reads `process.env.PORT`)
6. **First deploy — run setup once** against the mounted volume. Railway's one-off command / shell
   feature (or a temporary `predeploy`/`release` script) should run:
   ```bash
   node src/db/init.js   # creates data/aims.db (at DB_PATH) and applies schema.sql
   node scripts/seed.js  # OPTIONAL — only for a demo instance, not for Brian's real data
   ```
   Do **not** run `npm run seed` against a real customer's volume — it loads fictional demo data that
   deliberately triggers all 8 M-AI rules.
7. **Custom domain:** Railway project → Settings → Domains → add custom domain, create the CNAME record.

## Option B — Any other Node-friendly host (Render, Fly.io, a plain VPS)

Same shape: install Node ≥22.5, `npm install`, provide a persistent disk for `DB_PATH`, run `npm start`
as a long-lived process (with a process manager / the host's own restart policy — this app has no
built-in daemonization). Static hosts (GitHub Pages, Netlify's static tier, Cloudflare Pages) **will not
work** for this product anymore — they cannot run a persistent Node process or hold a writable disk-backed
database.

## Pre-deploy checklist

- [ ] Confirm `npm test` passes from a fresh `npm install` (smoke tests: `tests/smoke.test.js`).
- [ ] Confirm the acceptance suite passes: `node --test tests/acceptance.test.js` (AT-01..16). As of
      2026-07-11, all 16 pass — re-run after any further changes.
- [ ] Confirm the persistent volume is actually persistent across a redeploy (deploy, create a record,
      redeploy, confirm the record is still there) before trusting it with real data.
- [ ] Do **not** run the seed script against a real customer's database.
- [ ] **Known open issue:** the UI's create/edit forms for 6 of 7 registers currently send field names
      that don't match the real API (see `RISKS-AND-BOUNDARIES.md`). This is a functional bug independent
      of hosting — fix it before telling a customer to use the UI to create records; the API itself works
      correctly when called with the right field names (see `app\SETUP.md` for the `curl` examples).

## Post-deploy

- No CI/CD or GitHub Actions required to *deploy*, but consider wiring `npm test` and the acceptance
  suite into a GitHub Actions workflow that blocks a merge/deploy on failure — the acceptance suite exists
  specifically to catch regressions in the M-AI Kernel's governance guarantees (idempotency, supersession,
  tenant isolation, restart survival, etc.), which are easy to silently break with a well-intentioned
  refactor.
- Monitor the process the same way you'd monitor any small Node service (uptime check on `/health`, which
  reports `dbConnected` and `kernelActive` — a good target for an external uptime monitor's expected-body
  check).

## Legacy: deploying the deprecated static tool

If Brian still wants `ISO42001-Readiness-GapCheck-Tool.html` reachable as a standalone lead magnet
(separate from the app above), any static host works — GitHub Pages, Netlify, Vercel, or Cloudflare
Pages, pointing at a folder containing just that file renamed to `index.html`. No build step, no
environment variables, no database. This is unrelated to and does not need to live at the same domain as
the real app.

---
© 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
ISO/IEC 42001 AIMS-in-a-Box is proprietary software of Conform-Edge Quality Consulting LLC
(Idaho LLC No. 6463380), Pocatello, Idaho, USA. Unauthorized reproduction, distribution, modification,
or resale is prohibited. "Conform-Edge" and the Conform-Edge mark are trademarks of Conform-Edge Quality
Consulting LLC. Advisory documentation aid — does not certify compliance and does not replace the
judgment of the user's organization or top management.
