# Risks & Boundaries — ISO/IEC 42001 AIMS-in-a-Box

This document states, plainly, what this product is and is not, and what still needs verification
before it is represented as complete or authoritative in any sales, marketing, or delivery context. It
exists so that nobody — Brian, a future employee, a buyer, or an auditor — mistakes this kit for
something it isn't.

## 1. This is advisory documentation, not certification

Nothing in this kit — not the gap-check tool, not any of the 23 authored documents, not the Statement of
Applicability — certifies an organization's compliance with ISO/IEC 42001:2023. Certification can only be
granted by an accredited, independent certification body performing an actual audit of the organization's
implemented management system. This kit is a starting point for building that management system and
assembling the evidence a certification audit would look for. Any marketing copy, sales conversation, or
document footer must preserve this distinction — the footer block already carries language to this
effect ("Advisory documentation aid — does not certify compliance..."), and that language must not be
removed or softened in any derivative material.

## 2. The 23 authored documents are intent-based, not verbatim-standard, and need verification

The document set (see `KIT-CONTENTS.md`) was authored to convey the **intent** of each ISO/IEC 42001
clause and Annex A control in plain language, deliberately avoiding reproduction of the standard's actual
copyrighted text. This has two consequences that must be tracked before sale:

- **Standard-text verification:** every document's clause/control references, numbering, and described
  intent should be checked against a licensed copy of the current published ISO/IEC 42001:2023 before the
  kit is represented as complete or accurate. This has not yet been done as of this writing — see
  `NEEDS-FROM-BRIAN.md` item 3 ("a licensed copy of ISO/IEC 42001:2023 so the documents can be authored
  accurately"). Until that verification pass happens, treat clause numbering and control descriptions as
  best-effort, not authoritative.
- **No standard text was copied.** This protects against copyright infringement, but it also means a
  buyer should not assume any document quotes the standard — they convey intent and provide an editable
  starting structure, not a substitute for reading the standard itself.

## 3. Annex A control coverage was built from general knowledge, not confirmed against the current text

The gap-check tool's Annex A section (`A.2` through `A.10` in the tool's `MODEL` array) represents a
**representative set** of AI controls built from general familiarity with ISO/IEC 42001's control
structure — not from a control-by-control transcription against the currently published standard. Before
this tool or the accompanying Statement of Applicability document is sold as a complete/accurate control
map:

- Confirm the actual Annex A control numbering, count, and titles against the current published ISO/IEC
  42001:2023 text.
- Confirm whether any controls have been added, removed, or renumbered since the standard's original
  January 2024 publication (standards do occasionally get corrigenda or amendments).
- Update the tool's `MODEL` array and the Statement of Applicability document to match, and note the
  verification date in `RELEASE-NOTES.md` when done.

Until this confirmation happens, any marketing claim of "complete Annex A coverage" should be qualified
as "representative" — which is the language already used in the tool's own section header ("Annex A — AI
controls (representative set)").

## 4. No live regulatory monitoring

This kit is a point-in-time authoring effort. It does not include:

- Any automated tracking of ISO/IEC 42001 amendments, corrigenda, or future revisions.
- Any automated tracking of EU AI Act phase-in dates, obligations, or enforcement guidance changes.
- Any automated tracking of other AI-governance regulation (US state AI laws, sector-specific AI
  guidance, etc.).

Any cross-framework claims (e.g., "this kit helps with EU AI Act compliance") must be re-verified against
current official sources immediately before publishing — dates and obligations mentioned in
`EVOLUTION-REPORT.md` or `BUILD-NOTES.md` were not independently confirmed via live web research at
authoring time (an unattended/offline authoring constraint noted in `BUILD-NOTES.md`) and must not be
repeated in customer-facing copy without that check.

## 5. Pricing and market claims are proposals, not validated figures

The SKU prices in `KIT-CONTENTS.md` and the revenue projections in `EVOLUTION-REPORT.md` are internal
proposals derived from a market-sizing exercise, not from actual sales data, competitor pricing research,
or a conducted willingness-to-pay study. Treat all dollar figures as planning inputs pending Brian's
review and confirmation (see `NEEDS-FROM-BRIAN.md` item 2).

## 6. What buyers should independently confirm

To set correct expectations in any customer-facing material, buyers should understand that:

- They will need to tailor every bracketed placeholder (`[Organization Name]`, `[AI System]`, etc.) —
  the documents are structural starting points, not turnkey artifacts.
- They are responsible for their own legal/compliance review of the tailored documents before relying on
  them for a real audit or customer questionnaire response.
- The gap-check tool's scoring is a self-assessment aid; it does not replace a qualified internal or
  external audit.

## 7. (Resolved 2026-07-12) The AIMS Command Center app (`app\`) — field-name mismatch, FIXED

**Status: RESOLVED.** The 2026-07-11 integration pass found and documented this defect but left it
unresolved; this 2026-07-12 pass fixed it and re-verified end to end against the running app (not just by
reading code). What follows is kept for the historical record and so anyone reviewing this file
understands exactly what changed and why.

**Original defect:** the UI's record-create/edit forms (`app\src\ui\schemas.js`) were built against a
documented, assumed API contract before the real backend existed. The real backend (`app\src\routes\*.js`)
used different field names for 6 of the 7 registers, and several UI fields had no backing database column
at all. Verified live on 2026-07-11:

```
POST /api/soa   with the UI's own form fields -> 400 {"missing":["controlRef","applicability"]}
POST /api/risks with the UI's own form fields -> 400 {"missing":["riskRef"]}
```

**Fix applied (2026-07-12):** `app\src\ui\schemas.js` was rewritten field-by-field against the real
`FIELDS` arrays in `app\src\routes\*.js` and the CHECK constraints in `app\src\db\schema.sql` (not just
the earlier documented contract). Full before/after mapping:

| Register | UI sent (wrong, pre-fix) | API/DB actually needs (now used) | Notes |
|---|---|---|---|
| SoA | `controlId`, `applicable`, `implementationStatus`, `reviewDate`, `evidenceRef` | `controlRef`, `applicability` (`applicable`/`not_applicable` only), `status` | `reviewDate`/`evidenceRef` had no DB column — removed, not renamed |
| Risks | `title`, `category` (no `riskRef` field existed) | `riskRef`, `description` (as title text) | `category` had no DB column — removed. `score` is now computed server-side, never a form field (see section 7b) |
| Treatments | `linkedRiskId`, `controlRef`, `dueDate`; status options `planned/in_progress/complete/verified` | `riskId`, `soaControlRef`, `targetDate`; status DB-constrained to `open`/`closed` only | The old status options would have thrown a SQLite CHECK-constraint error on save — not just a naming issue |
| Objectives | `statement`, `metric`, `target`, `current` | `objectiveText`, `measurableTarget` | `metric`/`target`/`current` had no DB column — removed |
| Audits | `auditRef`, `owner`, `dueDate`; severity options incl. `observation` | `findingRef`; severity DB-constrained to `major`/`minor` only | `owner`/`dueDate` had no DB column — removed. `observation` would have thrown a CHECK-constraint error |
| NCRs | `title`, `source`, `severity`, `owner`; no `dueDate`/`linkedFindingId` field; status options incl. `investigating`/`corrective_action` | `ncrRef`, `description`, `correctiveAction`, `dueDate`, `linkedFindingId`; status DB-constrained to `open`/`closed` only | `title`/`source`/`severity`/`owner` had no DB column — removed. Added the previously-missing `linkedFindingId` field (needed for the AUDIT-001 rule's linkage) |
| Competence | `lastAssessed`, `competenceArea`, `requiredLevel`, `currentLevel`, `evidenceRef` | `lastReviewDate`; `competenceReviewDueDate` computed, read-only | The four unsupported fields had no DB column — removed. Due date is never user-entered (see section 7b) |

**Re-verified live, 2026-07-12** (not just by inspection): started the app with the documented `DB_PATH`
local-disk workaround, then POSTed a realistic payload built from the corrected schema field names to all
7 `/api/<type>` create endpoints — all returned `201` with the record persisted (confirmed by a follow-up
`GET`). PUT-updated 2+ existing records (SoA owner field; Risk likelihood, which also proved the score
recomputation in section 7b) and confirmed by `GET` that the edit actually saved — the exact "PUT returns
200 but silently doesn't save" failure mode the 2026-07-11 pass warned about. Also confirmed the
Treatments risk-link (`riskId`) and SoA-control-link (`soaControlRef`) fields both round-trip correctly
(neither is silently dropped), and that the NCR-to-finding link (`linkedFindingId`) round-trips as well.
The full acceptance suite (`tests/acceptance.test.js`, 16 tests) plus `tests/smoke.test.js` (3 tests) —
19/19 — still pass after these changes (`npm test`).

## 7b. (Added 2026-07-12) Fields made read-only / auto-computed (FSA G3 fix)

The prior integration pass left the human role at 100% manual data entry with no deterministic
assistance — an FSA G3 gate failure. The M-AI Kernel itself remains deliberately rules-only (no LLM, no
AI-model call anywhere — that would violate the kernel's non-negotiable core design law), but plain
deterministic backend logic now eliminates several genuinely mechanical data-entry steps:

- **`risk_register.score`** (`app\src\routes\risks.js`): now computed server-side, unconditionally, as
  `likelihood x impact` on every create AND update. It is marked `computed: true` in the route's `FIELDS`
  array, which (see `app\src\routes\record-router-factory.js` `apiBodyToDb`) means a client-supplied
  `score` value in the request body is silently ignored — verified live by POSTing/PUTting a bogus
  `score` value and confirming the GET-back still shows the correct computed value. The UI form
  (`schemas.js`) never exposed a `score` input field; the user only ever enters likelihood and impact,
  and the record list/detail views display the server's authoritative computed value.
- **`competence_records.competence_review_due_date`** (`app\src\routes\competence.js`): now computed
  server-side, unconditionally, as `last_review_date + 365 days` on every create AND update (previously
  it only computed when not already present, which meant a client could still set an arbitrary value).
  Also marked `computed: true` so a client-supplied value is silently ignored — verified live the same
  way. The UI now shows this field read-only in both the Competence table and detail view (label
  "Review Due (auto)" / "Review Due (auto-computed)") and it is not a form field.
- **Risk Treatment `soaControlRef` deterministic auto-suggestion** (`app\src\ui\app-views.js`,
  `attachTreatmentSoaSuggestion` / `computeSoaSuggestion`): when creating a treatment, once the user
  identifies the linked risk, the UI does a simple, fully deterministic substring match — does the
  linked risk's own description text literally contain an existing SoA `control_ref` string? — and, if
  so, pre-fills (never overwrites) the SoA Control Reference field. No LLM, no inference beyond a
  literal substring check; if there's no clean signal, the field is left blank rather than guessed.
- **IDs and timestamps**: `id`, `createdAt`, and `updatedAt` were already exclusively system-generated
  across all 7 registers (never listed in any route's `FIELDS` array, so never client-settable) — this
  was verified true, not newly fixed, across all 7 `app\src\routes\*.js` files.

See `app\DESIGN-NOTES.md` for the FSA-required Problem/AI-layer/Human-role/Knowledge-graph/Comparison-test
write-up for this fix.

## 7c. (Added 2026-07-12) Continuity indicator made real (FSA G5 fix)

The prior FSA pass failed G5 ("resembles existing GRC platforms") because the product's real
differentiator — continuous, event-driven evaluation instead of a periodic/point-in-time compliance
questionnaire (the pattern used by ServiceNow GRC, LogicGate, and Vanta) — was asserted in documents but
not made visible in the product itself. The Overview screen (`app\src\ui\app-views.js`,
`loadContinuityInfo` / the `.continuity-banner` block in `renderOverview`) now shows a "Continuously
monitored since [earliest real event timestamp]" indicator, built from real `GET /api/events` data (which
itself reads directly from `mai_events`, the same hash-chained, restart-surviving audit trail proven by
AT-16) — not a decorative or hardcoded string. Verified live: `curl "http://localhost:3100/api/events?limit=200"`
returned real timestamped rows and the earliest timestamp in that set was confirmed by direct computation
during this pass.

## 8. Summary boundary statement (safe to reuse in customer copy)

> This kit accelerates building your AI management system — it does not certify you, does not
> substitute for legal review, and does not replace an accredited certification audit. Verify all
> standard-specific references against the current published ISO/IEC 42001:2023 text as part of your own
> implementation.

---
© 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
ISO/IEC 42001 AIMS-in-a-Box is proprietary software of Conform-Edge Quality Consulting LLC
(Idaho LLC No. 6463380), Pocatello, Idaho, USA. Unauthorized reproduction, distribution, modification,
or resale is prohibited. "Conform-Edge" and the Conform-Edge mark are trademarks of Conform-Edge Quality
Consulting LLC. Advisory documentation aid — does not certify compliance and does not replace the
judgment of the user's organization or top management.
