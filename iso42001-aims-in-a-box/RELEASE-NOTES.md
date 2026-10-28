# Release Notes — ISO/IEC 42001 AIMS-in-a-Box

## 2026-07-11 — Full backend + M-AI Kernel + UI rebuild, integrated and verified; old tool deprecated

- **`ISO42001-Readiness-GapCheck-Tool.html` is now DEPRECATED / SUPERSEDED as "the product."** It is kept
  in this folder unchanged (not deleted) and still works exactly as before as a standalone, self-contained
  browser quiz. It is superseded by the new `app\` product (below) and should no longer be presented as
  the current AIMS-in-a-Box offering in demos or customer-facing copy without updating the framing first.
- **New product built at `app\`: the AIMS Command Center** — a real Express + SQLite backend with an
  embedded, deterministic M-AI Kernel (rules-only "System-Detected Conditions" against 8 governance rules
  across the SoA, Risk, Treatments, Objectives, Audit Findings, NCR, and Competence registers — never an
  LLM, no randomness, no autonomous record changes), plus a full records-based FSA-compliant UI replacing
  the single-file quiz concept entirely.
- **Integration pass (this session):**
  - Verified file integrity of every `.js`/`.json` file under `app\` (this vault mount has a documented
    bug where overwriting an existing file with different-length content can silently truncate/corrupt
    it). Found `app\src\ui\app.js` corrupted with ~25KB of trailing null bytes past a complete,
    well-formed 19,544-byte file; truncated it back to the valid content and re-verified with
    `node --check`. Hit the same corruption bug repeatedly on `server.js` and
    `lib\mai-kernel\lib\condition-evaluator.js`/`kernel.js` while making integration edits; worked
    around it by writing those files directly via a shell heredoc instead of the file-edit tool, which
    reproduced correctly on both the Linux sandbox view and the Windows-native OneDrive view of the same
    file.
  - Wired `express.static` serving of `app\src\ui\` at `/` into `server.js`, added a real
    `GET /api/events` route (tenant-scoped, reading `mai_events`) so the UI's Overview "recent activity"
    feed uses real data instead of only its client-side fallback, and confirmed `config.js`'s same-origin
    detection already matched how the app is served (no fix needed there).
  - Reproduced the documented `DB_PATH` local-disk workaround (SQLite is unreliable on this specific
    OneDrive-bridge mount) and ran the full `npm install` → `setup` → `seed` → `start` sequence for real,
    confirming `/`, `/styles.css`, `/app.js`, `/health`, `/api/conditions`, and `/api/events` all serve
    real data end-to-end.
  - Found and fixed two real M-AI Kernel bugs while building the AT-01..16 acceptance suite
    (`app\tests\acceptance.test.js`): `condition-evaluator.js` was silently swallowing rule-evaluation
    errors (defeating AT-15's fault-injection/error-logging requirement) instead of letting them surface
    to `kernel.js`'s existing error-logging catch block; and `kernel.js` never actually measured
    evaluation latency despite AT-14 requiring it, so `avgEvaluationMs` was always 0. Both fixes were
    verified by deliberately re-breaking each one and confirming the relevant acceptance test fails, then
    restoring the fix and confirming it passes again.
  - **Result: 16/16 acceptance tests (AT-01 through AT-16) passing** against the real API/DB, plus the
    original 3 smoke tests — 19/19 total, real terminal output captured, no shallow always-pass tests.
  - **Found and left unresolved (non-trivial, architectural): the UI's record forms
    (`app\src\ui\schemas.js`) use different field names than the real backend API contract for 6 of the
    7 registers** (SoA, Risks, Objectives, Audits, NCRs, Competence). Verified live against the running
    server: submitting the UI's own SoA and Risk create-forms to the real API returns
    `400 validation_error` (missing `controlRef`/`applicability` for SoA; missing `riskRef` for Risks).
    Editing an existing record can silently no-op for mismatched fields rather than erroring, since the
    existing correctly-named values are still present in the PUT payload underneath the mismatched ones.
    Treatments is the only register where the sole required field (`description`) happens to match, but
    its risk-link and SoA-control-link fields are still misnamed and get silently dropped. This is a real
    contract-level mismatch between the two agents' independent builds, not a typo — left for Brian /
    whoever owns `schemas.js` next, with the exact field mapping in `RISKS-AND-BOUNDARIES.md`.
  - **FSA Gate Check re-run against the finished, integrated product** (not the backend or UI evaluated in
    isolation) — see the dated gate summary logged during this session for the honest per-gate result.


## 2026-06-17 — Initial tool build

- Built `ISO42001-Readiness-GapCheck-Tool.html`: a self-contained, single-file readiness/gap-check tool
  covering AIMS Clauses 4–10 and a representative Annex A control set, with 0/1/2 (Absent/Partial/
  Established) maturity scoring, a live overall-readiness meter, per-section progress badges, a
  "Generate gap report" function producing a ranked table of Gaps and Partials with recommended actions,
  and print/PDF support. No external dependencies, no network calls, no data storage.
- Authored `KIT-CONTENTS.md`: the full product definition — SKU ladder (Starter / Full Kit / Full Kit +
  Gap-Check / Monitored) and the 24-item deliverable set (23 documents + the tool).
- Logged open decisions and hard-limit items in `NEEDS-FROM-BRIAN.md` and `BUILD-NOTES.md`, including the
  branding decision (Conform-Edge vs. Annex Quality), pricing confirmation, a licensed standard reference
  for accurate authoring, and EU AI Act / NIST AI RMF fact confirmation.

## 2026-07-10 — Documents 1–23 authored; packaging completed; branding finalized; factual correction

- **Branding decision finalized: Conform-Edge Quality Consulting LLC.** Per
  `_Brand\Conform-Edge\BRAND-STANDARD.md`, document-generation/compliance-tooling products are always
  Conform-Edge's business line. Updated the HTML tool's `<title>` (now "ISO/IEC 42001 AIMS Readiness &
  Gap-Check Tool — Conform-Edge"), added the required meta author tag and proprietary-source comment
  banner, and replaced the footer's prior "Conform-Edge / Annex Quality" dual-brand line with the
  standard Conform-Edge copyright/trademark/advisory-disclaimer block. Updated `KIT-CONTENTS.md`,
  `README.md`, and `NEEDS-FROM-BRIAN.md` to record the decision as final and closed.
- **Corrected a factual error in `EVOLUTION-REPORT.md`.** The report previously claimed the gap-check
  tool has "45 questions." Re-counting directly from the tool's `MODEL` array confirms **33 questions
  across 8 sections**: Clause 4 (4), Clause 5 (3), Clause 6 (4), Clause 7 (4), Clause 8 (4), Clause 9
  (3), Clause 10 (2), Annex A (9). `EVOLUTION-REPORT.md` and `UI-TEST-PLAN.md` now state the verified
  count.
- **Documents 1–23 authored** into the `Documents\` subfolder, completing the document set described in
  `KIT-CONTENTS.md` (Tier 1 core management-system documents, Tier 2 planning & risk, Tier 3 support &
  operation, Tier 4 performance & improvement, and the two cross-framework bridge documents). Exact
  per-document status and any authoring notes are tracked in `KIT-CONTENTS.md` and within the
  `Documents\` subfolder itself — refer there for the authoritative list rather than duplicating it here.
- **Packaging set completed**, adding the launch-readiness documents that were previously missing from
  this folder: `GITHUB-READY.md`, `RAILWAY-DEPLOYMENT.md`, `UI-TEST-PLAN.md`, `sample-output.md`,
  `customer-facing-copy.md`, `RISKS-AND-BOUNDARIES.md`, `RELEASE-NOTES.md` (this file),
  `GETTING-STARTED.md`, and `.gitignore`.
- **Known remaining open items** (see `NEEDS-FROM-BRIAN.md` and `RISKS-AND-BOUNDARIES.md` for detail):
  pricing confirmation, a licensed ISO/IEC 42001:2023 reference copy for standard-text verification of
  the 23 documents and the tool's Annex A coverage, current EU AI Act obligation/date confirmation, and
  storefront/payment platform setup (Brian's action).

---
© 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
ISO/IEC 42001 AIMS-in-a-Box is proprietary software of Conform-Edge Quality Consulting LLC
(Idaho LLC No. 6463380), Pocatello, Idaho, USA. Unauthorized reproduction, distribution, modification,
or resale is prohibited. "Conform-Edge" and the Conform-Edge mark are trademarks of Conform-Edge Quality
Consulting LLC. Advisory documentation aid — does not certify compliance and does not replace the
judgment of the user's organization or top management.
