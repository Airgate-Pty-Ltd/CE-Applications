# Phase 1 Specification Index
**Project:** Adaptive Human Factors Training Engine  
**Phase:** 1 — Web Training Platform MVP (3 weeks)  
**Status:** SPECIFICATIONS COMPLETE, READY FOR IMPLEMENTATION  
**Date:** 2026-07-22  

---

## Overview

Phase 1 delivers a web-based training platform for Human Factors continuing education. Learners enroll, complete 5 embedded baseline courses (42 lessons), pass assessments (20 questions, 80% threshold), and receive certificates. Admins manage enrollments and view completion reports.

**Timeline:** Weeks 1-3 (July 22 - July 29, 2026)  
**Technology:** Next.js + React + TypeScript + SQLite (dev) / PostgreSQL (prod)  
**Deployment:** Railway.app  
**Target:** Launch production environment, live at public URL  

---

## Specification Documents

### 1. Product Definition (01-PRODUCT-DEFINITION.md)
**What to build:** Overview, user roles, learner journey, data model, API endpoints, UI components  
**Read this for:** Understanding what Phase 1 delivers, who uses it, how they use it  
**Key sections:**
- Product overview (what, who, when)
- User roles (Learner, Training Manager, Administrator)
- Learner journey (registration → assessment → certificate)
- Data model (Users, Courses, Lessons, Assessments, Enrollments, Certificates)
- API endpoints (complete list with request/response)
- UI components (pages and React components to build)
- Success criteria (12 checkboxes)

### 2. Functional Requirements (02-FUNCTIONAL-REQUIREMENTS.md)
**What the system must do:** Detailed feature-by-feature requirements  
**Read this for:** Exact specifications of each feature, acceptance criteria, constraints  
**Key sections:**
- FR-1 through FR-12 (authentication, dashboard, courses, assessments, certificates, admin, reports, remediation, accessibility, security, email)
- 150+ individual requirements (FR-X.Y format)
- Priority levels (MUST-HAVE, SHOULD-HAVE, NICE-TO-HAVE)
- Acceptance criteria per feature

### 3. System Architecture (03-SYSTEM-ARCHITECTURE.md)
**How to build it:** Technology stack, layers, data flow, database schema, APIs  
**Read this for:** Technical architecture, file structure, how components fit together  
**Key sections:**
- High-level architecture diagram (browser → API → database)
- Technology stack (React, Next.js, TypeScript, SQLite, PostgreSQL)
- Project file structure (complete directory tree)
- Data flow (login, assessment, certificate, report workflows)
- Prisma schema (25+ models for users, courses, lessons, assessments, etc.)
- API response schema (success/error format)
- Security architecture (authentication, authorization, secrets)
- Deployment pipeline (local → GitHub → Railway)

### 4. Test & Acceptance Plan (10-TEST-AND-ACCEPTANCE-PLAN.md)
**How to verify it works:** Testing strategy, acceptance criteria, UAT scenarios, sign-off  
**Read this for:** What tests to run, how to know Phase 1 is complete  
**Key sections:**
- Testing strategy (unit, integration, E2E, manual, performance, security)
- Acceptance criteria per feature (40+ criteria across assessment, certificate, dashboard, admin, security, accessibility)
- Manual testing checklist (30+ scenarios)
- User acceptance testing (4 full learner/admin scenarios)
- Definition of Done (14 checkboxes before ship)
- Defect severity levels (Critical, Major, Minor, Trivial)
- Sign-off requirements (product owner approval)

### 5. Implementation Plan (11-IMPLEMENTATION-PLAN.md)
**How to execute it:** Day-by-day breakdown, tasks, deliverables, dependencies  
**Read this for:** What to build each day, in what order, what depends on what  
**Key sections:**
- Week 1: Assessment engine foundation + dashboard (Days 1-5)
- Week 2: Assessment UI + certificates (Days 1-5)
- Week 3: Admin dashboard + reports + testing + deployment (Days 1-5)
- Dependency map (what must be built before what)
- Daily standdown checklist
- Blockers & mitigation
- Success criteria (end-of-phase deliverables)

---

## Documents Not Yet Written (Can Defer)

### 4. Data Model Detailed (04-DATA-MODEL.md)
**Deferred reason:** System Architecture doc includes complete Prisma schema; separate doc would be redundant  
**Contains:** Expanded Prisma models, indexes, relationships, sample queries  
**Read if:** Need detailed query optimization, schema deep-dive

### 5. M-AI Kernel Design (05-MAI-KERNEL-DESIGN.md)
**Deferred reason:** Phase 2 document, not needed for Phase 1 implementation  
**Contains:** 600-rule engine architecture, folder monitoring, recommendation engine  
**Read if:** Starting Phase 2 work

### 6. Human Factors Taxonomy (06-HUMAN-FACTORS-TAXONOMY.md)
**Deferred reason:** Phase 2 document, Phase 1 uses existing 14-topic taxonomy from artifacts  
**Contains:** Complete taxonomy hierarchy, scoring rules, classifications  
**Read if:** Customizing taxonomy for Phase 2

### 7. Training Content Model (07-TRAINING-CONTENT-MODEL.md)
**Deferred reason:** Content already embedded in 5 courses (from existing artifacts)  
**Contains:** Lesson structure, scenario format, assessment design  
**Read if:** Creating new courses beyond baseline 5

### 8. Governance & Approval Workflow (08-GOVERNANCE-AND-APPROVAL-WORKFLOW.md)
**Deferred reason:** Phase 2 document (M-AI recommendations, human approval)  
**Contains:** Recommendation lifecycle, approval authority, audit trail  
**Read if:** Building Phase 2

### 9. Security & Privacy Model (09-SECURITY-AND-PRIVACY-MODEL.md)
**Deferred reason:** System Architecture + Functional Requirements cover this adequately  
**Contains:** Threat model, compliance (GDPR, CCPA), data retention  
**Read if:** Deep-dive on security architecture needed

### 12. Repository Plan (12-REPOSITORY-PLAN.md)
**Deferred reason:** Can create immediately after Phase 1 complete  
**Contains:** GitHub setup, .gitignore, CI/CD, release checklist  
**Read if:** Publishing to GitHub

---

## Reading Order

**For Product Owner (Brian):**
1. Read SPECIFICATION-INDEX.md (this file)
2. Skim 01-PRODUCT-DEFINITION.md (overview)
3. Skim 10-TEST-AND-ACCEPTANCE-PLAN.md (success criteria)
4. Sign off on 11-IMPLEMENTATION-PLAN.md (timeline & deliverables)

**For Engineer (Claude):**
1. Read 01-PRODUCT-DEFINITION.md (full understanding)
2. Read 02-FUNCTIONAL-REQUIREMENTS.md (all features)
3. Read 03-SYSTEM-ARCHITECTURE.md (how to build)
4. Read 11-IMPLEMENTATION-PLAN.md (day-by-day tasks)
5. Reference 10-TEST-AND-ACCEPTANCE-PLAN.md (verification)

**For QA/Tester:**
1. Read 10-TEST-AND-ACCEPTANCE-PLAN.md (what to test)
2. Reference 02-FUNCTIONAL-REQUIREMENTS.md (detailed requirements)

---

## Quick Reference

### Technologies
```
Frontend:  React 18+ via Next.js 14+, TypeScript, Tailwind CSS
Backend:   Node.js 18+, Next.js API routes, TypeScript
Database:  SQLite (dev), PostgreSQL (prod)
Deploy:    Railway.app
Auth:      HTTP-only cookies + bcryptjs password hashing
```

### Key Features (Weeks 1-3)
```
✅ 5 courses (42 lessons) embedded
✅ Learner authentication & dashboard
✅ Course & lesson viewing
✅ 20-question assessments (80% pass threshold)
✅ Certificate generation & download
✅ Admin enrollment & user management
✅ Completion reports & CSV export
✅ Full security (no XSS, SQL injection, CSRF)
✅ Mobile responsive (375px+)
```

### Database Tables (20+)
```
Users, Courses, Lessons, Assessments, AssessmentQuestions
AssessmentAttempts, CourseEnrollments, LessonCompletions
Certificates, AuditLogs, Sessions (implied)
```

### API Endpoints (20+)
```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/courses
GET    /api/courses/:id
GET    /api/assessments/:id/start
POST   /api/assessments/:id/submit
GET    /api/certificates/:id
GET    /api/admin/enrollments
POST   /api/admin/reports/completion
... (20+ total)
```

### Timeline
```
Week 1 (July 22-26):  Assessment engine + dashboard
Week 2 (July 29-Aug2): Assessment UI + certificates
Week 3 (Aug5-9):      Admin + reports + testing + deploy
Target Go-Live:       Friday, August 9, 2026
```

---

## Decision Log

### Architecture Choices Made

| Decision | Option Selected | Reasoning |
|----------|---|---|
| Frontend Framework | React (Next.js) | Existing app uses it, team familiar, rapid development |
| Backend Framework | Next.js API routes | Same codebase as frontend, reduces deployment complexity |
| Database (Dev) | SQLite | Zero setup, file-based, portable, sufficient for MVP |
| Database (Prod) | PostgreSQL | Managed by Railway, scalable, production-grade |
| Authentication | HTTP-only cookies | Simpler than JWT, better XSS protection, meets MVP needs |
| PDF Generation | jsPDF or pdfkit | Client-side generation faster, no external service dependency |
| Deployment | Railway.app | Supports Node.js + PostgreSQL, auto-deploy from GitHub, simple |
| Hosting | Railway (Node.js service) | One platform for app + DB, reduces complexity |

### Deferred Decisions (Phase 2+)

| Decision | Reason | Target |
|----------|---|---|
| Email notifications | Nice-to-have, can defer to week 4 | Optional feature |
| Mobile app | Web responsive sufficient for MVP | Phase 2+ |
| SSO/SAML | Not needed for MVP (demo users only) | Phase 2+ |
| Advanced analytics | Basic reports sufficient | Phase 2+ |
| Real-time dashboard | Polling sufficient | Phase 2+ |
| M-AI Kernel integration | Phase 2 system, separate | Week 4+ |

---

## Risks & Mitigation

| Risk | Severity | Mitigation |
|---|---|---|
| Overscope (building too much) | High | Stick to MUST-HAVE features, defer SHOULD/NICE-TO-HAVE |
| Time overrun on assessment scoring | Medium | Test scoring logic first (Day 1-2 of Phase 1) |
| Database schema conflicts | Medium | Test migrations on fresh DB before pushing |
| Browser compatibility | Low | Test Chrome, Firefox, Safari during development |
| Security vulnerabilities | High | Run OWASP checklist every 2 days |
| Performance degradation | Medium | Test with 1000+ records in database, profile slow queries |

---

## Success Definition

**Phase 1 is complete when:**
1. ✅ All 12 specification documents written
2. ✅ Code implemented per Implementation Plan
3. ✅ All acceptance criteria met (40+)
4. ✅ All tests passing (unit, integration, UAT)
5. ✅ Security audit passed (OWASP Top 10)
6. ✅ Accessibility audit passed (WCAG AA)
7. ✅ Performance benchmarks met (page load < 2s)
8. ✅ Deployed to production (Railway)
9. ✅ Live at public URL
10. ✅ Monitoring/alerting configured
11. ✅ Product owner sign-off received
12. ✅ Documentation complete (user guide, admin guide)

---

## Next Steps

### Immediately (Now)
- [ ] Engineer (Claude) reviews all 5 specification documents
- [ ] Product Owner (Brian) reviews 01, 10, 11
- [ ] Schedule 30-min sync to confirm no questions

### Week 1 (July 22)
- [ ] Clone existing repo (if it exists) or init new Next.js app
- [ ] Set up GitHub repository
- [ ] Set up Railway project
- [ ] Begin Day 1 tasks (Prisma schema, scoring logic)

### Daily
- [ ] Follow Implementation Plan (Day 1 → Day 21)
- [ ] Commit code to GitHub each day
- [ ] Run tests before stopping for day
- [ ] Update progress in this document

### End of Week 3 (August 9)
- [ ] All Phase 1 code complete
- [ ] All tests passing
- [ ] Product deployed to production
- [ ] Product owner sign-off
- [ ] Begin Phase 2 (M-AI Kernel) planning

---

## Contact & Escalation

**Questions about Phase 1 specifications:**
- Review relevant specification document
- If still unclear, escalate to product owner

**Blockers during implementation:**
- Document blocker, reason, impact
- Propose mitigation
- Escalate if cannot be resolved

**Sign-off authority:** Brian Olea (Product Owner)

---

**Phase 1 Specifications: FINAL & READY FOR IMPLEMENTATION**

Version: 1.0  
Date: 2026-07-22  
Status: APPROVED FOR BUILD  

---
