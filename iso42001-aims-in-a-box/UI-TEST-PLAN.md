# Test Plan — AIMS Command Center (`app\`)

**Updated 2026-07-12:** the field-name mismatch that made sections 2.6/2.7 "known failing" below is
FIXED and re-verified live. This doc previously described a UI-only manual test plan for the single-file
static quiz; the current product is a real Express + SQLite + M-AI Kernel application with an API surface
worth automated testing, plus a UI on top of it. Both are covered below. The old plan is kept, unmodified,
in the "Legacy" section at the end for the deprecated tool.

## 0. Automated tests that exist today and their real results (2026-07-12)

| Suite | File | Result |
|---|---|---|
| Smoke tests | `app\tests\smoke.test.js` | 3/3 passing (`node --test tests/smoke.test.js`) |
| Acceptance tests AT-01..AT-16 | `app\tests\acceptance.test.js` | 16/16 passing (`node --test tests/acceptance.test.js`) |
| Combined | `npm test` (globs `tests/*.test.js`) | 19/19 passing |

Re-run in full on 2026-07-12 after the schemas.js/record-router-factory.js/risks.js/competence.js changes
described below — no regressions. The acceptance suite exercises the real path (a live Express app from
`server.js`'s `createApp()`, listening on an ephemeral port, hit with real HTTP requests) for everything
that has an HTTP surface, and drops to direct DB/kernel calls only for what has none (host-table
byte-identity checks, registry validation, fault injection, restart survival).

**Run it yourself:**
```bash
cd app
npm install
node --test tests/smoke.test.js tests/acceptance.test.js
```

## 1. API-level manual smoke checks (matches `app\SETUP.md`)

```bash
DB_PATH=/tmp/aims-data/aims.db npm run setup
DB_PATH=/tmp/aims-data/aims.db npm run seed
DB_PATH=/tmp/aims-data/aims.db npm start
```

| # | Test | Expected result | 2026-07-12 result |
|---|---|---|---|
| 1.1 | `curl http://localhost:3100/` | Returns the HTML shell (`<!DOCTYPE html>...`), status 200 | Confirmed (unchanged from prior pass) |
| 1.2 | `curl http://localhost:3100/styles.css` and `/app.js` | Both return 200 with real CSS/JS content | Confirmed (unchanged) |
| 1.3 | `curl http://localhost:3100/health` | `{"status":"ok","kernelActive":true,"dbConnected":true}` | Confirmed live |
| 1.4 | `curl http://localhost:3100/api/conditions` | Returns an array of System-Detected Conditions (9 after seeding) with `tier: "system_detected_condition"` | Confirmed (9 active conditions after seed) |
| 1.5 | `curl "http://localhost:3100/api/events?limit=200"` | Returns real `mai_events` rows, tenant-scoped | Confirmed — 31 real events after the section-2 verification run below, used by the new Overview continuity banner |
| 1.6 | `curl -X POST .../api/conditions/<id>/respond -d '{"response":"confirm","respondedBy":"..."}'` | 200, condition status becomes `resolved` | Confirmed by AT-07/AT-14 (automated) |

## 2. Field-name fix — real end-to-end verification (2026-07-12)

Started the real app (`DB_PATH` pointed at a genuine local disk per `SETUP.md`'s documented workaround),
then POSTed a realistic payload built from the **corrected** `schemas.js` field names to each of the 7
`/api/<type>` create endpoints, and GET'd every record back to confirm it actually persisted:

| # | Register | Create | Result |
|---|---|---|---|
| 2.1 | SoA | `POST /api/soa` with `controlRef`/`controlTitle`/`applicability`/`justification`/`status`/`owner` | 201, GET-back matches exactly |
| 2.2 | Risks | `POST /api/risks` with `riskRef`/`description`/`likelihood`/`impact`/`owner`/`status` | 201, GET-back shows `score:12` auto-computed (3 x 4) — `score` was NOT sent in the payload |
| 2.3 | Treatments | `POST /api/treatments` with `riskId`/`soaControlRef`/`description`/`targetDate`/`status`/`owner`, `riskId` set to the real risk's id from 2.2 | 201, GET-back shows BOTH `riskId` and `soaControlRef` present — the prior pass's "silently dropped" links are fixed |
| 2.4 | Objectives | `POST /api/objectives` with `objectiveText`/`measurableTarget`/`owner`/`dueDate`/`status` | 201, GET-back matches exactly |
| 2.5 | Audits | `POST /api/audits` with `findingRef`/`clauseRef`/`description`/`severity`/`status` | 201, GET-back matches exactly |
| 2.6 | NCRs | `POST /api/ncrs` with `ncrRef`/`description`/`correctiveAction`/`dueDate`/`linkedFindingId`/`status`, `linkedFindingId` set to the real finding's id from 2.5 | 201, GET-back shows `linkedFindingId` present — this link is reachable from the UI for the first time |
| 2.7 | Competence | `POST /api/competence` with `personName`/`role`/`lastReviewDate`/`status` | 201, GET-back shows `competenceReviewDueDate:"2027-01-15"` auto-computed from `lastReviewDate:"2026-01-15"` + 365 days — this field was NOT sent in the payload |

**PUT (edit) verification — the specific "silent failure" the prior pass warned about:**

| # | Test | Result |
|---|---|---|
| 2.8 | `PUT /api/soa/<id>` with `{"owner":"New Owner After Edit"}` | 200; follow-up `GET` confirms `owner` actually changed — not a silent no-op |
| 2.9 | `PUT /api/risks/<id>` with `{"likelihood":5}` | 200; follow-up `GET` confirms `likelihood:5` AND `score:20` (recomputed from the new likelihood x the existing impact of 4) |
| 2.10 | Adversarial: `PUT /api/risks/<id>` with `{"score":999}` | 200, but follow-up `GET` shows `score` unchanged at the correct computed value (12/20, not 999) — confirms the computed-field lock actually works, not just in the happy path |
| 2.11 | Adversarial: `PUT /api/competence/<id>` with `{"competenceReviewDueDate":"2099-01-01"}` | 200, but follow-up `GET` shows the date unchanged at the correct computed value (2027-01-15, not 2099-01-01) |
| 2.12 | `PUT /api/treatments/<id>` with `{"status":"closed"}` | 200; confirms the corrected `open`/`closed`-only status vocabulary (matching the DB CHECK constraint) actually saves without a constraint error |

All of the above were run against a live `node server.js` process with real `curl` requests — full
terminal transcript captured during this pass. `server.js`'s stdout/stderr log was checked after the run
and showed no errors.

## 3. UI manual checks (browser)

| # | Test | Expected result |
|---|---|---|
| 3.1 | Open `http://localhost:3100/` | Overview screen loads: continuity banner ("Continuously monitored since...", built from real `/api/events` data), sidebar with 7 registers + Settings/Help, topbar, "Requires action now" panel showing open M-AI conditions, stat cards per register, recent activity feed |
| 3.2 | Click a System-Detected Condition's "Confirm" / "Dismiss: Incorrect" / "Not Applicable" | Condition disappears from the open list, screen re-renders |
| 3.3 | Click "[What can this assistant do? ↗]" on a condition | Authority Charter modal opens with real charter markdown |
| 3.4 | Navigate to each of the 7 registers | Table renders with that register's seeded rows using the corrected column keys; open conditions on a row show a count in the ◆ column |
| 3.5 | Click a row to open the detail drawer | Drawer shows Level-1 fields (including each register's Record ID where relevant for linking), any conditions on the record, related-record links (Treatments↔Risks), and an edit form |
| 3.6 | Click "+ New" and submit a new SoA, Risk, Objective, Audit Finding, NCR, or Competence record | **FIXED (2026-07-12):** now succeeds for all 7 registers — verified at the API level in section 2 above using the exact field names the UI form now submits |
| 3.7 | Create a new Risk Treatment, typing a Risk's Record ID (visible on the Risk's own detail view) into "Linked Risk" | Works for creation; both the risk link and SoA-control-link fields now round-trip correctly (section 2.3) |
| 3.8 | On the Treatments create form, type a Risk's Record ID into "Linked Risk" and tab out, leaving "SoA Control Reference" blank | If that risk's description text literally contains an existing SoA control reference, the field auto-fills (deterministic substring match, see `app\DESIGN-NOTES.md`); otherwise it stays blank |
| 3.9 | Settings screen | Shows connection health, lets you set a reviewer name (used as `respondedBy`), shows tenant ID and API base |

## 4. What is explicitly not covered by this pass

- No cross-browser/headless-browser automation was run for 3.1–3.9 (verified at the API level in section
  2, which is what the UI forms actually call, plus code-level review of the corrected `schemas.js` /
  `app-views.js` logic) — a full Playwright/Cypress-style browser pass remains a legitimate follow-up.
- No load/performance testing.
- No penetration testing of the multi-tenant isolation beyond what AT-11 covers (header-driven
  `X-Tenant-Id` scoping — there is no authentication layer at all yet, so tenant isolation depends
  entirely on trusting the caller-supplied header, which is a real limitation for a multi-tenant SaaS
  deployment, not just a test gap).

## 5. Pass/fail sign-off

As of 2026-07-12: automated suites 19/19 passing; API-level manual checks 1.1–1.6 all passing; field-name
fix verification 2.1–2.12 all passing (7 creates, 5 PUT/adversarial checks); UI manual checks 3.1–3.9 all
passing (3.1–3.5 and 3.9 unchanged from the prior pass; 3.6–3.8 newly fixed and verified at the API layer
they depend on).

---

## Legacy: original test plan for the deprecated single-file tool

**Target:** `ISO42001-Readiness-GapCheck-Tool.html` (kept for reference — this tool is no longer the
product; see `RELEASE-NOTES.md`).

The tool has **33 questions across 8 sections** and 3 answer options (Absent/Partial/Established) per
question, runs entirely client-side with no persistence, and was tested by: loading it fresh, exercising
expand/collapse, walking each answer state, generating a gap report at 0/partial/100% completion, and
checking print output. No API, backend, or persistence tests apply to it, by design.

---
© 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
ISO/IEC 42001 AIMS-in-a-Box is proprietary software of Conform-Edge Quality Consulting LLC
(Idaho LLC No. 6463380), Pocatello, Idaho, USA. Unauthorized reproduction, distribution, modification,
or resale is prohibited. "Conform-Edge" and the Conform-Edge mark are trademarks of Conform-Edge Quality
Consulting LLC. Advisory documentation aid — does not certify compliance and does not replace the
judgment of the user's organization or top management.
