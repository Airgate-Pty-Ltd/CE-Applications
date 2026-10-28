# Design Notes — AIMS Command Center (`app\`)

Written 2026-07-12, per the Future Systems Architect skill's required output format, for the
deterministic-assistance fix that closed the G3 gate failure ("human role is 100% manual data entry
with no deterministic assistance"). See `RISKS-AND-BOUNDARIES.md` sections 7, 7b, and 7c for the full
technical mapping this note summarizes.

## Problem eliminated

Three genuinely mechanical data-entry steps were being performed by hand, with no assistance, even
though each one is fully deterministic and requires no judgment:

1. Computing a Risk's `score` from its `likelihood` and `impact` (pure arithmetic).
2. Computing a Competence record's `competence_review_due_date` from `last_review_date` (fixed +365-day
   offset, per the original build spec).
3. Looking up which SoA control reference a new Risk Treatment probably relates to, when that reference
   is already stated in the linked risk's own description text.

None of these require judgment, domain expertise, or inference beyond arithmetic and literal text
matching — which is exactly why they were legitimate targets for elimination, unlike (say) deciding
whether a risk treatment is *adequate*, which correctly remains a human judgment call.

## AI operating layer

There is no AI-model or LLM layer here, and none was added — that would violate the M-AI Kernel's
non-negotiable Design Law 1 (no LLM, ever). All three fixes are plain deterministic backend/frontend
logic:

- `risk_register.score = likelihood x impact`, recomputed unconditionally on every write
  (`app\src\routes\risks.js`, `deriveOnWrite`).
- `competence_records.competence_review_due_date = last_review_date + 365 days`, recomputed
  unconditionally on every write (`app\src\routes\competence.js`, `deriveOnWrite`).
- `soaControlRef` suggestion = "does the linked risk's `description` string contain an existing SoA
  `controlRef` string, verbatim?" — a single `String.indexOf` substring check
  (`app\src\ui\app-views.js`, `computeSoaSuggestion`). No model, no scoring, no probability — either the
  substring is there or it isn't, and if it isn't, the field is left blank.

Both `computed: true` fields are additionally locked server-side: `apiBodyToDb`
(`app\src\routes\record-router-factory.js`) skips any field flagged `computed`, so even a direct API
call attempting to set `score` or `competenceReviewDueDate` is silently ignored and the derived value
wins. This was verified live: POST/PUT with a deliberately wrong `score`/`competenceReviewDueDate` value,
then GET the record back and confirm the correct computed value persisted, not the injected one.

## Human role

Unchanged in kind, narrowed in scope to genuine judgment calls:

- For Risks: the human still assesses and enters `likelihood` and `impact` (real judgment calls about
  the risk). They no longer type a `score` — it is display-only, computed and shown to them.
- For Competence: the human still performs and records the actual competence review
  (`last_review_date`). They no longer type a due date — it is display-only, computed and shown to them,
  which also removes a class of human error (a reviewer typing a due date that doesn't actually match
  the +365-day policy).
- For Risk Treatments: the human still decides the treatment description, owner, target date, and
  status, and still has final say over the SoA control link — the suggestion only pre-fills an empty
  field and is always overridable/editable before saving. If no deterministic signal exists, the field
  stays blank and the human decides, same as before.

## Knowledge graph position

This sits in the **Risk Register -> Risk Treatments -> Statement of Applicability** linkage triangle
that the M-AI Kernel's SOA-001 rule already depends on (`soa_control_ref` matching between
`risk_treatments` and `soa_entries`). The auto-suggestion doesn't change that graph — it only makes one
edge (Treatment -> SoA control) easier to populate correctly the first time, which matters because
SOA-001 fires indefinitely on any SoA entry with no correctly-linked treatment, with no other UI signal
explaining why. Reducing typos/omissions in `soaControlRef` entry directly reduces false-positive
SOA-001 conditions.

## Comparison test

Per the FSA gate's own required test — identify the limitation of a comparable product, then eliminate
it in this design: generic GRC/risk-register tools (e.g. spreadsheet-based risk registers, or GRC
platforms with free-text risk-scoring fields) let a user type any number into a "risk score" field
independent of the likelihood/impact they also entered, so the two can silently drift out of sync (a
risk shown as "score: 4" while its own likelihood x impact really equals 20). This design eliminates that
specific failure mode structurally: the score field doesn't exist as user input at all, so drift between
the inputs and the displayed score is not possible by construction, not merely discouraged by policy.

## Gate check result

FSA Gate G3 ("Deterministic assistance / human role is not 100% manual entry"): **now passes.** Three
real, load-bearing manual-entry eliminations exist, are server-enforced (not just UI-suggested) where
correctness matters (score, due date), and are verified live against the running app, not just asserted.
See the full FSA Gate Check re-run in `../RISKS-AND-BOUNDARIES.md`'s companion assessment and the
handoff/verification output for this pass for the complete gate table.
