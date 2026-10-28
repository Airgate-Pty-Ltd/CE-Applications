# M-AI Kernel Upstream Review (5c976d1 -> 5a9cdeb)

Reviewed: 2026-10-10. Method: read-only git against the protected checkout; all test/build in an isolated clone (scratchpad `kernel-iso`, Node v22.19.0, npm 10.9.3, Windows 11, `core.autocrlf=true`). The protected checkout was not modified.

## Commits reviewed (oldest first)
| SHA | Subject |
|---|---|
| 3384cac | Complete ms1 deterministic foundation: add types.ts + kernel.ts, fix test paths, wire into build |
| 0826cda | Fix build-manifest determinism: stamp build time from git commit, not wall-clock |
| 99069d4 | Fix BUILD-MANIFEST self-referential dirty check + CI clean-tree gate |
| 5a9cdeb | Snapshot clean-releasable BUILD-MANIFEST.json |

Diff: 17 files, +1199/-67. New: `kernel/src/ms1/kernel.ts` (371 lines), `kernel/src/ms1/types.ts` (222), `kernel/BUILD-MANIFEST.json`. Modified: build-manifest script, tsconfig (ms1 no longer excluded), vitest config (tests/ms1 no longer excluded), kernel/package.json (+devDependency `tsx ^4.19.0`), source-governance.yml, ms1 tests (path fixes), root package-lock.json (+504 lines, all tsx/esbuild). No changes to legacy `kernel/src/*.ts` (evaluate.ts, rules-engine.ts, etc.), `src/ms1/lib`, `src/ms1/adapters`, or `src/ms1/migrations` between the two SHAs (git diff --stat confirmed).

## Commands and results
Both runs: `git reset --hard <sha>` in clone; `npm ci`; `cd kernel && npx vitest run`; `npx tsc`.

| Item | 5c976d1 | 5a9cdeb |
|---|---|---|
| npm ci | OK | OK |
| Test files | 15 passed / 15 | 23 passed / 23 |
| Tests | 178 passed / 178 | 282 passed / 282 |
| tsc (kernel) | exit 0, no errors | exit 0, no errors |
| dist .js files | 25 | 42 (ms1 now compiled to dist/ms1) |
| npm audit | 13 (6 mod, 4 high, 3 crit) | 13 (identical packages: vitest, tinypool, proxy-addr, vite, nanoid, postcss, etc.) |

Note: at 5c976d1 tests/ms1 and src/ms1 were excluded from vitest/tsc, so the +104 tests and +17 dist files are previously unbuilt code now entering the gate, not new behaviour in the existing public API. Host-demo and web workspaces were not built or tested.

Manifest regeneration at 5a9cdeb (`npx tsx scripts/build-manifest.ts` run twice, 2 s apart): output byte-identical both times; `built_at` = HEAD commit time (2026-09-09T03:50:05Z), confirming wall-clock removal.

## Per-area findings
| Area | Finding | Status |
|---|---|---|
| Policy evaluation | Legacy evaluation path (`evaluate.ts`, `rules-engine.ts`, decide/act) byte-unchanged. Change is limited to ms1 (a separate deterministic engine, `MaiKernel.processEvent`: content-addressed IDs, idempotency by determination hash, hash-chained ledger, outbox). ms1 is not exported from `package.json` `exports`. | Verified by diff + tests |
| TS interfaces/exports | `package.json` exports map unchanged (`.`, evaluate, entity-ref, kernel-event, decision, outcome-persistence, types). `src/ms1/index.ts` exports `MaiKernel`, `SqliteAdapter`, `PostgresAdapter` etc. but is reachable only by deep path/dist, not via the exports map. Two `types.ts` now coexist (`src/types.ts`, `src/ms1/types.ts`) with overlapping names (`Severity`, `MaiAssessment`...); a consumer must not mix them. `PostgresAdapter` is a stub that throws "not implemented". | Verified by reading |
| Packaging | ESM (`"type":"module"`), tsc output to dist, `.d.ts` emitted. `tsx` added as devDependency only; runtime `dependencies` remain empty in kernel. `better-sqlite3` is a host-demo dependency but is imported by `src/ms1/adapters/sqlite-adapter.ts` (undeclared in kernel/package.json; resolved via workspace hoisting). | Verified; undeclared dep is a defect risk for standalone consumers |
| Node-only APIs | See file list below. Legacy core (`evaluate.ts`, `authority-change.ts`, `routing-governance.ts`, `act/kernel/registry/sense.ts`) uses only `crypto` / `node:crypto`. fs / fs/promises / path / url usage is in migration-runner, manifest-file-loader, memory/tool/vault-governance, sqlite-adapter. `Buffer` used in ms1 canonicalize/content-id/snapshot/migration-runner. `import.meta.url` used to locate rule/dims/migration files. | Static analysis only |
| Browser / Capacitor | Upstream commits add `node:crypto` and `Buffer` to `ms1/kernel.ts` and make ms1 part of the build; ms1 persistence is `better-sqlite3` (native Node addon) which cannot run in a browser or Capacitor WebView. Nothing upstream adds a browser entry, bundle, or WebCrypto/SubtleCrypto path. | Block for ms1 persistence; legacy `evaluate` needs `node:crypto` shim/bundler polyfill |
| Determinism | Build time now from `git show -s --format=%cI HEAD`; fallback `1970-01-01T00:00:00.000Z`. Repeat generation reproducible (tested). Committed manifest stamps the previous commit (git_sha 99069d4) by design, so it cannot name its own commit. Runtime ms1 uses injected `Clock` (SystemClock/FixedClock). Legacy modules still use `Date.now()`/`new Date()`/`randomUUID` in IDs and timestamps (unchanged). | Verified |
| Determinism hazard (new finding) | On this Windows clone (autocrlf=true, no `.gitattributes`) regenerated manifest differs from committed one in all 5 migration checksums, `lockfile_hash`, `source_tree_hash` and `node_version`, because hashes are over working-tree bytes (CRLF vs LF). Committed values come from a CI/LF environment. A Windows build therefore cannot reproduce the committed manifest. Cause (CRLF) inferred from `file` output reporting CRLF terminators and the checksum mismatch; not confirmed by re-running with LF. | Partly verified |
| Security | New packages: `tsx@4.23.13`, `esbuild@0.28.2` (plus platform binaries), dev-only. No new runtime deps. `npm audit` unchanged at 13 advisories (all pre-existing, dev/host-demo chain: vitest 1.x, vite, express/qs/body-parser, uuid, etc.). Lockfile resolved URLs are registry.npmjs.org. Install scripts of new packages not reviewed. | Verified counts; no integrity review of tarballs |
| Provenance | `BUILD-MANIFEST.json` (kernel_version 0.2.0-5f, schema 0005_outbox, releasable=true, git_dirty=false) committed; dirty check now excludes the manifest from itself. CI clean-tree gate removed and replaced with a comment; the only remaining gate is the regenerated manifest's `releasable`/`git_dirty`/SHA checks, so drift between committed and regenerated manifest is no longer detected by CI. The repository also tracks a `.git.backup/` directory (fails to check out on this Windows host; pre-existing, present in both SHAs). | Verified by reading |
| Audit-action governance | ms1 has no free-form audit "action" taxonomy: `AuditEntry.type` is a closed union (event, evaluation, assessment, response, supersession); ledger/outbox use `event_type` strings and append-only triggers (migration 0003). No new audit-action vocabulary or authority-charter change upstream; DIM charters/rules under `dims/` unchanged. | Verified by diff |

## Files importing node:* or native modules in kernel/src (5a9cdeb)
- crypto / node:crypto: act.ts, authority-change.ts, evaluate.ts, kernel.ts, registry.ts, sense.ts, routing-governance.ts, tool-governance.ts, vault-governance.ts, memory-governance.ts, lib/migration-runner.ts, ms1/kernel.ts (new), ms1/adapters/sqlite-adapter.ts, ms1/lib/content-id.ts, ms1/lib/replay.ts, ms1/lib/snapshot.ts, ms1/lib/migration-runner.ts
- node:fs: lib/migration-runner.ts, ms1/lib/migration-runner.ts, ms1/lib/manifest-file-loader.ts
- node:fs/promises: memory-governance.ts, tool-governance.ts, vault-governance.ts
- node:path: lib/migration-runner.ts, ms1/lib/migration-runner.ts, ms1/adapters/sqlite-adapter.ts
- node:url: memory-governance.ts, tool-governance.ts, vault-governance.ts, ms1/adapters/sqlite-adapter.ts
- better-sqlite3 (native): ms1/adapters/sqlite-adapter.ts
Files with no node imports (candidates for browser use, unverified): rules-engine.ts, decide.ts, decision.ts, entity-ref.ts, kernel-event.ts, ms1/lib/condition-evaluator.ts, canonicalize.ts (uses `Buffer`), clock.ts.

## Recommendation
- Pin **5a9cdeb** (not 3384cac/0826cda/99069d4): the first three are intermediate; 99069d4 and 5a9cdeb are the only states with a consistent, committed manifest, and 5a9cdeb is the tip with 282/282 tests and a clean tsc. Pin by full SHA (5a9cdeb84453ef8c54e7a7837ed43db13a60ceaa).
- If the audit toolkit only consumes the legacy exported API, 5c976d1 and 5a9cdeb behave identically for it (no legacy source change); the upgrade adds only the ms1 engine, which the exports map does not expose.
- Do not advance the protected checkout until the owner approves; this review changed nothing there.

## Unproven (do not claim)
- Capacitor / WebView / browser compatibility: not tested. Only static import analysis was done. Unit tests run in Node (vitest `environment: 'node'`).
- Whether `node:crypto` imports in legacy modules bundle cleanly (Vite/webpack/Capacitor) or whether a polyfill is required.
- Whether the CRLF explanation for manifest drift is the sole cause; no LF re-run was done.
- Host-demo and web workspace build/test; Postgres adapter (stub); CI workflow execution (YAML read only, not run).
- Supply-chain integrity of tsx/esbuild tarballs and their install scripts; npm audit advisories were counted, not triaged for exploitability.
