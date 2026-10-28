# Build Notes — AS9110C MRO QMS Self-Assessment HTML Tool
**Built:** 2026-06-30 (unattended Desktop scan)
**File:** `as9110c-mro-self-assessment.html`

## What Was Built
Self-contained, offline HTML self-assessment tool. 35 questions across 6 AS9110C clause areas. No backend, no login, no data transmission. Scores responses and generates a prioritized gap report with remediation guidance.

## Questions Coverage

| Section | Clauses | Questions |
|---|---|---|
| Context, Leadership & Commitment | 4–5 | 5 |
| Planning, Risk & Objectives | 6 | 4 |
| Support: People, Tooling & Documentation | 7 | 6 |
| MRO Operations — Core Requirements | 8 | 12 |
| Performance Evaluation & Management Review | 9 | 4 |
| Improvement, NC & Corrective Action | 10 | 4 |

## MRO-Specific Tags
Questions marked `[MRO]` cover AS9110C requirements beyond ISO 9001 base:
- Certifying staff authorization (§7.2)
- Return-to-Service control (§8.5.1.3)
- Shift/Task handover procedure (§8.5.1.4)
- Work transfer control (§8.5.1.2)
- Airworthiness Directive compliance tracking (§8.5.1)
- Suspected Unapproved Parts process (§8.1.2.4)
- Product safety process (§8.1.3)
- Calibration traceability at point of use (§7.1.5.1)

## Scoring Logic
- 0 = Not Implemented | 1 = Partially Implemented | 2 = Fully Implemented
- Score < 50%: Critical Gaps (Red)
- Score 50–74%: Developing (Amber)
- Score ≥ 75%: Conforming (Green)
- Minimum 60% of questions must be answered to generate report

## Template Used
Pattern adapted from:
- `builds/2026-06-29-as9100d-self-assessment/as9100d-self-assessment.html`
- `builds/2026-06-22-mdsap-self-assessment/`

## Next Actions for Brian
1. Open the HTML in Chrome and run a test assessment
2. Review MRO-specific question accuracy against your AS9110C lead auditor knowledge
3. Adjust any question wording that feels off
4. Create Gumroad product at $149 individual / $299 org
5. Consider $249 bundle with AS9100D tool (both tools for one price)
6. Draft LinkedIn post: "Are you AS9110C certified? New MRO QMS self-assessment tool..."
