# Build Specification
## Part 145 Training Records Compliance Audit Tool

**Date:** 2026-08-18 | **FSA Gate:** PROCEED | **M-AI Gate:** ARCHITECTURE DEFINED

## Functional Requirements

| ID | Requirement |
|----|------------|
| FR-1 | Mode 1: 20 scored questions covering §145.163 and AC 145-10 training program requirements |
| FR-2 | Mode 2: Technician record spot-check worksheet; add/remove technicians; 8 record types; Hazmat supports N/A |
| FR-3 | 5 Critical requirements (1,2,3,5,10); score 0 on critical = Critical priority |
| FR-4 | Tab navigation between Mode 1 and Mode 2 |
| FR-5 | Live compliance meter on program assessment |
| FR-6 | Combined results: program gap report + technician record gap table |
| FR-7 | Verdict: NOT COMPLIANT / COMPLIANT / CONDITIONAL / IN PROGRESS |
| FR-8 | MR narrative with top-5 program gaps + technician gap summary |
| FR-9 | JSON export includes program scores + technician record data |
| FR-10 | M-AI reserved interface: `window.PART145TR_MAI_INTERFACE` with `getTechs()` method |
| FR-11 | Zero external dependencies; single HTML file; VERA design system |

## Acceptance Tests

| ID | Test | Pass Criteria |
|----|------|--------------|
| AT-01 | All 20 = 2 | 100%, 0 crits, 0 majs, COMPLIANT |
| AT-02 | All 20 = 0 | 0%, 5 crits, 15 majs, NOT COMPLIANT |
| AT-03 | 5 crits=0, rest=2 | 75%, 5 crits, 0 majs, NOT COMPLIANT |
| AT-04a-c | Verdict boundaries | COMPLIANT / CONDITIONAL / IN PROGRESS |
| AT-05 | Technician pct with N/A | 6 complete of 7 applicable = 86% (correct) |
| AT-06 | Section/critical count | 20 requirements, 5 critical |
| AT-07 | M-AI interface | window.PART145TR_MAI_INTERFACE; getAnswers() + getTechs(); lastResults populated post-results |
