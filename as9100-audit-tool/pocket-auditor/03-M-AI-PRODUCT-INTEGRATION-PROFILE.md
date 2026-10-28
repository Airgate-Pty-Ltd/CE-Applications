# 03 — M-AI Product Integration Profile: Pocket Auditor

Gate: mai-symbiotic-product-integration + mai-kernel-integration
Gate decision: **ARCHITECTURE DEFINED** overall; **INTEGRATION AUTHORIZED (prototype)** for server-side evaluation; rules in DRAFT until approved.

Kernel facts read directly from source on 2026-09-27 (`E:\...\Conform-Edge Software\M-AI\M-AI-Kernel\kernel\`): `package.json` = `@mai/kernel` `0.2.0-5f`, ESM, exports `evaluate`, `entity-ref`, `kernel-event`, `decision`, `outcome-persistence`, `types`; `src/decision.ts` defines decision states incl. `ADVISE`, `HOLD`, `PROCEED`, `AuthorityProfile` (strict schema), `GovernedDecision`, `applyHumanOverride`, `requestHostEnforcement`, and host-action patterns `hold:<name>`; `src/evaluate.ts` defines domain-neutral `KernelRule` with `consequence.decision`; source imports `node:crypto`/`node:fs` → Node runtime only. Re-verify against the pinned version at M0.

| # | Section | Content |
|---|---|---|
| 1 | Product | Conform-Edge · Pocket Auditor |
| 2 | Version | 0.1.0-prototype |
| 3 | Purpose statement | M-AI gives Pocket Auditor governed, replayable checks on audit integrity: that every finding is supported by evidence and cites requirements, that planned coverage and sampling were achieved, and that regulatory-authority requirements in scope were assessed before a report is issued. It detects these before the lead auditor does, records why, and never classifies findings or judges quality. |
| 4 | Domain ID | `pocket-audit` |
| 5 | Entity registry | `audit`, `audit_item`, `audit_finding`, `audit_evidence`, `audit_report` (EntityRef: type + id + organization_id) |
| 6 | Event registry | Namespaced per Constitution C.1 (`domain.entity.verb`), all under `audit.*` (IC-002 E.2): `audit.plan.locked`, `audit.item.assessed`, `audit.finding.created`, `audit.finding.updated`, `audit.evidence.attached`, `audit.closeout.requested`, `audit.report.issue_requested` (source_record = the audit), outcomes `audit.report.hold_applied`, `audit.report.hold_overridden`, `audit.report.issued`, and host-side `dim.determination.recorded`, `dim.human_response.recorded` (IC-002 E.3/E.4). All registered in the host event registry. Emitted by the host after sync acceptance or host edits, never by the device. |
| 7 | Observation model | Each event = host commit → snapshot (record + linked evidence IDs + requirement authority levels) → kernel `hashSnapshot` → `mai_events` row (real snapshot JSON + SHA-256) → evaluate. Actor = host user who synced/edited; envelope `occurred_at` = device capture time; `recorded_at` = host acceptance time. Classification: TELEMETRY (sync stats), OBSERVATION (all events above), EXPERIENCE (reserved, §15). |
| 8 | Evidence model | Required evidence per determination is listed on each rule (`requiredFields`). Missing field = rule fires (completeness). Evidence file integrity: SHA-256 captured on device, verified on upload; mismatch is its own condition (PA-010). UI shows the rule, fields evaluated, snapshot hash, and time for every condition ("what evidence caused this state"). |
| 9 | Governed decisions | Record rules PA-001..PA-010 → `ADVISE`. Audit-level gate rules PA-101..PA-106 on `audit.closeout.requested` / `audit.report.issue_requested` → kernel `GovernedDecision` `HOLD` with `permittedHostAction = hold:report-issuance` under Authority Profile AP-PA-REPORT-HOLD. The host never computes the hold itself; it only executes a kernel HOLD. Scope covers findings, items and evidence of the audit. No `PROCEED`/`BLOCK` in V1. |
| 10 | Authority Profile | `mai/authority/AP-PA-REPORT-HOLD.json` in the kernel's strict `AuthorityProfile` schema (DRAFT: `approvedBy`/`effectiveDate` empty, so `validateAuthorityProfile` fails and HOLD cannot execute until approved). Permitted: ADVISE, HOLD. Override: Lead Auditor, A3, justification ≥ 30 characters. **Deliberate deviation:** Authority Matrix 5.3 makes overriding an intelligence result A2; overriding a report HOLD is set to A3 because report issuance itself is A3. Escalate when overridden twice on the same audit. |
| 11 | Host execution handlers | `holdReportIssuance(auditId, decisionId)`: verify permissions → verify profile revision/hash → verify target audit state = FINDING_RESOLUTION → verify decision not superseded → set `report_issue_blocked=true` + reason → record outcome event `audit_report.hold_applied`. `overrideReportHold(auditId, justification)` is a human A3 route, logged. |
| 12 | Escalation | Repeat override (2×) → notification to organization admin (A1). |
| 13 | Override | Human response on each condition is **A2** (Authority Matrix 5.3), logged in `activity_log`, note required for OVERRIDDEN/DISPUTED. Host taxonomy follows IC-002 E.4; mapped to kernel responses: ACCEPTED → `confirmed`, OVERRIDDEN → `dismissed_not_applicable`, DISPUTED → `dismissed_data_error`. Stored immutably on both sides. |
| 14 | Outcome model | `audit.report.issued` (with/without override), finding later contested/verified (from CE-QMS, future). |
| 15 | Experience model | FUTURE KERNEL CAPABILITY — INTERFACE RESERVED. Candidate experience: condition → override → later contested finding. Store outcome events now; do not build a learning loop. |
| 16 | Learning model | Reserved (canonical M2). No product-side learning. |
| 17 | Negative learning | Reserved. Dismissals retained with reasons for future use. |
| 18 | Semantic mappings | `pocket-audit.audit_finding` ↔ CE-QMS `AuditFinding` (Domain Rationalization 10.13); `audit_item` ↔ `AuditChecklistItem`; `audit_evidence` ↔ `AuditEvidence`. |
| 19 | Implementation Mapper surfaces | Reserved: (a) checklist question wording, (b) sampling defaults per risk level, (c) evidence hierarchy hints. Changes require approved lesson + human approval. |
| 20 | Cross-app emits | Repeat-finding patterns per requirement (future, anonymized only with explicit promotion policy). |
| 21 | Cross-app consumes | CE-QMS CAR effectiveness outcomes (future). |
| 22 | Tenant isolation | `organization_id` on every `mai_*` row and query (kernel "tenant_id" = our `organization_id`). Cross-organization list/fetch/respond/export denied and tested (AT-11). No cross-organization learning. |
| 23 | Replay | Reconstruct from: `mai_events` snapshot + hash, `mai_rule_registry` definition + hash + revision, kernel build identity (package version + git SHA recorded at startup), Authority Profile revision/hash, evaluation time. Lineage: event → rule → condition → human response → host action → outcome. |
| 24 | Self-audit | Health panel (admin): kernel unreachable, evaluation queue depth, registry validation failure, `mai_error_log` count, unregistered event type attempts, hold overrides. Kernel down: records get `evaluation_status = EVALUATION_PENDING` and show "Determination Pending"; the host continues (Constitution K.2). Issuing a report while evaluation is pending requires an A3 acknowledgement "Issue without determination" with justification, recorded on the report — the control is never silently skipped. |
| 25 | UI signals | Condition badge on audit, item, finding, evidence; "Why" drawer: rule text, clause refs, fields evaluated, snapshot time/hash, response controls. Terminology: "System-Detected Condition". Never "AI finding", "AI decision", "confidence score". |
| 26 | Verification tests | AT-01..AT-16 (mai-kernel-integration) adapted to `pocket-audit`, plus: PT-01 device never writes `mai_*`; PT-02 host applies HOLD only on a kernel GovernedDecision (never self-computed); PT-03 override requires A3 + justification; PT-04 offline records show "Determination Pending" until synced. |
| 27 | Kernel milestone dependencies | AVAILABLE (per skill registry; re-verify): deterministic evaluate, rules engine, supersession, outcome persistence, Authority Profiles. FUTURE: Experience→Lesson, Implementation Mapper, browser/runtime-neutral build. |
| 28 | Reserved interfaces | (a) On-device evaluation (needs canonical kernel browser build — request to kernel owner, do not fork). (b) Learning/experience hooks. (c) Implementation Mapper surfaces §19. |
| 29 | Risks / open decisions | DIM rules below are DRAFT; activation needs Brian's approval with real effective date. Kernel "tenant_id" naming vs host `organization_id` — adapter maps, no kernel change. Kernel is 0.x — pin exact version. |
| 30 | Gate decision | ARCHITECTURE DEFINED; server integration AUTHORIZED for prototype with rules inactive until approved. |

## Draft DIM: `pocket-audit-integrity` (files in `mai/dims-draft/pocket-audit-integrity/`)

Status DRAFT. `approvedBy`/`effectiveDate` intentionally empty so registry validation fails and the DIM stays disabled until approval (AT-13 behavior). On approval, the DIM is submitted to the canonical DIM repository (Constitution M.2); the product keeps only adapter + manifest references.

Rules are **proposed by the drafter**. Wording, severities, categories and risk class need Brian's content authority before approval (mai-kernel-integration: rule content is user-supplied). Derived fields: `DERIVED-FIELDS.md`.

| Rule | Level | Severity | Fires when | Decision |
|---|---|---|---|---|
| PA-001 | finding | major | No linked objective evidence | ADVISE |
| PA-002 | finding | major | No requirement cited | ADVISE |
| PA-003 | finding | major | Statement missing or < 20 characters | ADVISE |
| PA-004 | item | minor | N/A without justification | ADVISE |
| PA-005 | item | minor | HIGH-risk item sampled below plan | ADVISE |
| PA-006 | item | minor | A dimension NOT_MET, no finding, no rationale | ADVISE |
| PA-007 | finding | major | Item's three dimensions all UNKNOWN | ADVISE |
| PA-008 | finding | minor | Requirement has an open finding from a prior audit of the same auditee | ADVISE |
| PA-009 | finding | major | Finding cites only guidance (3b) | ADVISE |
| PA-010 | evidence | major | Server hash ≠ device hash | ADVISE |
| PA-101 | audit | major | Regulatory items (1, 2, 3a) not started at close-out/report request | HOLD |
| PA-102 | audit | major | Any finding without evidence at report request | HOLD |
| PA-103 | audit | major | Any finding without requirement | HOLD |
| PA-104 | audit | major | Any finding with incomplete statement | HOLD |
| PA-105 | audit | major | Any finding on an all-UNKNOWN item | HOLD |
| PA-106 | audit | major | Any evidence hash mismatch | HOLD |

## Sidecar contract (aligns IC-002 with mai-kernel-integration)

| Endpoint (mai-sidecar) | IC-002 | Purpose |
|---|---|---|
| `POST /api/v1/dim/evaluate` | E.1 | Host sends `{evaluation_id, record_type, record_id, record_version, snapshot, organization_id, site_id, snapshot_at, correlation_id}`. Sidecar hashes with kernel `hashSnapshot`, writes `mai_events`, evaluates, writes `mai_assessments`/decisions, returns determinations (condition_state, evidence_manifest, provenance_id) and any `GovernedDecision`. |
| `POST /api/v1/dim/human-response` | E.4 | Host forwards a recorded human response; sidecar writes only response columns via adapter `recordAssessmentResponse`. |
| `GET /api/v1/dim/health` | — | Registry status, version, build SHA, error count |

**Write ownership:** `mai_*` tables live in PostgreSQL schema `mai`. Role `mai_kernel`: INSERT on `mai.*`, UPDATE only on supersession columns, **no access to host schema** (snapshots arrive in the request — ADR-005 "snapshots, not live reads"). Role `mai_response`: UPDATE only on `mai_assessments(response, response_by, response_at, status)`, used solely by the human-response endpoint (host principal per law 12). Host stores returned determinations in its own `dim_determinations` table (E.3) and human responses in `dim_human_responses`; host never writes `mai.*`.

**Draft DIM handling:** production configuration does not load `mai/dims-draft/` at all (M-AI stays enabled for any approved DIMs). The AT suite loads a test copy from `mai/tests/fixtures/pocket-audit-integrity/` whose `approvedBy` is `"TEST FIXTURE — NOT AN APPROVAL"` and whose `effectiveDate` is the test run date; it is loaded only when `NODE_ENV=test`. The draft files themselves are never edited to fake approval.

Clause references on these rules are left empty for Brian to supply (rules verify audit-record completeness; they are not standard requirements). `clauseRefs` must never be invented.
