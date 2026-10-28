# Phase 1 Product Definition — Web Training Platform
**Project:** Adaptive Human Factors Training Engine  
**Phase:** 1 (Weeks 1-3)  
**Scope:** Web platform with baseline training, assessments, certificates  
**Status:** Specification Document  
**Date:** 2026-07-22  

---

## Product Overview

A web-based training delivery platform for Human Factors continuing education. Learners enroll, complete baseline training courses (5 courses, 42 lessons), pass assessments (80% threshold), and receive certificates of completion.

**Version:** 1.0 MVP  
**Platform:** Web (browser-based)  
**Technology:** Next.js + React + TypeScript + SQLite + Prisma  
**Deployment:** Railway/Vercel  
**Users:** Learners, Training Managers, Administrators  

---

## Phase 1 Deliverables (3 weeks)

### Completed (80% done, exists in codebase):
- ✅ Authentication (login/logout, session management, cookies)
- ✅ Database schema (30+ Prisma models)
- ✅ User roles (Admin, Training Manager, Learner)
- ✅ 5 courses + 42 lessons seeded
- ✅ API routes for basic operations
- ✅ Route protection middleware

### To Complete (weeks 1-3):
- [ ] Assessment engine (question storage, randomization, scoring)
- [ ] Certificate generation (PDF, downloadable)
- [ ] Learner dashboard UI (courses, progress, due dates)
- [ ] Admin dashboard (enrollment, reports, user management)
- [ ] Training Manager dashboard (course editing, learner management)
- [ ] Completion tracking & records
- [ ] Remediation logic (failed assessments trigger retake)
- [ ] E-mail notifications (enrollment, completion, low scores)
- [ ] Export/reporting (CSV downloads, completion reports)

---

## User Roles & Permissions

### Learner
- View assigned courses
- View course progress
- Complete lessons (mark complete)
- Take assessments
- View assessment scores
- Download certificates
- View completion history
- **Cannot:** Enroll themselves, approve content, manage users

### Training Manager
- Enroll learners in courses
- View learner progress
- View completion reports
- Assign remediation
- Create course announcements
- **Cannot:** Modify course content, manage users, approve releases

### Administrator
- All Training Manager permissions, plus:
- Create/edit users
- Manage user roles
- Create/edit courses (for Phase 2)
- View audit logs
- Configure system settings
- Manage backups

---

## Learner Journey (MVP)

```
1. REGISTRATION
   ├─ Admin creates user or learner self-registers
   ├─ Email verification (optional for MVP)
   └─ Default assigned to learner role

2. DASHBOARD
   ├─ View "My Courses" (assigned courses)
   ├─ See progress bar per course (% lessons complete)
   ├─ See "Due Date" if set
   └─ See assessment status (not started, in progress, passed, failed)

3. COURSE LAUNCH
   ├─ Click course → see lesson list
   ├─ Click lesson → view lesson content (Markdown rendered)
   ├─ Click "Mark Complete" → record completion
   └─ Auto-unlock next lesson

4. ASSESSMENT
   ├─ Click "Take Assessment" → start quiz
   ├─ Answer 20 scenario-based questions
   ├─ Submit answers
   ├─ See score immediately
   ├─ If score ≥ 80% → PASS → unlock certificate
   ├─ If score < 80% → FAIL → show score breakdown
   └─ Can retake (scheduler limits to 2 attempts per 24 hours)

5. CERTIFICATE
   ├─ On pass, certificate page auto-generates
   ├─ Show learner name, course name, completion date, score
   ├─ Include TPECS/CEU credit info
   ├─ Downloadable as PDF
   └─ Shareable link (public view without login)

6. COMPLETION RECORD
   ├─ Record stored: learner, course, completion date, assessment score, certificate ID
   ├─ Audit trail: when completed, by whom, what version of course
   └─ Effectiveness tracking ready (Phase 2 data input)
```

---

## Data Model (Expanded from Existing)

### Core Entities (Already Exist)
```
User
├─ id, email, passwordHash, role
├─ isActive, createdAt, updatedAt
└─ Sessions (cookies)

Course
├─ id, title, description, version
├─ isPublished, isBaselineContent
├─ createdAt, updatedAt
└─ Lessons[]

Lesson
├─ id, courseId, title, content (Markdown)
├─ order, isPublished
├─ createdAt, updatedAt
└─ Assessments[]
```

### To Create (Assessment & Completion)
```
Assessment
├─ id, lessonId, title, passingScore (default 80%)
├─ assessmentType: "quiz" | "practical" | "scenario"
├─ timeLimit (minutes, optional)
├─ createdAt, updatedAt
└─ Questions[]

AssessmentQuestion
├─ id, assessmentId, question text
├─ questionType: "multiChoice" | "scenario" | "shortAnswer"
├─ options[] (for multiChoice)
├─ correctAnswer, explanation
├─ order, points
└─ createdAt

AssessmentAttempt
├─ id, learnerId, assessmentId
├─ startedAt, submittedAt, score, passed
├─ responses[] (answers given)
├─ createdAt

CourseEnrollment
├─ id, learnerId, courseId
├─ enrolledAt, completedAt, status
├─ currentLessonIndex, progressPercent
├─ createdAt, updatedAt

LessonCompletion
├─ id, learnerId, lessonId, courseId
├─ completedAt, timeTaken (seconds)
├─ createdAt

Certificate
├─ id, learnerId, courseId, assessmentAttemptId
├─ certificateCode (unique, shareable)
├─ issuedAt, expiresAt (optional)
├─ downloadedAt
├─ pdfUrl, publicUrl
├─ createdAt
```

---

## Assessment Design (20 questions per course)

**Question Types:**
1. **Scenario-based** (60%) — "An aircraft is being inspected when a technician notices [situation]. What is the most appropriate Human Factors consideration?" → 4 options, 1 correct
2. **Knowledge check** (25%) — "Which of the following is a latent condition in human factors?" → 4 options, 1 correct
3. **Short answer** (15%) — "Describe how fatigue affects situational awareness." → Graded against rubric keywords

**Scoring:**
- Each question worth 5 points (20 × 5 = 100)
- Scenario-based: 5 or 0 points (no partial credit)
- Knowledge check: 5 or 0 points
- Short answer: 5, 3, or 0 points (reviewed by system keyword matching or manual review)
- **Passing:** ≥80 points (16/20 or equivalent)

**Question Bank (seeded):**
- AQ-083: 20 questions (already written, in materials)
- AQ-086: 20 questions (already written, in materials)
- AQ-160: 20 questions (already written, in materials)
- AQ-050: 20 questions (already written, in materials)
- **Total:** 80 questions across 4 courses (AQ-166 deferred to Phase 2)

---

## API Endpoints (Complete by Week 3)

### Authentication
```
POST   /api/auth/login              → { email, password } → { token, user }
POST   /api/auth/logout             → clears session
POST   /api/auth/register           → { email, password, name } → { user }
GET    /api/auth/me                 → { currentUser }
```

### Courses & Lessons
```
GET    /api/courses                 → { courses[] }
GET    /api/courses/:id             → { course, lessons[] }
GET    /api/courses/:id/lessons     → { lessons[] }
GET    /api/lessons/:id             → { lesson, content }
POST   /api/lessons/:id/complete    → mark lesson complete
```

### Assessments
```
GET    /api/assessments/:id         → { assessment, questions[] }
POST   /api/assessments/:id/start   → { attemptId, questions[] }
POST   /api/assessments/:id/submit  → { responses[] } → { score, passed, results }
GET    /api/assessments/:id/results → { attempts[], scores }
```

### Enrollment & Progress
```
GET    /api/learner/enrollments     → { enrolledCourses[] }
GET    /api/learner/progress/:id    → { courseId, lessonsCompleted, assessmentStatus }
POST   /api/learner/enroll          → { courseId } → enrollment record
GET    /api/learner/certificates    → { certificates[] }
```

### Admin/Training Manager
```
POST   /api/admin/enroll-learner    → { learnerId, courseId } → enrollment
GET    /api/admin/reports/completion → { completionData, CSV export }
GET    /api/admin/learners          → { learners[], filters }
POST   /api/admin/users             → create user
```

### Certificates
```
GET    /api/certificates/:id        → { certificate, learner, course, score }
GET    /api/certificates/:id/pdf    → PDF download
GET    /public/certificates/:code   → public view (no auth required)
```

---

## UI Components (React)

### Pages
- `/login` — Login form
- `/register` — Sign-up form (if enabled)
- `/dashboard` — Learner dashboard (course list, progress)
- `/courses/:id` — Course detail (lesson list, start assessment)
- `/lessons/:id` — Lesson content (Markdown rendered, mark complete button)
- `/assessments/:id` — Assessment UI (questions, timer, submit)
- `/assessments/:id/results` — Score report (breakdown, pass/fail, next steps)
- `/certificates/:id` — Certificate display (shareable, downloadable)
- `/admin/dashboard` — Admin controls
- `/admin/learners` — Learner management
- `/admin/reports` — Completion reports

### Components
```
CourseCard              ← Displays course tile (title, progress bar, enrollment date)
LessonList             ← Lists lessons with checkboxes for completion
LessonContent          ← Renders Markdown, "mark complete" button
AssessmentQuestion    ← Single question display (options, input field)
AssessmentForm        ← Full assessment (20 questions, timer, submit button)
ProgressBar           ← Lesson completion %
CertificateDisplay    ← PDF preview + download link
LearnerDashboard      ← Main learner view (enrolled courses, progress, certificates)
AdminDashboard        ← System-wide stats (enrollments, completions, reports)
```

---

## Database Initialization

**Seeding (already mostly done):**
- Users: 3 demo accounts (admin, training manager, learner)
- Courses: 5 courses (AQ-083, AQ-086, AQ-160, AQ-050, AQ-166 defer)
- Lessons: 42 lessons across 5 courses
- Questions: 80 assessment questions (4 courses × 20 questions)
- Enrollments: Demo learner enrolled in all 5 courses

**Schema (Prisma migrations):**
- Existing: User, Course, Lesson
- New: Assessment, AssessmentQuestion, AssessmentAttempt, CourseEnrollment, LessonCompletion, Certificate

---

## Success Criteria (Phase 1 Complete)

- [ ] All 5 courses render without errors
- [ ] Learner can log in, see dashboard, view courses
- [ ] Learner can mark lessons complete (tracked in database)
- [ ] Learner can start, take, and submit assessments
- [ ] Assessment scoring works (80% threshold)
- [ ] Passing assessment unlocks certificate
- [ ] Certificate displays with learner name, course, date, score
- [ ] Certificate downloadable as PDF
- [ ] Admin can view learner progress reports
- [ ] Completion records stored with timestamp and learner ID
- [ ] No security vulnerabilities (auth, XSS, SQL injection checks)
- [ ] Responsive design (works on mobile, tablet, desktop)
- [ ] Local testing complete (Chrome, Firefox, Safari if macOS)
- [ ] Deployment to Railway successful
- [ ] Public URL accessible
- [ ] All routes protected (auth required where needed)

---

## Non-Functional Requirements

### Performance
- Page load < 2 seconds (assessed)
- Assessment submit → score display < 1 second
- Course list load < 1 second

### Security
- All passwords hashed (bcryptjs, 10+ rounds)
- Session cookies httpOnly, secure (production)
- CSRF protection on forms
- SQL injection prevention (Prisma ORM)
- XSS protection (React escape + CSP headers)

### Availability
- Uptime: 99% during business hours
- Database: SQLite (production-ready, backed up daily)
- Backup strategy: Weekly snapshots, retain 30 days

### Compliance
- GDPR ready (learner data export, right to delete)
- Audit trail (who accessed what, when)
- Certificate integrity (tamper-evident code)

---

## Known Limitations (MVP)

- No email notifications (Phase 2)
- No live chat/support (Phase 2)
- No mobile app (web responsive only)
- Single language (English only)
- Assessment questions not randomized (same order per learner)
- No adaptive difficulty (all learners see same questions)
- No real-time collaboration features
- Certificate expiration not enforced
- No SSO/SAML integration (Phase 2)

---

## Deployment (End of Week 3)

**Infrastructure:**
- Framework: Next.js 14+ (ESM)
- Database: SQLite (local dev) → PostgreSQL (production)
- Hosting: Railway (Node.js + PostgreSQL)
- DNS: Custom domain (Conform-Edge domain)
- SSL: Automatic (Let's Encrypt via Railway)

**Environment Variables (production):**
```
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=[generated]
COOKIE_SECURE=true
NEXTAUTH_URL=https://[domain]
```

**Build & Deploy:**
```bash
npm run build                    # Verify build succeeds
npm run start                    # Test production build locally
# Deploy to Railway via GitHub
git push origin main             # Triggers Railway auto-deploy
# Verify at https://[domain]/login
```

---

## Timeline (3 Weeks)

### Week 1
- Day 1-2: Finish assessment engine (storage, scoring logic)
- Day 3-4: Build learner dashboard UI
- Day 5: Assessment UI (question display, submit, scoring)

### Week 2
- Day 1-2: Certificate generation (PDF, download, storage)
- Day 3: Admin/Training Manager dashboards
- Day 4-5: Integration testing (end-to-end flows)

### Week 3
- Day 1-2: Security audit, bug fixes
- Day 3: Performance testing, optimization
- Day 4: Deployment to Railway, production testing
- Day 5: Go-live, monitoring setup

---

## Phase 1 Sign-Off Checklist

- [ ] All acceptance criteria met
- [ ] Security review complete (no vulnerabilities)
- [ ] Performance benchmarks met
- [ ] Database backups configured
- [ ] Monitoring/alerts set up (errors, uptime)
- [ ] Documentation complete (user guide, admin guide)
- [ ] Product can be demonstrated to stakeholders
- [ ] Ready for Phase 2 (integration with M-AI Kernel)

---

**Next Document:** 02-FUNCTIONAL-REQUIREMENTS.md
