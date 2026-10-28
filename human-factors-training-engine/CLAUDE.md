# CLAUDE.md — HF Engine Repository Rules
**Product:** Human Factors Continuous Learning Engine (Conform-Edge Quality Consulting LLC — proprietary)
**These rules apply to every session in this repository. They are standing law, not suggestions.**

## 1. Orientation — read before working
1. `DOCS-INDEX.md` (root) — repository map and document precedence.
2. `docs/01-directives/HF-ENGINE-BUILD-PROMPT-v3.md` — product authority.
3. The active run directive in `docs/01-directives/` and current journal in `docs/05-run-records/`.

## 2. Repository structure — maintain it
- **Root holds ONLY:** tooling-mandated files (package.json, lockfile, tsconfig, next/jest configs, .gitignore, .env*), LICENSE, NOTICE, README.md, DOCS-INDEX.md, CLAUDE.md. **Never create any other file at root.** Docker is an optional, non-standalone packaging path (Standalone Packaging Directive, 2026-08-06, DECISIONS.md D-048) — `Dockerfile`, `docker-compose.yml`, `.dockerignore`, and `docker/` live under `deploy/docker-optional/`, not root.
- **All documents go in `docs/`:** `01-directives/` (build/run directives) · `02-controlled/` (owner-approved controlled docs) · `03-architecture/` (design, schema, specs) · `04-verification/` (accepted verification reports) · `05-run-records/` (journals, DECISIONS.md, OPEN-QUESTIONS.md, done markers) · `99-superseded/` (superseded material — never implement from it).
- **Code:** `src/` (app), `src/services/`, `src/services/__tests__/`, `prisma/`, `scripts/`, `_prototypes/` (parked, unverified — do not extend without directive authority).
- New reports/journals/decisions → the matching `docs/` folder. Superseding a document → new file + banner on the old one, moved to `99-superseded/`. Update `DOCS-INDEX.md` when adding a folder or document class.

## 3. Controlled documents — owner authority
Files in `docs/02-controlled/` (kernel rules Rev-A, policy packs, requirement spine) are owner-approved with approval refs and effective dates. **Never modify them.** Changes require Brian R. Olea's approval as a new revision. Never invent kernel rule content, clause citations, regulatory interpretations, or policy-pack content — request via `OPEN-QUESTIONS.md`.

## 4. Evidence standard — non-negotiable
- "Verified" requires executed proof: real terminal output, API responses, DB rows. Code review is never evidence. Unexecuted = Partial. "Design-verified" is banned.
- Never redefine exit criteria to match what was built.
- Reports claim only what ran in the session; if a test didn't run, say so. Banned claims: "production-ready", "certifiable", "all passing" without pasted output.
- Done markers are written LAST, only when true. An interrupted run has no marker. Corrections are appended, never rewritten (journals are append-only).

## 5. Engineering rules
- **Never use a Bash heredoc append (`cat >> file << 'EOF' ... EOF`) on any tracked document.**
  This is the confirmed trigger for the 2026-08-06 truncation incident that destroyed
  `DECISIONS.md`, `OPEN-QUESTIONS.md`, and `PHASE-3-WP2-ADDENDUM.md` (see
  `docs/05-run-records/RUN-JOURNAL-PHASE3.md`, "CORRECTION ENTRY..."). Use the `Write` tool for
  new content, `Edit` for targeted insertions, or `Write`-to-scratch-file + plain `cat a b > c`
  concatenation when assembling multi-part content. No exceptions, no "just this once."
- TypeScript `strict: true` stays on. Never disable it to make a build pass.
- No bulk regex edits on `prisma/schema.prisma` — targeted edits, `npx prisma validate` after each.
- The M-AI Kernel is deterministic: closed operator grammar only, no DB queries during evaluation, no LLM, writes only to `mai_*` tables, fail-quiet-log-loud. Derived/counted values are computed by the HostAdapter into snapshots.
- Frozen manifests and learner evidence are immutable. No silent deletion, retirement, or history rewrites anywhere.
- Every source file carries the license header (`scripts/check-license-headers.js` gates the build — keep it wired).
- Receiving inspection must always work: `npm install && npm test` then `npm run dev` on Node 20 LTS.

## 5a. Host & system boundary — authorization required
The agent's authority ends at this repository's files and its own dev/test processes. **Never take a machine-wide or shared-service action without explicit owner authorization in the current session.** Specifically prohibited unless the owner says yes first:
- Starting, stopping, or installing Docker / Docker Desktop, or running `docker`/`docker compose` against the host daemon. Docker bring-up is an **owner-executed receiving-inspection step** — the agent writes the runbook and marks it Partial; it does not run it.
- Starting/stopping/installing any OS service, database server, or background daemon; elevated/admin commands; global package installs.
- Touching anything outside this repo — other containers, other projects, other databases. If a shared tool surfaces unrelated resources (other containers, DBs), do not interact with them; report and stop.
Reachable services the owner already started (e.g. a Postgres the owner launched) may be used. When in doubt, ask in one line and wait — do not "probe."

## 6. Confidentiality — hard boundary
- **Nothing Burrana-classified, customer-private, or personal ever enters this repository.** The recovered "Human Factors App" material lives in vault quarantine — never copy it back.
- Content classifications (`BURRANA_PRIVATE`, `CUSTOMER_PRIVATE`, etc.) are enforced in schema and tests — never weaken them.
- This repo targets a **private** GitHub remote only. No secrets in source; `.env*` stays gitignored.
- Software brand is Conform-Edge; embedded course content is Annex Quality IP (see NOTICE). Never blend or re-brand.

## 7. Session discipline
Default-and-log decisions in `docs/05-run-records/DECISIONS.md` (sequential D-numbers). Owner-only questions → `OPEN-QUESTIONS.md`; skip the item and continue, don't stall. Checkpoint at work-package boundaries when context runs low; a fresh session resumes from the journal — verify the journal's last claim against the disk before trusting it (including your own). Commit at every WP boundary once git is initialized.
