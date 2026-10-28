# M-AI Product Integration Profile — CAPA Effectiveness Verification Planner
**Date:** 2026-08-23
**Integration Gate Decision:** ARCHITECTURE DEFINED — Kernel wiring pending platform host

---

## Purpose Statement
M-AI purpose: observe CAPA context inputs (finding severity, root cause, CA type, escape status); issue governed verification pathway decisions (CRITICAL / MAJOR / MINOR protocol); advise on evidence specificity and timeline adequacy; flag high-risk CAPA closures that lack sufficient verification design.

## Domain ID
`domain:capa-effectiveness`

## Entity Registry (domain pack)
- `corrective-action` (session entity: id, finding-type, severity, root-cause, ca-type, escape-flag)
- `verification-plan` (outcome: method-set, timeline, evidence-list, pathway)
- `evidence-gap` (event: required evidence type not populated)
- `high-risk-closure-flag` (event: escape or safety concern without CRITICAL pathway selected)

## Governed Decisions (local, Kernel-shaped)
| Decision | Signal | Trigger |
|----------|--------|---------|
| Verification pathway | BLOCK/HOLD/PROCEED | Escape→CRITICAL required; if MINOR pathway for escape = HOLD |
| Evidence adequacy | ADVISE | Evidence checklist completeness |
| Timeline adequacy | ADVISE | CRITICAL CA > 30d = flag; MAJOR > 90d = flag |
| Completeness gate | HOLD | Required fields empty before plan generated |

## Kernel Dependency Status
- `@mai/kernel` runtime: **RESERVED INTERFACE** — static offline HTML
- Local governed logic: deterministic rule tables (severity→pathway; CA-type→methods+evidence)
- Domain pack: designed; not registered in Kernel-MASTER

## M-AI Role
Escape/safety override is the critical governed decision — enforces CRITICAL pathway regardless of user's severity input if escape flag is set. On platform promotion, this becomes a BLOCK-class governed decision in the Kernel.

## Interface Marker
`window.__MAI_RESERVED = { domain: 'capa-effectiveness', version: '1.0', kernelStatus: 'RESERVED_INTERFACE' };`

## Risks
1. Thresholds (30/60-90/90-180 days) are inferred from Brian's audit experience — confirm before publishing
2. Evidence list completeness depends on Brian review of each CA-type row
