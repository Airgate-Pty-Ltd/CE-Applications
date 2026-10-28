# Dependency Footprint — What This Product Actually Needs to Run

**Written:** 2026-08-06, Standalone Packaging Directive §1 ("correct the record first, no code").
**Purpose:** prior directives (Phase 3 WP-5, Phase 4 WP-3) over-weighted Docker and PostgreSQL
as if they were runtime dependencies of the product itself. They are not. This document states
plainly what the standalone product actually requires, so packaging work proceeds from an
accurate baseline rather than an inherited assumption.

---

## The real runtime dependency footprint

1. **Node.js** — the JavaScript runtime the built application executes under. This is the
   **single external requirement**, and it is bundled into the packaged installer (see
   `docs/03-architecture/INSTALL-GUIDE.md` and the Packaging directive §2) so a customer's
   machine needs nothing pre-installed.
2. **Libraries that bundle directly into the built application** — not separate services, not
   things a customer installs or configures:
   - `next` (^14.0.0) — the application framework; `next build` with `output: 'standalone'`
     (see `next.config.js`) produces a self-contained server bundle with only the trimmed
     `node_modules` subset the app actually uses.
   - `react` / `react-dom` (^18.2.0) — UI rendering.
   - `@prisma/client` (^5.0.0) + the Prisma-generated native query engine binary — the database
     access layer. The native engine binary is a real technical constraint for packaging (see
     §2 of the Packaging directive) — it must be present and path-correct in the distributable,
     matched to the target OS/architecture.
   - `bcryptjs` — password hashing (pure JS, no native compile step, deliberately chosen over
     `bcrypt` for exactly this packaging reason — no native-addon rebuild risk).
   - `jspdf` — client-side PDF generation for certificates/exports (runs in-browser, ships as
     part of the bundled client JS, not a server dependency).
   - `zod` — runtime schema validation.
3. **An embedded SQLite database file** (`prisma/dev.db` in dev; a configurable path in the
   packaged product — see the INSTALL-GUIDE) — the entire persistence layer for the standalone
   product. A single file on disk. No server process, no port, no separate service to install,
   start, or keep running.

## What it does NOT need

- **No Docker.** Docker Compose (`Dockerfile`, `docker-compose.yml`, `docker/`) was built in
  Phase 3 WP-5 / Phase 4 WP-5 as a *packaging option*, not a product dependency — the
  application itself has never required a container runtime to execute. Per this directive,
  that material is reclassified to `deploy/docker-optional/` (DECISIONS.md, this run) —
  preserved, not deleted, but explicitly not part of the standalone product's install path.
- **No PostgreSQL, no separate database server.** The dual-provider schema work
  (Phase 4 WP-1/WP-2 — `prisma/postgresql/`) remains real, tested, and preserved for a
  **future hosted/multi-tenant online edition**, where a real client-server database earns its
  keep (concurrent writers, the `mai_kernel` least-privilege role, network-reachable access).
  It is not part of this standalone, single-user/small-site install path.
- **No cloud service of any kind.** No managed database, no object storage, no external auth
  provider, no SaaS dependency.
- **No outbound network calls at runtime.** Confirmed by inspection: no `next/font` Google/CDN
  font imports exist anywhere in `src/` (the app's typography already uses the OS's own system
  font stack — `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu,
  Cantarell, sans-serif`, per `src/app/layout.tsx` — a deliberate choice already in place before
  this directive, not a new packaging accommodation). AI Assist's real behavior when no provider
  is configured (the onprem-appropriate, and only currently-implemented, mode) is documented in
  DECISIONS.md D-036/WP-5.4: a genuine no-AI manual fallback, never a silent network attempt.
- **No telemetry, no phone-home, no update-check pings.** Nothing in this codebase reports
  usage, errors, or version-check data anywhere. This is a property to actively preserve when
  choosing a packaging tool in §2 — some Node-bundling tools default to sending anonymous
  install/usage telemetry; whichever is chosen must have that disabled or absent.

## Development-time-only tooling (never ships to a customer)

`jest`, `ts-jest`, `typescript`, `tsx`, `prisma` (the CLI, as opposed to the generated client),
`@testing-library/*`, `@types/*` — all `devDependencies`, used to build and test the product,
never present in what a customer installs.

## Node version

Development and CI have run against Node v22.19.0 in this session's environment.
`CLAUDE.md` §5 names Node 20 LTS as the target for receiving inspection. The bundled runtime
packaged for customers (Packaging directive §2) should target the same LTS line the product is
actually verified against — pin and document the specific version chosen when the runtime
bundle is built, rather than "whatever happens to be on the build machine."
