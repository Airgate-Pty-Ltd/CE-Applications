# Phase 0 — Human Factors Training Engine Discovery Report
**Date:** 2026-07-22  
**Status:** DISCOVERY COMPLETE — SCOPE CLARIFICATION REQUIRED  
**Prepared by:** Claude Code  

---

## Executive Summary

**What Was Found:**
- ✅ **Annex Quality Training Courses** (5 complete courses, 42 lessons, Teachable-ready)
- ✅ **Next.js Web Application** (authentication working, 5 courses seeded, database configured)
- ✅ **Training Content** (Markdown files, facilitation notes, workbook materials)
- ❌ **Desktop Adaptive Engine** (NOT FOUND — does NOT currently exist)

**Critical Finding:**
The artifacts located represent a **traditional training platform** and **LMS-based delivery system**.

The reconstruction directive describes a **fundamentally different system** — a **desktop adaptive training engine** with M-AI Kernel that monitors organizational evidence and generates governed training recommendations.

---

## Artifacts Located

### Location 1: E:\Conform-Edge\ClaudeCowork\02 Active Projects
**File:** HF-TRAINING-LAUNCH-READINESS-2026-07-21.md  
**Status:** ✅ 5 production-ready courses for Teachable platform  
**Content:**
- AQ-083: Human Factors (3.0 hrs)
- AQ-086: Dirty Dozen Human Factors (2.5 hrs)
- AQ-160: Personnel, HF & Airworthiness R4 (3.5 hrs)
- AQ-050: Human Factors Quality (2.5 hrs)
- AQ-166: CCAR 145 R4 Deep Dive (partial)

**Assessment:** Courses are pedagogically complete, regulatory-aligned, and ready for external LMS deployment (Teachable, CANVAS, etc.).

---

### Location 2: E:\Conform-Edge\ClaudeCowork\00 - Migration Control
**File:** HF-TRAINING-FINALIZATION-SUMMARY.md  
**Status:** ✅ Web application backend complete (July 5, 2026)  
**What's Built:**
- Authentication system (login/logout working, session persistence fixed)
- SQLite database with 30+ models
- 5 courses with 42 lessons seeded
- 3 demo users configured
- API endpoints (/api/auth/*, /api/training/courses, /dashboard)
- Route protection via middleware
- Secure cookie implementation (httpOnly)

**What's NOT Built:**
- Lesson content rendering
- Exam/assessment system
- Certificate generation
- Progress tracking
- Learner dashboard UI
- Trainer materials integration

**Technology Stack:**
- Framework: Next.js (React)
- Database: SQLite + Prisma ORM
- Auth: Cookie-based sessions + bcryptjs
- Language: TypeScript/JavaScript

**Launch Status:** "Production candidate pending blocking materials"  
**Blocking Items:** 4 trainer materials + assessment engine + certificate generation

---

### Location 3: E:\Conform-Edge\ClaudeCowork\90 Recovered OneDrive\D-Vault-2026-07-17\Human Factors App
**Files Found:**
- HF-Course-1-Introduction-to-Human-Factors-in-Aviation.md
- HF-Course-2-Communication-and-Teamwork.md
- HF-Course-3-Error-Management-and-Detection.md
- HF-Course-4-Fatigue-and-Performance.md
- HF-Course-5-Procedural-Compliance.md
- HF-MASTER-STATUS-2026-07-02.md
- HF-Regulatory-Framework.md
- HF-VALIDATION-CHECKLIST-2026-07-02.md
- HF-Trainer-Master-Guide.md
- HF-Participant-Workbook-Answers.md
- HF-Trainer-Answer-Key-Rubrics.md
- HF-Facilitator-Deep-Dive-Notes.md
- HF-TRAINING-PACKAGE-COMPLETE.md

**Assessment:** Complete curriculum package with instructor guides, workbooks, answer keys, and rubrics. Suitable for both classroom delivery and asynchronous online learning. CAAC CCAR-145 R4 compliant.

---

## What the Directive Describes

The reconstruction directive (27 sections) specifies a **desktop application** with these characteristics:

### Core Capabilities (NOT FOUND)
1. **Desktop Shell** (Tauri or Electron) — local desktop app, not web
2. **Folder Monitoring** — watches user-selected local folder for files
3. **M-AI Kernel** — 600-rule deterministic engine analyzing organizational evidence
4. **Source Intake** — detects new/modified files, extracts content, indexes
5. **Classification** — evaluates Human Factors relevance via taxonomy
6. **Evidence Evaluation** — determines if source justifies training change
7. **Recommendation Generation** — creates governed proposals for training updates
8. **Human Review Workflow** — approval/rejection/deferral with audit trail
9. **Training Evolution** — creates continuing education from approved evidence
10. **Traceability** — complete chain from source evidence → training lesson
11. **Local Persistence** — SQLite database, no cloud dependency
12. **Learner Interface** — assigns and tracks completion of adapted training
13. **Effectiveness Tracking** — measures training impact

### Historical Intent (Stated)
> "a complete embedded initial Human Factors training course, a desktop interface that could run locally on Windows and macOS, a user-selected local folder that served as the source of continuing Human Factors information, a mechanism that inspected new or changed files within that folder, a governed process for extracting relevant Human Factors lessons from the source material, a training engine that expanded or revised the continuing-education content based on accepted evidence, the M-AI Kernel as the reasoning, governance, classification, and change-control mechanism, traceability showing what source caused a training change, a method to test learner understanding and training effectiveness, a controlled separation between the approved baseline training and newly proposed or approved continuing-education content"

---

## Gap Analysis

| Component | Directive Requirement | What Exists | Status |
|-----------|---|---|---|
| **Desktop Application** | Tauri/Electron | Next.js web app | ❌ MISSING |
| **M-AI Kernel** | 600-rule engine | Not present | ❌ MISSING |
| **Folder Monitoring** | Watch local folder | Not present | ❌ MISSING |
| **File Extraction** | PDF/DOCX/MD parsing | Not present | ❌ MISSING |
| **Classification** | HF taxonomy evaluation | Not present | ❌ MISSING |
| **Recommendations** | Evidence-based proposals | Not present | ❌ MISSING |
| **Governance Workflow** | Approval/rejection cycle | Not present | ❌ MISSING |
| **Baseline Training** | Embedded initial course | 5 courses exist | ✅ AVAILABLE |
| **Continuing Education** | Adaptation system | Not present | ❌ MISSING |
| **Traceability** | Source→Training chain | Not present | ❌ MISSING |
| **Learner Interface** | Assignment + tracking | Partial (web app) | ⚠️ PARTIAL |
| **Audit Trail** | Append-only events | Not present | ❌ MISSING |
| **Local Persistence** | SQLite, no cloud | SQLite exists | ✅ AVAILABLE |

---

## Reusable Components

**From Existing Artifacts:**
1. **Baseline Training Content** — 5 complete courses, 42 lessons (can be embedded in desktop app)
2. **Database Schema** — Prisma models for users, courses, lessons (can be ported to Tauri backend)
3. **Authentication Model** — Cookie + session logic (pattern can be reused)
4. **Human Factors Taxonomy** — 14 topics organized (can inform M-AI classification)
5. **Regulatory Framework** — CAAC CCAR-145 R4 alignment documented
6. **Learner Assignment Model** — Course/lesson/assessment structure

**What Cannot Be Reused:**
- Next.js web framework (directive specifies desktop only)
- External deployment assumptions (directive specifies local-first)
- Teachable platform integration (desktop app requires different delivery)

---

## Two Possible Interpretations

### Interpretation A: Desktop Adaptive Engine (Matches Directive)
**What to Build:**
- Tauri/Electron desktop application
- M-AI Kernel with 600 rules
- Folder watcher + file extraction
- Evidence classification system
- Recommendation + governance workflow
- Training evolution engine
- **Use existing courses as baseline training layer**

**Timeline:** 8-12 weeks (complex, multi-system)  
**Scope:** Full reconstruction per sections 1-27 of directive

### Interpretation B: Complete the Existing Web Application
**What to Build:**
- Finish Next.js app that was paused at 80%
- Assessment engine + grading
- Certificate generation
- Learner dashboard UI
- Trainer material integration
- Deploy to Railway/Vercel
- **Does NOT address M-AI Kernel or folder monitoring**

**Timeline:** 2-4 weeks (feature completion)  
**Scope:** Complete existing architecture, add missing features

---

## Critical Question for Brian

**The directive describes a desktop adaptive training engine with M-AI Kernel governance.  
The existing artifacts show a traditional web-based training platform.**

### Which system do you want?

1. **Desktop Adaptive Engine** (directive sections 1-27) — Monitors organizational evidence, uses M-AI Kernel to generate training recommendations, creates continuing education
2. **Web Training Platform** (existing Next.js app) — Traditional LMS with courses, assessments, and learner tracking
3. **Both** — Desktop engine generates recommendations, web platform delivers training to learners

---

## Recommendations

### If Desktop Adaptive Engine (Interpretation A):
1. Proceed with Phase 1 — Product Specification
2. Baseline training content from existing courses is READY
3. Begin with Phase 2 — Skeleton Application (Tauri desktop shell)
4. Create 12 specification documents before implementation
5. Test locally on Windows + macOS before GitHub publication

### If Complete Web App (Interpretation B):
1. Review `C:\builds\Conform-Edge\annex-quality-hf\` for existing codebase
2. Prioritize: Assessment engine → Certificate generation → Learner dashboard
3. Follow the 4-week timeline from HF-TRAINING-FINALIZATION-SUMMARY.md
4. Deploy to Railway when blocking materials complete
5. No M-AI Kernel required for this path

### If Both (A + B):
1. Build desktop adaptive engine per directive (generates recommendations)
2. Web platform consumes recommendations (delivers continuing education)
3. Requires coordination between systems
4. Timeline: 12-16 weeks

---

## What's Blocking Progress

**To Proceed with Either Path, Confirm:**

1. ✅ **Scope** — Desktop adaptive engine (A), web platform completion (B), or both (A+B)?
2. ✅ **Priority** — Which takes precedence if both?
3. ✅ **M-AI Kernel** — Is the 600-rule deterministic engine to be built? (Required for path A, not for B)
4. ✅ **Folder Monitoring** — Is local evidence monitoring required? (Required for path A, not for B)
5. ✅ **Timeline** — What's the target launch date?
6. ✅ **Platform** — Windows only, or macOS also?
7. ✅ **Deployment** — Desktop installer (A), web URL (B), or both?

---

## Artifacts Ready for Use

Regardless of direction chosen, these are immediately available:

```
✅ 5 complete courses (42 lessons, regulatory-aligned)
✅ Trainer materials (guides, rubrics, workbook answers)
✅ Human Factors taxonomy (14 topics)
✅ Database schema (30+ Prisma models)
✅ Authentication pattern (cookie + session)
✅ Demo data (1,200+ lines)
✅ Regulatory framework (CAAC CCAR-145 R4)
✅ Security checklist (hardened implementation)
```

---

## Next Step

**For Claude to Proceed:**

Provide one clarification:

> **Which system are we rebuilding?**
> 
> A) Desktop adaptive engine with M-AI Kernel (monitors organizational evidence, generates training recommendations, desktop-first, local-only)
> 
> B) Complete the web training platform (finish Next.js app, add assessments + certificates + dashboard, deploy to web)
> 
> C) Both (desktop engine generates recommendations, web platform delivers training)

Upon clarification, I will:
1. Produce Phase 1 — Product Specification documents (12 files)
2. Define functional requirements specific to chosen path
3. Begin Phase 2 — Skeleton Application
4. Test locally before any GitHub publication

---

**Discovery Status:** ✅ COMPLETE  
**Scope Clarity:** ⏳ AWAITING CONFIRMATION  
**Ready to Proceed:** YES (pending answer to clarification question)

---

**Archive:** This report will be updated as work progresses. All artifact locations documented for future reference.
