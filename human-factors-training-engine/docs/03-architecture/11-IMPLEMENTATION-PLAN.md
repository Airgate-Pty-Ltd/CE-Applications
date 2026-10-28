# Phase 1 Implementation Plan — 3-Week Build Schedule
**Phase:** 1 (Weeks 1-3)  
**Scope:** Detailed task breakdown, dependencies, deliverables  
**Status:** Ready for Execution  
**Date:** 2026-07-22  

---

## Overview

**Goal:** Complete web training platform MVP (5 courses, assessments, certificates, admin dashboard)  
**Timeline:** 21 days (3 weeks)  
**Team:** Claude (engineer)  
**Methodology:** Incremental delivery, daily testing  

---

## Week 1: Assessment Engine & Dashboard

### Day 1-2: Assessment Engine Foundation
**Tasks:**
- [ ] Create `prisma/schema.prisma` extensions:
  - [ ] Assessment model
  - [ ] AssessmentQuestion model
  - [ ] AssessmentAttempt model
  - [ ] CourseEnrollment model
  - [ ] LessonCompletion model
- [ ] Run `prisma migrate dev` to apply schema
- [ ] Create `/lib/scoring.ts`:
  - [ ] `calculateScore(responses, questions)` function
  - [ ] `determinePassed(score, passingThreshold)` function
  - [ ] Test cases for scoring logic
- [ ] **Deliverable:** Assessment data model + scoring logic tests passing

**Success Criteria:**
- [ ] Prisma migrations apply without errors
- [ ] Unit tests for scoring: 10/10 passing
- [ ] Can query assessments from DB

---

### Day 3: Assessment API Routes
**Tasks:**
- [ ] Create `/api/assessments/[id]/start/route.ts`:
  - [ ] Fetch assessment + questions
  - [ ] Randomize question order per learner
  - [ ] Fetch assessment attempt with learner context
  - [ ] Return: { attemptId, questions[], timeLimit }
- [ ] Create `/api/assessments/[id]/submit/route.ts`:
  - [ ] Validate learner is logged in
  - [ ] Validate assessment attempt exists
  - [ ] Call `calculateScore()` from lib
  - [ ] Create/update AssessmentAttempt record
  - [ ] Return: { score, passed, results[] }
- [ ] Test with Postman/curl
- [ ] **Deliverable:** Assessment APIs working, can start and submit

---

### Day 4-5: Learner Dashboard UI
**Tasks:**
- [ ] Create `/app/dashboard/page.tsx`:
  - [ ] Fetch learner's enrollments
  - [ ] Display CourseCard component for each
  - [ ] Show progress bar (lessons completed / total)
  - [ ] Show assessment status badge
  - [ ] Show due date if set
- [ ] Create `/components/CourseCard.tsx`:
  - [ ] Course title, description thumbnail
  - [ ] Progress bar with %
  - [ ] Assessment status (Not Started, In Progress, Passed, Failed)
  - [ ] "View Course" button
  - [ ] "View Certificate" button (if passed)
- [ ] Create `/components/ProgressBar.tsx`:
  - [ ] Display % complete
  - [ ] Color coding (yellow < 50%, green >= 80%, blue 50-80%)
- [ ] Test on desktop, tablet, mobile
- [ ] **Deliverable:** Dashboard renders, shows enrolled courses with progress

---

## Week 2: Assessment UI & Certificates

### Day 1-2: Assessment Question UI
**Tasks:**
- [ ] Create `/app/assessments/[id]/page.tsx`:
  - [ ] Display "Take Assessment" page
  - [ ] Show progress: "Question 5 of 20"
  - [ ] Display one question at a time (or all, learner choice)
- [ ] Create `/components/AssessmentQuestion.tsx`:
  - [ ] Render question text (Markdown support for italics, bold)
  - [ ] Multiple choice: show 4 radio buttons with options
  - [ ] Scenario: show 4 radio buttons with scenario outcomes
  - [ ] Short answer: show text input field
  - [ ] Allow user to select/change answer before submit
- [ ] Create `/components/AssessmentForm.tsx`:
  - [ ] Iterate through questions
  - [ ] Show submit button
  - [ ] Validate all questions answered before allow submit
  - [ ] Display timer (if timeLimit set)
- [ ] Test answering 20 questions end-to-end
- [ ] **Deliverable:** Can take full 20-question assessment

---

### Day 3: Assessment Results & Score Display
**Tasks:**
- [ ] Create `/app/assessments/[id]/results/page.tsx`:
  - [ ] Display score (e.g., "82%")
  - [ ] Show pass/fail status (green/red)
  - [ ] Display score breakdown:
    - [ ] Total points possible (100)
    - [ ] Passing points needed (80)
    - [ ] Your points earned (82)
  - [ ] If passed: show "Certificate Ready" button
  - [ ] If failed: show "Retake available in 24 hours" message
- [ ] Test passed and failed scenarios
- [ ] **Deliverable:** Score display working correctly

---

### Day 4-5: Certificate Generation
**Tasks:**
- [ ] Create `/lib/certificate.ts`:
  - [ ] `generateCertificateCode(learnerId, courseId)` → SHA-256 hash
  - [ ] `generateCertificatePDF(learner, course, score, date)` → PDF buffer
  - [ ] Use jsPDF library for PDF generation
- [ ] Create `prisma/schema.prisma` Certificate model:
  - [ ] certificateCode (unique)
  - [ ] issuedAt, expiresAt
  - [ ] pdfUrl, publicUrl
  - [ ] downloadedAt
- [ ] Create `/api/certificates/[id]/pdf/route.ts`:
  - [ ] Serve PDF for download
  - [ ] Set correct headers (Content-Type: application/pdf)
  - [ ] Update downloadedAt timestamp
- [ ] Create `/app/certificates/[id]/page.tsx`:
  - [ ] Display certificate preview (iframe or image)
  - [ ] Show download button
  - [ ] Show public share link (copy to clipboard)
- [ ] Test certificate generation on pass
- [ ] Test PDF download works on multiple browsers
- [ ] **Deliverable:** Certificate generated and downloadable

---

## Week 3: Admin Dashboard & Reports

### Day 1-2: Admin User Management
**Tasks:**
- [ ] Create `/app/admin/users/page.tsx`:
  - [ ] Display table of all users (learners, trainers, admins)
  - [ ] Show: email, name, role, isActive, actions
  - [ ] Create "Add User" button
- [ ] Create `/app/admin/users/create/page.tsx`:
  - [ ] Form: email, name, role (dropdown), password
  - [ ] Submit creates user in DB (bcryptjs hash)
  - [ ] Redirect to users list on success
- [ ] Create `/api/admin/users/route.ts`:
  - [ ] POST to create user (validate email unique)
  - [ ] GET to list users (paginated)
- [ ] Test user creation and listing
- [ ] **Deliverable:** Can create and view users

---

### Day 3: Enrollment Management
**Tasks:**
- [ ] Create `/app/admin/enrollments/page.tsx`:
  - [ ] Display table: learner, course, enrolled date, due date, status
  - [ ] "Enroll Learner" button
  - [ ] "Bulk Enroll" button (CSV upload)
- [ ] Create `/app/admin/enrollments/create/page.tsx`:
  - [ ] Form: select learner + course
  - [ ] Optional: set due date
  - [ ] Submit POST to API
- [ ] Create `/api/admin/enrollments/route.ts`:
  - [ ] POST to create enrollment (check learner not already enrolled)
  - [ ] GET to list enrollments
  - [ ] DELETE to un-enroll
- [ ] Test enrollment creation and listing
- [ ] **Deliverable:** Can enroll learners in courses

---

### Day 4: Reports & Analytics
**Tasks:**
- [ ] Create `/app/admin/reports/page.tsx`:
  - [ ] Dropdown: select report type (Completion, Scores, Overdue)
  - [ ] Date range filters (from/to)
  - [ ] "Generate Report" button
  - [ ] Display table with results
- [ ] Create `/api/admin/reports/completion/route.ts`:
  - [ ] Query: enrollments, completions, assessments
  - [ ] Calculate: % completion per course, avg score, pass rate
  - [ ] Return: JSON data
- [ ] Create `/api/admin/reports/export/route.ts`:
  - [ ] Generate CSV from report data
  - [ ] Set Content-Type: text/csv
  - [ ] Return downloadable file
- [ ] Test report generation and CSV export
- [ ] **Deliverable:** Reports generating, data exporting to CSV

---

### Day 5: Testing, Bug Fixes, Deployment
**Tasks:**
- [ ] Run full manual test checklist (Day 1-2 scenarios)
  - [ ] Login/logout
  - [ ] Complete course, take assessment, pass/fail
  - [ ] Download certificate
  - [ ] Admin enroll learners
  - [ ] View reports
- [ ] Run security tests:
  - [ ] SQL injection attempts
  - [ ] XSS attempts
  - [ ] CSRF validation
  - [ ] Authorization checks (learner can't access other learner's data)
- [ ] Fix any bugs found (prioritize critical/major)
- [ ] Performance check (Lighthouse, DevTools)
- [ ] Mobile responsiveness check (375px, 768px, 1280px)
- [ ] Deploy to Railway:
  - [ ] Push to GitHub
  - [ ] Verify Railway deploys automatically
  - [ ] Test at production URL
  - [ ] Verify database backed up
- [ ] Create monitoring/alerting (Sentry, uptime checks)
- [ ] **Deliverable:** Production deployment successful, all tests passing

---

## Daily Standdown Checklist

**Each day, before stopping:**
- [ ] Code committed and pushed to GitHub
- [ ] Tests passing (unit + integration)
- [ ] No console errors or warnings
- [ ] Manual testing of feature completed
- [ ] README updated if needed
- [ ] Comments added to complex logic
- [ ] Security considerations reviewed (if sensitive code)

---

## Dependency Map (Order of Work)

```
Day 1-2: Assessment schema
         ↓
Day 3: Assessment APIs (depends on schema)
       ↓
Day 4-5: Dashboard UI (depends on APIs)
         ↓
Week 2, Day 1-2: Assessment question UI (depends on APIs)
                 ↓
Week 2, Day 3: Results display (depends on question UI)
               ↓
Week 2, Day 4-5: Certificate (depends on schema + APIs)
                 ↓
Week 3, Day 1-2: Admin users (independent, can run in parallel with week 2)
                 ↓
Week 3, Day 3: Enrollment (depends on admin users)
               ↓
Week 3, Day 4: Reports (depends on enrollments)
               ↓
Week 3, Day 5: Testing + deployment (depends on all above)
```

---

## Blockers & Mitigation

| Risk | Mitigation |
|---|---|
| PDF generation library not working | Try jsPDF, pdfkit, or HTML-to-PDF service in advance |
| Database schema conflicts | Test migrations on fresh DB first |
| Performance slow on large datasets | Add indexes to DB queries, test with 1000+ records |
| Browser compatibility issues | Test in Chrome, Firefox, Safari during development |
| Time overrun on any day | Cut lower-priority features (email, mobile app, advanced charts) |

---

## Deliverables (End of Week 3)

### Code
- [ ] `/src/app/` — All pages (login, dashboard, courses, assessments, admin)
- [ ] `/src/components/` — All React components
- [ ] `/src/lib/` — Utility functions (scoring, certificates, auth)
- [ ] `/prisma/` — Schema + migrations
- [ ] `/public/` — Static assets (logo, fonts)

### Database
- [ ] PostgreSQL schema on Railway (or SQLite for dev)
- [ ] Demo data seeded (5 courses, 42 lessons, 80 questions, 3 users)
- [ ] Backup strategy configured

### Tests
- [ ] Unit tests (scoring, validation, certificate)
- [ ] Integration tests (API routes)
- [ ] Manual test results (UAT checklist)
- [ ] Security test results

### Documentation
- [ ] README.md (setup, running locally, deployment)
- [ ] User Guide (how to take course, download certificate)
- [ ] Admin Guide (enroll learners, view reports)
- [ ] API documentation (endpoints, request/response examples)

### Deployment
- [ ] Live at: https://[domain]
- [ ] SSL certificate configured
- [ ] Database backups automated
- [ ] Monitoring/alerting configured
- [ ] GitHub repository ready (before Phase 2)

---

## Success Criteria (Phase 1 Complete)

```
✅ 5 courses with 42 lessons embedded and seeded
✅ Learners can log in and see dashboard
✅ Learners can view courses and mark lessons complete
✅ Learners can take 20-question assessment
✅ Scoring works correctly (80% pass threshold)
✅ Certificates auto-generated and downloadable
✅ Admin can enroll learners in courses
✅ Admin can view completion reports and export to CSV
✅ All routes protected with authentication
✅ Zero SQL injection, XSS, or CSRF vulnerabilities
✅ Mobile responsive (works on 375px+ screens)
✅ Performance: page load < 2s, API response < 1s
✅ Deployed to production (Railway) and live
✅ All unit/integration tests passing
✅ UAT scenarios completed successfully
```

---

## Post-Phase-1 (Week 4+)

Once Phase 1 is stable:
- [ ] Monitor production for errors (first 48 hours critical)
- [ ] Fix any emergent bugs
- [ ] Gather learner feedback
- [ ] Begin Phase 2 (Desktop M-AI Kernel engine)

---

**Phase 1 work begins immediately upon director sign-off.**  
**Target completion: 2026-07-29 (Week 3, Friday)**
