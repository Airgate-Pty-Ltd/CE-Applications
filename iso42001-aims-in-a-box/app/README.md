# ISO/IEC 42001 AIMS Command Center

A real Node.js/Express/SQLite backend that runs an actual AI Management
System: users maintain real records (Statement of Applicability entries,
risk register, risk treatments, objectives, audit findings, NCRs, competence
records). An embedded **M-AI Kernel** — a deterministic, rules-only
governance engine — watches every record mutation and surfaces
**System-Detected Conditions** (gaps, missing links, overdue items)
automatically. Readiness is computed from real record completeness /
linkage / timeliness — nothing here is a self-assessment quiz.

This replaces the earlier static single-file HTML quiz
(`ISO42001-Readiness-GapCheck-Tool.html`) in the parent folder, which had no
real records, no M-AI governance, and failed almost every gate of the
Future Systems Architect review.

## Architecture

```
server.js                      Express app entry point (PORT env, default 3100)
src/db/schema.sql               Host tables (soa_entries, risk_register, ...) + mai_* tables
src/db/init.js                  Opens/creates the SQLite file, applies schema.sql
src/adapter/aims-adapter.js      Host <-> kernel integration glue (event flow, link precompute, export)
src/routes/*.js                  Express routes per the API contract
src/dims/iso42001-aims-governance/
  manifest.json                  DIM manifest (subscribesTo, readsFields)
  rules/*.json                   8 approved rules (SOA-001/002, RISK-001/002, OBJ-001, AUDIT-001, NCR-001, COMP-001)
  AUTHORITY-CHARTER.md            Generated from the rule files (`npm run charter`)
lib/mai-kernel/                  The M-AI Kernel library — COPIED into this repo, not an npm dependency
scripts/seed.js                  Demo data that deliberately triggers each of the 8 rules
scripts/generate-charter.js      Regenerates AUTHORITY-CHARTER.md from rules/*.json
tests/smoke.test.js              Minimal smoke tests (not the full AT-01..16 suite — see tests/README.md)
```

## The M-AI Kernel is copied in, not an npm dependency

`lib/mai-kernel/` is a **copy** of the real kernel library from
`Personal/07-Outputs/.../builds/2026-07-03-MAI-KERNEL-BUILD/mai-kernel/`
(`lib/kernel.js`, `lib/condition-evaluator.js`, `lib/snapshot.js`,
`lib/validators.js`, `adapters/adapter-contract.js`,
`adapters/sqlite-adapter.js`), required via a plain relative path
(`require('../../lib/mai-kernel')` from `src/adapter/aims-adapter.js`). There
is **no** `"mai-kernel": "^1.0.0"` npm dependency anywhere in `package.json`
— that exact mistake was made in an earlier build
(`2026-07-03-MAI-KERNEL-BUILD/supplier-scorecard-v2`) and is called out
there as a defect to avoid repeating. This app installs and runs standalone
with a plain `npm install` in this folder alone.

### What was adapted from the reference kernel, and why

The reference kernel (built for a different product, "Supplier Quality Risk
Scorecard") does the same deterministic core correctly, but its concrete
schema/API doesn't match what this host and its acceptance tests require.
Adapted, with the reasoning documented in each file's header comment:

- **`condition-evaluator.js`, `snapshot.js`** — reused **unmodified**. Already
  fully generic; snapshot hashing and the operator grammar (`is_null`,
  `not_null`, `is_empty`, `not_empty`, `eq`, `ne`, `in`, `length_gte`,
  `length_lt`, `date_before_today`, `date_after_today`,
  `linked_record_exists`/`linked_record_missing`, `all`/`any`/`not`) match
  the required grammar exactly.
- **`validators.js`** — the reference `validateEvent` hardcoded a whitelist
  of event types from a different product (`supplier.created`,
  `audit.created`, ...) that would have rejected every event this host
  emits. Generalized to a structural `<record_type>.<action>` shape check.
  `validateRule` was renamed `validateRuleRegistration` and now enforces the
  AT-13 registry fields (ruleId, dimId, revision, effectiveDate, approvedBy,
  approvalRef). `validateAssessment` field names/shape now match this host's
  `mai_assessments` schema.
- **`kernel.js`** — the reference `processEvent` wrote the `mai_events` row
  itself and only supported one DIM manifest per call. This host's event
  flow requires the **host** to write the event row (using the kernel's own
  hash) before calling `processEvent`, and requires manifest-driven dispatch
  across every DIM whose manifest `subscribesTo` includes the event type
  (Design Law 11). Added `hashSnapshot()`, `loadRuleRegistry()` (AT-13),
  multi-manifest dispatch, and the `dim_id`/`resolution_hint`/`clause_refs`/
  `status`/`prev_hash`/`row_hash` fields this host's schema requires. The
  response taxonomy was aligned to `confirm` / `dismiss_incorrect` /
  `not_applicable` per this product's API contract.
- **`adapters/adapter-contract.js`, `adapters/sqlite-adapter.js`** — method
  names/shape updated to match `integration-checklist.md` section 2
  (`getSnapshot`, `writeEvent`, `markEventProcessed`, `writeAssessment`,
  `recordAssessmentResponse`, `markAssessmentSuperseded`, `loadAssessments`,
  `listLinkedRecords`, `notify`, `log`) plus the small set of query methods
  the kernel needs (`getActiveAssessmentsByHash`,
  `getActiveAssessmentsForRecord`, `getLastRowHash`, `logError`,
  `upsertRuleRegistryEntry`, `getMetrics`). The reference postgres adapter
  was not copied — this build is SQLite-only.
- **`manifest-loader.js`** — the reference loader validated one pre-parsed
  manifest object; this loader walks `dims/<dim-id>/manifest.json` +
  `dims/<dim-id>/rules/*.json` on disk and returns one manifest per DIM with
  `rules` populated, so multiple DIMs can be added later without touching
  the kernel.

## Design laws enforced

- Kernel writes **only** to `mai_*` tables (`sqlite-adapter.js` SQL is
  scoped to `mai_events`, `mai_assessments`, `mai_error_log`,
  `mai_rule_registry` — never a host table).
- Every kernel entry point (`emitEvent` in `aims-adapter.js`) is wrapped in
  try/catch that logs to `mai_error_log` and always lets the host route
  return 2xx even if the kernel throws.
- Real SHA-256 snapshot hashing via the kernel's own `hashSnapshot()` — no
  placeholder hashes.
- Idempotency (same snapshot hash -> no duplicate active assessment) and
  supersession (changed snapshot -> prior active rows superseded, linked
  forward via `superseded_by`) — see `kernel.js` `processEvent`.
- Tenant-scoped structurally: every `mai_*` query takes `tenant_id`; the API
  reads it from the `X-Tenant-Id` header (defaults to `"default"`).
- Rule JSON files carry `ruleId`, `dimId`, `revision`, `effectiveDate`
  (2026-07-10), `approvedBy` ("Brian R. Olea"), `approvalRef`
  ("MAI-CCB-2026-014"). A rule missing any of these fails registry
  validation at load time and is excluded from the active rule set — the
  rest of the kernel and the host are unaffected.
- Terminology: only "assessment" / "System-Detected Condition" /
  `data_confidence` (high/medium/low) anywhere in code, comments, or API
  output — never "AI finding/decision/approval" or a numeric confidence
  score.

## The 8 approved rules

See `src/dims/iso42001-aims-governance/rules/*.json` for the full,
technically-complete definitions, and
`src/dims/iso42001-aims-governance/AUTHORITY-CHARTER.md` (generated) for the
plain-language governing rules table. Summary: SOA-001 (applicable control
with no linked treatment), SOA-002 (applicable control with no
justification), RISK-001 (scored risk with no owner), RISK-002 (overdue open
treatment), OBJ-001 (objective not measurable), AUDIT-001 (major finding
never escalated to an NCR), NCR-001 (overdue open NCR), COMP-001 (stale
competence review).

## API contract

Base: Express app, `PORT` env (default 3100). All requests read tenant from
header `X-Tenant-Id` (default `"default"`).

- `GET /health` -> `{status, kernelActive, dbConnected}`
- `GET/POST /api/soa`, `GET/PUT /api/soa/:id` (and the same pattern for
  `/api/risks`, `/api/treatments`, `/api/objectives`, `/api/audits`,
  `/api/ncrs`, `/api/competence`)
- `GET /api/conditions?status=active|resolved|superseded|all` -> System-Detected Conditions
- `POST /api/conditions/:id/respond` `{response: 'confirm'|'dismiss_incorrect'|'not_applicable', respondedBy}`
- `GET /api/conditions/:id/charter` -> Authority Charter (markdown)
- `GET /api/export` -> evidence export (manifest + assessments-with-responses + rule registry + charter)

## Running it

See `SETUP.md`. Short version:

```
npm install
npm run setup
npm run seed
npm start
```

## Known limitations / follow-up work

- The approved rule-subscription table only wires SOA-001 to
  `soa.created`/`soa.updated` (not to `risk_treatment.*`), and AUDIT-001
  only to `audit_finding.*` (not to `ncr.*`). This is intentional — it's
  exactly what was approved — but it means adding a treatment/NCR does not
  by itself re-fire the related SOA/finding rule; the SOA entry or finding
  must itself receive an update event afterward to pick up the new link
  (the seed script demonstrates this explicitly for AUDIT-001).
- `tests/smoke.test.js` is a minimal sanity suite, not the full AT-01..16
  acceptance suite from `references/acceptance-tests.md`. That suite is
  scoped as a follow-up pass (see `tests/README.md`).
- No authentication layer — out of scope per the M-AI skill's scope
  discipline section; `X-Tenant-Id` is trusted as sent for this demo build.
- Uses Node's built-in `node:sqlite` (`DatabaseSync`), not the `better-sqlite3`
  npm package. `better-sqlite3` requires downloading a prebuilt native binary
  or compiling one with node-gyp; in this build environment both paths were
  network-blocked (confirmed by direct testing), which is exactly the class
  of "does `npm install` actually work" failure this build was told to avoid
  repeating. `node:sqlite` ships inside Node itself (>=22.5, experimental —
  one warning line, not an error) so `npm install` never compiles anything.
  See `src/db/init.js` for the full reasoning.
- SQLite needs a genuinely local disk under the DB file — see the
  "Troubleshooting" section in `SETUP.md` for a real `disk I/O error` this
  build hit (and resolved by pointing `DB_PATH` at a local path) when running
  from a sandbox that bridges a cloud-synced folder across OS boundaries.
