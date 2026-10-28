# Build Governance Status — Pocket Auditor

| Field | Value |
|---|---|
| Product | Conform-Edge · Pocket Auditor |
| Slug | 2026-09-27-pocket-auditor |
| Brand | Conform-Edge (software). Not Annex Quality. Not Burrana. |
| Route | Commercial + Regulated Product (C+D) |
| Product root | `E:\Conform-Edge\ClaudeCowork\04 Product Portfolio\_Opportunity-Scans\Builds\2026-09-27-pocket-auditor\` |
| Discovery source root (read-only) | `E:\Conform-Edge\ClaudeCowork\` |
| Current stage | STAGE 4 complete. BUILD BASELINE LOCKED. Ready for STAGE 5 (Build) as a prototype. |
| Baseline ID | PA-BASELINE-001 |
| Locked | 2026-09-27, by Brian R. Olea's decisions in session (recorded below) |

## Stage decisions

| Stage | Artifact | Decision |
|---|---|---|
| 0 Opportunity intake | This file | PROCEED. No duplicate active build found under `Builds\`. Existing asset is the `conform-edge-pocket-auditor` skill only. |
| 1 Discovery | `01-DISCOVERY-RECORD.md` | PROCEED_WITH_RECORDED_ASSUMPTIONS (assumptions listed in 01 §9) |
| 2 FSA BUILD | `02-FSA-DESIGN-NOTES.md` | PASS (8 of 8 gates, design stage) |
| 3 M-AI Symbiotic | `03-M-AI-PRODUCT-INTEGRATION-PROFILE.md` | ARCHITECTURE DEFINED — RESERVED INTERFACE for on-device evaluation and learning. Server-side evaluation INTEGRATION AUTHORIZED for prototype; DIM rules PA-001..PA-010 / PA-101..PA-106 and AP-PA-REPORT-HOLD are DRAFT (not loaded in production) until Brian approves them. |
| 4 Build spec | `04`–`07` | PROTOTYPE BUILD AUTHORIZED: **YES**. PRODUCTION BUILD AUTHORIZED: **NO**. |
| 5–10 | Claude Code produces `08`–`12` | Not started |

Independent review (separate agent, 2026-09-27): 7 high, 13 medium, 5 low items raised; all high and medium items resolved in this baseline (HOLD via kernel GovernedDecision, sidecar contract and write ownership, namespaced events, audit and finding state machines, derived-field specification, converter hierarchy/splitting fixes, schema version columns, shared-library isolation, 3a/3b authority, IC-002 response taxonomy, K.2 control).

## Locked decisions (baseline PA-BASELINE-001)

Change to any line below requires a Decision Log entry (01 §10) and Brian's approval before code changes.

| ID | Decision | Source |
|---|---|---|
| LD-01 | V1 is **standalone + CE-QMS ready**: its own server ("Pocket Auditor Cloud") built to the CE-QMS Next contracts, so it later syncs to a CE-QMS Next host without redesign. | Brian, 2026-09-27 |
| LD-02 | Mobile/tablet/web client: **Ionic React + Capacitor + TypeScript**, one codebase for Android, iOS and browser. | Brian delegated; selected in session |
| LD-03 | Server: **PHP / Laravel** host, **PostgreSQL** database. | CE-QMS Next ADR-001, ADR-002 |
| LD-04 | M-AI: canonical `@mai/kernel` runs as a **Node/TypeScript sidecar** next to the Laravel host. No port, no fork, no copy of Core. | ADR-001, ADR-005, mai-kernel-integration law 12 |
| LD-05 | Semantic intent review uses the **JudgmentProvider contract** (VERA default). Never called directly from client. Offline = `PENDING_JUDGMENT`. | ADR-006, IC-003 |
| LD-06 | Requirement storage = **Requirement Graph, closure-table schema** in PostgreSQL. | ADR-008 + PPD-002 |
| LD-07 | Authority model **A0–A3** enforced in host middleware. Field actions are A0 locally, A2 on sync, finding classification A3 (human). | ADR-009, Authority Matrix §3.5 |
| LD-08 | Development on Brian's E: PC (PostgreSQL 16 in `E:\Conform-Edge\Runtime\pg16-data`). Production hosting on Railway. | Brian, 2026-09-27 |
| LD-09 | Scope authorized now: **prototype**. Nothing sold, published to app stores, or used for a real client audit until production authorization. | Brian, 2026-09-27 |
| LD-11 | Prototype proceeds under the CE-QMS Next Constitution while it is DRAFT (PAD-010). Production requires Constitution approval (N-07). | Brian, 2026-09-27 |
| LD-10 | No standard text ships in the product. Library content = clause number, title, Conform-Edge-authored intent and evidence expectations. Customer-uploaded standards stay private to that customer's organization. | Brian's standing rule; 01 §4 |

## Location audit

```
BUILD ROOT:        E:\Conform-Edge\ClaudeCowork\04 Product Portfolio\_Opportunity-Scans\Builds
PRODUCT ROOT:      ...\Builds\2026-09-27-pocket-auditor
ALLOWED WRITES:    PRODUCT ROOT and below only
PROHIBITED WRITES: M-AI-Kernel folder, _Skills, any other Builds\<slug>, CE-QMS repos, Burrana folders
```

## Open blockers to production (not blocking prototype)

See `13-NEEDS-FROM-BRIAN.md`.
