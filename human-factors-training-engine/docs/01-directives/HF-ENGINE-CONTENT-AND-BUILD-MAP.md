# HF Continuous Learning Engine — Content & Build Map

**Date:** 2026-08-05
**Purpose:** Single reference that tells a coding agent (Claude Code / Codex) exactly what already exists, where every piece of Human Factors training content lives, what may and may not be used commercially, and what the gap is between what is built and the target system.
**Companion file:** `HF-ENGINE-BUILD-PROMPT-v2.md` (the build directive itself). Read this map first; it is the evidence base for the prompt.

---

## 1. What already exists (do not rebuild it — extend it)

There is a working codebase, not a blank slate. The build must **extend this repository in place**.

**Repo:** `E:\Conform-Edge\ClaudeCowork\04 Product Portfolio\HF-ENGINE\`

| Attribute | State |
|---|---|
| Type | Next.js 14 (React 18) + TypeScript web app |
| Data | Prisma ORM; SQLite (dev) / PostgreSQL (prod). 10 models: User, Course, Lesson, Assessment, AssessmentQuestion, AssessmentAttempt, CourseEnrollment, LessonCompletion, Certificate, AuditLog |
| Auth | HTTP-only cookies + bcryptjs, route middleware |
| Features built | Learner auth, dashboard, course/lesson viewing, lesson-completion tracking, 20-question assessment engine (80% pass), PDF certificate generation (jsPDF), admin reporting dashboard, single + bulk-CSV enrollment, CSV exports, audit logging |
| API | 17 endpoints (auth, courses, lessons, assessments, certificates, admin) |
| Pages | 11 (login, dashboard, course, lesson, assessment, results, certificate, admin dashboard, admin enrollments, health) |
| Size | ~5,500 LOC, 53 files |
| Seed | `prisma/seed.ts` — 3 demo users; 5 HF courses (AQ-083, AQ-086, AQ-160, AQ-050, AQ-166); course-1 seeded with 8 lessons + a 20-question assessment |
| Spec docs | `00-DISCOVERY-REPORT.md`, `01-PRODUCT-DEFINITION.md`, `02-FUNCTIONAL-REQUIREMENTS.md`, `03-SYSTEM-ARCHITECTURE.md`, `10-TEST-AND-ACCEPTANCE-PLAN.md`, `11-IMPLEMENTATION-PLAN.md`, plus weekly checkpoints |

**Verdict:** This is a competent **static LMS** ("System B — Web Training Platform" in `LAUNCH-SEQUENCING-OPTIONS.md`). It delivers fixed courses. It is roughly Phase-1 complete for baseline delivery.

**What it is NOT yet:** the *continuous learning engine* the vision prompt describes. None of the following exist yet: source-folder ingestion, the M-AI governance kernel, the adaptive first-time-vs-recurrent curriculum logic, risk-based distribution, effectiveness-beyond-completion, offline/sync, or the on-prem intranet edition.

---

## 2. Human Factors training content inventory (the seed material)

These are the *existing HF trainings* to fold into the engine as its controlled baseline curriculum. Grouped by source, with the brand/license status that governs whether each may ship in a commercial product.

### 2.1 Annex Quality courses — full production packages (PRIMARY baseline source)
Annex Quality IP. Usable as the engine's commercial baseline curriculum. Each folder is a complete 13-section AQ course (module content, slide blueprint, workbook, quiz banks, final exam + practical, scenarios, certification).

| Course | Title | Path |
|---|---|---|
| AQ-083 | Human Factors | `04 Product Portfolio\Annex Quality Training\Domains\11 - Safety Academy (SMS)\AQ-083 - Human Factors\` |
| AQ-086 | Dirty Dozen Human Factors | `04 Product Portfolio\Annex Quality Training\Domains\11 - Safety Academy (SMS)\AQ-086 - Dirty Dozen Human Factors\` |
| AQ-050 | Human Factors Quality | `04 Product Portfolio\Annex Quality Training\Domains\08 - Methods, Tools & Cross-Industry\AQ-050 - Human Factors Quality\` |
| AQ-160 | Personnel, Human Factors & Airworthiness (CCAR-145 R4) | `04 Product Portfolio\Annex Quality Training\Series\CAAC-CCAR145-R4-Series\AQ-160 - Personnel Human Factors and Airworthiness Requirements\` |
| AQ-166 | CCAR 145 R4 Human Factors Deep Dive | `04 Product Portfolio\Annex Quality Training\Series\CAAC-CCAR145-R4-Series\AQ-166 - CCAR 145 R4 Human Factors Deep Dive\` |

Per-course content lives in numbered subfolders — the ones the engine ingests as lessons/assessments are:
`05 - Instructor Materials\AQ-###_Module-Content.md` (lesson body),
`07 - Assessments\AQ-###_Section-Quiz-Banks.md` and `AQ-###_Final-Exam-and-Practical.md` (question banks),
`04 - Participant Materials\AQ-###_Participant-Workbook.md`,
`08 - Scenarios & Simulations\` (case studies/branching scenarios).
Ignore `_Superseded (...)` subfolders.

### 2.2 Recovered standalone HF curriculum — Markdown package (SECONDARY / reference)
Location: `90 Recovered OneDrive\D-Vault-2026-07-17\Human Factors App\`
Recovered content — **untrusted until reviewed** per vault governance; treat as reference/import candidate, confirm authority before promoting to controlled baseline.

- `HF-Course-3-Error-Management-and-Detection.md`
- `HF-Course-4-Fatigue-and-Performance.md`
- `HF-Course-5-Procedural-Compliance.md` (Courses 1–2 referenced in package index but not present in this folder — locate or regenerate)
- Instructor/assessment support: `HF-Trainer-Master-Guide.md`, `HF-Trainer-Answer-Key-Rubrics.md`, `HF-Participant-Workbook-Answers.md`, `HF-Facilitator-Deep-Dive-Notes.md`, `HF-TRAINING-PACKAGE-COMPLETE.md`
- Handoff note: `SESSION-HANDOFF-2026-07-02-Desktop-HF-Courses.md`

### 2.3 Prior status / planning docs (context, not content)
- `02 Active Projects\HF-TRAINING-LAUNCH-READINESS-2026-07-21.md` — the 5-course launch readiness view.
- `00 - Migration Control\HF-TRAINING-FINALIZATION-SUMMARY.md` — web-app backend finalization status (2026-07-05).
- In-repo: `LAUNCH-SEQUENCING-OPTIONS.md` (System A desktop engine vs System B web platform), `PLATFORM-COMPLETE-SUMMARY.md`, `PHASE-1-HANDOFF.md`.

---

## 3. Confidentiality & brand boundaries (hard rules for the build)

These are non-negotiable and come straight from vault governance.

1. **Burrana content is excluded from the commercial product.** The recovered folder in 2.2 also contains Burrana controlled training and records — the `A-720-*` Human Factors module PDFs (e.g. *A-720-109 Introduction to Human Factors*, *A-720-53..61 HF module set*), MOE, weekly quality reports, employee documents. These are **Burrana proprietary** and marked `[[Burrana]]`. They may seed **Burrana's own private on-prem deployment only**. They must **never** be copied, extracted, or embedded into the Conform-Edge commercial baseline, the online SaaS edition, or any shipped seed data. Do not train, quote, or derive shippable content from them.
2. **Annex Quality courses are Annex Quality IP.** Usable as the commercial baseline, but the product is a Conform-Edge *software* product — keep the software brand (Conform-Edge) and the course-content brand (Annex Quality) distinct; do not cross-label.
3. **Reference standards by clause and intent only.** CCAR-145, EASA Part-145, FAA, etc. — never reproduce copyrighted standard text in seed content.
4. **No personal / customer / export-controlled data** from recovered folders enters seed or demo data. Use the synthetic demonstration tenant only.

---

## 4. The built-vs-target gap (what the prompt must add)

| Capability | Built today | Target (vision) |
|---|---|---|
| Baseline course delivery | ✅ Yes | Keep + harden |
| Assessments, certificates, audit log | ✅ Yes | Keep + extend |
| Admin reporting | ✅ Basic | Extend to role dashboards |
| Source-folder ingestion (watched folders) | ❌ | ✅ Required |
| M-AI governance kernel (deterministic) | ❌ | ✅ Required |
| AI Assist layer (pluggable, optional extraction/drafting) | ❌ | ✅ Required, clearly separated |
| First-time-vs-recurrent adaptive curriculum | ❌ | ✅ Core differentiator |
| Frozen per-learner training-package manifests | ❌ | ✅ Required (reproducibility) |
| Risk-based distribution / routing | ❌ | ✅ Required |
| Effectiveness beyond completion | ❌ | ✅ Required |
| Offline-first + sync + conflict resolution | ❌ | ✅ Required (on-prem edition) |
| Two deployment editions (online SaaS + on-prem intranet) | ❌ (single web app) | ✅ Required |

---

## 5. The one architectural correction to make before coding

The uploaded vision prompt tells the **M-AI Kernel** to "propose training content," "identify human factors themes," "detect unsupported conclusions," etc. That blends two layers that Brian's own kernel architecture (MAI-ARCH-001 Rev C) requires be kept **separate**:

- **M-AI Kernel = deterministic, rules-only, no LLM, no network, advisory, writes only to `mai_*` tables.** It governs, validates, classifies-by-rule, escalates, and audits. It surfaces *System-Detected Conditions* for humans. It never generates prose and never has authority to publish.
- **AI Assist Layer = the pluggable LLM/NLP service** that does extraction, theme suggestion, and draft content generation. It is **optional, always advisory, always human-approved, and has a no-AI fallback.** Confidential/Burrana/export-controlled data is never routed to an external provider.

The build prompt (v2) makes this split explicit and enforces the kernel's design laws and terminology. This is the single most important change from the original directive; everything else in the original is sound and is retained.

---

*Sources for this map: `HF-ENGINE\` repo files (README, PLATFORM-COMPLETE-SUMMARY, package.json, prisma/schema.prisma, prisma/seed.ts, 00-DISCOVERY-REPORT, LAUNCH-SEQUENCING-OPTIONS); Annex Quality Training Domains & Series folders; recovered `Human Factors App` folder; vault CLAUDE.md governance and the mai-kernel-integration / future-systems-architect design laws.*
