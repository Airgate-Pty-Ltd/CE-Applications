# Phase 1 System Architecture — Web Training Platform
**Phase:** 1 (Weeks 1-3)  
**Scope:** Technology stack, layers, deployment architecture  
**Status:** Specification  
**Date:** 2026-07-22  

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER (Client)                      │
│  React Components, TypeScript, Responsive CSS            │
│  Pages: Login, Dashboard, Course, Assessment, Cert       │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS
                           ↓
┌─────────────────────────────────────────────────────────┐
│                  NEXT.JS API SERVER                      │
│  ├─ /api/auth/*           (login, logout)               │
│  ├─ /api/courses/*        (course data)                 │
│  ├─ /api/assessments/*    (questions, scoring)          │
│  ├─ /api/enrollments/*    (enrollment management)       │
│  ├─ /api/reports/*        (admin analytics)             │
│  └─ /api/certificates/*   (PDF generation, download)    │
└──────────────────────────┬──────────────────────────────┘
                           │ SQL Queries
                           ↓
┌─────────────────────────────────────────────────────────┐
│              PRISMA ORM (Data Access Layer)              │
│  Migrations, Schema, Query Builder                       │
└──────────────────────────┬──────────────────────────────┘
                           │ SQL
                           ↓
┌─────────────────────────────────────────────────────────┐
│              DATABASE (SQLite / PostgreSQL)              │
│  Tables: Users, Courses, Lessons, Assessments,          │
│          Enrollments, Completions, Certificates,        │
│          AuditLogs                                       │
└─────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend
- **Framework:** React 18+ (via Next.js)
- **Language:** TypeScript
- **Styling:** Tailwind CSS or CSS Modules
- **State Management:** React Hooks (Context API)
- **HTTP Client:** fetch API (native)
- **Build:** Next.js App Router (ESM)
- **Testing:** Jest + React Testing Library (optional MVP)

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **ORM:** Prisma 5+
- **Authentication:** HTTP-only cookies + bcryptjs
- **PDF Generation:** jsPDF or pdfkit
- **Validation:** Zod or io-ts
- **Testing:** Jest

### Database
- **Development:** SQLite 3 (file-based)
- **Production:** PostgreSQL 14+ (Railway managed)
- **Migrations:** Prisma Migrate
- **Backups:** Automated (Railway handles)

### Deployment
- **Platform:** Railway.app
- **DNS:** Cloudflare (or custom domain)
- **SSL/TLS:** Automatic (Let's Encrypt via Railway)
- **Environment:** Node.js + PostgreSQL service on Railway

### Monitoring & Observability
- **Error Tracking:** Sentry (optional)
- **Logging:** Console logging → Railway logs
- **Analytics:** Google Analytics (optional)
- **Uptime Monitoring:** StatusPage or Checkly (optional)

---

## Project Structure

```
conform-edge-hf-training/
├── public/                      # Static assets (logo, images)
│   ├── conform-edge-logo.png
│   └── certificate-template.png
│
├── src/
│   ├── app/                     # Next.js app router
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Home (redirects to login or dashboard)
│   │   ├── login/page.tsx       # Login page
│   │   ├── register/page.tsx    # Registration (if enabled)
│   │   ├── dashboard/page.tsx   # Learner dashboard
│   │   ├── courses/
│   │   │   └── [courseId]/page.tsx        # Course detail
│   │   ├── lessons/
│   │   │   └── [lessonId]/page.tsx        # Lesson content
│   │   ├── assessments/
│   │   │   └── [assessmentId]/page.tsx    # Take assessment
│   │   ├── assessments/
│   │   │   └── [attemptId]/results.tsx    # Assessment results
│   │   ├── certificates/
│   │   │   └── [certificateId]/page.tsx   # Certificate display
│   │   ├── admin/
│   │   │   ├── dashboard/page.tsx         # Admin dashboard
│   │   │   ├── users/page.tsx             # User management
│   │   │   ├── enrollments/page.tsx       # Enrollment management
│   │   │   ├── reports/page.tsx           # Reports
│   │   │   └── settings/page.tsx          # System settings
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/route.ts
│   │       │   ├── logout/route.ts
│   │       │   └── register/route.ts
│   │       ├── courses/
│   │       │   └── [courseId]/route.ts
│   │       ├── assessments/
│   │       │   ├── [id]/start/route.ts
│   │       │   ├── [id]/submit/route.ts
│   │       │   └── [id]/results/route.ts
│   │       ├── enrollments/
│   │       │   └── route.ts
│   │       ├── reports/
│   │       │   ├── completion/route.ts
│   │       │   ├── scores/route.ts
│   │       │   └── export/route.ts
│   │       └── certificates/
│   │           └── [id]/pdf/route.ts
│   │
│   ├── components/               # Reusable React components
│   │   ├── CourseCard.tsx
│   │   ├── LessonList.tsx
│   │   ├── LessonContent.tsx
│   │   ├── AssessmentQuestion.tsx
│   │   ├── AssessmentForm.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── CertificateDisplay.tsx
│   │   ├── LearnerDashboard.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── ReportTable.tsx
│   │   └── ...more components
│   │
│   ├── lib/                     # Utility functions
│   │   ├── auth.ts              # Authentication helpers
│   │   ├── db.ts                # Prisma client initialization
│   │   ├── scoring.ts           # Assessment scoring logic
│   │   ├── certificate.ts       # Certificate generation
│   │   ├── validation.ts        # Input validation
│   │   ├── pdf.ts               # PDF generation wrapper
│   │   └── constants.ts         # App-wide constants
│   │
│   ├── middleware.ts            # Auth middleware for route protection
│   │
│   └── styles/
│       └── globals.css          # Global styles
│
├── prisma/
│   ├── schema.prisma            # Data model (extended from existing)
│   ├── migrations/              # Schema migrations
│   │   ├── 001_init/migration.sql
│   │   └── ...more migrations
│   └── seed.ts                  # Database seeding (demo data)
│
├── public/
│   └── fonts/                   # Any custom fonts
│
├── .env.local                   # Local environment variables (DEV)
├── .env.production              # Production environment variables
├── .gitignore                   # Ignore node_modules, .env, etc.
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
├── next.config.js               # Next.js configuration
├── jest.config.js               # Jest configuration
├── README.md
└── LICENSE

```

---

## Data Flow

### Login Flow
```
1. User enters email + password on /login
2. POST /api/auth/login
3. Backend: hash provided password, compare to stored hash
4. If match: generate session token, set httpOnly cookie
5. Redirect to /dashboard
6. Middleware on /dashboard checks cookie, allows access
```

### Assessment Flow
```
1. Learner clicks "Take Assessment"
2. GET /api/assessments/:id
3. Backend: fetch assessment + 20 questions (randomized)
4. Display assessment form (Question 1-20)
5. User answers and clicks Submit
6. POST /api/assessments/:id/submit { responses: [...] }
7. Backend: calculate score (sum points / 100)
8. If score >= 80: Pass → trigger certificate generation
9. If score < 80: Fail → show retry message
10. Redirect to /assessments/:attemptId/results
11. Display results page with score, breakdown, next steps
```

### Certificate Generation
```
1. Assessment passes (score >= 80)
2. Backend triggers: generateCertificate(learnerId, courseId, assessmentAttemptId)
3. Create PDF using template:
   - Learner name
   - Course name
   - Score
   - Completion date
   - Certificate code (SHA-256 hash)
4. Save PDF to storage (disk or S3)
5. Create Certificate record in DB
6. Return download link to frontend
7. User can download or share public link
```

### Report Generation
```
1. Admin clicks "Generate Report"
2. GET /api/reports/completion?courseId=X&dateRange=...
3. Backend queries DB:
   - SELECT enrollments, completions, assessments
   - JOIN with courses, learners
   - GROUP BY course, calculate % completion, avg score
4. Return JSON data
5. Frontend renders chart/table
6. Optional: export to CSV (backend generates CSV, user downloads)
```

---

## Database Schema (Prisma)

**Core Tables (Existing):**
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  name          String
  role          String    // "learner" | "trainer" | "admin"
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // Relations
  enrollments   CourseEnrollment[]
  assessmentAttempts AssessmentAttempt[]
  completions   LessonCompletion[]
  certificates  Certificate[]
}

model Course {
  id                String    @id @default(cuid())
  title             String
  description       String
  version           String    // "1.0", "1.1", etc.
  isPublished       Boolean   @default(false)
  isBaselineContent Boolean   @default(true)  // Phase 2: false for continuing ed
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  // Relations
  lessons        Lesson[]
  enrollments    CourseEnrollment[]
  certificates   Certificate[]
}

model Lesson {
  id        String    @id @default(cuid())
  courseId  String
  course    Course    @relation(fields: [courseId], references: [id], onDelete: Cascade)
  title     String
  content   String    // Markdown
  order     Int
  isPublished Boolean  @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  // Relations
  assessments  Assessment[]
  completions  LessonCompletion[]
}

model Assessment {
  id              String    @id @default(cuid())
  lessonId        String
  lesson          Lesson    @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  title           String
  assessmentType  String    // "quiz" | "practical" | "scenario"
  passingScore    Int       @default(80)  // %
  timeLimit       Int?      // minutes, optional
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  questions  AssessmentQuestion[]
  attempts   AssessmentAttempt[]
}

model AssessmentQuestion {
  id              String    @id @default(cuid())
  assessmentId    String
  assessment      Assessment @relation(fields: [assessmentId], references: [id], onDelete: Cascade)
  questionText    String
  questionType    String    // "multiChoice" | "scenario" | "shortAnswer"
  options         Json      // [ { text: "", isCorrect: true } ]
  explanation     String
  points          Int       @default(5)
  order           Int
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model AssessmentAttempt {
  id              String    @id @default(cuid())
  learnerId       String
  learner         User      @relation(fields: [learnerId], references: [id])
  assessmentId    String
  assessment      Assessment @relation(fields: [assessmentId], references: [id])
  startedAt       DateTime
  submittedAt     DateTime?
  score           Int?      // 0-100
  passed          Boolean?
  responses       Json      // [ { questionId, answer } ]
  attemptNumber   Int       @default(1)
  createdAt       DateTime  @default(now())
  
  // Relations
  certificate     Certificate?
}

model CourseEnrollment {
  id            String    @id @default(cuid())
  learnerId     String
  learner       User      @relation(fields: [learnerId], references: [id])
  courseId      String
  course        Course    @relation(fields: [courseId], references: [id])
  enrolledAt    DateTime  @default(now())
  completedAt   DateTime?
  status        String    @default("in-progress") // "in-progress" | "completed"
  dueDate       DateTime?
  currentLessonIndex Int @default(0)
  progressPercent Int    @default(0)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // Relations
  completions   LessonCompletion[]
}

model LessonCompletion {
  id            String    @id @default(cuid())
  learnerId     String
  learner       User      @relation(fields: [learnerId], references: [id])
  lessonId      String
  lesson        Lesson    @relation(fields: [lessonId], references: [id])
  courseId      String
  enrollmentId  String
  enrollment    CourseEnrollment @relation(fields: [enrollmentId], references: [id])
  completedAt   DateTime  @default(now())
  timeTaken     Int?      // seconds
  createdAt     DateTime  @default(now())
}

model Certificate {
  id                String    @id @default(cuid())
  learnerId         String
  learner           User      @relation(fields: [learnerId], references: [id])
  courseId          String
  course            Course    @relation(fields: [courseId], references: [id])
  assessmentAttemptId String
  attempt           AssessmentAttempt @relation(fields: [assessmentAttemptId], references: [id])
  certificateCode   String    @unique  // SHA-256 hash
  issuedAt          DateTime  @default(now())
  expiresAt         DateTime?
  pdfUrl            String    // Path to stored PDF
  publicUrl         String    // Shareable public link
  downloadedAt      DateTime?
  createdAt         DateTime  @default(now())
}

model AuditLog {
  id          String    @id @default(cuid())
  actor       String    // User ID or "SYSTEM"
  action      String    // "login" | "enrollment" | "completion" | etc.
  object      String    // "User" | "Course" | "Assessment" | etc.
  objectId    String
  details     Json      // Additional context
  timestamp   DateTime  @default(now())
  createdAt   DateTime  @default(now())
}
```

---

## API Response Schema

**Success Response:**
```json
{
  "success": true,
  "data": { /* response data */ },
  "timestamp": "2026-07-22T10:30:00Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Descriptive error message",
  "code": "INVALID_EMAIL",
  "statusCode": 400,
  "timestamp": "2026-07-22T10:30:00Z"
}
```

---

## Security Architecture

### Authentication
- Passwords hashed with bcryptjs (10 rounds)
- Sessions stored as httpOnly cookies (no JavaScript access)
- JWT optional (if stateless desired), but cookies preferred for simpler XSS protection
- Session timeout: 30 min idle, 7 day max

### Authorization
- Middleware checks user.role for protected routes
- Role-based access control:
  - Learner can only access own courses, assessments, certificates
  - Trainer can manage courses, view reports
  - Admin can do everything

### Data Protection
- All API responses sanitized (no sensitive data in responses)
- Audit logs immutable (append-only, no editing)
- Database encryption at rest (Railway PostgreSQL provides this)
- TLS 1.2+ required for all connections

### Secrets Management
- Environment variables (.env.local, .env.production)
- Never committed to git (.gitignore includes .env)
- Production secrets stored in Railway environment config
- No hardcoded API keys, passwords, JWT secrets

---

## Deployment Pipeline

```
Local Development
  ↓ (npm run dev)
  Local Next.js server on http://localhost:3000
  SQLite database (prisma/dev.db)
  ↓ (git push origin main)

GitHub Repository
  ↓ (trigger Railway deploy)

Railway Build & Deploy
  ├─ Install dependencies (npm ci)
  ├─ Run migrations (prisma migrate deploy)
  ├─ Build Next.js (npm run build)
  ├─ Start server (npm start)
  └─ Health check (GET /health)
  ↓

Production Environment
  ├─ Node.js service on Railway
  ├─ PostgreSQL database on Railway
  ├─ Automatic HTTPS (Let's Encrypt)
  ├─ Custom domain via Cloudflare
  └─ Live at: https://hf-training.conform-edge.com (example)
```

---

## Scalability Considerations

**Phase 1 (MVP):**
- Single Next.js instance
- Shared PostgreSQL database
- SQLite for local development
- Expected load: < 100 concurrent users

**Phase 2+ (If scaling needed):**
- Horizontal scaling (multiple Next.js instances behind load balancer)
- Database read replicas
- Caching layer (Redis for sessions, API responses)
- CDN for static assets
- S3 for certificate PDFs (not filesystem)
- Message queue for background jobs (email, report generation)

---

## Monitoring & Alerting

**Metrics to Track:**
- Request latency (p50, p95, p99)
- Error rate (5xx responses)
- Database query time
- Certificate generation time
- User session count
- Failed login attempts

**Alerts:**
- Error rate > 5%
- Response time p95 > 5 seconds
- Database down
- Disk space < 10%

---

**Next Document:** 04-DATA-MODEL.md
