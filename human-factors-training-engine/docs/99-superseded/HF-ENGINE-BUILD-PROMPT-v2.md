# HUMAN FACTORS CONTINUOUS LEARNING ENGINE — BUILD DIRECTIVE v2

> **SUPERSEDED 2026-08-05 by `HF-ENGINE-BUILD-PROMPT-v3.md`. Do not build from this file.**
> Retained for history per vault governance. v3 narrows scope to the HF niche, adds the Curriculum Compiler, Learning Atoms, Controlled Differential Training, machine-enforced content classification, causal-status controls, the Appropriateness Review, training-burden budget, content recall, Policy Packs, and the Defense Dossier; it defers federated sync and bare-metal packaging.

## Production build prompt for Claude Code / Codex / equivalent coding agent

**Product owner:** Conform-Edge Quality Consulting (software). Course content is Annex Quality IP. Keep the two brands distinct.
**Read before coding:** this directive **and** `HF-ENGINE-CONTENT-AND-BUILD-MAP.md` (same folder). The map is your evidence base — it tells you what already exists, where the training content lives, and what you may and may not use.

---

## 0. HOW TO USE THIS DIRECTIVE

This is **not a greenfield build.** A working web app already exists at this repo root (`HF-ENGINE/`). You will **extend it in place**, not rebuild it. Preserve what works, refactor where the map's gap table (§4 of the map) requires, and add the continuous-learning layer.

Work in phases (§30). After each phase, run it, test it, and produce an honest status report (§28). Do not claim completion you have not verified. When an assumption is needed, choose a reasonable default, record it in `DECISIONS.md`, and continue — stop only for a decision that materially changes security, regulatory control, data ownership, brand/confidentiality, or core architecture.

---

## 1. WHAT ALREADY EXISTS

Repo: `E:\Conform-Edge\ClaudeCowork\04 Product Portfolio\HF-ENGINE\`

- Next.js 14 (React 18) + TypeScript, Prisma ORM (SQLite dev / PostgreSQL prod).
- 10 models (User, Course, Lesson, Assessment, AssessmentQuestion, AssessmentAttempt, CourseEnrollment, LessonCompletion, Certificate, AuditLog).
- Working: learner auth (HTTP-only cookie + bcrypt), dashboard, course/lesson viewing, lesson-completion tracking, 20-question assessment engine (80% pass), PDF certificates (jsPDF), admin reporting, single + bulk-CSV enrollment, CSV export, audit logging. 17 API routes, 11 pages, ~5,500 LOC.
- Seed (`prisma/seed.ts`): 3 demo users; 5 HF courses (AQ-083, AQ-086, AQ-160, AQ-050, AQ-166); one course fully seeded with lessons + assessment.

This is a solid **static LMS**. Your job is to evolve it into a **governed, evolving organizational learning system** — and to produce it in **two deployment editions** (§3).

---

## 2. PRODUCT OBJECTIVE

Build a controlled Human Factors learning system that:

1. delivers a stable, versioned baseline HF foundation curriculum to every first-time learner;
2. ingests approved organizational knowledge from controlled source folders;
3. evaluates relevance, credibility, risk, sensitivity, and training value of that knowledge;
4. routes approved content to the correct learner populations by role/site/exposure;
5. evolves **recurrent** training over time without altering any historical learner record;
6. preserves the baseline for first-time learners while progressively refreshing recurrent material;
7. prevents content overload through controlled retention, compression, retirement, and recurrence rules;
8. verifies training **effectiveness**, not just completion;
9. provides end-to-end auditable traceability: source event → lesson → risk → approval → assignment → completion → assessment → effectiveness → closure;
10. keeps humans in authority over everything that becomes mandatory training;
11. warns when known HF risks are not represented in training;
12. audits itself periodically and surfaces uncertainty, weak evidence, conflicts, and overdue reviews.

It is not merely an LMS. It is a governed learning and risk-distribution system. The learner experience must change per cycle while the controlled baseline and all prior records remain intact.

---

## 3. TWO DEPLOYMENT EDITIONS — ONE CODEBASE

Deliver **both** from a single, configuration-switched codebase. Do not fork. A build/runtime flag (`DEPLOYMENT_EDITION=online|onprem`) and an edition config module select behavior.

### Edition A — Online (hosted SaaS)
- Browser-based, cloud-deployable (Docker; targets such as Railway/Vercel/any container host).
- PostgreSQL, object storage optional, provider-hosted or organization-hosted AI Assist allowed.
- Multi-organization capable (tenant separation enforced structurally — see §21).
- Always-connected assumptions permitted, but the app must still degrade gracefully if the AI Assist provider is unavailable.

### Edition B — On-Prem Intranet (download-to-server)
- A downloadable install package the organization runs on its **own server**, reachable over the **intranet/LAN** by internal browsers. No public internet required.
- **Offline-first and local-first** (§12): login, training delivery, assessment, evidence capture, ingestion from local/NAS/Windows-share folders, reporting, package generation, backup, and restore all work with no internet.
- Single-organization by default. AI Assist defaults to **local model or no-AI fallback**; no confidential data leaves the network.
- Ships with: Docker Compose **and** a scripted bare-metal install (Windows Server + Linux), a bundled PostgreSQL (or SQLite fallback for small sites), first-run setup wizard, backup/restore scripts, and an offline install guide.
- Optional periodic sync to a central instance when connectivity exists (§12.2).

**Both editions share** the same domain model, schema, kernel, rules, screens, and tests. Edition differences are isolated to: deployment packaging, AI Assist provider defaults, connectivity/sync behavior, and multi- vs single-tenant defaults.

---

## 4. TWO-LAYER INTELLIGENCE — GOVERNANCE KERNEL vs AI ASSIST (READ CAREFULLY)

The system has **two distinct intelligence layers**. Keeping them separate is mandatory. Conflating them is a defect.

### 4.1 M-AI Kernel — deterministic governance (authoritative: MAI-ARCH-001 Rev C)
A **rules-only, deterministic** kernel. It senses host events, evaluates immutable record snapshots against version-controlled rules, and surfaces **System-Detected Conditions** for human response. It is **advisory only; humans retain all authority.**

Enforce these non-negotiable design laws in **code and tests** (violations are defects):

1. **Rules before models.** The kernel contains no LLM, no network calls, no randomness. Judgment/LLM work lives only in the separate AI Assist layer (§4.2).
2. **No silent authority.** The kernel writes ONLY to `mai_*` tables. It never modifies user data, record status, learner history, or its own config. No code path may exist that lets it.
3. **Fail quiet, log loud.** Every kernel entry point is wrapped; exceptions log to `mai_error_log` and the host workflow proceeds untouched. A disabled or crashed kernel = host behaves as if the kernel were never installed.
4. **Everything persists.** Events (with snapshot JSON + SHA-256 hash written *before* processing), assessments, human responses, supersession links, and the rule registry all live in the DB. In-memory state is a cache rehydrated at startup. A restart-survival test is mandatory.
5. **Kernel owns assessment IDs** (`crypto.randomUUID()`), persisted exactly as issued — one ID across memory, DB, API, UI.
6. **One canonical hash function.** No placeholder hashes.
7. **Idempotency + supersession.** Same snapshot hash → no duplicate active assessment. Changed snapshot → prior active rows superseded and linked forward. Rules that no longer fire resolve their stale rows.
8. **Controlled terminology.** Outputs are "assessments"; displayed outputs are "System-Detected Conditions". NEVER use "AI finding", "AI decision", "AI approval", or numeric "confidence score" in UI/code/docs. Rules carry `logic_result` + `data_confidence` (high/medium/low).
9. **Tenant-scoped structurally.** `tenant_id` on every `mai_*` table; every query filtered; cross-tenant denial tested.
10. **Configuration is controlled.** Rules/manifests are versioned JSON with `ruleId`, `revision`, real `effectiveDate` (never backdated), `approvedBy` (a real person — "Brian R. Olea" unless told otherwise). Registry validation fails loud on missing fields → kernel disables, host unaffected.
11. **Manifest-driven dispatch.** Domain Intelligence Modules (DIMs) subscribe via manifest `subscribesTo`. Never route events by name prefix or hardcoded map.
12. **Kernel imports nothing from any host.** One-way dependency: hosts implement the adapter interface. On PostgreSQL the kernel connects under a least-privilege role (SELECT on host tables, INSERT on `mai_*`, no UPDATE grants on host tables); human responses are written under the host principal.

**Kernel DIMs for this product** (rules supplied by the owner — do not invent rule content, severities, or clause citations; if a rule table is not provided, ask): source-acceptance & duplicate detection; confidentiality/sensitivity screening; risk escalation; mandatory-approval gating; audience/role/site routing checks; recurrence & overdue-training detection; effectiveness-requirement enforcement; content retention/retirement control; coverage audit (risks with no training linkage); stale-source and expired-approval detection; unauthorized-change and audit-log-integrity checks. Each rule ships with positive, negative, and missing-data tests.

**Kernel UI:** an assessment panel showing tier label, severity, condition text, resolution hint, clause refs, rule id + revision, and three response buttons (Confirm / Dismiss – incorrect / Dismiss – not applicable), plus a "What can this assistant do?" link rendering the DIM's Authority Charter. Header badge: **"M-AI active — advisory only. Human authority controls all decisions."**

### 4.2 AI Assist Layer — pluggable, optional, always human-approved
The LLM/NLP service that *proposes* — text extraction, HF-theme suggestion, draft lesson/question generation, duplicate-similarity hints, audience suggestions. It is **advisory**: nothing it produces becomes training without human approval and (where configured) deterministic kernel checks passing.

Requirements: a provider abstraction supporting local models, org-hosted models, commercial APIs, and a **no-AI fallback**; provider switching; prompt versioning; model-version tracking; restricted-data routing rules (**confidential / Burrana / export-controlled content never leaves the network or goes to an unapproved provider**); token/cost controls. **No essential training or evidence function may depend on external AI availability.** Never present AI Assist output as fact — always labeled as a draft/suggestion pending review.

> Design rule of thumb: *AI Assist proposes. The M-AI Kernel and humans dispose.*

---

## 5. BASELINE vs RECURRENT — THE CORE BEHAVIOR

### 5.1 First-time training
Every learner receiving HF training for the first time gets the **controlled baseline curriculum**, versioned and configurable by industry/regulator/site/function/role — but never displaced by later events. Minimum baseline topics: introduction to human factors; human error & error-producing conditions; active failures & latent conditions; organizational influences; communication; fatigue; distraction/interruption; stress; workload; situational awareness; decision-making; complacency; normalization of deviance; procedural compliance; teamwork; shift handover; supervision; competence; reporting culture; just culture; product safety; ethical behavior; lessons learned; barriers & defenses; personal responsibility; escalation & stop-work.

### 5.2 Recurrent training
Every subsequent cycle assembles: required retained core topics + newly approved organizational lessons + new risk-based content + applicable industry/regulatory changes + role/site-specific content + learner-specific reinforcement from prior results + mandatory carry-forward topics not yet meeting effectiveness criteria. Recurrent training must **not** simply append forever. The engine decides, by configurable rule, whether each older item is retained, shortened, converted to refresher questions, replaced, archived, deferred, merged, escalated, repeated, narrowed to selected roles/sites, or made reference-only. **No material is ever silently removed** — every change needs traceable disposition and approval.

### 5.3 Per-learner path & frozen manifest
The system generates a controlled path per cycle from: role, duties, site, department, regulatory/product exposure, completion history, prior assessment performance, prior effectiveness, unresolved competence gaps, events since last training, risk priority, recurrence rules, management assignment, audit/CA linkage, language, accessibility. For **every assignment**, generate and **freeze a training-package manifest** (package id, learner, role, site, curriculum, revision, module list with exact content-object revisions, questions, scoring rules, completion & effectiveness requirements, due date, assignment reason, source-event links, regulatory/QMS links, approval record, timestamp). The exact package presented to each learner must be perfectly reproducible.

---

## 6. SEED THE ENGINE FROM REAL CONTENT (brand/license rules apply)

Import the existing HF trainings as the controlled baseline and demo content. Follow the confidentiality boundaries in the map (§3) exactly.

**Use as commercial baseline (Annex Quality IP):** the five AQ course packages — AQ-083, AQ-086, AQ-050, AQ-160, AQ-166 — at the paths in the map. For each, ingest `05 - Instructor Materials\..._Module-Content.md` as lesson bodies, `07 - Assessments\..._Section-Quiz-Banks.md` + `..._Final-Exam-and-Practical.md` as question banks, `04 - Participant Materials\..._Participant-Workbook.md`, and `08 - Scenarios & Simulations\` as case studies. Ignore `_Superseded` folders.

**Use as reference/import candidates (verify authority first):** the recovered Markdown package in `90 Recovered OneDrive\D-Vault-2026-07-17\Human Factors App\` (`HF-Course-3/4/5*.md`, trainer guide, answer keys, rubrics, facilitator notes). Recovered files are untrusted until reviewed — do not treat as authoritative baseline without confirmation.

**Never ship in the commercial or online edition:** the Burrana `A-720-*` HF module PDFs, MOE, quality reports, or any `[[Burrana]]` / personal / customer / export-controlled material in that recovered folder. These may seed **Burrana's private on-prem instance only**. Reference standards (CCAR-145, EASA Part-145, FAA) by clause and intent only; never reproduce copyrighted text.

Model imported content as **controlled content objects** (§7), not free-form pages, so versioning, approval, and replacement logic apply uniformly.

---

## 7. HUMAN FACTORS KNOWLEDGE MODEL, TAXONOMY & CONTENT ENGINE

**Knowledge model** (normalized, many-to-many): event, risk, hazard, human error, contributing factor, latent condition, active failure, failed/successful barrier, control, behavior, competency, process, task, role, site, department, product, service, customer, supplier, regulator, requirement, lesson learned, corrective/preventive action, improvement, training objective, training module, assessment question, effectiveness criterion, evidence, approval, assignment, completion, review, revision. One event may relate to many themes, roles, sites, actions, objectives, modules, and reviews.

**Taxonomy:** ship a configurable default HF taxonomy (communication, teamwork, leadership, supervision, fatigue, stress, workload, time pressure, distraction, interruption, complacency, situational awareness, decision-making, procedural noncompliance, unclear procedures, inadequate training, competence gap, memory limitation, confirmation bias, normalization of deviance, peer pressure, organizational culture, resource limitations, environmental conditions, shift turnover, handover quality, task complexity, tool/equipment/software usability, documentation quality, design/maintenance-induced error, inspection/production/quality escape, reporting failure, ethical & just-culture concerns, product safety, counterfeit-parts awareness, cyber-related human error, change-management failure, management-system weakness, latent organizational condition, barrier failure, recovery action, positive lesson, successful intervention). Admins may add/revise/map/merge/retire/localize categories.

**Content objects** (typed, controlled): learning objective, lesson, case study, scenario, question, answer, explanation, image, diagram, video reference, policy/procedure reminder, decision exercise, branching scenario, role/site example, manager discussion guide, toolbox talk, microlearning card, refresher, knowledge check, final assessment, practical observation, effectiveness task.
**Status:** Draft, Under Review, Approved, Published, Superseded, Archived, Rejected, Emergency Interim, Reference Only.
**Versioning per object:** id, revision, effective date, review/expiry date, author, source refs, reviewer, approver, change summary, superseded revision, reason for change, risk impact, affected curriculum/assignments, historical learner exposure.
**Replacement logic:** configurable rules propose whether new material replaces / supplements / merges / becomes assessment-only refresher / role- or site-specific / one-time urgent / recurring / manager-led / reference-only / rejected. AI Assist may propose; the kernel and a human approver dispose. Automatic proposals are allowed; **final publication authority stays human and controlled.**

---

## 8. EFFECTIVENESS, RISK-BASED DISTRIBUTION, PRIVACY

**Effectiveness (beyond completion):** support knowledge test, scenario test, practical observation, supervisor verification, process/product audit, KPI improvement, recurrence monitoring, error/escape/repeat-event reduction, CA effectiveness, interview, team-discussion evidence, external certificate/license verification. Each assignment (where required) defines an effectiveness criterion before closure. The system tracks due dates, blocks closure without evidence, reopens ineffective training, assigns retraining, escalates repeated failure, links systemic failure to corrective action, trends effectiveness by role/site/topic/manager/source-event, and distinguishes knowledge retention from behavior change and completion from process improvement.

**Risk-based distribution:** configurable model over severity, likelihood, detectability (where used), exposure, population, regulatory/product-safety/customer impact, recurrence, systemic reach, evidence confidence, control effectiveness. Compute source risk, training urgency, audience breadth, recurrence requirement, approval level, effectiveness rigor, review frequency. Route e.g. low-risk local lesson → affected workgroup; medium repeated issue → function-wide recurrent; high-risk product-safety → urgent mandatory for all affected roles + management; enterprise systemic weakness → org-wide training + management action; uncertain source → hold for validation; confidential event → anonymized/restricted.

**Privacy/confidentiality/anonymization:** protect personal, medical, employee-relations, customer, proprietary, export-controlled, security-sensitive, investigation-privileged, regulator-restricted, and confidential-CA data. The kernel flags sensitive content and proposes anonymization, redaction, aggregation, role/site restriction, management-only review, exclusion, or generalized case study. No learner-facing content exposes personal names or confidential details without express approval.

---

## 9. INGESTION, ROLES, OFFLINE/SYNC

**Source-folder ingestion:** sit over one or more controlled folders (configurable), default layout `/00-System /01-Incoming /02-Under-Review /03-Approved /04-Rejected /05-Archived /06-Generated-Training /07-Training-Evidence /08-Audit-Reports /09-Reference-Library /10-Configuration`. Support Windows/Linux shares, NAS, mapped/local drives, SharePoint/S3 connectors where configured, manual upload, and API ingestion. Accept PDF/DOCX/XLSX/PPTX/TXT/CSV/MD/JSON/HTML/images and (OCR only if explicitly enabled) scans, plus record types: audit reports, CAs, NCRs, risk registers, lessons learned, safety reports, complaints, SCARs, maintenance events, escapes, incident reports, minutes, regulatory notices, controlled procedures/WIs, training records, industry alerts. Each item gets: source id, file hash, name, path, owner, upload/source dates, revision, status, confidentiality class, applicable site/function/product-process, record category, initial risk score, processing/duplicate/approval/retention status, extraction confidence, relationship to prior sources. **Nothing uploaded is automatically training** — quarantine logically, then process through the kernel.

**Roles (RBAC, least privilege):** System Admin, M-AI Kernel Admin, Training Admin, Quality Manager, Safety Manager, HR Manager, Department Manager, Site Manager, Content Author, Reviewer, Approver, Auditor, Instructor, Supervisor, Learner, Read-Only Executive, External Auditor Read-Only, Regulator Read-Only (where authorized). High-risk actions require elevated authorization. Configurable **dual approval** for product-safety, regulatory, enterprise-wide, emergency-interim, confidential-event content, retirement of mandatory content, and scoring/effectiveness-criteria changes.

**Offline/local/online (Edition B especially):** run fully offline — login (locally cached creds or local IdP), training delivery, assessment, completion evidence, local ingestion/review, audit logs, reporting, package generation, config, backup, restore. On reconnect, sync learner records, assignments, completions, content revisions, source records, approvals, audit events, config — with conflict detection, deterministic resolution rules, manual conflict review, immutable audit history, idempotency, retry, partial-failure recovery, encrypted transport. Display state clearly: Online / Local Only / Degraded / Synchronizing / Conflict Detected / Backup Overdue / Source Folder Unavailable / AI Service Unavailable. **No essential function depends solely on external AI.**

---

## 10. TECHNICAL ARCHITECTURE

Extend the existing stack; do not swap frameworks without recording justification in `DECISIONS.md`.
- **Front end:** React 18 / Next.js 14 / TypeScript; responsive; accessible (keyboard, WCAG-minded); light + dark; desktop-first, tablet-capable; printable reports; local-first caching. Avoid generic flat-tile-only dashboards — use meaningful charts, gauges, status indicators, queues, drill-downs.
- **Back end:** Node/TypeScript (current) with REST API; background job queue; services for ingestion, document extraction, training-package generation, rules engine, M-AI Kernel, audit, reporting, auth, sync.
- **Data:** SQLite (demo/small on-prem) + PostgreSQL (prod); object storage or controlled filesystem for source files; migrations; backups; encryption at rest; referential integrity; immutable audit + `mai_*` records.
- **AI Assist:** the pluggable provider abstraction from §4.2. Never hard-code a single vendor.
- **Rules engine:** deterministic, configurable, runs alongside AI Assist; categories per §4.1. AI may propose; deterministic controls enforce.

**Visual & platform lens (FSA / VERA):** every screen must advance Data → Information → Knowledge → Recommendation → Decision, not just store data. Every record should surface why it exists, what it affects, who owns it, what regulations apply, what risks exist, and what should happen next. Minimize/eliminate manual data entry where the system can derive it. This is an organizational-intelligence tool, not a document store.

---

## 11. PERIODIC SYSTEM AUDIT, REPORTING, SEARCH, CONFIG, SECURITY, LOGGING

**Periodic kernel self-audit** across ≥30 domains: source-folder availability; processing backlog; unreviewed high-risk events; duplicate/conflicting content; stale training; expired approvals; missing audience assignment; overdue learner training; overdue effectiveness review; repeated learner failures; ineffective training; risks / corrective actions / product-safety events with no training linkage; regulatory changes with no review; content missing source/owner/review-date; unauthorized changes; broken source links; sync failures; backup failures; restore-test failures; permission anomalies; inactive users with assignments; orphaned records; model/prompt changes without approval; AI Assist output published without required review; audit-log integrity. Each finding: audit id, date, scope, findings, severity, evidence, owner, due date, corrective action, verification, closure.

**Dashboards** (role-appropriate): Executive (compliance, high-risk open items, effectiveness, repeated events, risk coverage, overdue, site comparison, trends, top themes, unresolved systemic issues); Quality/Safety (source pipeline, lessons under review/approved/rejected, uncovered risks, CA linkage, audit findings, product-safety linkage, recurring-event analysis); Training Admin (assignments, completions, overdue, progress, results, effectiveness, expiring curriculum, review workload); Manager (team compliance, weak areas, overdue, effectiveness tasks, observations, repeated themes); Learner (assigned training, due dates, progress, results, follow-up, history, reference). **No fabricated metrics** — when data is absent, show explicitly: *Verified zero / No data submitted / Source unavailable / Not yet calculated / Insufficient evidence.*

**Search & traceability:** global search across source files, lessons, risks, events, modules, learners, assignments, assessments, audits, corrective actions, approvals. Forward trace source→closure and reverse trace learner completion → exact frozen package → exact content revisions → source events & approvals.

**Configuration:** organization, sites, departments, roles, regulatory & QMS profiles, HF taxonomy, risk matrix, source folders, approval workflows, training cycles, languages, retention periods, confidentiality levels, recurrence rules, effectiveness criteria, notifications, escalation thresholds, backup/audit schedules, AI provider & local model, prompt controls, allowed file types, max file size, sync behavior, and **deployment edition**. Default org placeholder: `[The Organization]`.

**Security:** secure auth; configurable password policy; optional MFA; local identity; LDAP/AD readiness; RBAC; encryption in transit + at rest; secure sessions; rate limiting; input validation; upload scanning hooks; file-type validation; hash verification; audit logging; encrypted backups; restore testing; secrets management; no hard-coded credentials; structural tenant separation in multi-tenant (online) mode.

**Audit log:** every meaningful action logged (event id, timestamp, user, role, action, object type & id, previous/new value, reason, source IP/device where appropriate, success/failure, related approval/source/training-package). Tamper-evident and exportable.

**Notifications:** in-app first (new/high-risk source, review/approval required, assignment issued, due-date approaching, overdue, assessment failure, effectiveness-review due, ineffective training, repeated event, unresolved high-risk item, source-folder failure, backup failure, sync conflict, periodic audit finding); design interfaces for later email/Teams/Slack/SMS.

**APIs (versioned, stable ids):** user/role import, training assignment, completion export, source/event/risk submission, lesson approval, report & audit retrieval, and integration hooks for LMS/HRIS/QMS/SSO.

---

## 12. REQUIRED SCREENS

At minimum: Login; Organization Setup; Site & Department Setup; Role & User Management; Source Folder Configuration; Incoming Source Queue; Source Review; Extracted HF Analysis; Risk Review; Training Recommendation Review; Content Authoring; Content Approval; Curriculum Builder; Training Package Preview; Learner Dashboard; Training Player; Assessment; Manager Dashboard; Effectiveness Review; Audit Dashboard; Kernel Recommendations (System-Detected Conditions); Kernel Audit Results; Reports; System Health; Backup & Restore; Synchronization Status; Configuration; Audit Log; Search; Record Traceability View. No dead-end screens; no placeholder routes.

---

## 13. DEMONSTRATION DATA

Create a synthetic demo tenant for `[The Organization]` (no real Burrana/personal/customer data): two sites; six departments; ten roles; twenty learners; five managers; eight source events; three audit findings; four NCRs; two customer complaints; one product-safety concern; one fatigue event; one communication event; one procedural-noncompliance event; one positive lesson; three approved new training items; two rejected; one awaiting evidence; one high-risk overdue review; one recurrent-course revision; one learner needing retraining; one ineffective outcome; one successful effectiveness closure. Demonstrate exact traceability through the full lifecycle.

---

## 14. TESTING

Automated tests for: auth; permissions; ingestion; file hashing; duplicate detection; source classification; risk calculation; audience routing; content approval; content versioning; training-package generation; first-time curriculum logic; recurrent curriculum logic; replacement logic; assignment; completion; scoring; retraining; effectiveness; traceability; audit logs; offline operation; synchronization; conflict resolution; backup; restore; kernel periodic audit; **prohibited publication without approval**; confidentiality controls. Include the M-AI Kernel acceptance tests (AT-01..AT-16 per MAI-ARCH-001, adapted to this host) — including the restart-survival and cross-tenant-denial tests — and each test must fail if its feature is not actually implemented (no shallow tests). Levels: unit, integration, API, DB migration, end-to-end, accessibility, security, seeded-demo validation. No major workflow ships untested.

---

## 15. ACCEPTANCE CRITERIA

Not complete unless all are demonstrated in the running app:
1. First-time learner receives the full controlled baseline.
2. Recurrent learner receives updated content, not an identical repeat.
3. A new source file is detected and registered.
4. AI Assist extracts and proposes an HF lesson; the kernel classifies/gates it by rule.
5. Affected roles and sites are identified.
6. A reviewer can approve, modify, or reject the recommendation.
7. Approved content joins a future training package.
8. Rejected content never reaches learners.
9. Historical training records remain unchanged.
10. Exact learner content is reproducible from the frozen manifest.
11. An urgent high-risk lesson can be assigned outside the normal cycle.
12. A lesson replaces an older recurrent lesson with traceable approval.
13. Silent deletion is prevented.
14. A learner completes training offline (Edition B).
15. Completion synchronizes when connectivity returns.
16. Sync conflicts are detected and resolved.
17. Effectiveness is tracked beyond completion.
18. Ineffective training triggers retraining or escalation.
19. The kernel flags a risk with no training coverage.
20. The periodic audit identifies overdue/stale records.
21. Source→training→effectiveness traceability is complete (both directions).
22. Audit logs export.
23. Backups create and restore.
24. Status clearly shows offline/degraded/synchronizing states.
25. No production workflow depends solely on external AI.
26. No mandatory content publishes without configured approval.
27. Confidential content is protected; no Burrana/personal data in commercial/online seed or demo.
28. Demo data shows the full lifecycle.
29. All implemented automated tests pass (report exactly which ran).
30. Build/deploy docs complete for **both** editions.

---

## 16. DELIVERABLES

Complete source (single repo, both editions); DB schema + migrations; seed + demo tenant; setup script; **Edition A** cloud/Docker deploy package + guide; **Edition B** on-prem install package (Docker Compose + scripted bare-metal Windows/Linux), first-run wizard, offline install guide; configuration/administrator/user guides; M-AI Kernel design doc + DIM Authority Charters; rules-engine documentation; API docs; data dictionary; security model; backup/restore procedure; audit-log spec; test plan; **real test results** (actual terminal output); architecture decision records (`DECISIONS.md`); known limitations; future-phase backlog; and a `DESIGN-NOTES.md` capturing the FSA build answers.

---

## 17. DEVELOPMENT & HONESTY RULES

1. Extend the existing repo; don't rebuild from scratch or replace working features with mockups.
2. No hard-coded demo values in production logic; no dead-end screens; no placeholder routes.
3. Don't claim a feature complete unless it functions end-to-end and you verified it.
4. AI Assist output never bypasses approval controls; the kernel never gains publish/write authority beyond `mai_*`.
5. Never overwrite historical learner evidence; never silently retire/change controlled content.
6. No secrets in source; no single-vendor AI dependency; no external network dependency for essential local operation; don't assume internet.
7. Never expose confidential/Burrana/export-controlled content to unapproved AI providers.
8. No fabricated KPIs; never suppress missing data; never close effectiveness on completion alone.
9. Maintain `DECISIONS.md` for material architecture/governance choices.
10. **Honest reporting only.** A completion report may claim only what was actually executed this session. If tests didn't run (env limits), say so — never "complete/all passing" by assumption. Prohibited claim language: "production-ready", "certifiable", "ready for certification", absolute "first/only". Permitted: "designed to be auditable", "controlled technical baseline", "deterministic prototype". Include real terminal output, a repo `tree`, sample DB rows (events/active/resolved/superseded assessments/rule registry), files-changed list, open risks, and an acceptance recommendation separating verified from unverified. Structure so the owner's receiving inspection is `npm install && npm run setup && npm test` then `npm run dev` on Node 20 LTS.

---

## 18. PHASED IMPLEMENTATION

**Phase 1 — Working vertical slice (fully DB-backed):** source file → AI Assist extraction proposal → kernel rule check → human-approved lesson → recurrent curriculum update → learner assignment (frozen manifest) → completion → effectiveness → audit evidence. Prove first-time-vs-recurrent divergence and reproducibility here.
**Phase 2 — Full governance:** advanced approval & dual approval; confidentiality/anonymization; content versioning & replacement logic; periodic kernel audit; management dashboards; corrective-action linkage.
**Phase 3 — Local/online resilience:** offline operation; sync + conflict resolution; local AI Assist model; degraded-state behavior; **finalize Edition B on-prem packaging**.
**Phase 4 — Integration & scale:** HRIS/LMS/QMS/SSO; external storage; multi-site; optional multi-tenant for Edition A.
Do not treat later phases as an excuse to leave Phase 1 incomplete.

---

## 19. INITIAL BUILD INSTRUCTION

Begin by: (1) reading this directive and `HF-ENGINE-CONTENT-AND-BUILD-MAP.md`; (2) auditing the existing repo and writing a short gap note vs this directive; (3) producing the target architecture, domain model, and schema deltas (including `mai_*` tables) and the edition-config design; (4) writing `DESIGN-NOTES.md` (FSA build answers) and `DECISIONS.md`; (5) defining the Phase-1 vertical slice; (6) implementing it end-to-end against the existing app; (7) testing it; (8) running it; (9) documenting exact startup for both editions; (10) delivering an honest completion matrix against §15 and every section here, marking each item Verified / Partial / Not-implemented.

The finished system operates as a **controlled, evolving organizational learning engine — not a static course library — delivered in an online edition and a downloadable on-prem intranet edition from one governed codebase.**

*(If a required rule table, severity scheme, or clause mapping for a kernel DIM has not been supplied, request it before inventing content — per the kernel authoring rules.)*
