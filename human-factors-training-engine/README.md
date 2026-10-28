# Human Factors Training Platform — Phase 1

Web-based training delivery platform for Human Factors continuing education.

**Status:** Specifications complete, skeleton application scaffolded, ready for Phase 1 implementation.

## Quick Start (Local Development)

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with a real JWT_SECRET (DATABASE_URL default is fine for local SQLite)

# Initialize database: migrations + the frozen-manifest immutability trigger (C-013 -
# NOT applied by `prisma migrate`, must be run separately, see prisma/manual-sql/) +
# the Phase 1 seed data + the 3 WP-3 demo accounts (QM/supervisor/learner)
npm run db:setup

# Start development server
npm run dev
```

Open http://localhost:3210 in your browser (see `.claude/launch.json` for the configured dev
port; `npm run dev` alone defaults to 3000). Demo accounts (all password `DemoPass123`):
`qm.demo@example.com`, `supervisor.demo@example.com`, `learner.demo@example.com`.

**Standalone install (the supported path for a non-developer):** see
`docs/03-architecture/DEPENDENCY-FOOTPRINT.md` and, once published,
`docs/03-architecture/INSTALL-GUIDE.md` — no Docker, no npm, no database server required.

**Docker (optional alternative, not required — see `deploy/docker-optional/README.md`):**
container-based deployment for operators who specifically want it, relocated out of the repo
root under the Standalone Packaging Directive (2026-08-06).

## Project Structure

```
hf-training-platform/
├── src/
│   ├── app/                 # Next.js pages & API routes
│   ├── components/          # React components
│   ├── lib/                 # Utility functions
│   └── middleware.ts        # Auth middleware
├── prisma/
│   └── schema.prisma        # Database schema
├── docs/                    # Documentation
├── package.json
└── tsconfig.json
```

## Tech Stack

- **Frontend:** React 18 via Next.js 14
- **Language:** TypeScript
- **Database:** PostgreSQL (production), SQLite (dev optional)
- **ORM:** Prisma
- **Auth:** HTTP-only cookies + bcryptjs
- **PDF:** jsPDF

## Development Timeline

- **Week 1:** Assessment engine + dashboard
- **Week 2:** Assessment UI + certificates
- **Week 3:** Admin dashboard + reports + deployment

Target go-live: August 9, 2026

## Features (Phase 1)

- ✅ 5 embedded Human Factors courses (42 lessons)
- ✅ Learner authentication & dashboard
- ✅ 20-question assessments (80% pass threshold)
- ✅ Automated certificate generation & download
- ✅ Admin enrollment & user management
- ✅ Completion reports & CSV export
- ✅ Full security (no XSS, SQL injection, CSRF)
- ✅ Mobile responsive design

## Documentation

See `docs/` folder for complete specifications:

- `01-PRODUCT-DEFINITION.md` — What to build
- `02-FUNCTIONAL-REQUIREMENTS.md` — Detailed features
- `03-SYSTEM-ARCHITECTURE.md` — How to build it
- `10-TEST-AND-ACCEPTANCE-PLAN.md` — How to verify it works
- `11-IMPLEMENTATION-PLAN.md` — Day-by-day build schedule
- `SPECIFICATION-INDEX.md` — Overview & reading guide

## Deployment

**Standalone (supported path):** a self-contained installer with an embedded SQLite database
— no Docker, no npm, no separate database server. See
`docs/03-architecture/DEPENDENCY-FOOTPRINT.md` for what the product actually depends on, and
`docs/03-architecture/INSTALL-GUIDE.md` (once published under the Standalone Packaging
Directive) for install/first-run/backup/uninstall steps.

**Docker (optional, not required):** two editions from one codebase
(`DEPLOYMENT_EDITION=online|onprem` — see `docs/03-architecture/DESIGN-NOTES.md` §8) via
`deploy/docker-optional/docker-compose.yml`. Relocated out of the repo root 2026-08-06 — see
`deploy/docker-optional/README.md`. This is NOT deployed via Railway — that was an
earlier-phase plan superseded first by the Docker-based approach (Phase 3 WP-5 / Phase 4),
then by the standalone installer above.

## Testing

```bash
# Run all tests
npm test

# Type checking
npm run typecheck

# Lint code
npm run lint
```

## Database

Local development uses SQLite (optional). Production uses PostgreSQL on Railway.

```bash
# Open Prisma Studio (database GUI)
npm run db:studio

# Create new migration
npm run db:migrate -- --name add_your_feature
```

## Support

Questions? See the specification documents in `docs/`.

---

**Phase 1: Web Training Platform MVP**  
Target: August 9, 2026  
Status: Development scheduled to begin July 22, 2026
