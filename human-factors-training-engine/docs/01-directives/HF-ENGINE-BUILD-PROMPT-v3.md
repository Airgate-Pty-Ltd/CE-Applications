# HUMAN FACTORS CONTINUOUS LEARNING ENGINE — BUILD DIRECTIVE v3
## Production build prompt for Claude Code / equivalent coding agent

**Supersedes:** `HF-ENGINE-BUILD-PROMPT-v2.md` (retained for history — do not follow it where it conflicts with this document).
**Companion (read first):** `HF-ENGINE-CONTENT-AND-BUILD-MAP.md` — evidence base: what already exists, where every training source lives, brand/license boundaries.
**Product owner:** Conform-Edge Quality Consulting (software brand). Course content is Annex Quality IP. Never cross-brand.

---

# 1. WHAT THIS PRODUCT IS — AND IS NOT

## 1.1 Definition

A **specialized Human Factors training tool for regulated organizations** (aerospace manufacturing, MRO, inspection, engineering, quality, support operations). Its job, stated narrowly:

> When a regulator or CB auditor asks *"prove your people are competent in human factors per the requirement that applies to you,"* this tool produces the defensible answer — and keeps producing it as the organization's HF risks change.

Formally: **a controlled organizational-learning compiler that transforms approved HF-relevant operational evidence into targeted, versioned, reproducible, effectiveness-verified HF training — and generates the evidence package that defends it.**

## 1.2 Explicit NON-goals (do not architect for these)

- It is **NOT an LMS** and must not grow into one. No general course marketplace, no non-HF subject matter, no generic training administration platform.
- It is **NOT a multi-domain organizational learning engine.** Build for HF only. Do not generalize the domain model, taxonomy, or UI "for future domains." (A future-domains note exists in owner strategy documents; it is intentionally excluded from this build.)
- No federated multi-node synchronization in this build (see §4).
- No prediction/forecasting claims. The system surfaces *patterns with evidence*; it never claims to predict incidents. Defensibility is the product's core asset — overclaiming destroys it.

## 1.3 The five product differentiators (the demo IS these)

Everything else in this directive exists to make these five things work. Prioritize accordingly.

1. **The Regulatory Defense Dossier.** One click produces the complete evidentiary chain for an audit: applicable HF requirement (via Policy Pack) → curriculum mapping objective-by-clause → per-learner frozen training records → occurrence-informed recurrency proof → effectiveness evidence (with honest levels) → gap register with dispositions → Content Bill of Materials. This replaces weeks of manual audit preparation. It is the flagship feature and the flagship demo.
2. **Recurrent training built from the organization's own occurrences.** Approved internal HF events become sanitized decision scenarios ("You are the inspector on night shift, third consecutive...") assigned to affected roles. Generic HF slide decks cannot compete with training in which the learner recognizes their own building.
3. **Controlled Differential Training** (never call it "adaptive"). Training differs by learner, role, site, exposure, cycle, and prior performance — but every difference is governed, traceable, explainable, approved, reproducible, and frozen before assignment. The system can always answer, deterministically: *"Why did Learner A receive this content while Learner B did not?"*
4. **Continuous drift watch.** The engine maintains a living HF exposure picture from the organization's occurrence stream and continuously reconciles it against current training coverage. When a theme rises and training doesn't cover it, a System-Detected Condition surfaces — before the escape, before the auditor. Human role: decide. Machine role: everything else.
5. **AI a regulator can trust.** Deterministic kernel governs; every AI-generated sentence traces to an approved source span; humans hold all publication authority; evidence is hash-chained and reproducible years later. Say it in the UI. In this market, auditable AI beats impressive AI.

---

# 2. WHAT ALREADY EXISTS — EXTEND, DON'T REBUILD

Repo: `E:\Conform-Edge\ClaudeCowork\04 Product Portfolio\HF-ENGINE\`

Working Next.js 14 / React 18 / TypeScript app with Prisma (SQLite dev / PostgreSQL prod): learner auth (HTTP-only cookie + bcrypt), dashboard, course/lesson delivery, lesson-completion tracking, 20-question assessment engine (80% pass), PDF certificates, admin reporting, single + bulk-CSV enrollment, CSV export, audit logging. 10 models, 17 API routes, 11 pages, ~5,500 LOC. Seeded with the 5 AQ HF courses.

This is a functioning static delivery layer. **Extend it in place.** Where this directive requires refactoring (e.g., decomposing courses into Learning Atoms, adding the compiler), refactor with migrations — never discard working delivery, assessment, or evidence code without recording justification in `DECISIONS.md`.

---

# 3. ARCHITECTURE — FOUR PLANES

Organize services and schema into four explicit planes. No service bypasses a plane boundary.

1. **Evidence Plane** — HF source records, events, provenance, source authority, confidentiality, hashes, extraction results, evidence relationships. Answers: what happened, where did it come from, is it controlled/current/authoritative, what's missing, what conflicts. *Training decisions never occur in this plane.*
2. **Governance Plane** — deterministic M-AI Kernel, rule manifests, System-Detected Conditions, approvals, publication gates, escalations, retirement controls, human dispositions, Authority Charters. Answers: is this acceptable, sufficient, who must approve, may this publish, is the system inside its authority.
3. **Learning Design Plane** — Learning Atoms, objectives, scenarios, questions, recurrence rules, Policy Packs, effectiveness plans, and the **Curriculum Compiler**. Answers: what must the learner understand/demonstrate, what is foundational vs recurrent, what replaces what, how much is reasonable, how effectiveness will be evaluated.
4. **Delivery & Effectiveness Plane** — assignments, frozen manifests, training delivery, assessments, observations, completions, certificates, retraining, effectiveness evidence. Answers: what exactly was assigned/seen/completed/understood/demonstrated, was it effective, is retraining required.

---

# 4. TWO DEPLOYMENT MODES — ONE CODEBASE

Config-switched (`DEPLOYMENT_EDITION=online|onprem`), never forked.

**Mode 1 — Hosted Online (SaaS).** Browser-based, Docker-deployable to any container host. PostgreSQL. Multi-organization capable with structural tenant separation. AI Assist may use commercial or org-hosted providers per routing rules.

**Mode 2 — Independent On-Prem (download to server, intranet access).** The organization runs it on its own server; internal browsers reach it over LAN. Fully functional with **no internet**: login (local credentials), training delivery, assessments, evidence capture, local/NAS/Windows-share folder ingestion, review/approval, compilation, reporting, dossier export, backup, restore. AI Assist defaults to local model or **no-AI manual fallback**; confidential data never leaves the network. Single organization.

**Mode 3 — Federated On-Prem (local nodes syncing to a parent): DEFERRED. Do not build it, and do not let its absence block anything.** Design the event log so it *could* support sync later, but ship no sync code. Keep clear system-state display (Online / Local Only / Degraded / AI Service Unavailable / Backup Overdue / Source Folder Unavailable).

**Packaging.** Production baseline: Docker Compose + PostgreSQL + browser clients + filesystem/object-storage abstraction (works for both modes; Windows Server and Linux hosts via Docker). Demonstration baseline: local Node.js + SQLite, no production claim. Bare-metal install scripts: deferred until the architecture stabilizes. SQLite is never positioned as production.

---

# 5. TWO-LAYER INTELLIGENCE — KERNEL vs AI ASSIST

## 5.1 M-AI Kernel — deterministic governance (authoritative: MAI-ARCH-001 Rev C)

Rules-only, deterministic, advisory. Senses host events, evaluates immutable snapshots against version-controlled rules, surfaces **System-Detected Conditions** for human response. Non-negotiable laws (enforce in code AND tests; violations are defects):

1. **Rules before models** — no LLM, no network calls, no randomness in the kernel.
2. **No silent authority** — writes ONLY to `mai_*` tables; never modifies user data, record status, learner evidence, or its own config; no code path may exist that can.
3. **Fail quiet, log loud** — every entry point wrapped; exceptions → `mai_error_log`; host proceeds untouched; disabled kernel = host behaves as if it were never installed.
4. **Everything persists** — events (snapshot JSON + SHA-256 written BEFORE processing), assessments, responses, supersession, rule registry all in DB; memory is a cache rehydrated at startup; restart-survival test mandatory.
5. **Kernel owns assessment IDs** (`crypto.randomUUID()`), identical across memory/DB/API/UI.
6. **One canonical hash function**; no placeholders.
7. **Idempotency + supersession** — same snapshot hash → no duplicate active assessment; changed snapshot → prior rows superseded and linked; non-firing rules resolve stale rows.
8. **Controlled terminology** — "assessments" / "System-Detected Conditions"; NEVER "AI finding/decision/approval" or numeric confidence; rules carry `logic_result` + `data_confidence` (high/medium/low).
9. **Tenant-scoped structurally** — `tenant_id` on every `mai_*` table, every query filtered, cross-tenant denial tested.
10. **Configuration controlled** — rules/manifests are versioned JSON: `ruleId`, `revision`, real `effectiveDate` (never backdated), `approvedBy` = a real person ("Brian R. Olea" unless told otherwise); registry validation fails loud → kernel disables, host unaffected.
11. **Manifest-driven dispatch** — DIMs subscribe via `subscribesTo`; never route by name prefix or hardcoded map.
12. **Kernel imports nothing from the host** — one-way adapter dependency; on PostgreSQL, kernel connects under least-privilege role (SELECT host tables, INSERT `mai_*`, no UPDATE on host tables); human responses written under host principal.

**Kernel DIM scope for this product (HF-focused):** source acceptance & duplicate detection; confidentiality screening; publication gating (no mandatory training without configured approval); coverage drift (HF risks/themes with no current training linkage — differentiator #4); Learning Intervention Appropriateness conditions (§7.3); recurrence/overdue/effectiveness-overdue detection; stale content & expired approvals; causal-status guard (§7.2); training-burden escalation (§9); unauthorized change & audit-log integrity. **Rule content (fires-when, severities, clause citations) comes from the owner — never invent it. If a rule table is missing, request it.** Every rule ships with positive, negative, and missing-data tests.

**Kernel UI:** assessment panel with tier label, severity, condition text, resolution hint, clause refs, rule id + revision, three responses (Confirm / Dismiss – incorrect / Dismiss – not applicable), and a "What can this assistant do?" link rendering the DIM Authority Charter. Header badge: **"M-AI active — advisory only. Human authority controls all decisions."**

## 5.2 AI Assist — pluggable, optional, always human-approved

Proposes only: extraction, HF-theme suggestion, scenario/question drafting, duplicate hints, audience suggestions. Provider abstraction: local model, org-hosted, commercial API, **no-AI manual fallback** — switchable; nothing essential depends on external AI.

**Grounding constraint (schema-level, not policy-level):** every AI-drafted content object stores the exact approved source spans it derives from; the approval UI shows draft beside source; content with no traceable source span cannot reach Approved status. Preserve for every AI output: provider, model + version, deployment location, prompt template ID + revision, system-instruction revision, generation parameters, source IDs, input hash, output hash, timestamp, requesting user, human disposition, and the diff chain AI proposal → human-edited draft → final approved content.

**Evaluation gate:** maintain a controlled evaluation set (known HF events, classifications, sensitive data, irrelevant docs, duplicates, misleading causal statements, expected omissions). A new model or prompt revision does not activate until it passes the approved thresholds (extraction accuracy, taxonomy accuracy, sensitivity recall, unsupported-causation rate, hallucination rate, confidentiality routing).

> AI Assist proposes. The Kernel and humans dispose.

---

# 6. LEARNING DESIGN CORE

## 6.1 Learning Atoms

The smallest independently controlled content unit — approvable, versioned, assignable, replaceable, retirable, assessable, traceable, effectiveness-measurable. Types: micro-lesson, case study, decision scenario, question cluster, procedural reminder, toolbox talk, manager briefing, practical observation, microlearning card. Each atom carries: id, title, revision, objective, source evidence links, target audience, applicability, prerequisite, duration, format, risk linkage, recurrence rule, effectiveness method, review date, approval, replacement relationship, status (Draft / Under Review / Approved / Published / Superseded / Archived / Rejected / Emergency Interim / Reference Only), and the content-classification fields of §8.1. The 5 AQ courses remain complete controlled courses AND are decomposed into approved atoms (migration task).

## 6.2 The Curriculum Compiler (named core service)

Generates deterministic, reproducible, frozen learner packages.
**Inputs:** baseline curriculum revision; learner role/site/department/duties/exposure; regulatory profile (Policy Packs); package history; prior assessment results; unresolved effectiveness requirements; competence gaps; approved organizational lessons; urgent content; recurrence rules; training-burden limits; assignment purpose; language; accessibility.
**Outputs (frozen manifest):** package ID + type; curriculum revision; compiler version; ruleset revision; Policy Pack revisions; learner attributes used; baseline content included; recurrent content included; **candidate content omitted + omission reasons**; replacement decisions; question selection; scoring logic; practical requirements; effectiveness requirements; source + approval traceability; package hash; timestamp.
**Determinism:** same approved inputs + configuration → identical output. **Explainability:** every selection decision answerable by rule id + revision (differentiator #3). The compiler uses no unrestricted AI decision-making. In-course branching permitted only when the complete branching logic is approved and inside the frozen manifest.

## 6.3 Baseline vs recurrent

- **First-time learners** always receive the full controlled versioned baseline (built from the AQ courses; topics per v2 §5.1 list — retained unchanged). Later events never displace the baseline.
- **Recurrent cycles** assemble: retained core + newly approved organizational lessons + applicable Policy Pack changes + role/site content + learner-specific reinforcement + mandatory carry-forwards not yet effective. Older items get explicit dispositions (retain / shorten / convert to refresher questions / replace / archive / defer / merge / narrow audience / reference-only) — **nothing is silently removed**; every disposition is approved and traceable.
- **Drip recurrency (differentiator #5):** approved occurrence-scenarios can be assigned as five-minute atoms at shift-brief cadence between formal cycles, evidenced and counted toward recurrency.

## 6.4 Policy Packs

Versioned regulatory/organizational requirement packs, e.g. AS9100 HF Pack, AS9110 Maintenance HF Pack, FAA Repair Station Pack, EASA Part-145 Pack, CAAC CCAR-145 Pack, Product Safety Pack, Just Culture Pack, Fatigue Pack. Each: applicability criteria, mandatory topics, recurrence requirements, mandatory audiences, assessment requirements, effectiveness expectations, approval requirements, retention, clause references (clause number + intent only — never reproduced standard text), rule manifests, reporting requirements. Every package records the Policy Pack revisions that created its obligations — this powers the Defense Dossier's requirement-to-training mapping. **Clause mappings come from the owner; request them, never invent them.**

---

# 7. EVIDENCE QUALITY & LEARNING-DECISION CONTROLS

## 7.1 Four separated quality dimensions (never one blended "confidence")

- **Extraction quality:** complete / partial / unreadable / OCR-derived / uncertain structure.
- **Source authority:** approved controlled record / official regulatory publication / approved audit report / approved CA record / draft / meeting note / employee submission / recovered file / unknown.
- **Evidence sufficiency:** sufficient / conditionally sufficient / corroboration required / insufficient / conflicting.
- **Applicability certainty:** confirmed / probable / possible / undetermined.

## 7.2 Causal-status labels

Controlled statuses: reported factor / suspected factor / contributing factor under investigation / verified contributing factor / root cause / latent condition / unsupported assertion / disputed conclusion. **AI Assist may never promote causal status; only authorized humans may.** Interim awareness content from unresolved events must display: *"Interim preventive awareness content. Causal investigation remains open."* The kernel guards against weak-cause laundering ("operator error," "lack of attention," "inadequate training" as auto-causes).

## 7.3 Learning Intervention Appropriateness Review

Before training is selected as a corrective/preventive response, require a recorded review: (1) is a competence/awareness gap demonstrated? (2) can training reasonably reduce this risk? (3) is a process/engineering/tooling/staffing/supervision/software control more appropriate? (4) is training primary or supporting? (5) what behavior/knowledge/skill should change? (6) how will change be observed? (7) what if ineffective?
Kernel conditions fire when: training is the sole corrective action; no competence gap is documented; the same issue was previously trained without improvement; the cause is primarily non-training-related; no effectiveness method exists. *A training tool that tells you not to train is the strongest credibility feature in the product.*

## 7.4 Provenance & evidence relationship model

Typed, controlled relationships (relational implementation, graph-ready): source supports lesson; source contradicts source; event reveals risk; CA addresses event; lesson teaches control; role exposed to risk; package includes lesson revision; question verifies objective; effectiveness activity evaluates intervention; new supersedes old. Each: id, type, endpoints, rationale, creator, created date, approver, effective date, status, superseded date. Must answer: which lessons link to fatigue; which risks have no intervention; which learners received content from a later-invalidated source; which packages contain recalled content. Forward (source→closure) and reverse (completion→exact package→exact revisions→sources & approvals) traceability are mandatory.

---

# 8. CONTENT GOVERNANCE

## 8.1 Machine-enforced classification (not documentation — schema + checks)

Every content object and source carries: content owner; license category; permitted tenant types; permitted deployment editions; external-AI permission; derivative permission; export permission; branding requirement; confidentiality classification; commercial-use permission; review/expiry date. Minimum license enums:
`ANNEX_COMMERCIAL_BASELINE` · `CONFORM_EDGE_SOFTWARE` · `CUSTOMER_PRIVATE` · `BURRANA_PRIVATE` · `RECOVERED_UNVERIFIED` · `EXTERNAL_REFERENCE_ONLY` · `SYNTHETIC_DEMO`
**Enforced at:** ingestion, AI routing, content approval, package compilation, tenant cloning, export, backup transfer, seed generation, SaaS publication. `BURRANA_PRIVATE` and `CUSTOMER_PRIVATE` must be *technically incapable* of entering commercial seeds, the online edition, or external AI providers. Write tests that prove it.

## 8.2 Content Bill of Materials

Every curriculum release and learner package emits a BOM: all content objects + revisions, source records, licenses, images, question banks, answer keys, regulatory references, AI-assisted objects, human approvers, compiler version, Policy Pack revisions, ruleset revisions. Feeds audits, IP review, recalls, and the Defense Dossier.

## 8.3 Content recall & impact analysis

Formal workflow: hold content → identify active packages containing it → identify exposed learners → identify affected assessments → determine certificate impact → issue corrected training → preserve original evidence → document disposition → notify required authorities → verify closure. This is product recall for learning content.

## 8.4 Emergency interim content

Urgent source → rapid restricted review → interim content with minimum approvals → defined audience → **mandatory expiration date** → scheduled permanent review → final disposition → effectiveness review. Interim content auto-expires unless renewed; it can never live indefinitely.

## 8.5 Event-sourced governance transitions

Event-source the critical transitions only (not the whole system): source registered/revised; lesson proposed/approved/rejected/published/superseded; curriculum released; package compiled; assignment issued/started/completed; effectiveness accepted; content recalled; approval revoked; kernel assessment issued/answered. Current-state tables remain. The append-only event stream is **hash-chained** for tamper evidence and supports historical reconstruction and the "prove it" export.

---

# 9. TRAINING-BURDEN GOVERNANCE

Configurable **Training Burden Budget**: max recurrent duration per cycle; max urgent-training duration per month; max new concepts per package; max cumulative overdue; min spacing between assignments; max question count; max repeated-content percentage; enterprise-wide assignment threshold requiring elevated approval. Candidate atoms carry priority, risk value, mandatory status, duration, recurrence, prerequisite, replacement value; the compiler optimizes inclusion against the budget (risk-weighted value per minute) and writes a **disposition queue** for everything that didn't fit: include now / defer / convert to manager briefing / convert to reference-only / replace older / narrow audience / escalate (mandatory content exceeding budget becomes a management decision). Nothing silently omitted.

---

# 10. EFFECTIVENESS — FOUR LEVELS, HONEST LANGUAGE

- **Level 1 Completion** — activity finished.
- **Level 2 Knowledge/skill** — exam, practical demonstration, scenario, observed exercise.
- **Level 3 Workplace transfer** — supervisor observation, process audit, behavior check, handover review.
- **Level 4 Operational impact** — recurrence reduced, escapes reduced, reporting improved, error rate reduced.

Each assignment (where required) defines an effectiveness plan before closure: criterion, method, owner, due date, evidence, observation period. Completion never equals competence; Level 4 improvement is never auto-attributed causally to training. Permitted outcome language: "effectiveness evidence supports improvement" / "outcome improved following intervention" / "causal attribution not established" / "insufficient observation period" / "confounding process changes identified." Ineffectiveness triggers retraining, intervention redesign, CA review, or management escalation. **Certificates match evidence:** distinct certificate types for course completion, knowledge assessment passed, practical demonstration, competence verified, recurrent completed, awareness briefing — a passed online quiz never certifies task competence.

The **manager is a first-class actor**: Level 3 verification lives or dies on a supervisor's five minutes. Their queue (pending observations, one-tap verify with evidence note) must be the simplest workflow in the product.

---

# 11. INGESTION — NARROWED TO HF

**Scope:** HF-relevant occurrences only — internal HF events, HF-classified NCRs/CAs/audit findings, safety reports with HF factors, HF lessons learned, applicable HF regulatory changes, HF-relevant industry alerts. This is a specialized tool: do not build general-purpose ingestion of every record type.

**Two intake paths:**
1. **Structured event intake** (form + API): category, date, site, affected process/role, HF theme(s), severity — this feeds the drift watch and effectiveness trending. Without structured signals, trending is theater.
2. **Document intake** via a **connector interface** — `SourceConnector: discover() / retrieve() / fingerprint() / acknowledge() / quarantine() / move() / healthCheck()`. Initial connectors: LocalFolderConnector, WindowsShareConnector, ManualUploadConnector, ApiSubmissionConnector. All emit one canonical source envelope. (SharePoint/S3/email: later.) Formats: PDF, DOCX, XLSX, TXT, MD, images; OCR only when explicitly enabled.

**Quarantine pipeline states:** Detected → Quarantined → Malware Scan Pending → Integrity Verified → Metadata Extracted → Content Extracted → Classification Proposed → **Human Classification Confirmed** → Evidence Review Pending → Accepted for Learning Review | Rejected | Archived. Restricted content is intercepted **before** any external AI provider can receive it. Every item: source id, hash, name, path, owner, dates, revision, confidentiality class, site/function applicability, category, quality dimensions (§7.1), duplicate status, approval status, retention category. Nothing uploaded is automatically training.

**HF taxonomy:** ship the configurable default taxonomy (Dirty Dozen-derived + organizational/latent categories per v2 §7 list — retained). Include **positive-learning categories** (successful recovery, effective stop-work, strong handover, hazard caught, peer intervention, barrier success): the engine distributes what worked, not only what failed. Include **management learning paths** (workload allocation, staffing, production pressure, procedure quality, fatigue exposure, investigation quality, response to reporting, just culture, organizational drift) routed to control owners, process owners, supervisors, accountable managers — HF training that only targets the frontline misses the latent conditions.

---

# 12. SEED CONTENT & BRAND BOUNDARIES

Per the map (§2–3), seed from real content under the §8.1 classifications:

- **`ANNEX_COMMERCIAL_BASELINE`:** the five AQ course packages — AQ-083, AQ-086, AQ-050 (paths under `04 Product Portfolio\Annex Quality Training\Domains\`), AQ-160, AQ-166 (under `...\Series\CAAC-CCAR145-R4-Series\`). Ingest Module-Content as lessons, Section-Quiz-Banks + Final-Exam as question banks, Participant-Workbook, and Scenarios. Ignore `_Superseded` folders. Decompose into Learning Atoms.
- **`RECOVERED_UNVERIFIED`:** the recovered Markdown package in `90 Recovered OneDrive\D-Vault-2026-07-17\Human Factors App\` (HF-Course-3/4/5, trainer guide, answer keys, rubrics). Import as reference only until the owner promotes it.
- **`BURRANA_PRIVATE` — never in commercial/online/seed:** the `A-720-*` PDFs and all other Burrana material in that folder. Enforced by §8.1, proven by tests.
- **`SYNTHETIC_DEMO`:** demonstration tenant for `[The Organization]` — 2 sites, 6 departments, 10 roles, 20 learners, 5 managers, and a full lifecycle of synthetic HF events per v2 §13 (retained), including one recall demonstration and one appropriateness-review rejection ("training not the right intervention").
- Standards referenced by clause number and intent only. No personal/customer data anywhere in seeds.

---

# 13. PLATFORM REQUIREMENTS (carried forward from v2, trimmed to niche)

- **RBAC, least privilege.** Roles: System Admin, Kernel Admin, Training Admin, Quality Manager, Safety Manager, Department/Site Manager, Content Author, Reviewer, Approver, Auditor, Supervisor, Learner, Read-Only Executive, External Auditor Read-Only, Regulator Read-Only. Dual approval configurable for product-safety, regulatory, enterprise-wide, emergency-interim, confidential-event content, retirement of mandatory content, scoring/effectiveness changes. **Decision ownership on every significant object:** record owner, action owner, decision authority, reviewer, approver, verifier, escalation owner — one generic "owner" field is insufficient.
- **Security:** secure auth, configurable password policy, optional MFA, local identity, LDAP/AD readiness, encryption in transit + at rest, secure sessions, rate limiting, input validation, upload scanning hooks, file-type validation, hash verification, encrypted backups, restore testing, secrets management, no hard-coded credentials, structural tenant separation (online mode).
- **Audit log:** every meaningful action — event id, timestamp, user, role, action, object type/id, previous/new value, reason, source device where appropriate, success/failure, related approval/source/package. Tamper-evident (hash-chained per §8.5), exportable.
- **Auditor-ready exports (feeds the Defense Dossier):** curriculum-control report, source-provenance report, content-approval report, learner-package manifest, completion record, assessment evidence, effectiveness record, kernel-condition history, audit-log extract, Policy Pack applicability, revision history. The product supports auditability; it never claims software use alone establishes compliance.
- **Dashboards** (honest data only — absent data shows *Verified zero / No data submitted / Source unavailable / Not yet calculated / Insufficient evidence*): Executive (coverage vs requirement, drift watch, high-risk open items, effectiveness levels, overdue, site comparison, top HF themes); Quality/Safety (occurrence pipeline, lessons under review/approved/rejected, uncovered risks, CA linkage, recurring-event analysis); Training Admin (assignments, completions, overdue, review workload, expiring content); **Manager (the five-minute view:** team compliance, pending observations, one-tap effectiveness verification, repeated team themes); Learner (assigned training, due dates, progress, history, reference library).
- **Screens (minimum):** Login; Org/Site/Department Setup; Role & User Management; Source Connector Configuration; Incoming Source Queue; Source Review; HF Event Intake; Extracted HF Analysis; Causal-Status Review; Appropriateness Review; Training Recommendation Review; Content Authoring (draft-beside-source); Content Approval; Curriculum Builder; Compiler Package Preview (with omission reasons); Learner Dashboard; Training Player; Assessment; Manager Dashboard; Effectiveness Review; Drift Watch; Kernel Conditions; Kernel Audit Results; Defense Dossier Generator; Reports; System Health; Backup & Restore; Configuration; Audit Log; Search; Traceability View (forward + reverse); Content Recall. No dead-end screens, no placeholder routes.
- **UX:** professional, regulated-industry restrained, keyboard accessible, light/dark, printable, explicit about record status, missing data, AI-drafted content, approval status, and offline state. Meaningful queues/status/drill-downs — not flat tile grids.
- **Notifications:** in-app first (per v2 §11 list, retained); interfaces designed for later email/Teams integration.
- **APIs:** versioned, stable IDs — user/role import, event submission, source submission, assignment, completion export, report/audit retrieval, dossier export; integration hooks for HRIS/QMS/SSO later.

---

# 14. PHASE 1 — THE VERTICAL SLICE (narrow, complete, verified)

Build ONE complete lifecycle end-to-end, database-backed, before widening anything.

**Scope:** one approved NCR or lessons-learned source (Markdown or PDF; manual upload + local-folder connector only) · themes limited to communication, fatigue, procedural compliance, situational awareness, supervision · roles limited to Learner, Supervisor, Quality Manager · intervention = one Learning Atom + one occurrence-derived case study + three knowledge questions + one supervisor effectiveness observation · cycles = baseline assignment + first recurrent assignment.

**Phase 1 exit criteria — all demonstrated in the running app with real automated tests:**
1. Controlled source ingestion with hash, quarantine states, and provenance.
2. Confidentiality/license classification enforced (a `BURRANA_PRIVATE`-classified test file is provably blocked from AI routing and seeds).
3. AI proposal **and** the no-AI manual fallback both work; AI draft shows source spans beside it.
4. Causal-status control (human promotion only) and Appropriateness Review recorded; kernel condition fires on "training is sole CA."
5. Deterministic kernel publication gate; unapproved content provably cannot publish.
6. Learning Atom created, approved, versioned.
7. Baseline vs recurrent divergence: first-time learner gets full baseline; recurrent learner's package differs, with compiler explanation of why.
8. Deterministic compilation: identical inputs → identical package hash; frozen manifest with omission reasons.
9. Learner completes; assessment scores; supervisor records the effectiveness observation; effectiveness closes on evidence, not completion.
10. Forward and reverse traceability render in the UI.
11. Content recall demonstration: recalled atom → exposed learners identified → corrected training issued → evidence preserved.
12. Defense Dossier export (even minimal) assembles the chain for this one lifecycle.
13. No historical mutation anywhere (test attempts to alter a frozen manifest/completion must fail).
14. Honest verified-status report per §16.

**Then increments:** (2) full governance — dual approval, emergency interim, versioning/replacement, periodic kernel audit, dashboards; (3) burden budget + drip recurrency + drift watch + Policy Packs; (4) full Defense Dossier + BOM + hash-chain "prove it" export + auditor read-only mode; (5) deployment hardening — Docker Compose both modes, backup/restore, health, on-prem no-internet verification; (6) evaluation-gated AI provider expansion.

---

# 15. TESTING

Real automated tests (unit, integration, API, migration, E2E, accessibility, security, seeded-demo validation) for: auth; permissions; ingestion + hashing + quarantine; classification enforcement (§8.1 — including the Burrana-block test); duplicate detection; causal-status control; appropriateness review; kernel gates + AT-01..AT-16 adapted to this host (restart survival, cross-tenant denial included); compiler determinism (hash-identical outputs) + explainability + burden dispositions; baseline/recurrent logic; frozen-manifest immutability; completion/scoring/retraining; effectiveness levels + closure rules; recall impact; traceability both directions; audit-log integrity + hash chain; backup/restore; offline operation (Mode 2); AI grounding (no source span → no approval) + evaluation gate. **No shallow tests** — each must fail if its feature is unimplemented. No major workflow ships untested.

---

# 16. DEVELOPMENT & HONESTY RULES

1. Extend the existing repo; never replace working features with mockups; no demo values in production logic.
2. AI Assist never bypasses approval; the kernel never gains authority beyond `mai_*`; nothing publishes mandatory training without configured human approval.
3. Never overwrite historical learner evidence; never silently retire/change controlled content; never silently omit compiler candidates.
4. No secrets in source; no single-vendor AI dependency; no internet assumption; no essential dependence on external AI; restricted content never reaches unapproved providers.
5. No fabricated KPIs; never suppress missing data; never close effectiveness on completion alone; no causal claims the evidence doesn't support; no prediction claims.
6. Maintain `DECISIONS.md` (material choices) and `DESIGN-NOTES.md` (FSA build answers: problem eliminated, AI layer, human role, no-enterprise-equivalent rationale).
7. **Honest reporting.** Claim only what was executed this session; if tests didn't run, the status line says so. Prohibited language: "production-ready," "certifiable," "ready for certification," absolute "first/only." Permitted: "designed to be auditable," "controlled technical baseline," "deterministic prototype." Reports include real terminal output, repo tree, sample DB rows (events / active / resolved / superseded assessments / rule registry), files-changed list, open risks, and a verified-vs-unverified acceptance recommendation. Receiving inspection on the owner's machine (Node 20 LTS): `npm install && npm run setup && npm test` then `npm run dev`.
8. Stop only for decisions that materially change security, regulatory control, data ownership, brand/confidentiality, or core architecture — otherwise choose a reasonable default and record it.
9. **Request from the owner, never invent:** kernel rule tables (fires-when, severity, clause citations), Policy Pack clause mappings, effectiveness criteria thresholds.

---

# 17. INITIAL BUILD INSTRUCTION

1. Read this directive fully, then `HF-ENGINE-CONTENT-AND-BUILD-MAP.md`.
2. Audit the existing repo; write a short gap note against this directive.
3. Produce target architecture (four planes), domain-model and schema deltas (Learning Atoms, compiler manifests, `mai_*` tables, classification fields, relationship model, event stream), and the edition-config design.
4. Write `DESIGN-NOTES.md` and `DECISIONS.md`.
5. Implement the Phase 1 vertical slice end-to-end against the existing app.
6. Test it. Run it. Document exact startup for both deployment modes.
7. Deliver a completion matrix against §14's exit criteria and every section of this directive: Verified / Partial / Not implemented — honestly.

The finished system is a **specialized, governed HF training engine that an organization can defend to a regulator** — delivered as a hosted online edition and a downloadable on-prem intranet edition from one codebase. It is not an LMS. Its output is proof.
