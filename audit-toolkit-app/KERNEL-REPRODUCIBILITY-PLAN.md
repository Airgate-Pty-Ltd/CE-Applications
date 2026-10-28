# M-AI Kernel Reproducibility Plan — before any authoritative use

**Date:** 2026-10-11 · **Rule:** the Kernel is **not** adopted for authoritative audit governance or evidence integrity until every item below passes in every supported environment. Controlled experiments may use the browser-compatible evaluation path. **Chromium results do not establish Capacitor compatibility.** The protected checkout (`5c976d1`) is not modified, pulled or forked; all experiments use isolated clones.

## 1. Evidence so far
`KERNEL-WEBVIEW-SPIKE.md`: pure `evaluate` path bundles for the browser with a config-only `node:crypto` alias; `determinationHash` and full output byte-equal in Node, a no-builtins VM and Chromium, at `5c976d1` and `5a9cdeb` (evaluate-path source identical). `KERNEL-UPSTREAM-REVIEW.md`: 282/282 tests in an isolated clone at `5a9cdeb`; CRLF is one cause of manifest drift (path separators another).

## 2. Specific sites found in the Kernel source (read-only grep, 2026-10-11)
| Concern | Location (`kernel/src/…`, identical at both SHAs unless noted) | Risk | Required outcome |
|---|---|---|---|
| **Locale-dependent sorting** | `evaluate.ts:140–141` (evidence ordering by `localeCompare`), `evaluate.ts:211` (key ordering in normalization), `evaluate.ts:273` (rule ordering), `ms1/adapters/sqlite-adapter.ts:394` (timestamp ordering) | The hash depends on the host locale (a simulated Swedish collation changed it) | Replace with code-point comparison (as `ms1/lib/canonicalize.ts` already does) **in the Kernel's governed repo**, with a regression vector; until then wrap/pin the locale and test under non-English locales |
| **Canonical serialization** | `stableStringify` in `evaluate.ts:218`; `ms1/lib/canonicalize.ts` | Two canonicalizers with different ordering rules | One documented canonical form (ordering, number format, Unicode normalization, undefined/null handling) with published test vectors, used for every hashed artifact |
| **Path normalization** | migration/manifest loaders (`lib/migration-runner.ts`, `scripts/build-manifest.ts`) | Windows separators change source-tree hash | POSIX-normalized relative paths in every hashed listing |
| **Line-ending normalization** | manifest hashes over working-tree bytes; no `.gitattributes` | CRLF changes migration/lockfile/source hashes (confirmed) | `.gitattributes` forcing LF for hashed files, or hash a normalized form; Windows and Linux builds produce the identical manifest |
| **Dependency declaration and locking** | `better-sqlite3` imported by `ms1/adapters/sqlite-adapter.ts`, undeclared in `kernel/package.json`; lockfile covers `tsx/esbuild` | Hidden native dependency; unreproducible install | Declare every runtime/optional dependency; lock; keep the policy core free of native modules |
| **Cross-platform manifest** | `BUILD-MANIFEST.json` | Differs between Windows and CI | Same manifest from a clean checkout on Windows, Linux, macOS |
| **Persistence abstraction** | ms1 persistence is SQLite-bound | A WebView cannot load a Node native addon | Policy core with no storage; persistence through an adapter interface (see PRODUCTION-ARCHITECTURE §7) |
| **Time and randomness** | `Date.now`, `new Date`, `randomUUID` in legacy modules; `Date.parse` ordering in `evaluate.ts:411` | Non-determinism in IDs/timestamps | Injected clock and id source; only `evaluationDurationMs` is permitted to vary and must be excluded from hashes |

## 3. Work split
- **In this workstream (allowed):** a conformance harness and vector set in our own folder (fixed inputs, expected hashes) runnable against any Kernel build; isolated-clone experiments; WebView proof in the throw-away Capacitor shell (T-1/T-2).
- **In the Kernel's governed repository (not here):** the source corrections above. Any fix is requested through a dependency record; this workstream does not fork or patch the Kernel to satisfy an assumption.

## 4. Acceptance matrix (all must pass to lift BD-03)
| Check | Environments | Pass criterion |
|---|---|---|
| Hash equality on the fixed vector set | Node (Win/Linux/macOS), no-builtins VM, Chromium, **Android WebView (phone and tablet)** | Identical `determinationHash` and output bytes |
| Locale independence | `en-US`, `sv-SE`, `tr-TR`, `de-DE`, and a non-Latin locale | Identical hashes |
| Canonical serialization vectors | all above | Identical bytes for ordering, Unicode, numbers, null/undefined |
| Path/line-ending | Windows CRLF checkout, Linux LF checkout | Identical manifest |
| Dependencies | clean install from lockfile | No undeclared imports; policy core has zero runtime native dependencies; audit clean for runtime deps |
| Persistence | WebView with the chosen adapter | Same results with every adapter; policy core unchanged |
| Determinism | repeated runs, rule/evidence order permutations, forced clock | Identical hashes |
| Provenance | every governed decision records Kernel build/rule-set versions | Stored in the audit record |

## 5. Decision rule
Until §4 passes: the Governed Audit Runtime's own rules remain authoritative; the Kernel is optional, advisory-grade, and used only in isolated tests.
