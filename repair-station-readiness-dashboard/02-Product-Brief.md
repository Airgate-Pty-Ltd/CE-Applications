# Product Brief — Repair Station Readiness Dashboard v2.0
**Created:** 2026-07-07 (Product Evolution Engine — this file was claimed by the 2026-07-04 completion marker but had not been created)

## Vision
Repair stations should never manually check compliance. The system continuously understands posture, surfaces problems automatically, and recommends action before the manager thinks to ask.

## Product Definition
An alert-driven compliance intelligence tool for FAA Part 145 and EASA Part-145 repair stations. Instead of a dashboard the user visits, it produces prioritized alerts, each answering seven questions: what happened, why, what changed, why it matters, what needs attention, what to do next, and what happens if you don't.

## Scoring Model
| Dimension | Weight | Inputs |
|---|---|---|
| Regulatory Status | 35% | Surveillance recency, outstanding corrective-action count + aging, approval/renewal horizon, Form 8 oversight status (dual approvals) |
| QMS Maturity | 40% | AS9110C clause-8 readiness score, 145.163 training compliance (initial + recurrent), certifying/inspection staff authorization currency, handover proceduralization; SMS sub-score planned (MAG CHG 10 §20) |
| Supplier Quality Health | 25% | Supplier Scorecard v2.0 feed: average risk score, Red/Orange supplier count, defect trend |

Output: Green / Yellow / Orange / Red posture + ranked action list.

## Data Sources (honest v1.0 statement)
- User-supplied internal records (manual entry or CSV): corrective actions, training dates, staff authorizations.
- Public regulator records refreshed monthly with visible currency dates (FAA Dynamic Regulatory System and repair-station directory data; EASA Part-145 approvals list).
- **No live regulator API exists in v1.0.** Automated refresh is a v1.1 roadmap item. Earlier references to a "FAA AVRO API" / "EASA NANDO API" were incorrect and have been retired.

## Architecture
- v1.0: single self-contained HTML (`artifact/index-v2-fsa.html`), client-side only, no data leaves the browser.
- v1.1: M-AI Kernel (MAI-ARCH-001) as the governed alert-rules engine; localStorage persistence; monthly data-refresh pipeline.
- v1.2+: multi-station backend (Railway), role-based access.
- AI Architecture Requirement: local/deterministic first (Kernel rules; later Ollama/Qwen3 for narratives), provider abstraction, demo mode, no Anthropic/OpenAI dependency.

## Non-Goals (v1)
Work-order management, parts/inventory, airworthiness tracking, document control — adjacent categories served by MRO ERP; we integrate, not compete.

## Success Metrics
Activation (own-data posture score) < 10 min; trial→paid ≥ 10%; monthly churn < 5%; ≥ 60% of users print the management-review report monthly (the retention habit).
