# Build Specification
## EASA Form 8 Self-Prep Assessment Tool

**Date:** 2026-08-18 | **FSA Gate:** PROCEED | **M-AI Gate:** ARCHITECTURE DEFINED

## Functional Requirements

| ID | Requirement |
|----|------------|
| FR-1 | 22 sections mirroring MAG CHG 10 / EASA Form 8 structure; one scored question per section |
| FR-2 | Scoring: 0=Non-Compliant, 1=Partial, 2=Compliant |
| FR-3 | 9 Critical sections (1,2,3,4,5,7,8,13,16); score 0 on critical = Critical priority in gap report |
| FR-4 | EASA Delta sections visually distinguished (blue tint background, EASA DELTA tag) |
| FR-5 | Regulatory basis displayed per section |
| FR-6 | Live readiness meter updating on each answer |
| FR-7 | Gap report sorted Critical → Major → Minor; includes recommended action per gap |
| FR-8 | Verdict: NOT READY (any critical) / READY (≥85%, ≤1 major) / CONDITIONAL (≥70%, ≤3 major) / IN PROGRESS |
| FR-9 | MR narrative includes SMS status callout (new MAG CHG 10 §20 requirement) |
| FR-10 | JSON export with section scores, overall score, verdict, MAG revision reference |
| FR-11 | M-AI reserved interface: `window.FORM8_MAI_INTERFACE` |
| FR-12 | Zero external dependencies; single HTML file; VERA design system |

## Acceptance Tests

| ID | Test | Pass Criteria |
|----|------|--------------|
| AT-01 | All 22 = 2 | 100%, 0 crits, 0 majs, READY |
| AT-02 | All 22 = 0 | 0%, 9 crits, 13 majs, NOT READY |
| AT-03 | 9 crits=0, rest=2 | 59%, 9 crits, 0 majs, NOT READY |
| AT-04a-d | Verdict boundary conditions | NOT READY / READY / CONDITIONAL / IN PROGRESS per spec |
| AT-05 | Section count | 22 sections, 9 critical |
| AT-06 | JSON export | Downloads with section_scores for all 22, MAG revision, date |
| AT-07 | M-AI interface | `window.FORM8_MAI_INTERFACE` present at load; `lastResults` populated after results |
