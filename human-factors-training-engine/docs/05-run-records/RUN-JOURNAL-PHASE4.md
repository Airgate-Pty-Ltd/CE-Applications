# RUN JOURNAL — PHASE 4

**Authority:** `docs/01-directives/PHASE-4-RUN-DIRECTIVE.md` — Online Edition, Postgres, Deployment Proof
**Authorization basis:** Phase 3 closed — `RUN-PHASE3.done` (4 Verified / 1 Partial), commit `5ba7d09`.
**Standing law:** `CLAUDE.md` governs this run in full. Append-only. Corrections are appended, never rewritten.

---

## Entry 0: WP-0 — Receiving Inspection & Git Remote — COMPLETE (exit gate met)

**Timestamp:** 2026-08-06

### Step 1: Clean-clone receiving inspection

Cloned the local repo (at commit `5ba7d09`, the Phase 3 close) into a fresh temp directory via
`git clone` — a genuine clean clone, no working-directory state carried over. Real setup +
verification sequence, in order:

```
$ npm install
added 452 packages, and audited 453 packages in 15s
5 vulnerabilities (1 moderate, 3 high, 1 critical)   <- see D-038/Q-009, logged not fixed here
```

```
$ npx prisma migrate deploy
4 migrations found in prisma/migrations
Applying migration `20260806150826_init_hf_phase1_models`
Applying migration `20260806165843_add_atom_completion`
Applying migration `20260806170445_add_emergency_expires_at`
Applying migration `20260806181341_add_drip_delivery`
All migrations have been successfully applied.
```

```
$ npx prisma db execute --file prisma/manual-sql/frozen_manifest_trigger.sql --schema prisma/schema.prisma
Script executed successfully.
$ npx prisma db execute --file prisma/manual-sql/frozen_manifest_trigger_v2_widen_superseded.sql --schema prisma/schema.prisma
Script executed successfully.
```

```
$ npm run db:seed
Error: To configure seeding in your project you need to add a "prisma.seed" property...
```
**Real, previously-hidden gap found** (D-036): no `prisma.seed` config existed in `package.json`
at all, and no `ts-node`/`tsx` dependency was declared — `npm run db:seed` has been broken on
every genuinely clean clone this entire engagement, never caught because dev.db was always
seeded incrementally across sessions that already had a working environment. Fixed: added `tsx`
devDependency, `"prisma": {"seed": "tsx prisma/seed.ts"}` config, `db:seed:demo`,
`db:migrate:deploy`, `db:triggers`, and a `db:setup` orchestrator. Full detail: DECISIONS.md
D-036, D-037.

Re-ran the full sequence after the fix, from a fresh `npm install` with the corrected
`package.json` synced into the clean-clone directory:

```
$ npm run db:seed
> tsx prisma/seed.ts
✓ Seed data created:
  - User: test.learner@example.com
  - Evidence: NCR-2026-0001
  ...
The seed command has been executed.

$ npm run db:seed:demo
> tsx prisma/seed-phase3-demo-users.ts
Demo users ready:
  QM:         qm.demo@example.com / DemoPass123 (id=cmshw8q9k000012kur82uomtf)
  Supervisor: supervisor.demo@example.com / DemoPass123 (id=cmshw8qbv000112kuapq850u3)
  Learner:    learner.demo@example.com / DemoPass123 (id=cmshw8qe4000212kuvw2ay5ce)
```

```
$ npx tsc --noEmit
(0 errors, clean exit)

$ npx jest
Test Suites: 27 passed, 27 total
Tests:       199 passed, 199 total
Snapshots:   0 total
Time:        8.4 s

$ node scripts/check-license-headers.js
✓ License header check passed — 149 files checked, all compliant.

$ npm run build
(succeeded — full standalone Next.js build, no errors)
```

**Every check specified in the directive's WP-0 step 1 passed on a genuinely clean clone, after
one real fix.** The npm audit findings (D-038) are logged, not silently fixed — see Q-009.

### Step 2: `next-env.d.ts`

Checked: already tracked in the repo (part of the Phase 3 baseline commit `dddb66c`) — the
directive's "commit it or gitignore it" instruction was already satisfied before this session
started. No action needed.

### Step 3: Private GitHub remote

The agent's first attempt (creating a new repo via the shared Chrome browser under
`Airgate-Pty-Ltd`) was interrupted by the owner, who supplied the exact target directly instead:
`https://github.com/Airgate-Pty-Ltd/Human-Factors-Training-Engine.git`.

```
$ git remote add origin https://github.com/Airgate-Pty-Ltd/Human-Factors-Training-Engine.git
$ git ls-remote origin ; echo "EXIT_CODE=$?"
EXIT_CODE=0                                          <- empty output, exit 0: repo exists, empty
$ git push -u origin master
To https://github.com/Airgate-Pty-Ltd/Human-Factors-Training-Engine.git
 * [new branch]      master -> master

$ git rev-parse HEAD
5ba7d09326405886047d63f5202ad6fbadb51c4e
$ git ls-remote origin master
5ba7d09326405886047d63f5202ad6fbadb51c4e	refs/heads/master
                                                      <- local and remote HEAD match exactly

$ git ls-files | grep -E '\.env|\.db'
.env.example
docker/.env.docker.example
                                                      <- only templates, no real secrets/DBs

$ curl -s -o /dev/null -w "%{http_code}\n" https://api.github.com/repos/Airgate-Pty-Ltd/Human-Factors-Training-Engine
404                                                   <- confirms genuinely private (GitHub's
                                                         standard behavior: private repos 404 to
                                                         unauthenticated requests, not 403)
```

Remote URL recorded in DECISIONS.md D-039.

### Final state

```
npx tsc --noEmit: 0 errors
npx jest: 27 suites, 199/199 passing
node scripts/check-license-headers.js: 149/149 compliant
Private remote: https://github.com/Airgate-Pty-Ltd/Human-Factors-Training-Engine.git, HEAD
  5ba7d09 pushed and verified matching.
```

**WP-0 exit gate: MET** — clean-clone `npm test` output pasted (above, both pre- and post-fix);
private remote live with full history, verified matching; no secrets/DBs tracked, verified by
the directive's own exact check.

---

**Next:** WP-1 — Dual-provider schema (SQLite + PostgreSQL), closing Q-008.


---

## Entry 1: WP-1 — Dual-Provider Schema (SQLite + PostgreSQL) — Built & Verified, Postgres-Side Run PARTIAL (named gap)

**Timestamp:** 2026-08-06

### Built

- `scripts/generate-postgres-schema.js`: mechanically derives `prisma/postgresql/schema.prisma`
  from the single-source-of-truth `prisma/schema.prisma` (SQLite, unchanged), swapping only the
  datasource provider line. Its own subdirectory (not a sibling file) so Prisma's
  migrations-folder convention resolves separately (`prisma/postgresql/migrations/`, distinct
  from `prisma/migrations/`).
- `prisma/postgresql/migrations/20260807000000_init_postgresql/migration.sql`: real, valid
  PostgreSQL DDL (927 lines, 150 CREATE TABLE/CONSTRAINT/INDEX statements), generated via
  `prisma migrate diff --from-empty --to-schema-datamodel ... --script` — this needs NO live
  database connection (computes the diff purely from the schema's data model).
- `prisma/postgresql/manual-sql/frozen_manifest_trigger.sql`: PostgreSQL equivalent of the
  SQLite frozen-manifest trigger (C-013), preserving the exact `frozen_manifest_immutable_error`
  message text.
- New npm scripts: `db:generate:pg`, `db:migrate:pg`, `db:triggers:pg`, `db:seed:pg`,
  `db:seed:demo:pg`, `db:setup:pg` (Postgres-targeted equivalents of the existing SQLite `db:*`
  scripts), `db:generate:sqlite` (explicit restore-to-SQLite).
- Full reconciliation review of every SQLite-specific concession named in the directive:
  Json-as-String serialization, native arrays, the immutability trigger, `@db.*` types, and
  `date_*` kernel-operator grammar. Full detail: DECISIONS.md D-040, D-041.

### Executed evidence — everything NOT requiring a live Postgres connection

```
$ npx tsc --noEmit                                          -> 0 errors
$ npx jest generatePostgresSchema --silent
  PASS src/lib/__tests__/generatePostgresSchema.test.ts      -> 3/3

$ DATABASE_URL="postgresql://user:pass@localhost:5432/hfengine" \
    npx prisma validate --schema prisma/postgresql/schema.prisma
  The schema at prisma\postgresql\schema.prisma is valid 🚀

$ DATABASE_URL="postgresql://user:pass@localhost:5432/hfengine" \
    npx prisma migrate diff --from-empty --to-schema-datamodel prisma/postgresql/schema.prisma --script
  (927 lines of real, valid PostgreSQL DDL, no errors)

$ node scripts/check-license-headers.js                     -> 150/150 compliant
```

### Real client swap-and-restore test (proves the mechanism works, no live Postgres needed for this part)

```
$ npm run db:generate:pg
✔ Generated Prisma Client (v5.22.0) to .\node_modules\@prisma\client
$ grep activeProvider node_modules/.prisma/client/index.js
  "activeProvider":"postgresql"

$ npx jest MaiKernel.rules --silent          -> PASS 43/43 (pure logic, no DB access — expected)
$ npx jest AtomCompletionService --silent    -> FAILS, correctly:
  PrismaClientInitializationError: error validating datasource `db`: the URL must start with
  the protocol `postgresql://` or `postgres://`
  (proves the swap is real: the postgres-mode client genuinely refuses the sqlite `file:` URL
  rather than silently misbehaving)

$ npm run db:generate:sqlite                  -> restored
$ npx jest --silent
  Test Suites: 28 passed, 28 total
  Tests:       202 passed, 202 total          <- full suite passes again, clean restore
```

### PARTIAL, named gap: live test run against real Postgres

Per the directive's own text ("if no daemon, WP-2's live bring-up is Partial with repro steps,
but WP-1's provider-parity tests still run against any reachable Postgres, including a temporary
one") — this environment has no reachable Postgres of any kind (Docker daemon down, confirmed
again this session with the identical failure signature as Phase 3 D-035; no local `psql`; port
5432 closed). The SQLite half of the exit gate ("run npm test on SQLite... paste") is done and
re-confirmed multiple times above. The Postgres half ("...then against a real Postgres instance,
paste both") could not be executed. Logged honestly as DECISIONS.md D-042 / OPEN-QUESTIONS.md
Q-010 — not silently skipped, not claimed as run.

**One specific thing flagged to re-check once Postgres access exists:** D-016 predicted (but
never confirmed) that Postgres's `RAISE EXCEPTION` message text would surface through Prisma's
error object, unlike SQLite's generic P2003 mapping. `ManifestGuard.test.ts`'s assertions should
be specifically re-examined against live Postgres for this.

### Final state

```
npx tsc --noEmit: 0 errors
npx jest: 28 suites, 202/202 passing (SQLite)
node scripts/check-license-headers.js: 150/150 compliant
```

**WP-1 status: everything buildable without a live database connection is Verified. The
directive's exit gate (same suite passing on both providers, both outputs pasted) is PARTIAL —
the Postgres-side run is blocked on environment access, named and reproducible, not hidden.**

---

**Next:** the agent is asking the owner how to provide Postgres access, since it blocks both the
remainder of WP-1's exit gate and the entirety of WP-2.


---

## Entry 1 (continued): WP-1 Exit Gate CLOSED — Real PostgreSQL Access Obtained, Both Providers Verified

**Timestamp:** 2026-08-06 (same day, continuing after the Postgres-access request above)

The owner installed PostgreSQL locally via Chocolatey in an elevated PowerShell window (run
directly by the owner — the agent's `computer-use` tooling cannot type into terminal windows,
by explicit policy, even with an elevated session). Getting from "installed" to "a genuinely
usable instance" required real diagnostic work: the Windows service failed to start (error
1067); investigation traced this to an unrelated, pre-existing v18 data directory located
inside a OneDrive-synced folder, corrupted by an interrupted shutdown months earlier (real
Postgres log: `Could not open file "pg_multixact/offsets/0000"`) — confirmed by the owner as a
known anti-pattern ("we are not supposed to be in OneDrive at all"). That broken directory, and
two other already-running Postgres instances (v13, v16) with unknown credentials, were all
deliberately left untouched. A fresh, isolated data directory was initialized instead
(`C:\Users\oleab\AppData\Local\Temp\hf-engine-postgres-data`, UTF8, trust auth, port 5544 —
explicitly outside OneDrive) and started as a plain user process via `pg_ctl` (no admin rights
needed for that part — only Windows *service* registration required elevation). Full
diagnostic trail: DECISIONS.md D-043.

**The actual WP-1 exit-gate evidence, both providers, both real, both pasted:**

```
$ createdb -h 127.0.0.1 -p 5544 -U postgres hfengine   (via psql CREATE DATABASE)

$ DATABASE_URL=postgresql://postgres@127.0.0.1:5544/hfengine npm run db:setup:pg
  migrations applied, C-013 trigger installed, real seed data + 3 demo users created

$ DATABASE_URL=postgresql://postgres@127.0.0.1:5544/hfengine npx jest
  Test Suites: 1 failed, 27 passed, 28 total
  Tests:       1 failed, 201 passed, 202 total
```

The single failure was D-016/D-041's predicted-but-never-confirmed difference, now CONFIRMED
real: on Postgres, the trigger function's `RAISE EXCEPTION` message text genuinely surfaces
through Prisma's error object (`PostgresError { code: "P0001", message:
"frozen_manifest_immutable_error" }`), unlike SQLite's opaque `P2003`. Not a functional gap —
the UPDATE was still correctly blocked (the two preceding re-fetch assertions in the same suite
passed). Fixed `ManifestGuard.test.ts` to branch its error-text assertion by provider (detected
from `DATABASE_URL`'s protocol) instead of asserting only the SQLite behavior.

**Re-verified after the fix, both providers, both pasted:**

```
$ DATABASE_URL=postgresql://postgres@127.0.0.1:5544/hfengine npx jest --silent
  Test Suites: 28 passed, 28 total
  Tests:       202 passed, 202 total

$ npm run db:generate:sqlite
$ npx jest --silent   (DATABASE_URL back to file:./dev.db)
  Test Suites: 28 passed, 28 total
  Tests:       202 passed, 202 total

$ npx tsc --noEmit                              -> 0 errors
$ node scripts/check-license-headers.js         -> 150/150 compliant
```

**WP-1 status: VERIFIED.** The directive's exact exit-gate text is met: identical results on
both providers, with the one genuine behavioral difference logged, tested, and correctly
asserted per-provider rather than hidden. OPEN-QUESTIONS.md Q-010 resolved.

**Standing infrastructure for the rest of this run:** local PostgreSQL 18.4 at `127.0.0.1:5544`,
database `hfengine`, user `postgres`, trust auth (local-only, throwaway test instance — not
exposed beyond `127.0.0.1`). This satisfies the directive's WP-2 item 1 ("Docker container **or
local service**") via the local-service path, since the Docker daemon remains unavailable.

---

**Next:** WP-2 — Online-edition runtime on Postgres (already has a real, reachable instance to
build against).


---

## Entry 2: WP-2 — Online-Edition Runtime on Postgres — COMPLETE (exit gate met)

**Timestamp:** 2026-08-06

### Scope

Three items: stand up PostgreSQL (already done in WP-1, D-043), run the full Phase-1 lifecycle
against it with DB-query confirmation, wire and prove the least-privilege `mai_kernel` role.

### Least-privilege mai_kernel role (MAI-ARCH-001 §6)

Built `prisma/postgresql/manual-sql/mai_kernel_role.sql`: SELECT on all 24 host tables,
SELECT+INSERT on all 6 `mai_*` tables, explicit REVOKE of UPDATE/DELETE/TRUNCATE everywhere.
Applied for real via `npm run db:mai-kernel-role:pg`.

Manually verified via real `psql` connections as the role before writing the automated test:

```
=== SELECT on host table (should succeed) ===
 count
-------
     3
=== UPDATE on host table (should FAIL) ===
ERROR:  permission denied for table hf_event
=== INSERT on mai_* table (should succeed) ===
INSERT 0 1                                    (confirmed landed via a separate superuser query)
=== UPDATE on mai_* table (should FAIL) ===
ERROR:  permission denied for table mai_approval
```

Automated: `src/services/__tests__/MaiKernelDbRole.test.ts` (new) — 6/6 passing against real
Postgres (connects as `mai_kernel` via a dedicated `PrismaClient`; SELECT/INSERT succeed, UPDATE
and DELETE on both host and `mai_*` tables fail with `permission denied`, each failure
independently confirmed unchanged via the host-principal connection). Postgres-only — self-skips
on SQLite with an explicit `console.warn`, so a green run can never be silently mistaken for the
grant model having been verified. Full detail: DECISIONS.md D-047.

### Full Phase-1 lifecycle against real Postgres — executed, DB-query confirmed at every step

Started the dev server pointed at the real instance with accurate config:
`DATABASE_URL=postgresql://postgres@127.0.0.1:5544/hfengine`, `DATABASE_MODE=postgresql`,
`DEPLOYMENT_EDITION=online`. Confirmed via `curl /api/health/status`:
`{"state":"ONLINE","config":{"edition":"online","databaseMode":"postgresql",...},
"database":{"reachable":true,"latencyMs":58},...}` — real network latency, not a local file,
satisfying the exit gate's "health screen shows correct state against Postgres."

**Real bug found and fixed live (D-044):** the owner, watching in their own browser, hit a real
React hydration error in `layout.tsx` — a global `<style>` tag's raw CSS text needed
`dangerouslySetInnerHTML`, not a plain string child (React escapes the latter inconsistently
between SSR and hydration, briefly producing invalid CSS). Fixed; a self-inflicted JSX comment
placement error introduced during the fix was itself caught (not by `tsc --noEmit`, which missed
it — by the dev server's own compile log) and fixed. Re-verified via a real `npm run build`.
Logged as D-044/D-045 (the latter a process note: `tsc --noEmit` is not sufficient proof of a
working Next.js build on its own).

**Second real finding (D-046, tooling not product):** the browser-automation tool's synthetic
clicks did not reach React's submit handlers for real form submissions (confirmed: no POST
request ever fired, reproduced in a brand-new clean tab, isolated by direct comparison against
`element.click()` via `javascript_tool`, which worked immediately). Every subsequent UI action
this session used `element.click()` via JS, with every resulting state change independently
confirmed via direct `psql` queries — not just DOM state — against the real database.

**The lifecycle itself, real evidence at every step (QM → learner → supervisor, real demo
accounts, real Postgres, `psql` output pasted for each):**

```
Ingest: "WP2 Postgres Demo: Shift handover fatigue incident" (NCR-WP2-PG-001)
  -> real row, hash 260215e57f87...

Extract event: "Missed torque verification due to night-shift fatigue"
  -> themes: ["fatigue"], rolesExposed: ["night_shift_technician"],
     sitesExposed: ["brisbane_hangar_2"]   (real structured-intake fields, WP-4.1 feature,
     confirmed working identically on Postgres)

Causal status promotions, each confirmed via mai_causal_status after the real UI action:
  REPORTED -> SUSPECTED -> UNDER_INVESTIGATION -> VERIFIED

Appropriateness review -> real intervention "WP2 Postgres Demo: Fatigue Handover Training"
  (DRAFT), competenceGapIdentified: true, trainingReducesRisk: true

Atom authored: "Fatigue Handover Protocol Refresher" -> classification inherited: INTERNAL
  (real C-006 enforcement, confirmed on Postgres)
Atom approved -> approvedBy: qm.demo@example.com

Compile & Assign to Lee Learner (Demo)
  -> real frozen manifest, outputHash cb9bca14f64edc47a0c03c38162b10f8f095b48ccdb670fb178ee3c9db43ec2a
  -> assignment ASSIGNED, intervention PUBLISHED

Learner: Mark Complete -> assignment IN_PROGRESS -> readyForAssessment correctly gated true
  (only after the single atom completed)
Take Assessment -> assignment PASSED

Supervisor: one-tap "Observed effective (Workplace Transfer)"
  -> real SupervisorObservation + EffectivenessEvidence rows
  -> InterventionClosureService evaluated for real:
     closureStatus: CLOSED, closedAt: 2026-08-06 20:24:35.252
     AuditLog: {"reason":"effectiveness_target_level_met","targetLevel":"COMPLETION",
                "highestEvidenceRank":3,"system":true}
```

Full Phase-1 lifecycle, all real, all on live PostgreSQL, all independently confirmed by direct
database query rather than trusting UI state alone.

### Final state, both providers, both pasted

```
$ npm run build                                    -> succeeds (real SWC compile, D-044 fix confirmed)

$ DATABASE_URL=postgresql://postgres@127.0.0.1:5544/hfengine npx jest --silent
  Test Suites: 29 passed, 29 total
  Tests:       208 passed, 208 total

$ npm run db:generate:sqlite && npx jest --silent
  Test Suites: 29 passed, 29 total
  Tests:       5 skipped, 203 passed, 208 total

$ node scripts/check-license-headers.js            -> 151/151 compliant
```

Dev server stopped cleanly (Stop-Process on real OS PIDs, confirmed zero orphaned processes).

**WP-2 exit gate: MET.** Lifecycle executed against Postgres with pasted evidence (above);
`mai_kernel` role restrictions proven by real failing-write tests (both manual `psql` and
automated Jest, both against a live instance); health screen showed correct `ONLINE` state
against Postgres throughout.

---

**Next:** WP-3 — Deployment proof (closes the Phase-3 Docker Partial).
