# 05 — Product Architecture: Pocket Auditor

Conforms to CE-QMS Next Architecture Constitution v1.0-DRAFT (sections A.1, A.3, A.4, A.5, B, C, I, J, K), ADR-001/002/003/005/006/007/008/009/011, Interface Contracts IC-002/IC-003, Authority Matrix §3.5. Where this document and those conflict, those win and Claude Code must stop and report.

## 1. Framework (locked)

| Layer | Technology | Why |
|---|---|---|
| Client (Android, iOS, web) | Ionic Framework (React) + Capacitor + TypeScript (strict) + Vite | One codebase; Brian's existing tools are React; runs in browser for library/planning screens |
| Client state | TanStack Query (server data) + local repository layer over SQLite | Offline-first reads come from SQLite, not the network |
| Device database | `@capacitor-community/sqlite` with encryption (SQLCipher) on Android/iOS; web build uses its web (IndexedDB-backed) implementation for development/planning only — field use is native apps | Offline storage |
| Device files | `@capacitor/filesystem`, `@capacitor/camera`, `@capacitor/preferences` (non-secret only), secure storage plugin for tokens (Keychain/Keystore) | Evidence capture, secrets |
| Server host | PHP 8.3+ / Laravel (current stable major) — API only; Fortify (password), Sanctum (tokens). Device tokens are human-session tokens bound to a user and device; A3 endpoints additionally require re-authentication within 15 minutes (biometric on device) and reject service tokens (Authority Matrix 4.4) | ADR-001, PPD-004 |
| Database | PostgreSQL 16 | ADR-002; matches `E:\Conform-Edge\Runtime\pg16-data` |
| Queue / events | Laravel queues on database driver; transactional outbox table for events (Constitution C, K.7) | No extra infrastructure for prototype |
| File storage | Laravel filesystem abstraction: local disk in dev, S3-compatible bucket in prod (Railway bucket or equivalent) | ADR-010 storage abstraction |
| M-AI | Canonical `@mai/kernel` (pinned version) in a Node 20 LTS sidecar service `mai-sidecar` exposing a small HTTP API to the host; kernel DB role least-privilege | ADR-001/005; mai-kernel-integration law 12 |
| JudgmentProvider | HTTP client in host implementing IC-003 (`evaluateRequirementIntent`, `evaluateEvidence`, `evaluateDocument`); VERA default; provider configurable; feature-flagged | ADR-006 |
| Reports | Server-side: HTML template → PDF (headless Chromium via Browsershot or equivalent) and DOCX (PHPWord) | Auditors hand over PDF/Word |
| CI | GitHub Actions: lint, types, tests for all three packages | Build-Standards.md |

## 2. Repository layout (inside product root)

```
2026-09-27-pocket-auditor/
  00-START-HERE.md … 13-NEEDS-FROM-BRIAN.md, BUILD-GOVERNANCE-STATUS.md
  content/                 converter, library-seed.json, CONVERSION-REPORT.md
  mai/
    adapter/               host adapter (TypeScript) + snapshot builders contract
    dims-draft/pocket-audit-integrity/   manifest, rules PA-001..010 + PA-101..106 (DRAFT), DERIVED-FIELDS.md, charter
    authority/             AP-PA-REPORT-HOLD.json (DRAFT, kernel AuthorityProfile schema)
    tests/                 AT-01..AT-16 + PT-01..PT-04
  src/
    server/                Laravel app (API)
    mai-sidecar/           Node service wrapping @mai/kernel (dependency, not a copy)
    app/                   Ionic React + Capacitor client
    packages/contracts/    shared JSON Schemas: sync protocol, event envelope, provenance, audit package
  docs/                    ADRs added during build, API reference (OpenAPI)
```
`@mai/kernel` is consumed as a package (local path or registry), never copied into `src/` (mai-symbiotic §5.1).

## 3. Component diagram

```
┌─────────────── Device (Android / iOS) ───────────────┐
│ Ionic React UI                                       │
│   ↕ repositories                                     │
│ Encrypted SQLite  ── outbox ──┐   Evidence files     │
└───────────────────────────────┼──────────────────────┘
                     HTTPS sync │  (A2 proposals)
┌───────────────────────────────▼──────────────────────┐
│ Laravel host  (authoritative)                         │
│  Auth · Authority middleware A0–A3 · Activity log     │
│  Requirement Graph · Library · Ingestion              │
│  Audit planning · Checklist generator · Sync API      │
│  Findings · Reports · Event outbox · Provenance       │
│        │ snapshots/events        │ IC-003             │
│        ▼                         ▼                    │
│  mai-sidecar (@mai/kernel)   JudgmentProvider (VERA)  │
│        │ mai_* tables only                            │
│  PostgreSQL 16  ·  Object storage                     │
└───────────────────────────────────────────────────────┘
               │ same sync + event contracts (future)
               ▼
        CE-QMS Next host (on-prem)
```

## 4. Data model (server, PostgreSQL)

All tables: `id uuid (v7)`, `organization_id uuid not null`, `version integer not null default 1` (incremented on every change; used for sync conflict detection and IC-002 `record_version`), `created_at`, `updated_at`, `created_by`. Soft void only (`voided_at`, `void_reason`). **Shared library:** owned by a platform organization row (`organizations.is_platform = true`, name "Conform-Edge Library"). Read policy: a user may read rows of their own organization plus APPROVED rows owned by the platform organization with `license_scope = SHARED_LIBRARY`. Writes to platform rows: platform Library Manager only. Cross-organization tests (PR-084) include this policy.

**Platform:** `organizations`, `legal_entities` (nullable level, PPD-001), `sites`, `departments` (processes), `users`, `memberships(user_id, organization_id, role)`, `devices(user_id, platform, public_id, revoked_at)`, `auditees(organization_id, name, is_self, headcount_band <50|50-250|250-1000|>1000)`, `auditee_sites`, `activity_log(actor_id, actor_type, authority_level, action, record_type, record_id, payload_hash, at)`.

**Requirement Graph (ADR-008 + PPD-002, extended):**
- `requirement_sources(source_code, name, issuer, revision, effective_date, authority_level 1–6, source_type REGULATION|AD|REGULATORY_PROGRAM|GUIDANCE|CONTRACT|STANDARD|INTERNAL (distinguishes 3a program from 3b guidance), jurisdiction, base_sources[], license_scope SHARED_LIBRARY|ORG_PRIVATE, catalog_sha256, status, approved_by, approved_at)`
- `requirements(source_id, requirement_key, standard_ref, clause_ref, title, body_ref null, level, intent, expected_controls jsonb, expected_evidence jsonb, failure_modes jsonb, doc_types jsonb, applicability_text, applicability_trigger_key null, enforcement_sensitivity, catastrophic_flag, major_likelihood, question_text null, interview_prompts jsonb, pack_id, pack_version, status PROPOSED|APPROVED|RETIRED, approved_by, approved_at)` — `body_ref` points to org-private uploaded text only; shared library never stores standard text.
- `requirement_paths(ancestor_id, descendant_id, depth)` closure table
- `requirement_relations(from_id, to_id, relation_type MAPS_TO|IMPLEMENTS|DEMONSTRATES|CONFLICTS_WITH, basis, precedence_note, status PROPOSED|APPROVED|REJECTED, approved_by)`
- `requirement_scope(requirement_id, site_id, module_key, applicability_type MANDATORY|APPLICABLE|EXCLUDED)`
- `requirement_evidence(requirement_id, entity_type, entity_id, evidence_type)`
- `applicability_triggers(key, question_text, default_answer)` (e.g., `performs_design`, `special_processes`, `customer_property`)

**Library / ingestion:** `library_packs(pack_id, version, status, approved_by)`, `source_documents(source_id, storage_key, sha256, mime, pages, uploaded_by)`, `ingestion_jobs(source_document_id, stage, status, error)`, `ingestion_candidates(job_id, segment_locator, segment_text_ref, proposed jsonb, proposer deterministic|judgment_provider, provenance_id, status PROPOSED|ACCEPTED|EDITED|REJECTED|MERGED, reviewer_id, reviewed_at, requirement_id)`.

**Audit (maps to Domain Rationalization 10.13):** `audits(auditee_id, site_ids[], type, status PLANNED|SCHEDULED|IN_PROGRESS|FINDING_RESOLUTION|CLOSED, lead_auditor_id, planned_start, planned_hours, scope jsonb, standard_mandates jsonb (source_code → CONTRACTUAL|BEST_PRACTICE), plan_version, evaluation_status EVALUATED|EVALUATION_PENDING, report_issue_blocked, hold_reason, hold_decision_id)`, `audit_team(audit_id, user_id, role)`, `audit_scope_answers(audit_id, trigger_key, answer, justification)`, `audit_plan_snapshots(audit_id, version, snapshot jsonb, sha256, locked_by, locked_at)`, `audit_items(audit_id, plan_version, item_no, process_area, intent_statement, question_text, requirement_ids uuid[], authority_levels int[], source_types text[], risk_level HIGH|MEDIUM|LOW, sampling_min, sampling_escalation, trace_direction, evidence_hierarchy jsonb, interview_prompts jsonb, prior_finding_ids uuid[], documented, implemented, effective (MET|PARTIAL|NOT_MET|UNKNOWN), intent_judgment, keyword_absent_intent_met, na_selected, na_justification, no_finding_rationale, sample_count, samples jsonb, notes, status NOT_STARTED|IN_PROGRESS|ASSESSED, assessed_by, assessed_at, device_updated_at)`, `audit_evidence(audit_item_id, evidence_type RECORD|DOCUMENT|SYSTEM_DATA|OBSERVATION|INTERVIEW|VERBAL, rank 1–6, description, record_reference, interviewee_role, storage_key, mime, sha256_device, sha256_server, captured_at, captured_by, device_id)`, `audit_findings(audit_id, audit_item_id, requirement_ids uuid[], evidence_ids uuid[], statement_of_nonconformity, submission_status DRAFT|SUBMITTED, proposed_classification MAJOR_NC|MINOR_NC|OBSERVATION|OFI, classification null, classified_by, classified_at, status null|OPEN|RESPONSE_REQUIRED|RESPONSE_RECEIVED|VERIFIED|ACCEPTED|CONTESTED|CLOSED (null until classified; 06 §9), repeat_of_finding_id, evaluation_status)`, `audit_reports(audit_id, version, pdf_key, docx_key, sha256, issued_by, issued_at, hold_overridden, override_justification, issued_without_determination, no_determination_justification)`.

**Intelligence & integration:** `provenance_records` (Constitution J.1 schema), `judgment_requests(operation, target_type, target_id, status QUEUED|DONE|PENDING_JUDGMENT|FAILED, provenance_id)`, `dim_determinations` and `dim_human_responses` (host copies per IC-002 E.3/E.4); M-AI's own `mai_events`, `mai_assessments`, `mai_error_log`, `mai_rule_registry` live in PostgreSQL schema `mai`, owned by the sidecar (03, "Sidecar contract"; kernel `tenant_id` = `organization_id`), `event_outbox` (Constitution C.1 envelope), `sync_batches(device_id, received_at, protocol_version)`, `sync_items(batch_id, idempotency_key unique, entity_type, entity_id, op, payload_hash, result ACCEPTED|REJECTED|CONFLICT, reason)`, `sync_conflicts(sync_item_id, server_version jsonb, device_version jsonb, resolved_by, resolution)`.

Device SQLite holds: `packages`, `requirements_cache`, `items`, `evidence`, `evidence_files`, `findings`, `outbox`, `sync_state`. Same UUIDs as server (generated on device, UUID v7).

## 5. Sync protocol v1 (`packages/contracts/sync-v1.schema.json`)

- `GET /api/v1/pocket/audits/{id}/package` → plan snapshot (version, sha256), requirements referenced, private excerpts referenced, prior findings, applicable enums. Device stores package hash.
- Device mutations write local row + outbox entry `{idempotency_key (uuid v7), entity_type, entity_id, op create|update|void, base_version, payload, payload_hash, occurred_at}`.
- `POST /api/v1/pocket/sync` with up to 200 outbox entries → per-entry `ACCEPTED | REJECTED(reason) | CONFLICT(server_version)`. Server dedupes on `idempotency_key` (at-least-once safe). Server validates authority (auditor assigned to audit; audit IN_PROGRESS; plan version matches).
- Evidence binaries: `PUT /api/v1/pocket/evidence/{id}/file` (resumable chunks); server computes SHA-256, compares to `sha256_device`; mismatch → store both hashes, emit `audit.evidence.attached` (PA-010, PA-106).
- Late sync: an audit in FINDING_RESOLUTION still accepts evidence and DRAFT/SUBMITTED findings from assigned auditors (flagged "late"); a CLOSED audit accepts nothing — the device keeps the data and the sync center offers "Export package" (encrypted file) for the lead auditor to attach through a new A3 "reopen" action. Evidence is never discarded (Constitution A.5).
- Conflict rule: field-level last-writer-wins is **not** used for assessments or findings; any concurrent change by two users to the same item or finding → CONFLICT for human resolution (Constitution A.5).
- Incomplete findings are accepted as `submission_status = DRAFT` (so PA-001..PA-003 can fire); complete ones as SUBMITTED.
- On acceptance host writes records, `activity_log`, outbox events, then M-AI events. Findings become authoritative only after acceptance; classification never set by sync (Authority Matrix §3.5).
- Protocol versioned; server supports current and previous version.

## 6. Requirement ingestion pipeline

```
upload → store + hash → text extraction (PDF: text layer; DOCX: document XML; TXT)
  → deterministic segmentation (clause numbering, shall/must statements, list items)
  → [flag JP_DECOMPOSE] JudgmentProvider proposal per segment (A0, provenance)
  → ingestion_candidates (PROPOSED) → human review (A2 edit, A3 approve)
  → requirements (APPROVED) + requirement_paths
  → crosswalk candidates → human review → requirement_relations (APPROVED)
```
- Scanned PDFs without a text layer are rejected with a clear message in the prototype (OCR = Future).
- Regulator detection: port the detection patterns in `aerospace-regulatory-audit-router/packs/*.md` ("Regulation Detection Patterns" sections) into a data file `server/resources/detection/regulators.json` to suggest source type and authority level. Suggestion only.
- `JP_DECOMPOSE` requires a JudgmentProvider operation not in IC-003 (PAD-008). Until approved, the flag stays off and reviewers write intent and evidence manually on accepted segments.

## 7. Intent-based auditing — where each part lives

| Capability | Where | Authority |
|---|---|---|
| Intent statement, expected evidence, failure modes per requirement | Requirement Graph content (library packs, ingestion) | A3 approval |
| Intent test prompt shown on item card | Derived from requirement intent (+ ISO 9001 intent tests from `intent-compliance-framework.md` loaded as `intent_tests` content for ISO 9001-family clauses) | content |
| Merge requirements with same intent into one item | Checklist generator using APPROVED MAPS_TO (06 §3) | host logic |
| Documented / Implemented / Effective assessment; "UNKNOWN is not a nonconformity" | Item card + PA-007 | auditor A0/A2 |
| Keyword-absent-but-intent-met guard | Item flag; blocks finding creation unless explicitly overridden with note | auditor |
| Semantic intent second opinion | JudgmentProvider `evaluateRequirementIntent` / `evaluateEvidence` (IC-003 F.1.2, F.1.6), online, lead review screen | A0 result |
| Integrity checks | M-AI `pocket-audit-integrity` | A0/A1 HOLD |
| Finding wording guidance | Severity model + NC patterns + auditor voice profile as JudgmentProvider **policies** (Constitution M.3) and as static guidance text in the composer | content / A0 |

## 8. Skill-to-product reuse map

Skills are Category 5 (Constitution M.5). They are **not** runtime code and must not be copied into MAK or DIM sources. Their content is converted into governed product artifacts:

| Skill asset (path under `E:\Conform-Edge\ClaudeCowork\_Skills\`) | Becomes | Governance |
|---|---|---|
| `Auditor-Profile-and-Audit-Engine/Skills-Library/*-auditor/references/requirements-catalog.md` — complete set; root `_Skills` lacks ISO 9001, QMSR, MDSAP (AS9100D, AS9110C, AS9120B, ISO 9001, ISO 13485, QMSR, MDSAP/EU MDR, ISO 14001, IATF 16949) | Library pack `CE-PA-LIB-CORE` v0.1.1 via `content/convert_catalogs.py` (329 records, 354 closure rows, 119 candidate relations; run on Brian's PC 2026-09-27) | Approved per source by Brian |
| `enterprise-audit-intelligence-engine/references/checklist-structure.md`, `engine-layers.md` | Checklist item schema; applicability logic; authority hierarchy; sampling table; evidence hierarchy and sufficiency score; maturity scale | Encoded in 06 |
| `as9100d-auditor/references/intent-compliance-framework.md` (ISO 9001 intent tests + plain-language equivalents) | `intent_tests` content for ISO 9001-family clauses | Approved content |
| `*/references/severity-model.md` | Severity guidance in finding composer; JP policy | Content |
| `*/references/nc-patterns.md` | Failure-mode hints on item card; JP policy for finding drafting | Content |
| `*/references/auditor-voice-profile.md` | JP policy for finding statement and report wording | Policy (M.3) |
| `*/references/output-templates.md`, `audit-reporting-analytics-engine/references/report-templates.md` | Report templates | Content |
| `cross-framework-compliance-auditor/guardrails/cross-framework-intent-precedence.md` | Crosswalk conflict precedence rules (06 §4) | Host logic |
| `aerospace-regulatory-audit-router/packs/*.md` | Regulator registry + detection patterns (ingestion suggestions) | Data file |
| `conform-edge-pocket-auditor/SKILL.md` | Product modes: document audit, interview, checklist, field finding capture; Light/Standard/Deep → risk filter presets | Product behavior |
| `conform-edge-pocket-auditor/references/easa-form8-reqs.md`, `mag-chg10-reqs.md` | Candidate packs (different format — needs a second converter pass) | Brian approval |
| `mai-kernel-integration` | DIM authoring, AT-01..16 | Binding |
| `vera-molecule-design-system` | Brand chrome and tokens (no 3D on mobile) | Binding for UI |
| MAK `audit-intent-judgement` (canonical in `QMS-MAK-world`, not accessible 2026-09-27) | Reference only for JP policy alignment | Do not copy |

## 9. Hosting

- **Dev (E: PC):** PostgreSQL 16 from `E:\Conform-Edge\Runtime\pg16-data` (create database `pocket_auditor_dev` and a separate `mai_kernel` role); Laravel via `php artisan serve`; sidecar via Node; app via `ionic serve` and Android emulator / device.
- **Prod (Railway):** services `server` (Laravel), `mai-sidecar` (Node), `postgres`, object storage bucket; secrets as Railway variables. Prototype deploy only to a non-public environment until production authorization.
- Backups: daily PostgreSQL dump + storage versioning (prod).

## 10. CE-QMS Next readiness

Same entity names, state machines, event envelope, provenance schema and requirement graph schema as CE-QMS Next. A future `CeQmsConnector` pushes accepted audits/findings to a CE-QMS host through its governed API, or a CE-QMS host implements the same `/api/v1/pocket/*` sync API. No schema change should be needed; any needed change is recorded as a defect against this document.
