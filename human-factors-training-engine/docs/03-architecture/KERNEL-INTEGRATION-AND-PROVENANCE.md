# Kernel Integration and Provenance

## Protected source rule

`M-AI/Kernel-MASTER` is the authoritative source and is never built in place, edited, or used
as a mutable runtime dependency. HF Engine contains a verified copy under
`vendor/m-ai-kernel/ba2a1cf-f81fbf10/`:

- `kernel/` is the exact source copy;
- `runtime/` is the derived installable package built in a disposable workspace;
- `PROVENANCE.json` and `MANIFEST.sha256` identify and hash the source;
- `npm run verify:kernel` fails the build if the vendored copy changes unexpectedly.

The source-copy hash is
`1DC5EDC4AD451932B88235CCAB835B236DAAFE7218A9CE00611B75B0922FD5F2`; the derived runtime
hash is `FD2D42A3877B1CB834EA31BC402B89C164260A55830DC91FD095B3CF7B0A5A0A`.

## Runtime boundary

`MaiDecisionAdapter` is the HF-owned compatibility boundary around the master package's
decision and authority APIs. Product-specific Prisma access, legacy rule shapes, and training
workflows remain outside the protected package. Updating the Kernel requires a new immutable
vendor version directory, provenance record, hash manifest, upstream test run, and HF host
acceptance run; an existing vendor directory is not overwritten.

The current master package's generic `evaluate()` entry point is intentionally not used for
regulated HF rule evaluation because that implementation is still a stub. HF Engine's existing
closed, deterministic 13-leaf/3-composite evaluator remains isolated in `MaiKernel` for the 14
approved HF rules. The master package is used where its implemented public authority/decision
contracts apply. Replacing the legacy evaluator requires a production-capable master evaluator
and equivalence evidence for every approved rule and missing-data case.

## Snapshot integrity and versioning

Kernel event hashes are SHA-256 values over canonical, recursively key-sorted JSON. A repeated
snapshot under the same published manifest is idempotent. The same snapshot may be deliberately
re-evaluated under a different manifest version; uniqueness includes tenant, manifest, and
snapshot hash. Each surfaced condition stores the exact frozen input plus data-confidence and
the same content-derived hash—never a random identifier.

Initial setup atomically provisions the approved 14-rule manifest for the organization and the
active bounded-authority profile. Seed commands are idempotent across every active organization
and no longer select a historical tenant implicitly.

## Verification evidence

- Upstream Kernel tests: 164 passed in the disposable build workspace.
- HF host acceptance: 16 passed for the vendored package boundary.
- `MaiKernel.persistence.test.ts` proves canonical hashing, same-manifest idempotency, and
  new-manifest re-evaluation.
- `governanceProvisioning.test.ts` proves idempotent fresh-organization provisioning.

Live PostgreSQL role tests and container-image execution remain environment-gated and must be
completed with production-like credentials before a hosted release is declared ready.
