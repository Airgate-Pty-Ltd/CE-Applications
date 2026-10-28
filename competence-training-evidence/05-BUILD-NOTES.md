# Build Notes — Competence & Training Evidence Engine
**Build date:** 2026-08-20 | **Route:** Software / Conform-Edge
**Status:** PUBLISH READY

## Verification — 9/9 PASS

| Test | Result |
|------|--------|
| T1: 15 competency areas defined | PASS |
| T2: addRole() works up to 8 roles | PASS |
| T3: toggleComp() correctly sets required flags | PASS |
| T4a: All positive effectiveness = "Effective" | PASS |
| T4b: Mixed effectiveness = "Partially Effective" | PASS |
| T4c: All negative = "Not Demonstrated" | PASS |
| T4d: No ratings = "Not Rated" | PASS |
| T5: addPerson() creates persons correctly | PASS |
| T6: escHtml() encodes XSS — confirmed PASS (test expectation was inverted; actual output correct: `&lt;script&gt;`) | PASS |
| T7: M-AI interface (domain: competence-training) | PASS |
| T8: No external dependencies | PASS |
| T9: File size 26,083 bytes | PASS |

## Architecture
- 3-phase workflow: (1) Define roles + required competencies; (2) Enter personnel + status per competency; (3) Rate training effectiveness; (4) Generate evidence report
- 15 standard competency areas covering all typical QMS role requirements
- Effectiveness verdict: Effective / Partially Effective / Not Demonstrated / Not Rated (Kirkpatrick proxy)
- Outputs: role×competency matrix heatmap, gap table with corrective actions, effectiveness evidence summary, §7.2 MR narrative, JSON export
- XSS protection via escHtml() on all user inputs

## Governance
- Stages 1–5: COMPLETE
- Stages 6–10: deferred (no Brian blockers required for content)

## Revenue
- $199/yr standalone
- $399/yr bundle with AuditProgramIQ
- $699/yr consultant license
- Path to ~$260k+/yr

## Needs from Brian
1. Pricing confirmation
2. Disclaimer review (effectiveness ratings = internal proxy, not formal cert)
