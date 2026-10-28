# Owner Review Guide

## Section 1 — Corrected product: Audit Toolkit planning toolbox (`toolkit.html`) — review script

**Open:** double-click `Start-Prototype.cmd` (opens `http://127.0.0.1:8765/prototype/toolkit.html`) or open `prototype/dist/audit-toolkit-prototype.html`. Toolbar buttons are review aids. All data is synthetic; library content is a 5-obligation AI-drafted demonstration, **unverified and not releasable**. The earlier audit-record prototype is Section 2 (reference component).

| # | Directive demonstration | Where / how | What to look for |
|---|---|---|---|
| 1 | Select a standard and edition | **Checklist Library** → standard selector (10 intended packs) | Only AS9100D (Rev D 2016, demonstration, edition unverified) has content; the other nine say "Not authored" with edition/licence status |
| 2 | View the clause hierarchy | Library → AS9100D | Hierarchy tree with parent / authored (deep) / unclassified leaf states; completeness banner: **cannot be called complete** (27 leaves, 5 authored, 22 unclassified); reasons listed |
| 3 | Drill into a detailed, defensible checklist | Tap an authored leaf (e.g. 7.1.5.2(a)) | Interpretation, intent, expected control, applicability, verification activities, audit and interview questions, expected evidence, sampling, process relationships, risks, failure indicators, valid alternatives, alternative explanations, related requirements, provenance, verification/approval status (PENDING), content hash |
| 4 | Select processes and requirements | **Audit Planner** → *Load a worked example*, steps 2–3 | Processes from library; each obligation selected separately with applicability and reasons; excluded obligations cannot be planned |
| 5 | Build an audit plan | Steps 4–7 | Detailed checklist, agenda and duration estimate (labelled planning estimate), team with competence/independence checks (try assigning J. Okafor as lead), approval with accountable approver, plan pinned to the library pack, DEMONSTRATION marker |
| 6 | Create an audit program | **Audit Program** → *Load worked example* | Pinned to the library; seven coverage measures; policy panel marked UNVERIFIED; incomplete-pack caveat; overdue audit; risk-based schedule; revisions need reasons |
| 7 | Identify an uncovered requirement | Program → tile *Not yet covered* (7.2(c)) | Shown by identifier; *Add to a planned audit* closes it; justified N/A needs a real justification |
| 8 | Build a SCAR response | **SCAR Builder** → *Import SCAR* then *Load a worked, evidence-backed response* | Assertions separated from stated requirements; "Not ready" with itemised blockers; evidence-backed version is ready, and the response document labels planned work **Planned** and unverified causes **probable** |
| 9 | Construct a Should Be / As Found NCR | **NCR Builder** → *Import audit results* → pick the calibration conclusion | Should Be (attested), As Found, Statement of nonconformity; scheme selector (Major/Minor, Critical/Major/Minor, NC/Observation); 12 gates; incorrect citations refused; approval step; DEMONSTRATION banner |
| 10 | Test an auditor's competency from the verified checklist criteria | **Competency** | Nine items from library records; PRACTICE MODE banner; result never claims competence; the NCR item is scored by the real gates |
| 11 | Export or preview professional outputs | Planner step 7 (plan preview, checklist CSV, downloads, print); SCAR response document; Program effectiveness report | Documents carry the DEMONSTRATION marker and content pins |
| 12 | Show how the same record is consumed by Pocket Auditor | Library detail → *Same record, second consumer* | Field prompts/evidence/alternatives from the **same** record with identical pack and obligation hash; Pocket Auditor itself is not built here |
| + | Library update must not silently change anything | Dashboard → *Simulate library update (0.3.1)* | Banner: plan and program unchanged, affected obligations flagged for re-evaluation; revert to clear |

**Simulated or absent in this prototype:** all organizations, people, SCAR facts and imported results are synthetic; no real import formats; competency items are not expert-reviewed; coverage and duration rules are unverified planning rules; no signing; unencrypted browser storage; no authentication; no Pocket Auditor integration; no device or WebView test; accessibility not audited. Full list: `CODE-HANDOFF-PRODUCT-RESET-2026-10-11.md` §11.
**Browser evidence:** `tests/ui/toolkit-sweep.js` — 40 checks pass at 375 px and 900 px; headless 133 + library 11.

---
## Section 2 — Reference component: audit-record / field-execution reference (`index.html`)

**Purpose:** review the application as an auditor; accept or reject the prototype on your own observation. **Status:** *not yet independently accepted.* Open the prototype: double-click `Start-Prototype.cmd` (opens `http://127.0.0.1:8765/prototype/index.html`) or open `prototype/dist/audit-toolkit-prototype.html`. Use Home → New audit for a clean audit. Toolbar buttons (Phone / Tablet / Auto, Theme, Acceptance scenarios A–F, Guided audit thread, Reset all) are **review aids, not product UI**.

## Review script (about 40 minutes)
| # | Demonstrate | How | What to look for |
|---|---|---|---|
| 1 | **Guided 12-step audit thread** | Toolbar → *Guided audit thread* → *Run step 1…12* (each step opens where it happened and shows the auditor's reasoning). Stop at step 12 | Ends with an NCR in *auditor review* for **you** to approve. Seeded sample for lot 0431 is disclosed as a demonstration seed |
| 2 | **Exact requirement traceability** | Audit tab → any requirement card | Exact reference in the header (e.g. 7.1.5.2(a)); intent, objective, method; aspects; steps; expected evidence; common weaknesses; Reference index status shown as pending review |
| 3 | **Evidence selection and sufficiency** | Card → Sampling and *Other verification activities*; watch *What the requirement needs to show* and *Assessment* change | Each evidence item shows which aspect it supports/contradicts; interview alone → "Statement only"; below-minimum sample refused; same evidence linked to another requirement is not duplicated |
| 4 | **Scenario A** (conforming) | *Acceptance scenarios A–F* → A | "Demonstrated" only after three lots and corroboration; NC refused |
| 5 | **Scenario B** (potential NC held) | → B; open the review aid to resolve either way | Held in Findings, not a finding; NC refused; favourable resolution flags the held conclusion for review; adverse resolution still requires alternative checks |
| 6 | **Scenario C** (substantiated NC) | → C | Register alone is not a finding; follow-up leads to the work order; alternatives evaluated; NC then permitted |
| 7 | **Scenario D** (incorrect citation) | NCR builder → review aid *Try incorrect citations* | Parent, wrong paragraph, non-existent paragraph, non-existent clause: each refused with a different reason |
| 8 | **Scenario E** (alternative method) | → E | A missing "effectiveness form" does not create a finding; demonstrated through the MES gate; NC and NCR impossible |
| 9 | **Scenario F** (insufficient evidence) | → F | Neither demonstrated nor NC permitted; recorded as a limitation in the report |
| 10 | **Should Be / As Found NCR** | NCR builder | Exact citation; Should Be (paraphrase + attestation); As Found (date, record IDs); statement of nonconformity; classification; DEMONSTRATION banner |
| 11 | **NCR approval gates** | NCR builder → *Issuance checks* | 12 gates; submit disabled until 1–9, 11, 12 pass; approval is a separate step; return to draft / discard (with reason) |
| 12 | **Report traceability** | Report tab | Conclusions with samples (method, seed, population), NCR with edition and approver, held/limited items, discarded drafts, version stamps and record hash |
| 13 | **Phone and tablet** | Toolbar Phone / Tablet, or resize the window | Tab bar on phone, side rail on tablet; no horizontal scroll |
| 14 | **Persistence** | Reload the page; Home → switch audits | State and screen restored |

## Simulated or absent functionality (nothing here is production)
| Item | Status |
|---|---|
| Organization, people, records, interviews, dates, outcomes | **Synthetic and preset** (including the "simulate" review aids in scenario B) |
| Suggested Follow-Up | **Deterministic engineering stub. Not MAK; not intelligence.** |
| Requirement content | **5 demonstration obligations**; authored by AI-assisted draft; **not verified** against the licensed edition |
| Clause index | **Unverified sample** (only titles of 8.5.1.1–.3 owner-checked) |
| NCR issuance | **Demonstration mode only**; production mode blocks issuance (gate 11) |
| Storage | Browser `localStorage`, **unencrypted**, single browser; no sync |
| Users, authentication, roles | **Absent.** One synthetic auditor is author and approver |
| Attachments, camera, signatures, real PDF | **Absent** (print stylesheet only) |
| NCR withdrawal after issuance | **Absent** (designed) |
| Browser back button, deep links, concurrent tabs | **Absent** |
| Accessibility audit; real-device and Capacitor WebView testing | **Not done** |
| Offline | Works once loaded; no service worker or installable shell; not tested on a device |

## Defects and limitations preserved from testing
All items in `ACCEPTANCE-SWEEP-REPORT.md` §3–4 and `CODE-HANDOFF-UPDATE-2026-10-11.md` §5, plus: (a) a browser-only wiring defect (a required script not loaded) was found by the sweep on 2026-10-11 and fixed, with `tests/prototype-wiring.test.js` added; (b) a content defect (an alternative-explanation check with no action to perform it) was found by the depth tests and fixed.

## Recording acceptance
Record your decision, date and any rejected items in the Migration Decision Log and in `BLOCKING-DEPENDENCY-REGISTER.md` (BD-07). Until then the prototype is **not independently accepted**.
