# Audit Thread Walkthrough — traceability sampling into calibration control

**Where to run it:** prototype → toolbar **Guided audit thread** (or Home → New audit → Guided audit thread). Each "Run step" performs the same operations as the on-screen buttons and shows the auditor's reasoning. It ends with an NCR in **auditor review** so *you* make the approval decision. Headless equivalent: `tests/scenarios.test.js` ("guided audit thread").
**All data is synthetic.** Clause references are unverified demonstration content.

## Required elements and where they occur

| Required by directive §7 | Where |
|---|---|
| Multiple applicable obligations | 8.5.2 (identification and traceability) and 7.1.5.2(a) (calibration), resolved from scope (step 1) |
| Multiple verification activities | Reverse trace, interview, register review, usage trace, deviation-log search, procedure review, point-of-use observation, post-lapse certificate, cause interview |
| Several evidence items | 14+ evidence items by the end (EV-LOT-26-0419/-0431/-0438, EV-INT-STORES, four register records, EV-WO-88213-OP40, EV-DEV-LOG, EV-QP-7.1.5, EV-OBS-TW-0417-TAG, EV-CAL-TW-0417-B, EV-INT-CALCOORD) |
| Defined sample population | 6 shipped lots (population stated); 6 calibrated tools on the register |
| Recorded sample identifiers | `LOT-26-0419, LOT-26-0431, LOT-26-0438` via a **seeded** draw (seed recorded, reproducible; for the demonstration the seed was chosen so lot 0431 is included, and the narration says so); register sample `CAL-MIC-0211, CAL-CMM-0002, CAL-TW-0422, CAL-TW-0417` |
| At least one interview | Production-control lead (supports; alone insufficient); calibration coordinator (cause) |
| Documentary / transaction record | Traveler and material cert trace; work order tool log; calibration register and certificates; QP-7.1.5 Rev C |
| An actual observation | TW-0417 on the Line 3 tool cart with a stale due-date label and no out-of-service tag |
| A potential discrepancy | TW-0417 past due on the register (step 5–6), then used on 2026-09-17 (step 7); the system holds it as *potential* and refuses an NC |
| Alternative explanations investigated | Authorized extension? (deviation log) · grace period? (procedure §4.3) · status identification at point of use? (observation) · impact (post-lapse as-found within tolerance: reduces risk, does not cure) |
| Evidence-supported assessment | After the alternatives are evaluated the assessment moves from *potential* to *nonconformity supported*; the auditor records it |
| Conformity decision **and** NCR | 8.5.2 concluded **demonstrated**; 7.1.5.2(a) concluded **nonconformity** and a Should Be / As Found NCR is drawn |

## How a competent auditor investigates, as modelled

1. **Scope first.** Applicability comes from the organization's activities; each exclusion or inclusion has a stated reason. The prior finding is recorded as a lead, not evidence.
2. **Sample reproducibly.** The population is defined before sampling; the seed and population size are stored so the sample can be reproduced.
3. **Corroborate.** Statements (interview) support but never alone establish an aspect of a requirement.
4. **Follow the lead across processes.** The traveler for lot 0431 shows a tool; the same evidence item is linked to calibration (one record, not duplicated). The system suggests the follow-up; the auditor decides.
5. **A register entry is not a finding.** A past-due date matters only if the tool was used; the follow-up points at the usage record.
6. **Test the organization's side before concluding.** Extension, grace period, status identification: all evaluated; unexamined alternatives keep the finding at *potential*.
7. **Cite the exact paragraph.** 7.1.5.2(a); the parent clause, (b), (e) and non-existent clauses are each refused for different reasons.
8. **State the difference.** Should Be (paraphrase, attested against the licensed text), As Found (date, work order, tool, due date, evidence IDs), statement of nonconformity (requirement vs. verified condition), classification with rationale, then authorized-auditor approval.

## What it does not show
Multiple auditors, a real opening/closing meeting, evidence photographs, corrective-action follow-up, or a finding that is later withdrawn after issuance. The follow-up suggestions are rule-based (engineering stub). The organization's responses are preset synthetic data; real audits surprise.
