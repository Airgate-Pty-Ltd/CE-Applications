# Phase 1 Functional Requirements — Web Training Platform
**Phase:** 1 (Web Platform MVP)  
**Scope:** Detailed requirements for assessment, certificate, dashboard, and admin features  
**Status:** Specification  
**Date:** 2026-07-22  

---

## Functional Requirements by Feature

### FR-1: Authentication & Session Management

**Requirement:** Users log in with email/password, receive HTTP-only session cookie, can log out.

| ID | Requirement | Type |
|---|---|---|
| FR-1.1 | Login form accepts email + password | Page |
| FR-1.2 | Invalid credentials show error message | UI |
| FR-1.3 | Successful login redirects to /dashboard | Flow |
| FR-1.4 | Session cookie persists for 7 days or until logout | Config |
| FR-1.5 | Logout clears session cookie | Action |
| FR-1.6 | Protected routes redirect to /login if not authenticated | Middleware |
| FR-1.7 | User can remain logged in across browser sessions (cookie persists) | Behavior |
| FR-1.8 | Session expires after 30 minutes of inactivity | Config |
| FR-1.9 | Passwords stored as bcryptjs hash (10+ rounds) | Security |
| FR-1.10 | Password minimum 8 characters, at least 1 uppercase, 1 number | Validation |

---

### FR-2: Learner Dashboard

**Requirement:** Authenticated learners see dashboard with enrolled courses, progress, and assignment status.

| ID | Requirement | Type |
|---|---|---|
| FR-2.1 | Dashboard displays "My Courses" list | Layout |
| FR-2.2 | Each course shows: title, progress bar (%), lessons completed | Card |
| FR-2.3 | Each course shows due date (if set by Training Manager) | Card |
| FR-2.4 | Each course shows assessment status: "Not Started" \| "In Progress" \| "Passed" \| "Failed" | Status |
| FR-2.5 | Clicking course card opens course detail page | Navigation |
| FR-2.6 | Progress bar shows lessons completed / total lessons | Calculation |
| FR-2.7 | "View Certificate" button appears if assessment passed | Conditional |
| FR-2.8 | Dashboard shows "No courses assigned" if learner not enrolled | Message |
| FR-2.9 | Enrollments sorted by due date (ascending) | Sorting |
| FR-2.10 | Page refreshes data on load (not cached) | Behavior |

---

### FR-3: Course & Lesson Viewing

**Requirement:** Learners open courses and view lessons sequentially.

| ID | Requirement | Type |
|---|---|---|
| FR-3.1 | Course page shows lesson list (sequential order) | Layout |
| FR-3.2 | Completed lessons show checkmark icon | Visual |
| FR-3.3 | Uncompleted lessons show lock icon (if prerequisite not met) | Visual |
| FR-3.4 | Learner can click lesson to view content | Navigation |
| FR-3.5 | Lesson content renders Markdown formatting (bold, italics, lists, links) | Rendering |
| FR-3.6 | Lesson includes scenario examples, case studies, questions | Content |
| FR-3.7 | "Mark Complete" button records completion with timestamp | Action |
| FR-3.8 | Cannot skip forward (must complete lessons 1→2→3 sequence) | Business Rule |
| FR-3.9 | Lesson content does not include answers to assessment questions | Content |
| FR-3.10 | Lesson can include embedded scenarios, decision trees (branching optional) | Content |

---

### FR-4: Assessment Engine

**Requirement:** Learners take 20-question assessments, receive immediate scoring, can retake if failed.

| ID | Requirement | Type |
|---|---|---|
| FR-4.1 | Assessment unlocks after completing all lessons | Business Rule |
| FR-4.2 | Learner clicks "Take Assessment" to start | Action |
| FR-4.3 | Assessment displays 1 question at a time (or all on one page, learner choice) | UI |
| FR-4.4 | Questions randomized per learner (not in same order each time) | Behavior |
| FR-4.5 | Question types: multiple choice (4 options), scenario (4 options), short answer | Type |
| FR-4.6 | Multiple choice questions: 1 correct answer selected = 5 points | Scoring |
| FR-4.7 | Scenario questions: 1 correct choice = 5 points | Scoring |
| FR-4.8 | Short answer: rubric-based scoring (5 pts, 3 pts, 0 pts) via keyword matching | Scoring |
| FR-4.9 | Timer optional (displayed if assessmentType includes time limit) | Display |
| FR-4.10 | Learner can review answers before submitting (edit mode) | Behavior |
| FR-4.11 | Submit button finalizes assessment (cannot edit after) | Behavior |
| FR-4.12 | System calculates score: sum of points / 100 = % score | Calculation |
| FR-4.13 | Score ≥ 80% shows "PASSED" with green indicator | Pass |
| FR-4.14 | Score < 80% shows "FAILED" with red indicator | Fail |
| FR-4.15 | Failed assessment shows remediation message (e.g., "Study lessons X and Y, retake in 24 hours") | Message |
| FR-4.16 | Learner can retake failed assessment after 24 hours (max 2 attempts per 24h) | Business Rule |
| FR-4.17 | Assessment attempt records: learner, questions asked, answers given, score, timestamp | Data |
| FR-4.18 | Only highest assessment score counts (if multiple attempts) | Calculation |
| FR-4.19 | Score breakdown shows: total points, passing points (80), learner points, % score | Report |
| FR-4.20 | Assessment cannot be started again after passing | Business Rule |

---

### FR-5: Certificate Generation & Display

**Requirement:** Passing assessment triggers certificate generation; learner can download/share.

| ID | Requirement | Type |
|---|---|---|
| FR-5.1 | Certificate generated automatically after passing assessment | Trigger |
| FR-5.2 | Certificate includes: learner name, course name, score, completion date | Content |
| FR-5.3 | Certificate includes TPECS/CEU credit info (9 hours = 0.9 CEU, 9 CPD) | Content |
| FR-5.4 | Certificate includes: "This learner has demonstrated competency in [course]" | Statement |
| FR-5.5 | Certificate includes unique certificate code (unforgeable, e.g., SHA-256 hash) | Security |
| FR-5.6 | Certificate includes Conform-Edge Quality Consulting logo and branding | Branding |
| FR-5.7 | Certificate PDF generated using certificate template (professional layout) | Format |
| FR-5.8 | PDF download available immediately after passing | Behavior |
| FR-5.9 | Certificate also shareable via public URL (no login required to view) | Access |
| FR-5.10 | Public certificate view shows all learner details (name, score, date, course) | Display |
| FR-5.11 | Certificate code verifiable (someone can look up code and confirm authenticity) | Verification |
| FR-5.12 | Certificate stored in database (not regenerated each time) | Persistence |
| FR-5.13 | Learner can download certificate multiple times | Behavior |
| FR-5.14 | Certificate displays download date (when learner downloaded it) | Tracking |
| FR-5.15 | Certificate expires after 3 years (optional enforcement for Phase 2) | Expiration |

---

### FR-6: Completion Records & Audit Trail

**Requirement:** System records all learner activity with timestamps for audit/compliance.

| ID | Requirement | Type |
|---|---|---|
| FR-6.1 | Each lesson completion records: learner ID, lesson ID, completion timestamp | Data |
| FR-6.2 | Each assessment attempt records: learner ID, assessment ID, score, timestamp, attempt # | Data |
| FR-6.3 | Certificate issuance records: learner ID, course ID, certificate ID, issued date | Data |
| FR-6.4 | User login/logout recorded: user ID, timestamp, action | Audit |
| FR-6.5 | Admin actions recorded: who enrolled learner, who changed course, when | Audit |
| FR-6.6 | All records include: actor, action, object, timestamp, system version | Audit |
| FR-6.7 | Audit log cannot be edited by normal users (append-only) | Security |
| FR-6.8 | Audit log exportable as CSV for compliance review | Export |
| FR-6.9 | Learner can request export of their completion records (GDPR) | Privacy |
| FR-6.10 | Completion records retained for 7 years minimum | Retention |

---

### FR-7: Admin Enrollment & User Management

**Requirement:** Admin can enroll learners in courses, manage user accounts.

| ID | Requirement | Type |
|---|---|---|
| FR-7.1 | Admin can view list of all users (learners, trainers, admins) | View |
| FR-7.2 | Admin can create new user (email, name, role, password) | Action |
| FR-7.3 | Admin can deactivate/reactivate users | Action |
| FR-7.4 | Admin can reset user password (temporary password sent via email) | Action |
| FR-7.5 | Admin can enroll learner in single course | Action |
| FR-7.6 | Admin can bulk-enroll learners (CSV upload: email, course ID) | Action |
| FR-7.7 | Admin can set course due date per learner or per cohort | Action |
| FR-7.8 | Admin can un-enroll learner from course | Action |
| FR-7.9 | Admin can view all active enrollments (learner, course, enrolled date, due date) | View |
| FR-7.10 | Admin can export enrollment list as CSV | Export |
| FR-7.11 | Admin can create user cohort (group of learners, e.g., "Quality Team 2026") | Action |
| FR-7.12 | Admin can bulk-enroll cohort in course | Action |
| FR-7.13 | Admin actions logged (who enrolled whom, when) | Audit |
| FR-7.14 | Cannot create user with duplicate email | Validation |
| FR-7.15 | User deletion not permitted (only deactivation) | Business Rule |

---

### FR-8: Reports & Analytics (Admin/Training Manager)

**Requirement:** Training Manager views completion reports, trends, learner progress.

| ID | Requirement | Type |
|---|---|---|
| FR-8.1 | Report: "Completion by Course" (% completion, # learners passed/failed) | Report |
| FR-8.2 | Report: "Learner Progress" (individual learner, lessons completed, assessment status) | Report |
| FR-8.3 | Report: "Assessment Scores" (course, average score, pass rate, score distribution) | Report |
| FR-8.4 | Report: "Overdue Learners" (course, due date, who hasn't completed by date) | Report |
| FR-8.5 | Report: "Certificates Issued" (course, # certificates, date range) | Report |
| FR-8.6 | All reports filterable by: date range, course, learner, role | Filter |
| FR-8.7 | All reports exportable as CSV | Export |
| FR-8.8 | Reports display in dashboard (charts, tables) | Display |
| FR-8.9 | Dashboard shows key metrics: total enrollments, completions this week, avg score | KPI |
| FR-8.10 | Reports auto-refresh hourly (or on-demand refresh button) | Behavior |

---

### FR-9: Remediation (Failed Assessments)

**Requirement:** Learners who fail assessment can retake; system enforces rules.

| ID | Requirement | Type |
|---|---|---|
| FR-9.1 | Failed assessment shows: score, passing score (80), gap (e.g., "need 4 more points") | Message |
| FR-9.2 | Failed assessment shows: recommended review lessons (e.g., "Review Lesson 3, 5") | Message |
| FR-9.3 | Learner cannot retake immediately (24-hour waiting period) | Business Rule |
| FR-9.4 | Retake button becomes active after 24 hours | UI |
| FR-9.5 | Max 2 assessment attempts per 24 hours (prevent test-to-exhaustion) | Business Rule |
| FR-9.6 | Training Manager can assign manual remediation (extra lessons, reading) | Action |
| FR-9.7 | Manual remediation recorded: assigned by, date, remediation content | Data |
| FR-9.8 | After passing retake, certificate issued (replaces previous attempt record) | Behavior |
| FR-9.9 | Highest score used for certificate (if multiple attempts) | Rule |
| FR-9.10 | Failed assessment data used for effectiveness review (Phase 2) | Noted |

---

### FR-10: Responsive Design & Accessibility

**Requirement:** Platform works on desktop, tablet, mobile; accessible to all users.

| ID | Requirement | Type |
|---|---|---|
| FR-10.1 | All pages responsive (mobile 375px+, tablet 768px+, desktop 1280px+) | Design |
| FR-10.2 | Touch-friendly buttons and links (min 44px × 44px) | Accessibility |
| FR-10.3 | Color contrast meets WCAG AA (4.5:1 for text) | Accessibility |
| FR-10.4 | All interactive elements keyboard navigable (Tab, Enter, Escape) | Accessibility |
| FR-10.5 | Form labels associated with inputs (for screen readers) | Accessibility |
| FR-10.6 | Images include alt text | Accessibility |
| FR-10.7 | Assessment questions readable on small screens | Usability |
| FR-10.8 | Certificate readable and downloadable on mobile | Usability |
| FR-10.9 | No horizontal scroll required (content fits width) | Usability |
| FR-10.10 | Focus indicators visible on all interactive elements | Accessibility |

---

### FR-11: Security

**Requirement:** System protects user data, prevents unauthorized access, prevents attacks.

| ID | Requirement | Type |
|---|---|---|
| FR-11.1 | All passwords hashed with bcryptjs (10+ rounds) | Security |
| FR-11.2 | Passwords never logged or displayed in plain text | Security |
| FR-11.3 | Session cookies httpOnly=true (XSS protection) | Security |
| FR-11.4 | Session cookies secure=true in production (HTTPS only) | Security |
| FR-11.5 | CSRF tokens on all forms (POST, PUT, DELETE) | Security |
| FR-11.6 | All API endpoints validate input (no SQL injection, XSS) | Security |
| FR-11.7 | Rate limiting on login endpoint (max 5 attempts per 15 min per IP) | Security |
| FR-11.8 | Admin actions require re-authentication (password prompt) for sensitive actions | Security |
| FR-11.9 | Sensitive data (passwords, API keys) not in logs or error messages | Security |
| FR-11.10 | Database backups encrypted at rest | Security |
| FR-11.11 | TLS 1.2+ required (no old SSL/TLS versions) | Security |
| FR-11.12 | Security headers set: CSP, X-Frame-Options, X-Content-Type-Options, etc. | Security |
| FR-11.13 | CORS configured to allow only known domains | Security |
| FR-11.14 | Certificate codes cryptographically secure (SHA-256 hash minimum) | Security |
| FR-11.15 | Audit log immutable (append-only, no editing) | Security |

---

### FR-12: Email Notifications (Optional MVP, Can Defer)

**Requirement:** System sends email notifications for key events.

| ID | Requirement | Type |
|---|---|---|
| FR-12.1 | Enrollment email: "You've been enrolled in [Course], due [date]" | Notification |
| FR-12.2 | Completion email: "Certificate ready, download at [link]" | Notification |
| FR-12.3 | Failed assessment email: "Score [X]%, retake available in 24 hours" | Notification |
| FR-12.4 | Overdue reminder email: "Course due in 3 days" | Notification |
| FR-12.5 | Email includes learner name, course name, action link | Content |
| FR-12.6 | Admin can configure email enabled/disabled per event type | Config |
| FR-12.7 | Email templates use Conform-Edge branding | Branding |
| FR-12.8 | Email service: SendGrid, Mailgun, or SMTP | Integration |

---

## Priority Levels

### MUST-HAVE (Weeks 1-3)
- Authentication & sessions
- Course/lesson viewing
- Assessment engine
- Certificate generation
- Admin enrollment
- Basic reports
- Completion records
- Security

### SHOULD-HAVE (Week 4, if time)
- Email notifications
- Bulk enrollment (CSV)
- Advanced reports/charts
- Remediation workflow

### NICE-TO-HAVE (Phase 2+)
- Mobile app
- SSO/SAML
- Adaptive difficulty
- Real-time collaboration
- Language localization
- Custom certificate templates

---

## Acceptance Criteria (Phase 1 Complete)

- [ ] All MUST-HAVE features implemented and tested
- [ ] All security requirements (FR-11) implemented
- [ ] All accessibility requirements (FR-10) verified
- [ ] Zero critical bugs
- [ ] Zero security vulnerabilities (OWASP top 10)
- [ ] Performance benchmarks met (page load < 2s)
- [ ] User acceptance testing passed
- [ ] Documentation complete
- [ ] Deployment successful to production

---

**Next Document:** 03-SYSTEM-ARCHITECTURE.md
