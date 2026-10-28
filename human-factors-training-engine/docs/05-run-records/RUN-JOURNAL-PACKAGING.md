# Run Journal — Standalone Packaging Directive

**Directive:** `docs/01-directives/PHASE-PACKAGING-DIRECTIVE.md`, issued 2026-08-06.
**Standing law:** `CLAUDE.md` in full, especially §5a (host boundary) and §4 (evidence standard).
**Relationship to other journals:** `RUN-JOURNAL-PHASE4.md` stays open — Phase 4 WP-3/WP-5 is
superseded for the *deployment* story by this directive, but WP-4 (pre-commercial hardening)
is not addressed by this directive and remains separately tracked there. This journal covers
only the packaging work.

---

## Entry 0: §1 — Correct the Record; Docker Reclassified

**Actions taken (see DECISIONS.md D-048 for full detail):**

1. Wrote `docs/03-architecture/DEPENDENCY-FOOTPRINT.md` — the definitive statement of the
   standalone product's real runtime dependency footprint (Node.js, to be bundled; `next`/
   `react`/`react-dom`/`@prisma/client`+native engine/`bcryptjs`/`jspdf`/`zod` as bundled
   libraries; an embedded SQLite file). States explicitly: no Docker, no PostgreSQL/separate DB
   server, no cloud service, no outbound network calls, no telemetry. Verified before writing:
   `node --version` → v22.19.0; grep across `src/` for `next/font|fonts.googleapis|
   fonts.gstatic|cdn\.` → zero matches (confirms no CDN font dependency; the app already uses
   the OS system font stack per `src/app/layout.tsx`).

2. Reclassified Docker out of the repo root into `deploy/docker-optional/`:
   `git mv Dockerfile`, `docker-compose.yml`, `docker/entrypoint.sh`,
   `docker/.env.docker.example` to their new paths; `.dockerignore` renamed to
   `Dockerfile.dockerignore` (BuildKit convention, required because the build context stays at
   the real repo root). `docker/backups/` (gitignored, untracked) moved on disk for
   consistency. Fixed the Dockerfile's `COPY` path and docker-compose.yml's `build.context`/
   `build.dockerfile` so the relocated setup is not silently broken. Wrote
   `deploy/docker-optional/README.md`. Updated `.gitignore`, `CLAUDE.md` §2, `DOCS-INDEX.md`,
   `README.md` to match the new reality.

3. PostgreSQL explicitly NOT touched — remains a switchable option for a future hosted edition
   per directive §1; `prisma/postgresql/` (Phase 4 WP-1/WP-2 work) is untouched.

**Verified this entry, real:**
```
$ node --version
v22.19.0
```
```
$ grep -rniE "next/font|fonts\.googleapis|fonts\.gstatic|cdn\." src/
(no matches)
```
```
$ git status --short (after all moves/edits)
 M .gitignore
 M CLAUDE.md
 M DOCS-INDEX.md
 M README.md
RM Dockerfile -> deploy/docker-optional/Dockerfile
R  .dockerignore -> deploy/docker-optional/Dockerfile.dockerignore
RM docker-compose.yml -> deploy/docker-optional/docker-compose.yml
RM docker/.env.docker.example -> deploy/docker-optional/docker/.env.docker.example
R  docker/entrypoint.sh -> deploy/docker-optional/docker/entrypoint.sh
?? deploy/docker-optional/README.md
?? docs/01-directives/PHASE-PACKAGING-DIRECTIVE.md
?? docs/03-architecture/DEPENDENCY-FOOTPRINT.md
```

**Not verified this entry (honest gap, non-blocking — see D-048):** an actual
`docker compose --profile onprem up --build` re-run against the relocated files was not
executed — per CLAUDE.md §5a the agent does not run Docker itself, and Docker is optional, not
a product dependency. No exit gate in this directive depends on it.

**§1 status: COMPLETE.**

**Next:** G1 (task #27) — production build (`npm run build`) + a real running-server proof
against embedded SQLite, pasted terminal output and a real HTTP 200, before starting G2's
harder bundled-runtime work.

---

## Entry 1: G1 — Production Build Runs Against Embedded SQLite

**Full detail in DECISIONS.md D-049.** Summary:

1. Regenerated the Prisma client in SQLite mode (`npm run db:generate:sqlite` — the installed
   client was left in Postgres mode from Phase 4 WP-2 testing).
2. `npm test`: 29/29 suites, 208/208 (203 passed, 5 correctly-skipped Postgres-only).
3. `npm run build`: real `next build` succeeded; `.next/standalone/server.js` + the Prisma
   native query engine confirmed present in the standalone output.
4. Assembled a runnable standalone directory (static assets + a real copy of `prisma/dev.db`,
   mirroring what `deploy/docker-optional/Dockerfile` already does via `COPY`) and started the
   **real production server** (`node server.js`, `NODE_ENV=production`, no `next dev`).
5. Real HTTP proof: `GET /api/health/status` → 200, `reachable:true`, `databaseMode:sqlite`;
   `POST /api/auth/login` with the real demo QM account → 200, real user row, real session
   cookie.
6. Stopped the server cleanly by its real Windows PID; confirmed the port freed.

**Real finding, logged and fixed:** a *relative* `DATABASE_URL` (`file:./prisma/dev.db`)
silently resolves against the **generated Prisma client's own directory**
(`node_modules/.prisma/client/`), not the process CWD — a real table query failed with
SQLite error 14 ("unable to open the database file") even though the health check's
`SELECT 1` reported reachable. Fixed by using an **absolute** `file:` URL, matching what the
Docker path already does for the same reason. This is now a hard requirement for the
installer's runtime config (G2/G3), not a dev-only detail — logged so it carries forward.

**G1 status: VERIFIED.**

---

## Entry 2: G2 — Bundled Self-Contained Node Runtime

**Full detail in DECISIONS.md D-050.** Summary:

- Chose bundled portable Node + a plain launcher script over Node SEA/`pkg`-class tools
  (Next.js standalone output is a directory tree with dynamic `require()`s, not a
  single-file bundle those tools can carry; Prisma's native engine binary makes this worse).
- Downloaded the official Node v20.20.2 (latest v20 LTS) Windows x64 build from nodejs.org,
  **with the owner's explicit permission** (asked first, per this agent's own download-
  permission rule), checksum-verified against the published SHA-256 before use.
- Built `deploy/installer-windows/{fetch-node-runtime.ps1, build-package.ps1, start.ps1}` —
  reproducible download+verify, app assembly, and the real launcher (absolute `DATABASE_URL`,
  first-run migration via the bundled Prisma CLI, then execs the bundled `node.exe`).
- Two real bugs found and fixed running the actual packaged artifact: (1) the launcher's
  first attempt tried to run `node_modules/.bin/prisma` (a POSIX shell shim) through
  `node.exe` — fixed to call the real CLI entry point,
  `node_modules/prisma/build/index.js`, directly; (2) `/api/health/status` and
  `/api/health/detailed` were silently statically generated at build time (no detectable
  dynamic API usage) — every request returned one frozen build-time snapshot forever. Fixed
  with `export const dynamic = 'force-dynamic'` on both routes (two lines). Full suite
  reconfirmed 208/208 after the fix.
- **Definitive proof of self-containment:** `Get-Process` on the real OS PID listening on the
  test port showed its executable path as
  `deploy\installer-windows\runtime\node-win-x64\node.exe` — not
  `C:\Program Files\nodejs\node.exe`. Bundled Node reports `v20.20.2`; system PATH node
  reports `v22.19.0` — unambiguously different runtimes.
- Real fresh-DB migration via the bundled Prisma CLI (no npx, no network): 4 migrations
  applied, pasted in D-050.
- Post-fix, two health-check calls 3 seconds apart against the same running process returned
  genuinely different `checkedAt`/`latencyMs` values — confirmed live, not cached.

**Correction note (append-only, per CLAUDE.md §4):** the health-check portion of Entry 1 /
D-049's G1 evidence was, unknown at the time, a frozen build-time snapshot rather than
genuinely live per-request proof — the separately-pasted real login evidence in that same
entry remains valid and is unaffected. See D-050 for the full explanation and fix.

**G2 status: VERIFIED.**

---

## Entry 3: G3 — First-Run Setup, Real Accounts, Full Learner Lifecycle

**Full detail in DECISIONS.md D-051.** Summary:

- Found a real gap before this gate could be honestly proven: no existing path to create an
  admin (or any user) without either a broken dev fixture or a hard-coded-password demo seed
  script — neither appropriate for a real customer install.
- Built the missing feature, minimal and scoped: `POST /api/setup` (one-time-only initial
  admin creation, no hard-coded credentials), `/setup` first-run UI, `POST /api/users`
  (admin-only creation of QM/supervisor/learner/admin accounts), `/admin/users` (minimal,
  unstyled admin screen). Login page now redirects to `/setup` on a genuinely fresh install.
- Proactively applied the same `force-dynamic` fix from D-050 to both new routes before it
  could bite again.
- Full suite reconfirmed: 208/208.
- **Full real lifecycle, HTTP-executed, against the packaged bundled-runtime app:** admin
  setup -> admin creates QM/supervisor/learner -> QM ingests evidence, creates the event,
  promotes causal status through the full real chain, authors and approves an atom, compiles
  a real frozen manifest and assigns it -> learner completes it -> supervisor records
  effectiveness -> real automatic closure (`closedNow: true,
  closureReason: "effectiveness_target_level_met"`).
- **Independently confirmed at the database level**, bypassing the API entirely: a direct
  Prisma query via the bundled `node.exe` against the real `.db` file shows
  `closureStatus: "CLOSED"`, the real frozen manifest with its real output hash, and four real
  audit-log rows for the account-creation trail, all attributed to the real admin actor.
- Process note: first account-creation attempt hit `405` because the running server was
  serving a build assembled before the `POST /api/users` handler was added — self-inflicted
  ordering mistake, caught via the real HTTP status, fixed by rebuilding/reassembling in the
  correct order (which also incidentally previewed G4: the existing database was correctly
  detected and migration skipped on restart).

**G3 status: VERIFIED.**

---

## Entry 4: G4 — Restart Persistence, Backup/Restore Into a Clean Tree, Negative-Path Safety

**Full detail in DECISIONS.md D-052.** The owner specified exactly how to make this gate
rigorous rather than superficial: confirm the stopped PID is actually dead, restore into a
clean tree rather than over the live one, and run a real negative test against a corrupted/
missing DB file. All three surfaced real findings.

- **Restart:** real PID stopped, confirmed dead via `Get-Process`/`Get-NetTCPConnection`
  (both empty), relaunched as a genuinely new PID, byte-for-byte diff of every real record
  (all 4 accounts, the closed intervention, the frozen manifest's `outputHash`) against the
  pre-stop snapshot: identical.
- **Backup/restore:** real backup with a real SHA-256, restored into a completely separate
  directory tree (not the live install), verified via real login (proving the actual password
  hash survived) and a byte-for-byte DB-level diff against the original: identical.
- **Negative test — real gap found and fixed:** the original `start.ps1` treated "no DB file"
  as always meaning "fresh install," which would have silently created an empty database over
  lost customer data on any ordinary file-loss mishap. Built a `data/.initialized` marker +
  `db-check.mjs` preflight integrity/table-count check (specifically to catch SQLite's own
  trap of silently treating a missing/empty file as a valid new database). Three real
  scenarios — missing file, corrupted file, zero-byte file, all with the marker present — each
  independently confirmed to fail loudly, exit non-zero, and never bind the server port.
- **Separate, more serious finding:** re-verifying the fresh-install path from a location with
  no repo tree above it (not explicitly requested, done as due diligence after `start.ps1`
  changed) revealed that G2/G3's own "self-contained" fresh-install proofs had silently relied
  on Node's upward `node_modules` resolution finding the Prisma CLI's dependencies in the
  *repo's* `node_modules`, invisible while testing from inside the checkout. Fixed
  `build-package.ps1` to copy the CLI's real transitive dependencies; re-verified fresh-install
  migration succeeds in genuine isolation. Logged as a correction to G2/G3's evidence, not a
  rewrite — the server-runtime self-containment proof (D-050's `Get-Process` check) remains
  valid and unaffected; only the first-run-migration self-containment claim needed the fix.
- Full suite reconfirmed: 208/208.

**G4 status: VERIFIED.**

---

## Entry 5: G5 — INSTALL-GUIDE.md, Self-Validated in Genuine Isolation

**Full detail in DECISIONS.md D-053.** Summary:

- Fixed two real prerequisite gaps before the guide could be honest: `JWT_SECRET` now
  auto-generates and persists (`data\jwt-secret.txt`) instead of requiring a manual env var on
  every launch; added `Start HF Engine.bat` / `Backup Database.bat` double-click launchers
  (a bare `.ps1` isn't runnable by a non-developer double-click).
- Built the actual distributable (`HF-Engine-Standalone-Windows.zip`, ~88MB) and wrote
  `docs/03-architecture/INSTALL-GUIDE.md` as a validation protocol - every step ends with an
  observable "You should now see" check.
- **Self-validated by literally walking the guide** in a location with zero repo tree above it
  (same isolation standard as G2/G4). This surfaced the most significant finding of the whole
  directive: the session cookie was marked `Secure`, and this product has no HTTPS anywhere in
  its design - real browsers refuse to send `Secure` cookies over plain HTTP, so **every
  real-browser login in the packaged product silently failed to stay logged in.** Never caught
  by G1-G4's curl-based testing, since curl doesn't enforce that browser policy. Fixed
  (`isSecureDeployment()`, keyed off `NEXTAUTH_URL`'s actual scheme) and re-verified for real
  in the browser: login now survives real page navigation. Logged as an appended correction to
  G1-G4's login evidence, not a rewrite - their specific claims (real 200, real user row, real
  Set-Cookie) remain true; only the "stays logged in for a real browser" property was unproven
  until this gate.
- Two testing-tool artifacts (not product defects) found and worked around: `.bat` files'
  `start`/`pause` can't be exercised in this sandboxed non-interactive environment (verified
  via the identical underlying command instead); the Browser pane's own `navigate()` didn't
  reliably carry cookies on a fresh top-level nav (worked around with `window.location.href`,
  matching real user behavior). Also reconfirmed D-046's synthetic-click gap.
- Walked every step for real: extract, first-run setup, team account creation, stop (PID
  confirmed dead), restart (data persisted), backup, and a full disaster-recovery restore into
  a completely fresh location - real login as the QM account, original password, correct
  role-routed landing page, proving the backup/restore round trip preserves everything
  including the bcrypt password hash. Fixed several small guide inaccuracies found during the
  walk (a confusing path, the explicit JWT_SECRET command, a garbled sentence).
- Full suite reconfirmed: 208/208.

**G5 status: VERIFIED. All five packaging gates (G1-G5) are now VERIFIED.**

---

## Entry 6: Post-G5 Handoff Gap Found and Closed

**Full detail in DECISIONS.md D-054.** The owner found, after G5 closed, that no distributable
actually existed under `deploy/` — G5's self-validation zip lived only in this session's OS
scratch temp directory (gone after the session), and `deploy/` held only the two build/config
directories (`docker-optional/`, `installer-windows/`). The owner's own attempt to run
`Start HF Engine.bat` directly from `installer-windows/` (the build workshop, not a product
folder) served a stale pre-cookie-fix build against old test data.

Closed by: a fresh `npm run build`/`npm test` (208/208) from current source; a new, tracked
`deploy/installer-windows/build-dist.ps1` that stages a customer-only allow-list (never the
builder scripts, never `data/`) and writes a versioned zip to `deploy/dist/`; a tracked
`deploy/dist/README.md` explaining what belongs there and how to rebuild it (required a
directory-level `.gitignore` negation, not just a file-level one, since the repo's existing
blanket `dist/` rule excluded the whole directory); `INSTALL-GUIDE.md` updated to name the real
location and warn explicitly against ever running from the workshop directory. Also fixed two
source comments that had speculatively cited "D-054" for the D-053 cookie fix before this
entry's real number was known.

**Real artifact, verified behaviorally (not by grepping minified output) in genuine
isolation:** `deploy/dist/HF-Engine-Standalone-Windows-v1.0.0.zip` — extracted with zero repo
tree above it, real first-run setup, real `Set-Cookie` header inspected directly: no `Secure`
attribute, confirming the D-053 fix is genuinely present in this exact shipped artifact.

**Journal note (append-only correction to G3/G4's fixture record):** the workshop's
`deploy/installer-windows/data/` directory was touched again on 2026-08-07 ~09:04 local time by
the owner's own login attempts against the stale build (a new `jwt-secret.txt` was
auto-generated at that time, alongside the pre-existing `hfengine.db`/`.initialized` from this
session's original G3/G4 testing on 2026-08-06). This does not invalidate D-051/D-052's
evidence (captured via direct DB queries/hashes at the time, independent of this directory's
later state) but is recorded so the directory's current timestamps aren't misread later.

**Status: CLOSED.**

---

## Entry 7: Real-Machine Finding — Admin Navigation Unreachable (Interim Fix; Real Fix Deferred to UI Directive)

**Full detail in DECISIONS.md D-055.** The owner's own real-machine testing found that an
admin account, after `/setup`, lands on the learner-style `/dashboard` with no menu, and
`/admin/users` likewise has no way back — every packaging gate's own testing used direct URLs
throughout, so this was never exercised by G1-G5.

Confirmed via inspection that this is narrower than "no navigation exists": `AppShell.tsx`
already works and is already wired into 11 QM/supervisor/learner pages (verified live in a
real browser — real nav links, real Log Out). The gap is specifically: `login.tsx`'s redirect
has no `admin` case, and `/dashboard`/`/admin/users`/`/admin/dashboard`/`/admin/enrollments`
don't use `AppShell` at all.

Per the owner's explicit scope: the real fix (role-appropriate admin landing + full
click-only-reachability, with an acceptance test of completing the G3 lifecycle via clicks
alone) is logged as a new §0a in `PHASE-UI-DESIGN-DIRECTIVE.md` itself — not fixed here. Only
the interim measure was shipped this session: an "Admin Quick Reference" table added to
`INSTALL-GUIDE.md`, every one of its 17 URLs verified 200 against a real running instance
before being documented.

No source code changes. Documentation only.

---

## Entry 8: System Tray Launcher (v1.1.0) — Console Window Eliminated

**Full detail in DECISIONS.md D-056 (finding) and D-057 (build + verification).**

The owner's real-machine testing of v1.0.0 found the console-window launcher could be closed
by a customer with no warning, killing the server, and that Prisma's internal "update
available... npm i" banner was leaking into the customer-facing console. Root cause of the
banner confirmed by reading the installed Prisma package's own source: the update-check is a
real outbound network call, made regardless of whether the resulting message is shown -
`CHECKPOINT_DISABLE` (not just `PRISMA_HIDE_UPDATE_MESSAGE`) is required to stop it, and both
undermine this product's own "no outbound network calls" claim if left unset.

Built a system tray launcher (PowerShell + WinForms `NotifyIcon`, no new runtime dependency):
`start.ps1`'s environment/migration logic extracted into a shared `preflight.ps1`; `tray.ps1`
runs the server as a fully redirected hidden child, with a Windows Job Object guaranteeing the
server cannot be orphaned even if the tray itself is forcibly killed - the one guarantee strong
enough to actually close the finding, since a clean-exit handler alone does not cover a forced
kill. `Start HF Engine.bat` replaced entirely (not kept alongside) by `Start HF Engine.vbs`,
which launches with zero console window, not even a momentary flash.

Two real bugs found and fixed by this entry's own testing, neither obvious from reading the
code: a second launch attempt crashed on the log file (opened before the single-instance mutex
check - fixed by reordering); the .NET `Exited` event never fired once
`Application.Run()`'s message loop took over the thread (a real PowerShell/WinForms
interaction gap - fixed with a polling `Timer` instead, which the same message loop does
correctly dispatch).

Rebuilt and verified on the real, isolated v1.1.0 artifact: zip contents clean, launched via
`wscript.exe` (the actual double-click handler), zero console-hosting process in the process
tree, Prisma banner absent from real migration output, orphan-prevention and unexpected-death
detection both confirmed via real process kills, single-instance guard confirmed via a real
second launch attempt, and a genuinely fresh browser tab showing the real `/setup` page with
"HF-ENGINE v1.1.0" in the footer. `package.json` and `versionStamp.ts` both bumped to 1.1.0.

Five items honestly named as unverifiable in this sandboxed, non-interactive environment (tray
icon's visual appearance, the context menu's click behavior, the balloon notification's visual
render, the tooltip's hover text, and any SmartScreen prompt) - listed explicitly in D-057 for
the owner's own real-machine confirmation, not silently assumed.

`INSTALL-GUIDE.md` updated throughout: no more console-window language, tray icon documented
as the way the app presents, Stop/Restart rewritten for the tray, and a new
"No icon in the tray" troubleshooting entry.

Full suite: 208/208.
