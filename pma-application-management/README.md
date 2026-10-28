# Conform-Edge · PMA Autopilot

FAA **Part 21 Subpart K** / **AC 21.303-4** parts-manufacturer-approval (PMA) drafting tool.
It removes the manual work of classifying the approval basis, cross-checking identifiers
across the letter/supplement/checklist, and monitoring regulatory currency — it does not
merely speed up retyping.

> **This tool never submits to the FAA and never marks a package "ready for submission."**
> Every generated file is watermarked `DRAFT FOR INTERNAL REVIEW ONLY — NOT FOR FAA SUBMISSION`.
> A human certifies and submits.

## Regulatory scope (do not expand without explicit instruction)

- 14 CFR Part 21, Subpart K — Parts Manufacturer Approvals
- AC 21.303-4 (3/21/14) — Application for PMA via Tests and Computations or Identicality

US FAA Part 21 only. No EASA/CAAC/other-authority logic. The authoritative regulatory
drafting logic (basis classification, AC §8 mandatory-element checklist, gap classes,
document templates) lives in the `faa-pma-supplement-generator` skill and is ported 1:1
into the rule engine and document generator — never re-derived.

## Architecture

npm-workspaces monorepo mirroring the Conform-Edge / Airgate platform:

| Path | Stack | Role |
|------|-------|------|
| `apps/api` | Express + TypeScript + Prisma (Postgres) | API, deterministic completeness gate, embedded M-AI kernel, scheduled registry job |
| `apps/web` | React 18 + Vite + Tailwind + TanStack Query | Case workspace, guided intake, dashboard (VERA design system) |
| `packages/shared` | TypeScript | Cross-cutting constants (scope, watermark, M-AI terminology) |

Deployed on Railway (`railway.json`), healthcheck at `/health`.

### Deliberate exclusions

- **No LLM. No model calls. No randomness** anywhere — intake, the completeness gate,
  the M-AI kernel, and the registry job are all deterministic. The `@anthropic-ai/sdk`
  dependency carried by the sibling QMS platform is intentionally **absent** here.

## Data model (`apps/api/prisma/schema.prisma`)

Two logical layers, all tenant-scoped:

- **Host** — `Organization` (with per-tenant Submission Office Profile), `User`
  (Preparer / Reviewer / Admin), `PmaCase`, `EvidenceDocument`, `DataField`
  (CONFIRMED / MISSING only — no LIKELY state), `GeneratedDocument`,
  `ApprovedLibraryEntry`, `RegulatorySource`, `AuditLedger` (append-only).
- **M-AI Core kernel** (`mai_*`) — `mai_events`, `mai_assessments`, `mai_error_log`,
  `mai_rule_registry`, defined in kernel-owned SQL (`apps/api/src/mai/sql/`), not Prisma,
  so the host never manages them. The kernel writes **only** to these tables, under a
  least-privilege `mai_kernel` DB role. See `docs/mai-kernel.md`.

Tenant isolation is structural (every host table carries `tenantId`), not a UI filter.

## Non-negotiable constraints

- Never fabricate a citation, FAA office, STC/TC/part number — missing data is `[CONFIRM: …]`.
- Never mark a case or document "ready for FAA submission."
- Never blend jurisdictions — FAA Part 21 only.
- Every rule cites the clause it enforces; inspector preference ≠ regulatory requirement.
- Never auto-apply a detected regulatory-source change without Admin approval.
- Never default one org's FAA submission office into another org.
- The kernel never writes to a host table (verified structurally, AT-04 / AT-12).
- If the kernel errors or is disabled, the host behaves as if it were never installed (AT-09).
- It is a **System-Detected Condition** with `data_confidence` high/medium/low — never an
  "AI finding," "AI decision," or a numeric confidence score.

## Build order (spec §12)

- [x] **0. Foundation** — monorepo scaffold, host data model, README, `/health`.
- [x] **1. Tenant/user model, auth, org Submission Office Profile** (JWT + roles + scrypt).
- [x] **2. Host services** for Case, Evidence, Data_Field, Generated_Document, Audit_Ledger.
- [x] **3. M-AI kernel embed** (adapter, event emission, `mai_kernel` DB role) + AT-01…AT-16 on the real DB — see `docs/mai-kernel.md`.
- [x] **4. `pma-application-assessment` DIM** — manifest + 15 ported rules + generated Authority Charter.
- [x] **5. Deterministic document intake** (PDF form-field reads, format-known pattern matching, guided transcription).
- [x] **6. Document generator** (4 DOCX outputs, watermarked, `[CONFIRM:]` placeholders, BLOCKING blocks generation).
- [x] **7. Regulatory Source Registry** + scheduled check / self-repair + Admin approval flow.
- [x] **8. Approved Document Library** (promote / search / pattern-match).
- [x] **9. Dashboard + VERA visual system** (React SPA, instrument aesthetic, no 3D).
- [x] **10. Full acceptance pass** (STC-basis + T&C-basis end to end) — `docs/BUILD-REPORT.md`.

**All ten build-order steps are implemented and tested** (69 tests against real Postgres,
web driven end-to-end with headless Chromium). Out of scope by design: 3D/graph layer,
additional jurisdictions, auto-submission.

## Running the whole thing

```bash
# 1. Provision Postgres (roles pma_app + mai_kernel, DB, schema, grants):
bash apps/api/scripts/setup-test-db.sh          # as the postgres OS user

# 2. Backend tests (69, real DB):
cd apps/api && npx jest

# 3. Run it:
DATABASE_URL=... MAI_KERNEL_DATABASE_URL=... npm run dev   # api :4000, web :5173
```

## Local development

```bash
npm install
cp apps/api/.env.example apps/api/.env   # set DATABASE_URL
npm run db:generate && npm run db:migrate
npm run dev                              # api :4000, web :5173
```
