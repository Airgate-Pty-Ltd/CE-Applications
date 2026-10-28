# Phase 1 Test & Acceptance Plan
**Phase:** 1 (Weeks 1-3)  
**Scope:** Testing strategy, acceptance criteria, sign-off requirements  
**Status:** Specification  
**Date:** 2026-07-22  

---

## Testing Strategy

### Unit Tests (Backend Logic)
**Framework:** Jest  
**Coverage Target:** 80% of business logic  
**Examples:**
- `scoring.test.ts` — Assessment scoring logic (80% = pass, < 80% = fail)
- `validation.test.ts` — Input validation (email format, password strength)
- `certificate.test.ts` — Certificate code generation (SHA-256 determinism)
- `auth.test.ts` — Password hashing, session creation

**Command:** `npm test`

### Integration Tests (API Routes)
**Framework:** Jest + fetch  
**Coverage Target:** All critical API routes  
**Examples:**
- Login flow: POST /api/auth/login → verify session cookie
- Course retrieval: GET /api/courses/:id → verify data structure
- Assessment submission: POST /api/assessments/:id/submit → verify scoring
- Certificate generation: trigger and verify PDF creation
- Enrollment: POST /api/enrollments → verify database record

**Command:** `npm test -- api.integration`

### End-to-End Tests (Full Learner Journey)
**Framework:** Playwright or Cypress (optional for MVP, can defer)  
**Scenarios:**
1. **Happy path:** Login → view course → complete lessons → take assessment → pass → download certificate
2. **Failure path:** Login → take assessment → fail → retake after 24h → pass
3. **Admin flow:** Create user → enroll in course → view progress → export report

**Command:** `npm test -- e2e` (if implemented)

### Manual Testing Checklist
**Performed by:** QA tester or product owner  
**Devices:** Desktop (Chrome, Firefox, Safari), Tablet, Mobile  

| Scenario | Steps | Expected Result | Status |
|----------|-------|---|---|
| Login | Enter email/password, click Submit | Redirect to dashboard | ☐ |
| Logout | Click Logout | Redirect to login, cookie cleared | ☐ |
| View Course | Click course card | Lesson list renders | ☐ |
| Complete Lesson | Click "Mark Complete" | Checkbox appears, counter updates | ☐ |
| Start Assessment | Click "Take Assessment" | Q1 displays with options | ☐ |
| Submit Assessment | Answer 20 Qs, click Submit | Score calculated, results shown | ☐ |
| Pass (Score ≥ 80%) | Completion | Certificate page loads | ☐ |
| Fail (Score < 80%) | Completion | "Retake in 24h" message | ☐ |
| Download Certificate | Click Download button | PDF downloads, opens in viewer | ☐ |
| Share Certificate | Copy public link, paste in incognito tab | Certificate visible without login | ☐ |
| Admin Enroll | Admin page, add learner to course | Enrollment record created, learner sees course | ☐ |
| View Report | Admin → Reports → Completion | Data displays, export CSV works | ☐ |
| Mobile Responsiveness | View on mobile (375px) | No horizontal scroll, touch-friendly | ☐ |
| Accessibility | Tab through form, use screen reader | All inputs labeled, focus visible | ☐ |

### Performance Testing
**Metrics:**
- Page load time: < 2 seconds
- Assessment submit: < 1 second
- Certificate generation: < 5 seconds
- Report query: < 3 seconds

**Tool:** Chrome DevTools, Lighthouse

### Security Testing
**Checklist:**
- [ ] SQL injection: Try `'; DROP TABLE users; --` in login field → no error, no data loss
- [ ] XSS: Try `<script>alert('xss')</script>` in name field → script not executed
- [ ] CSRF: POST request without token → rejected with 403
- [ ] Brute force: 6 failed logins → rate limit (401 after 5 attempts)
- [ ] Session fixation: Login with sessionA, check sessionB cannot access account
- [ ] Cookie security: Inspect cookies → httpOnly=true, secure=(production only)
- [ ] Authorization: Learner logs in as user A, tries to access user B's data → 403 Forbidden

---

## Acceptance Criteria (Gate for "Done")

### Feature: Assessment Engine
**AC-1:** Assessment displays 20 questions  
**AC-2:** Each question worth 5 points (100 total)  
**AC-3:** Score ≥ 80 = PASS, < 80 = FAIL  
**AC-4:** Passing assessment triggers certificate creation  
**AC-5:** Failed learner can retake after 24 hours  
**AC-6:** Max 2 attempts per 24 hours enforced  
**AC-7:** Highest score used if multiple attempts  
**AC-8:** Assessment data persisted (attempt not lost on refresh)  

### Feature: Certificate Generation
**AC-1:** Certificate auto-generated after passing assessment  
**AC-2:** Includes: learner name, course name, score, date, code  
**AC-3:** PDF downloadable (works on Chrome, Firefox, Safari, mobile)  
**AC-4:** Public URL shareable (no login required)  
**AC-5:** Certificate code unique and tamper-evident  
**AC-6:** Certificate persisted in database  

### Feature: Learner Dashboard
**AC-1:** Shows all enrolled courses  
**AC-2:** Shows progress bar per course (%)  
**AC-3:** Shows assessment status (Not Started, In Progress, Passed, Failed)  
**AC-4:** Shows due date if set  
**AC-5:** Clicking course opens course detail  
**AC-6:** No courses: shows "No courses assigned"  

### Feature: Admin Enrollment
**AC-1:** Admin can add learner to course (single)  
**AC-2:** Admin can bulk-enroll (CSV upload)  
**AC-3:** Enrollment record created in database  
**AC-4:** Learner sees course on dashboard immediately  
**AC-5:** Can un-enroll learner  
**AC-6:** Can set due date per enrollment  

### Feature: Reports
**AC-1:** Completion report shows % per course  
**AC-2:** Can filter by date range, course, learner  
**AC-3:** Report exportable as CSV  
**AC-4:** Dashboard shows key metrics (completions, avg score)  

### Feature: Security
**AC-1:** No SQL injection vulnerabilities (OWASP Top 10)  
**AC-2:** No XSS vulnerabilities  
**AC-3:** No CSRF vulnerabilities  
**AC-4:** Passwords hashed (never stored plain text)  
**AC-5:** Sessions secure (httpOnly, secure in production)  
**AC-6:** Audit log immutable (append-only)  

### Feature: Accessibility
**AC-1:** WCAG AA color contrast (4.5:1 text)  
**AC-2:** All forms keyboard navigable  
**AC-3:** Images have alt text  
**AC-4:** Focus indicators visible  
**AC-5:** Responsive (375px, 768px, 1280px breakpoints)  

---

## User Acceptance Testing (UAT)

### Test User Roles
| Role | User | Email | Use Case |
|---|---|---|---|
| Learner | Jane Doe | jane.doe@demo.com | Take courses, complete assessments |
| Admin | Bob Admin | admin@demo.com | Enroll users, manage courses |
| Trainer | Sue Coach | trainer@demo.com | View reports, manage content |

### UAT Scenarios (Week 3)

**Scenario 1: Learner Completes Course**
```
1. Jane logs in
2. Sees "AQ-083: Human Factors" in dashboard
3. Clicks course, sees 8 lessons
4. Completes lessons 1-8 (marks complete for each)
5. Sees "Take Assessment" button
6. Takes assessment (20 questions)
7. Scores 82% (PASS)
8. Certificate generated
9. Jane downloads and shares certificate
Expected: Everything works end-to-end, no errors
```

**Scenario 2: Failed Assessment & Retake**
```
1. Jane takes assessment, scores 75% (FAIL)
2. Sees "Retake available in 24 hours"
3. Waits 24 hours (or admin bypasses timer)
4. Retakes assessment, scores 80% (PASS)
5. Certificate issued (replaces previous attempt)
Expected: Highest score used, database updated
```

**Scenario 3: Admin Bulk Enrollment**
```
1. Bob logs in as admin
2. Navigates to Enrollments
3. Uploads CSV: email, courseId (10 learners)
4. System creates 10 enrollment records
5. Each learner sees course on dashboard
Expected: All 10 enrolled, no errors, audit logged
```

**Scenario 4: Report & Export**
```
1. Sue views Completion Report
2. Filters by: course=AQ-083, dateRange=past 7 days
3. Sees: 5 completed, 3 in-progress, 2 failed
4. Clicks "Export CSV"
5. Downloads file, opens in Excel
Expected: Data matches UI, CSV formatted correctly
```

---

## Definition of Done (Phase 1)

```
✅ All features implemented
✅ Unit tests passing (80%+ coverage)
✅ Integration tests passing
✅ Manual test checklist completed
✅ Security tests passed (OWASP Top 10 covered)
✅ Accessibility audit passed (WCAG AA)
✅ Performance benchmarks met
✅ Zero critical bugs
✅ UAT scenarios completed successfully
✅ Documentation written (user guide, admin guide)
✅ Deployment successful to production
✅ Monitoring/alerting configured
✅ Backup strategy verified
✅ Sign-off from product owner (Brian)
```

---

## Defect Severity Levels

| Severity | Definition | Example | Action |
|---|---|---|---|
| **Critical** | System unusable, data loss, security breach | Login broken, data deleted | Fix immediately, cannot ship |
| **Major** | Feature broken or significantly impaired | Assessment scoring wrong, certificate not generated | Fix before ship, or defer feature |
| **Minor** | Feature works but has issues | Button text slightly misaligned, typo in message | Fix if time, can ship with known issue |
| **Trivial** | Cosmetic, no impact on functionality | Slightly wrong shade of blue | Defer to next release |

**Phase 1 Ship Gate:** Zero critical/major bugs. Minor/trivial only.

---

## Sign-Off & Approval

**Product Owner (Brian):** Must approve before any production deployment

**Checklist for Sign-Off:**
- [ ] Reviewed Phase 1 test results
- [ ] Confirmed all acceptance criteria met
- [ ] Verified no critical/major bugs
- [ ] Reviewed security assessment
- [ ] Approved user experience
- [ ] Authorized production deployment

**Signature:** ________________________  **Date:** __________

---

## Regression Testing (Post-Deploy)

**After launching Phase 1, run regression tests weekly:**
- [ ] Login still works
- [ ] Course rendering not broken
- [ ] Assessment scoring correct
- [ ] Certificate generation working
- [ ] Reports showing data
- [ ] No new errors in logs

---

**Next Document:** 11-IMPLEMENTATION-PLAN.md
