# ISO 42001 AIMS-in-a-Box

**Status:** Working, integrated, real-database build. Field-name integration defect fixed and
re-verified 2026-07-12 (see `RISKS-AND-BOUNDARIES.md` section 7). See the FSA Gate Check re-run
(2026-07-12) for the current honest pass/fail per gate — G3 (Human Role) and G5 (Comparison Test)
were the two failing gates going into this pass and both now pass with live verification; G6 (Screen
Awareness) passes for the Overview screen but has a noted, non-blocking gap on per-register list/detail
screens (see the gate table in this pass's handoff/verification output for the full honest breakdown).
**Branding:** FINAL — Conform-Edge Quality Consulting LLC (decision closed 2026-07-10; see
`_Brand\Conform-Edge\BRAND-STANDARD.md`).

## What this product actually is now (updated 2026-07-12)

This folder now contains **two generations of the same idea**:

1. **The current product: `app\`** — a real Express + SQLite backend with an embedded, deterministic
   M-AI Kernel (rules-only "System-Detected Conditions," never an LLM, never an autonomous decision),
   and a full records-based UI ("AIMS Command Center") covering seven ISO/IEC 42001 registers: Statement
   of Applicability, Risk Register, Risk Treatments, Objectives, Audit Findings, NCRs, and Competence
   records. This is the product Brian should demo and evaluate going forward. See `app\README.md` and
   `app\SETUP.md` to run it.
2. **The original single-file tool: `ISO42001-Readiness-GapCheck-Tool.html`** — a self-contained
   browser-only 33-question readiness quiz with no backend, no persistence, and no governance layer.
   **This is now a deprecated/superseded first draft**, kept in this folder for reference and as a
   possible free lead-magnet artifact, but it is no longer "the product." Do not lead with it in
   customer-facing materials without updating the framing.

The 23-document kit under `Documents\` (Tier 1–4 authored documents, `KIT-CONTENTS.md`) is a separate,
still-valid deliverable — a document-authoring product independent of which tool sits alongside it.

## What actually makes this different from a generic GRC platform

Not "AI-powered" marketing language — a specific, verifiable architectural difference. Platforms like
ServiceNow GRC, LogicGate, and Vanta are built around a **periodic, point-in-time compliance
questionnaire**: someone answers a checklist on a schedule, and the tool reports whatever was true that
day. Between check-ins, a control can silently drift out of compliance with nobody notified.

The AIMS Command Center evaluates **every record mutation immediately**, the moment it happens, via an
embedded deterministic rules engine (the M-AI Kernel — rules-only, no LLM, no black-box scoring), and
writes every evaluation to a cryptographically hash-chained, restart-surviving audit trail (proven by the
AT-16 acceptance test: a fresh kernel instance on the same database sees byte-identical assessment
history after a restart). The Overview screen makes this real, not asserted: a "Continuously monitored
since [earliest real event timestamp]" indicator pulls live data straight from `GET /api/events`
(`mai_events`), not a hardcoded or decorative string.

## Quick Start (current product)

```bash
cd app
npm install
cp .env.example .env
npm run setup
npm run seed
npm start
```

Then open `http://localhost:3100/` — the Express server now serves the UI itself (same-origin), backed
by a real SQLite database and the M-AI Kernel. See `app\SETUP.md` for the documented `DB_PATH` workaround
if you hit a SQLite "disk I/O error" (only observed so far when the app's folder is accessed through a
Windows-OneDrive-to-Linux sandbox bridge mount — not expected on a normal machine).

## Verification status (as of 2026-07-12 fix pass)

- **Acceptance tests AT-01 through AT-16** (`app\tests\acceptance.test.js`) plus 3 smoke tests
  (`app\tests\smoke.test.js`): **19/19 passing** (`npm test`) after this pass's changes — re-run and
  confirmed with real terminal output, not assumed carried-over from the prior pass.
- **Field-name mismatch (Bug 1): FIXED.** `app\src\ui\schemas.js` was rewritten field-by-field against
  the real backend route contracts (`app\src\routes\*.js`) and the database CHECK constraints
  (`app\src\db\schema.sql`), then re-verified live: the app was started with the real backend, and a
  realistic payload built from the corrected schema field names was POSTed to all 7 `/api/<type>` create
  endpoints — all returned `201` with the record persisted (confirmed by `GET`). Multiple `PUT` updates
  were also confirmed to actually save (the exact "200 OK but silently didn't save" failure the prior
  pass warned about). See `RISKS-AND-BOUNDARIES.md` section 7 for the full before/after field mapping.
- **Deterministic assistance (Bug 2 / FSA G3): FIXED.** Risk `score` (likelihood x impact) and
  Competence `competence_review_due_date` (last_review_date + 365 days) are now computed server-side,
  unconditionally, and are locked against direct client override — verified live by attempting to inject
  a bogus value via the API and confirming the correct computed value persisted instead. A deterministic
  (non-LLM, substring-match) auto-suggestion for a Risk Treatment's SoA control link was also added. See
  `RISKS-AND-BOUNDARIES.md` sections 7b and `app\DESIGN-NOTES.md` for the full write-up.
- **Continuity differentiator (Bug 3 / FSA G5): FIXED.** The Overview screen now shows a real
  "Continuously monitored since..." indicator built from live `/api/events` data. `customer-facing-copy.md`
  and this README now name the specific competitor pattern (periodic GRC questionnaires) and the specific
  limitation this design eliminates, instead of generic "AI-powered" language.
- **FSA Gate Check** was re-run against the now-fixed product on 2026-07-12 — see the gate summary
  recorded for this pass (in the handoff/verification output) for the honest pass/fail per gate. G3 and
  G5 (the two gates that failed the prior review) now both pass with live verification, not just an
  updated document. G6 (Screen Awareness) passes for the Overview screen; per-register list/detail
  screens satisfy fewer of the seven screen-awareness questions (notably "consequences/risks/opportunities"
  is implicit rather than explicit there) — a genuine, non-blocking opportunity for further work, not a
  fabricated pass.

## Key Files

- `app\` — the current product (Express server, SQLite DB, M-AI Kernel, UI)
- `app\DESIGN-NOTES.md` — FSA-format write-up of the deterministic-assistance fix (2026-07-12)
- `ISO42001-Readiness-GapCheck-Tool.html` — deprecated/superseded first-draft tool (kept, not deleted)
- `Documents\` / `KIT-CONTENTS.md` — the separate 23-document authoring kit
- `EVOLUTION-REPORT.md` — original assessment/roadmap (describes the pre-rebuild state)
- `NEEDS-FROM-BRIAN.md` — remaining open decisions

## Deploy / GitHub

See `app\README.md`'s deployment section (Node app, not static hosting) and `GITHUB-READY.md` (updated
for the real app). Brian has not authorized pushing to any GitHub repo yet — see `GITHUB-READY.md` for
the exact commands to run when ready; no agent has executed them.
