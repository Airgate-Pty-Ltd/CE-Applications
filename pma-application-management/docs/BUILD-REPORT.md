# PMA Autopilot — Full Build Report

**Product:** Conform-Edge · PMA Autopilot (FAA Part 21 Subpart K / AC 21.303-4).
**Status:** All ten build-order steps implemented. **69 automated tests pass against a
real Postgres 16 database; the web app was driven end-to-end with headless Chromium.**
This is a controlled, deterministic technical baseline — not a certification claim.

## What was built (spec §12 build order)

| Step | Area | Evidence |
|------|------|----------|
| 0 | Monorepo scaffold, host data model | `apps/*`, `packages/shared`, `railway.json` |
| 1 | Tenant/user, auth, Submission Office Profile | JWT + roles + scrypt; `host.test.ts` |
| 2 | Host services (Case/Evidence/DataField/Generated/Audit) | `src/host/*`; append-only audit ledger |
| 3 | **M-AI Core kernel embed** + AT-01..AT-16 | `src/mai/*`; `at.test.ts` (16 AT) |
| 4 | `pma-application-assessment` DIM (15 rules + charter) | `dims/`; `kernel.unit.test.ts` |
| 5 | Deterministic intake (form reads, patterns, transcription) | `src/host/intake/*`; `intake.test.ts` |
| 6 | 4 DOCX generators + BLOCKING generation gate | `src/host/generation/*`; `generation.test.ts` |
| 7 | Self-repairing regulatory source registry | `src/host/registry.ts`; `registry.test.ts` |
| 8 | Approved document library | `src/host/library.ts`; `library.test.ts` |
| 9 | Web app + dashboard + VERA design system | `apps/web/*` (verified via Chromium) |
| 10 | Full acceptance pass (STC + T&C lifecycles) | `acceptance.test.ts` |

## Test result (real output)

```
Test Suites: 8 passed, 8 total
Tests:       69 passed, 69 total
```

`npx tsc --noEmit` (api) → 0. `npm run build` (api) → 0. `npm run build` (web) → 0
(tsc + vite, 1546 modules).

Suites: `at` (AT-01..AT-16), `kernel.unit`, `host`, `intake`, `generation`, `registry`,
`library`, `acceptance`.

## Spec step-10 acceptance scenarios — all verified

- **STC-basis case end to end** → intake → confirm basis → gate opens → generate DRAFTED
  letter → promote to library. (`acceptance.test.ts`)
- **T&C-basis case end to end** → DRAFTED with the 14 CFR 21.303(a)(1) basis paragraph.
- **A BLOCKING gap actually blocks** both the status gate (409) and document generation (409).
- **A broken regulatory link triggers the repair-proposal flow** (BROKEN → proposed URL →
  Admin approval; never auto-replaced). A **changed** source freezes new drafts until an
  Admin accepts. (`registry.test.ts`)
- **Cross-tenant data is unreachable** (list/fetch/respond/export/fields/library) — AT-11
  plus per-milestone isolation tests.
- **Restart survival** — a fresh kernel on the same DB reproduces active/resolved/superseded
  state with no duplicates (AT-16).

## Non-negotiable constraints — how each is met

- **No LLM anywhere** — intake, gate, kernel, registry job are deterministic; `@anthropic-ai/sdk`
  is absent from the tree.
- **Never "ready for FAA submission"** — status is only DRAFTED / DRAFTED_WITH_GAPS / BLOCKED;
  every DOCX carries the DRAFT watermark; asserted in `generation.test.ts`.
- **Missing data is `[CONFIRM: …]`, never invented** — asserted in the generated DOCX.
- **FAA Part 21 only** — single rule engine, one DIM, US clauses only.
- **Kernel writes only `mai_*`** — least-privilege `mai_kernel` role (AT-04, AT-12).
- **System-Detected Condition** terminology + high/medium/low confidence — never "AI finding"
  or a numeric score (asserted in `at.test.ts` and visible in the UI).
- **Tenant isolation is structural** — `tenantId` on every host table, filtered on every query.
- **No org's FAA office defaulted into another** — Submission Office Profile is per-tenant.

## Architecture note (honest)

The build sandbox blocks Prisma's engine download (`binaries.prisma.sh`), so host
persistence runs on **node-postgres with authoritative SQL DDL** (`apps/api/src/db/schema.sql`)
rather than the Prisma client. `apps/api/prisma/schema.prisma` is retained as a reference
model; a Prisma port (for Prisma Studio/migrations) is a mechanical follow-up. This choice is
what let every layer be executed and tested here rather than shipped untested.

## Open items / deferrals

- The DIM ships 15 representative Phase 1A/1C/1D rules; the full section-by-section audit
  checklist for re-opened/uploaded existing packages is a natural extension.
- The Inter webfont loads from Google Fonts (blocked in this sandbox → system-ui fallback);
  resolves on a normal network or self-host it for offline parity.
- `notify` logs to the server console; a host notification table lands with richer dashboard work.
- Prisma-managed provisioning (`prisma db push`) is unverified in this environment.

## Receiving inspection (on your Node 20 machine)

```bash
bash apps/api/scripts/setup-test-db.sh
cd apps/api && npm install && npx jest        # expect 69 passing
cd ../.. && npm run dev                        # api :4000, web :5173
```
