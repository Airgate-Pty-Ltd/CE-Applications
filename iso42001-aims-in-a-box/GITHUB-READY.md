# GitHub-Ready — Pushing This Folder to a Private Repo

**Product:** ISO/IEC 42001 AIMS-in-a-Box
**Updated 2026-07-11:** this doc previously described a static, backend-free product. As of the
2026-07-11 rebuild, the current product (`app\`) is a real Node.js/Express application with a SQLite
database, `node_modules`, and a `.env` file — this changes what "GitHub-ready" means. The instructions
below are updated accordingly. **No agent has pushed anything to GitHub. Brian has not provided
credentials for this, and none should be requested or assumed.** The commands below are for Brian (or
whoever holds the credentials) to run.

## 1. What this repo is for

This repo is the source of truth for the ISO/IEC 42001 AIMS-in-a-Box product line: the AIMS Command
Center app (`app\`), the legacy/deprecated single-file tool, and the supporting 23-document kit. Treat
`app\` commits like a normal software repo (feature commits, code review, etc.) and everything else like
document revision history.

## 2. What to commit

- `app\` — the real application, **excluding** `app\node_modules\` and `app\.env` (see `.gitignore`
  below) and **excluding** `app\data\aims.db*` (the local demo database — regenerate with
  `npm run setup && npm run seed`, don't commit a live DB file).
  - Do commit `app\package.json`, `app\package-lock.json`, `app\.env.example`, `app\server.js`,
    `app\src\`, `app\lib\`, `app\scripts\`, `app\tests\`, `app\SETUP.md`, `app\README.md`.
- `ISO42001-Readiness-GapCheck-Tool.html` — the deprecated/superseded self-contained gap-check tool (kept
  for reference; still a valid standalone artifact if used as a lead magnet).
- `Documents\` — the full 23-document kit (docs 1–23 per `KIT-CONTENTS.md`).
- `KIT-CONTENTS.md`, `README.md`, `EVOLUTION-REPORT.md`, `BUILD-NOTES.md`, `NEEDS-FROM-BRIAN.md` —
  product definition and internal history.
- `GETTING-STARTED.md`, `customer-facing-copy.md`, `sample-output.md`, `UI-TEST-PLAN.md`,
  `RISKS-AND-BOUNDARIES.md`, `RELEASE-NOTES.md`, `RAILWAY-DEPLOYMENT.md`, `GITHUB-READY.md` (this file)
  — the packaging/launch set.
- `.gitignore` (see below — this repo-root `.gitignore` and `app\.gitignore` both matter now).

## 3. What to exclude

- **`app\node_modules\`** — never commit; `npm install` rebuilds it from `package-lock.json`.
- **`app\.env`** — never commit (even though the current `.env.example` has no real secrets in it today,
  treat `.env` as secret-by-convention going forward).
- **`app\data\aims.db`, `app\data\aims.db-journal`** — the local demo SQLite file; regenerable, not source.
- Any local OS/editor cruft (`.DS_Store`, `Thumbs.db`, `*.swp`, `~$*` Office lock files).
- Any **licensed standard text**. Do not commit a copy of ISO/IEC 42001:2023 itself or any pasted
  excerpts of the standard.
- Anything containing the EIN or other tax/legal identifiers per `_Brand\Conform-Edge\BRAND-STANDARD.md`
  section 1 — none currently exist in this folder, but check before every push.

`app\.gitignore` already exists and should cover `node_modules/`, `.env`, and `data/*.db*` — verify it
before the first commit; add anything missing.

## 4. Repo setup steps (Brian's action — not executed by any agent)

1. **Create the repository on GitHub** (github.com → New repository):
   - Name suggestion: `iso42001-aims-in-a-box` (or the target repo, e.g. under `Airgate-Pty-Ltd/m-ai` if
     this is meant to live alongside the M-AI Kernel reference implementation — confirm with Brian which
     repo is correct before pushing anywhere).
   - Visibility: **Private**.
   - Do not initialize with a README/gitignore/license from GitHub's UI — this folder already has its own.

2. **Initialize locally, from this folder, exactly as follows:**
   ```bash
   cd "Personal/07-Outputs/Opportunity-Scans/Automated/builds/2026-06-17-iso42001-aims-in-a-box"
   git init
   git add .
   git status   # eyeball this BEFORE committing — confirm node_modules/, .env, and data/*.db are absent
   git commit -m "AIMS Command Center: Express + SQLite + M-AI Kernel + UI, integrated and acceptance-tested (AT-01..16)"
   git branch -M main
   git remote add origin https://github.com/<your-org-or-username>/<repo-name>.git
   git push -u origin main
   ```

3. **Verify before the first push:**
   - `git status` shows nothing from section 3 ("What to exclude") staged.
   - `cd app && npm install && npm run setup && npm run seed && npm start` works from a **fresh clone**
     (proves nothing required was accidentally gitignored).

4. **Ongoing commits:** one commit per meaningful change, descriptive messages, matching the dated entries
   this product now keeps in `RELEASE-NOTES.md`.

## 5. Access control

- Keep the repo **private** through at least the pre-launch phase.
- **Secrets:** the app currently needs none (`.env.example` has no real credentials — `DB_PATH` and
  `PORT` are the only variables, both safe defaults). If a future deployment needs real secrets (a hosted
  Postgres URL, an API key, etc.), those go into the hosting platform's own secret manager / GitHub
  Actions secrets — never into a committed file.

## 6. This is now a real application — what that changes vs. the old static-tool assumptions

- There IS a build/install step now (`npm install`), a runtime (`node server.js`), and a database
  (SQLite via `node:sqlite`). A `git clone` is no longer the entire "installation."
- CI is optional but now meaningful: `npm test` (smoke tests) and the acceptance suite
  (`node --test tests/acceptance.test.js`) can be wired into GitHub Actions once this is pushed, so future
  changes don't silently reintroduce the bugs found and fixed during the 2026-07-11 integration pass.
- See `RAILWAY-DEPLOYMENT.md` (updated) for deploying the real Node app, not the old static-hosting steps.

---
© 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
ISO/IEC 42001 AIMS-in-a-Box is proprietary software of Conform-Edge Quality Consulting LLC
(Idaho LLC No. 6463380), Pocatello, Idaho, USA. Unauthorized reproduction, distribution, modification,
or resale is prohibited. "Conform-Edge" and the Conform-Edge mark are trademarks of Conform-Edge Quality
Consulting LLC. Advisory documentation aid — does not certify compliance and does not replace the
judgment of the user's organization or top management.
