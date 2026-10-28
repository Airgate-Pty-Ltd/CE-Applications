# M-AI Kernel Integration — Build Report

**Build:** PMA Autopilot · build-order step 3 (M-AI Core kernel embed) + step 4 start
(the `pma-application-assessment` DIM).
**Date executed:** 2026-07-24.
**Status:** Deterministic prototype. All 40 tests (AT-01..AT-16 + 24 unit) executed and
passing against a real Postgres 16 database in this session. This is a controlled
technical baseline, not a certification claim.

## What was built

- **Pure kernel** (`src/mai/kernel/`) — canonical `hashSnapshot`, closed operator-grammar
  evaluator with `data_confidence`, versioned rule registry with manifest-driven
  dispatch, and `processEvent` with idempotency, supersession, resolve-stale,
  fail-quiet wrapping, and metrics. Imports nothing from the host.
- **Pg adapter** (`src/mai/adapter/pg-adapter.ts`) — two principals (host + least-privilege
  `mai_kernel`). Kernel writes only `mai_*`; human responses run under the host principal.
- **Emit "bell"** (`src/mai/service.ts`) wired into the `PmaCase` create/update/closure routes.
- **DIM `pma-application-assessment`** — 15 rules ported from the
  `faa-pma-supplement-generator` skill (Phase 1A basis-signal, Phase 1C completeness,
  Phase 1D gap classes), each citing the exact AC/CFR clause. Authority Charter generated
  programmatically from the rule JSON.
- **`mai_*` schema + role grants** (`src/mai/sql/`) — kernel-owned DDL and a controlled
  least-privilege grant script.

## How tests were run

```
bash apps/api/scripts/setup-test-db.sh    # roles pma_app + mai_kernel, DB, schema, grants
cd apps/api && npx jest                    # 40 tests through real HTTP routes + real Postgres
```

## Test result (real output)

```
Test Suites: 2 passed, 2 total
Tests:       40 passed, 40 total

AT-01 ✓  AT-02 ✓  AT-03 ✓  AT-04 ✓  AT-05 ✓  AT-06 ✓  AT-07 ✓  AT-08 ✓
AT-09 ✓  AT-10 ✓  AT-11 ✓  AT-12 ✓  AT-13 ✓  AT-14 ✓  AT-15 ✓  AT-16 ✓
+ 24 pure-kernel unit tests (hash, operator grammar, registry, DIM rules)
```

`npx tsc --noEmit` → exit 0 (clean). `npm run build` → exit 0.

## Sample ledger rows (from the real test DB)

Assessment lifecycle states all present and correct:

```
   status   | count
------------+-------
 active     |    31
 resolved   |    12      (human responses recorded under the host principal)
 superseded |     9      (both linked-forward and no_longer_firing supersession)
```

Supersession — both kinds observed:

```
 rule_id          | status     | superseded_by
------------------+------------+--------------------
 PMA-COMPLETE-001 | superseded | b4e8c5cb-3269-4511…   (changed snapshot, linked forward)
 PMA-COMPLETE-001 | superseded | no_longer_firing:7…   (rule stopped firing, resolved stale)
```

Rule registry populated with definition hashes; error log holds exactly the two
injected/handled error types:

```
    source    |            message            | count
--------------+-------------------------------+-------
 kernel:error | rule_evaluation_failed        |     3   (AT-15 unknown-operator isolation)
 kernel:error | mai_disabled_invalid_registry |     6   (AT-13 registry validation failure)
```

## A real bug the tests caught

AT-16 (restart survival) initially failed: after a human *resolved* a finding,
re-emitting the *same unchanged snapshot* re-raised a duplicate, because idempotency
consulted only active rows. Fixed by making `processEvent` read the record's full
assessment history from the DB per event and suppressing re-creation when an
assessment already exists for the same rule + same snapshot hash (active **or**
resolved). This also removed the in-memory active cache, so a freshly constructed
kernel is byte-for-byte equivalent to a long-running one.

## Files changed

See `git show --stat` for this commit. New areas: `apps/api/src/mai/**`,
`apps/api/dims/**`, `apps/api/src/host/case-store.ts`, `apps/api/src/http/app.ts`,
`apps/api/src/__tests__/**`, `apps/api/scripts/**`, `apps/api/src/mai/sql/**`.

## Open risks / deferrals (honest)

- **Prisma engine blocked in this environment.** `binaries.prisma.sh` is denied by the
  network policy, so Prisma Client could not be generated or exercised here. The kernel
  path uses `node-postgres` and is fully tested; host-table provisioning via
  `prisma db push` is unverified in this session and must be confirmed on the user's
  Node 20 machine with DB access.
- **Host case persistence uses `node-postgres` (CaseStore)** for the mutation routes so
  the integration is runnable end-to-end. Migrating those routes to Prisma (to match the
  rest of the platform) is a follow-up; the emit bell is unaffected.
- `notify` currently logs to the server console; a host notification table is wired in
  the dashboard step.
- The DIM rule set (15 rules) covers the representative Phase 1A/1C/1D items; the full
  audit-checklist port (Application Letter / Supplement / Cross-Document sections for
  re-opened packages) is build-order step 4/6 work.

## Acceptance recommendation

Verified in this session (real DB, real routes): kernel determinism, event/hash
integrity, snapshot-not-live evaluation, host-table immutability, response taxonomy,
cross-tenant denial, structural write-scope, registry-failure disable, fault isolation,
metrics, and restart survival. **Not** verified here: Prisma-managed host provisioning,
and behavior on the user's environment. Recommend the user run
`bash apps/api/scripts/setup-test-db.sh && (cd apps/api && npx jest)` on Node 20 to
reproduce, then proceed to build-order step 4 (complete the DIM rule port) and step 5
(deterministic intake).
