# M-AI Core Kernel — Integration (build-order step 3)

This document describes how the M-AI Core kernel (MAI-ARCH-001 Rev C) is embedded in
PMA Autopilot and how to run and verify it.

## What the kernel is

A deterministic, rules-only assessment kernel. It senses host events, evaluates an
immutable hashed record snapshot against version-controlled JSON rules, and surfaces
**System-Detected Conditions** for a human to Confirm or Dismiss — everything is
written to an append-only ledger. **No LLM, no network, no randomness.** It is advisory
only; it never changes host data or blocks a host action.

## Layout

```
apps/api/src/mai/
  kernel/            pure kernel — imports NOTHING from the host
    hash.ts          the single canonical hashSnapshot (SHA-256 over canonical JSON)
    evaluator.ts     the closed operator grammar + data_confidence
    registry.ts      rule load / validation / manifest-driven dispatch
    kernel.ts        processEvent: idempotency, supersession, resolve-stale, fail-quiet, metrics
    types.ts         adapter contract + record types
  adapter/pg-adapter.ts   node-postgres adapter (two principals)
  service.ts         bootstrap (fail-quiet), the emit "bell", evidence export
  dims-loader.ts     loads DIM manifests + rules from disk (host-side)
  charter.ts         generates the Authority Charter from rule JSON
  sql/               kernel-owned DDL + role grants + host test schema
apps/api/dims/pma-application-assessment/   the one DIM in this build
```

## Two database principals (design law 12)

- **host application principal** — Prisma / the host pool. Owns host tables; writes
  human responses (a person acted through the UI).
- **`mai_kernel`** — least-privilege role: `SELECT` on host record tables, `INSERT` on
  `mai_*`, `UPDATE` only on supersession columns + the event `processed` flags, and
  **no** `UPDATE`/`DELETE` on host tables. Provisioned by
  `src/mai/sql/mai_kernel_role.sql` (a controlled configuration item). The write-scope
  test (AT-12) proves the denial structurally.

If `MAI_KERNEL_DATABASE_URL` is unset the kernel falls back to the host connection
(single-role dev). The compensating control is then application-layer write scoping,
and AT-12 documents it.

## Event flow (the "bell")

Every `PmaCase` mutation route, after the host write commits:

```
getSnapshot → hashSnapshot → writeEvent (real snapshot_json + hash)
            → kernel.processEvent → markEventProcessed
```

Wired in `MaiService.emitCaseEvent`; called from `POST /api/cases`,
`PATCH /api/cases/:id`, and `POST /api/cases/:id/closure`.

## Running it

```bash
# 1. Provision Postgres with the two roles + schema (superuser):
bash apps/api/scripts/setup-test-db.sh

# 2. Run the acceptance + unit suite against real Postgres:
cd apps/api && npx jest
```

The app applies `mai_schema.sql` at startup (idempotent); the `mai_kernel_role.sql`
grants are a one-time admin step.

## Acceptance tests

`AT-01..AT-16` (`src/__tests__/at.test.ts`) run through the real HTTP routes against a
real Postgres database — not kernel memory. AT-11 (cross-tenant denial), AT-12
(write-scope), and AT-16 (restart survival) are the non-negotiable ones. Pure-kernel
unit tests (`kernel.unit.test.ts`) cover the hash, operator grammar, registry
validation, and representative DIM rules.

## Environment note

The Prisma query engine (`binaries.prisma.sh`) is blocked by the build environment's
network policy, so Prisma Client cannot be generated here. The kernel is deliberately
DB-agnostic and connects via `node-postgres`, so the entire suite runs against real
Postgres regardless. In production, host tables are provisioned by `prisma db push`
from `apps/api/prisma/schema.prisma`.
