# KERNEL-WEBVIEW-SPIKE — platform-independent policy core compatibility

Date: 2026-10-11  |  Status: spike evidence (no Kernel source modified)
SHAs under test: **5c976d1** (protected checkout HEAD) and **5a9cdeb** (origin/main, already fetched)
Method: local clones in the session scratchpad (`kernel-spike` at 5c976d1, worktree `kernel-spike-5a9cdeb`, `kernel-spike-crlf`), core.autocrlf=false unless stated, sparse checkout of `kernel/` (the repo has over-long paths and a committed `.git.backup/`, so a full Windows checkout fails without `core.longpaths`). esbuild 0.25.0, Node v22.19.0, tsx 4.19.0, TypeScript 5.9.3. Spike files (ours): `spikes\kernel-webview\`.

## 0. Verdict summary

| | 5c976d1 | 5a9cdeb |
|---|---|---|
| Evaluate path bundles for browser with config-only shim | YES | YES |
| Output byte-equal Node vs no-Node-builtins vm vs real browser | YES | YES |
| Deterministic / key-order independent | YES (one locale caveat, section 3) | YES (same) |
| Evaluate path touches better-sqlite3 | NO | NO |
| Recommendation for "platform-independent policy core" | **GO (conditional)** | **GO (conditional)** |

Evaluate-path source (`evaluate.ts`, `decision.ts`, `entity-ref.ts`, `kernel-event.ts`, `types.ts`, `rules-engine.ts`, `decide.ts`, `act.ts`) is byte-identical between the two SHAs (`git diff --stat` empty). The only `kernel/package.json` change is `tsx` added to devDependencies. So the compatibility result is the same for both; they differ only in build/persistence/provenance behaviour (sections 4 and 5).

Conditions on the GO: (1) consume `evaluate.ts` through a bundler alias or a vendored copy, not via the package export `./evaluate`, which keeps `node:crypto` in `dist/evaluate.js`; (2) pin or neutralise the `localeCompare` ordering (section 3); (3) the Capacitor/Android WebView run is still unproven (section 8).

## 1. Browser bundle and Node-only imports

Static scan of import statements (`grep` over `kernel/src`, identical at both SHAs):

Evaluate path (`evaluate.ts` and its transitive imports): the ONLY Node-only import is `import { createHash } from 'node:crypto'` at `evaluate.ts:5`. The esbuild metafile shows the bundle contains exactly three inputs: `evaluate.ts`, `decision.ts` (pure, no imports) and the shim. `entity-ref.ts`, `kernel-event.ts` are type-only imports and erased.

Without the alias, esbuild fails exactly as expected:
`X [ERROR] Could not resolve "node:crypto"  ../kernel/src/evaluate.ts:5:27` (platform=browser).

Other Node-only imports elsewhere in `kernel/src` (not on the evaluate path, listed because they block bundling the whole kernel or the root export `.`):

| File | Import |
|---|---|
| `act.ts`, `registry.ts`, `sense.ts` | `crypto` (createHash) |
| `kernel.ts` | `crypto` (randomUUID) |
| `authority-change.ts`, `routing-governance.ts`, `tool-governance.ts`, `vault-governance.ts` | `node:crypto` (+ `node:url` in tool/vault governance) |
| `memory-governance.ts` | `node:crypto` (createHash, randomUUID), `node:url` |
| `lib/migration-runner.ts` | `node:crypto`, `node:fs`, `node:path` |
| `ms1/adapters/sqlite-adapter.ts` | `better-sqlite3`, `node:crypto`, `node:path`, `node:url` |

esbuild bundle attempts without alias: `rules-engine`, `decide`, `entity-ref`, `decision`, `kernel-event`, `outcome-persistence`, `types` resolve cleanly (no Node imports); `act` and `kernel` fail on `crypto` (and `kernel` on `node:crypto` as well).

Config-only fix (`spikes\kernel-webview\build-bundle.mjs` + `node-crypto-shim.js`): `alias: { 'node:crypto': shim, crypto: shim }`, platform=browser, format=iife, target=es2020. The shim is pure JS, synchronous SHA-256 (Web Crypto is async and cannot replace the sync `createHash(...).digest('hex')` call). Bundle size ~25.6 KB per SHA. Bundle scan for `require(`, `process.`, `Buffer`, `__dirname`, `node:`, dynamic `import(`: zero hits.

Shim correctness: 26/26 SHA-256 comparisons against Node `crypto` (empty..100,000 repeats, ASCII and multi-byte UTF-8, block-boundary lengths 55/56/57/63/64/65/119/120). Shim requires `TextEncoder` (present in every browser/WebView).

## 2. Execution and byte-for-byte comparison

Input: `spikes\kernel-webview\test-input.json` - 5 rules (eq, is_null, gte, any/all/not, contains, in, exists, shorthand equality, unconditional rule, non-ASCII rule id, a rule for a different domain), event with applicableEventTypes, two evidence refs, authority profile, non-ASCII and mixed-case fact keys.

Three environments:
1. Node v22.19.0, real `node:crypto` (esbuild platform=node bundle of the same source).
2. `node:vm` context containing only ECMAScript builtins plus `TextEncoder`; probe `typeof process, require, Buffer, module, crypto, setTimeout` = all `undefined`.
3. Real browser: bundle served from `http://127.0.0.1:8765` and loaded in the Browser pane (Chromium 152 on Windows, `navigator.language` en-US), `typeof process/require/Buffer/module` = all `undefined`.

Results (identical for 5c976d1 and 5a9cdeb):

| Check | Result |
|---|---|
| `determinationHash` Node | `02525393fe7fd389676c3fcbf13a7e764f6936951ddb482b353186a4842b07c3` |
| `determinationHash` vm (no Node builtins) | same, MATCH |
| `determinationHash` real browser | same, MATCH |
| Full `evaluate()` result JSON (minus `evaluationDurationMs`), 3551 chars | SHA-256 `6fe5220a...3251` in Node and in real browser, MATCH; vm string equality true |
| `createDeterminationHash` direct call | equal (Node vs vm) |
| `evaluateRules` output | equal |
| Empty-input hash (shim self-test) | `72d77e91...daedbd` in Node and in browser, MATCH |
| Governed decisions produced | 3 (CAR-010, CAR-011, ÄCAR-013 met; car-012 not met) |

Note: my first test input used an invalid `permittedHostAction`; the Kernel correctly threw `Invalid governed decision: permittedHostAction is incompatible with decisionState` (ESCALATE requires `route:*`). The input was corrected; this also shows validation runs unchanged in the bundle.

Raw reports: `compat-report.5c976d1.json`, `compat-report.5a9cdeb.json`.

## 3. Determinism

Evidence (`run-compat.mjs`):
- Same input twice: identical (Node and vm).
- Deep key-order reversal of every object in the input: identical `determinationHash` (Node and vm). `stableNormalize` sorts keys.
- Rule array reversed: identical hash (rules are sorted inside `createDeterminationHash`).
- Wall clock forced to 2001 in the vm (`Date` and `Date.now` overridden): identical hash.

Time/random use in the evaluate path (static): `Date.now()` twice in `evaluate()` solely for `evaluationDurationMs` (not hashed, not in decisions; must be excluded from any byte comparison). `new Date(ref.capturedAt).toISOString()` is pure. `Date.parse` is used in sorting evidence timestamps (pure). No `randomUUID` and no `Math.random` in `evaluate.ts`, `decision.ts`, `entity-ref.ts`, `kernel-event.ts`. `rules-engine.ts` (legacy, NOT imported by `evaluate.ts`) uses `new Date()` for relative date operators (non-deterministic by design; keep out of the core).
Timestamp fallback chain is deterministic (event.observedAt, event.occurredAt, latest evidence capturedAt, evaluationContext.evaluatedAt, then 1970-01-01).

**Finding (risk, not a failure here): locale-dependent ordering.** `stableNormalize` sorts keys with `a.localeCompare(b)` and the rule sort uses `localeCompare` on `ruleId:revision`. Default-locale collation is ICU/host dependent, so the same data can hash differently on a device whose default locale collates differently. Simulation (NOT a real second ICU run): overriding `String.prototype.localeCompare` to Swedish collation in a vm changed the hash to `89bd0100...504a` versus `02525393...07c3`. Both Node and Chromium here were en-US, which is why they matched. Mitigation without touching Kernel source: our host pins the collator before loading the bundle (e.g. override `String.prototype.localeCompare` to a code-unit comparison in the host, applied identically on every platform and recorded in the manifest), or upstream a change to `localeCompare(b, 'en')`/code-unit sort. Whichever is chosen, hashes must be compared across platforms only under the same collation policy.

## 4. better-sqlite3 and a persistence-adapter boundary

Evidence:
- `better-sqlite3` is imported in exactly one Kernel source file: `kernel/src/ms1/adapters/sqlite-adapter.ts:1` (plus two ms1 tests). No other `kernel/src` file references it.
- Evaluate path does not import it (bundle inputs above; `evaluate.ts` imports only `node:crypto`, `entity-ref`, `kernel-event`, `decision`).
- `kernel/package.json` does NOT declare it (`dependencies: {}`; devDependencies: `@types/node`, `typescript`, `vitest`, plus `tsx` at 5a9cdeb). It is declared only in `host-demo/package.json` (`better-sqlite3 ^12.11.1`, `@types/better-sqlite3`) and resolves via root npm workspace hoisting. Lockfile entry `node_modules/better-sqlite3` is version 12.11.1 (production-type entry, pulled in by host-demo).
- Packaging difference: at 5c976d1 `kernel/tsconfig.json` excludes `src/ms1`, so ms1 (and sqlite) is not compiled into `dist` and is not reachable from package `exports`. At 5a9cdeb `src/ms1` is removed from the tsconfig exclude list, so `tsc` compiles `sqlite-adapter.ts` into the kernel build; a standalone `tsc --noEmit` of `kernel/` (no workspace install) reports `Cannot find module 'better-sqlite3'` at `ms1/adapters/sqlite-adapter.ts(1,22)`. It still is not in package `exports`, but the Kernel build now depends on an undeclared package. Recommend declaring it (optional/peer dependency) upstream or keeping ms1 out of the kernel tsconfig.

Proposed boundary (design proposal only, nothing implemented, nothing tested on device):

```
policy-core (pure, no I/O)           persistence adapter (interface, host-provided)
  evaluate(request) -> result    ->    appendDecision(entry), appendAudit(entry),
  createDeterminationHash()            getRules(manifestRef), getAuthorityProfile(id, rev),
  stableStringify()                    getEvidence(ids), transaction(fn)
```
- Core takes all inputs (rules, facts, authority, evidence refs, evaluatedAt) as arguments and returns data; the host decides what to persist. This is already the shape of `evaluate()` ("Kernel determines; host executes").
- Adapter implementations (options, none tested here): Node host keeps `better-sqlite3` (the existing ms1 adapter); WebView could use a Capacitor SQLite community plugin (SQLite via native layer, closest to the ms1 SQL migrations) or IndexedDB (no native dependency, but the ms1 SQL migrations and append-only triggers would need re-implementing and enforcing in code). Either needs its own append-only/immutability proof; the ms1 migration triggers do not carry over to IndexedDB.
- Contract tests: run the same adapter test suite against each implementation, and keep determination hash equality across hosts as a release gate (section 2 harness).

## 5. Reproducibility / Windows (manifest hypothesis)

Test at 5a9cdeb. Committed `kernel/BUILD-MANIFEST.json` was generated at commit 99069d4 (5a9cdeb only snapshots the manifest; `git diff --stat 99069d4 5a9cdeb` = that one file). So `git_sha`, `build_hash` and `built_at` cannot match a regeneration at 5a9cdeb by design, and `node_version` differs (v22.23.2 committed vs v22.19.0 here). Compared the fields that should be content-determined.

Actual script run (`build-manifest.ts` via tsx) in the LF clone (autocrlf=false; `git ls-files --eol`: all 54 files i/lf w/lf):

| Field | Result |
|---|---|
| kernel_version, git_dirty, schema_version, typescript_version, releasable | MATCH |
| lockfile_hash `370b7126...` | MATCH |
| migration_checksums (all 5) | MATCH |
| source_tree_hash | **DIFF on Windows even with LF**: regen `e35a8fb9...`, committed `f256f82d...` |
| git_sha, build_hash, built_at, node_version | DIFF (expected, see above) |

Second cause found: `hashSourceTree` hashes `relative(KERNEL_ROOT, f)`, which on Windows yields backslash paths (`src\evaluate.ts`) while the committed manifest used POSIX separators. Replicating the function read-only (`srchash.mjs`) with POSIX separators on the LF tree gives `f256f82d6d7401f3...` = committed value (MATCH); native Windows separators gives `e35a8fb9...` = the script's Windows output (confirms the replica).

CRLF hypothesis test (clone with `core.autocrlf=true`, 53 files i/lf w/crlf):

| Item | LF checkout | CRLF checkout | Committed |
|---|---|---|---|
| lockfile sha256 | `370b7126...` | `f4c242e3...` | `370b7126...` |
| migration 0001 checksum | `ff6753bb...` | `19461760...` | `ff6753bb...` |
| source_tree_hash (POSIX separators) | `f256f82d...` | `01ec5924...` | `f256f82d...` |

Conclusion: the CRLF hypothesis is CONFIRMED (CRLF changes lockfile, migration and source-tree hashes) AND a second Windows-only cause exists (path separators in `source_tree_hash`). With LF endings and POSIX separators the content-derived fields reproduce exactly. Remaining legitimate differences are provenance fields (git_sha/built_at/node_version).
At 5c976d1 the manifest script still stamps `built_at` from the wall clock (`new Date().toISOString()`) and checks dirty on the whole tree, so regeneration is never reproducible there (read from the 5c976d1 -> 5a9cdeb diff; not re-run). Mitigation we can apply outside Kernel source: add `.gitattributes` (`* text=auto eol=lf`) in our consuming repo/CI and generate manifests on Linux/CI; do not hash on Windows with autocrlf.

## 6. Security

- `kernel/package.json` `dependencies` is `{}` at both SHAs: runtime dependencies EMPTY. The evaluate path needs no npm package at runtime (only the sha256 shim, ours).
- `npm audit --package-lock-only --omit=dev --workspace kernel`: **found 0 vulnerabilities** (run at 5a9cdeb; the repo-wide audit output was identical at 5c976d1 and the kernel dependency block is empty at both).
- Repo-wide `npm audit --omit=dev` (whole workspace): 5 vulnerabilities (4 moderate, 1 critical): `express`, `body-parser`, `qs`, `uuid` (moderate), `proxy-addr` (critical). All belong to `host-demo` (express/uuid), not the Kernel evaluate path. With dev dependencies: 13 (6 moderate, 4 high, 3 critical), tooling only.
- Our additions: esbuild 0.25.0 and tsx are build/test-time only and are not shipped in the bundle. Audit was network-based against the lockfile on 2026-10-11 and is a point-in-time result.

## 7. Files (ours, not Kernel files)

`spikes\kernel-webview\`: `build-bundle.mjs` (bundle config), `node-crypto-shim.js`, `run-compat.mjs` (Node/vm comparison + determinism + shim self-test), `test-input.json`, `browser-page.html`, `srchash.mjs` (read-only replica of manifest source hash), `compat-report.5c976d1.json`, `compat-report.5a9cdeb.json`, `manifest.regenerated-LF-5a9cdeb.json`.
Run: `npm i esbuild@0.25.0` in a scratch folder, then `node <path>\build-bundle.mjs <kernel\src> out.js` or `node <path>\run-compat.mjs <kernel\src> <tag>`.

## 8. UNPROVEN (stated plainly)

- Execution inside a Capacitor / Android WebView. A desktop Chromium page and a Node vm are not a Capacitor WebView: no Android System WebView version, no device ICU/locale (the `localeCompare` risk in section 3 is exactly the kind of difference that would show up there), no Capacitor bridge, no file/URL scheme (`capacitor://`/`https://localhost`) behaviour, no CSP, no performance or memory data on a phone.
- Any persistence option on Android (Capacitor SQLite plugin, IndexedDB): proposals only, none installed or tested.
- Cross-platform hash equality on a non-en-US default locale (only simulated).
- Equivalence of the sha256 shim beyond the 26 vectors and one rule set; larger property-based or fuzz comparison was not run.
- The Kernel's own vitest suite was not run in the clones (no workspace install); behaviour evidence here is the evaluate-path harness only.
- Whether `package.json` `exports["./evaluate"]` (`dist/evaluate.js`) can be consumed in a browser as published: it retains `node:crypto`; only the source-bundle-with-alias route was proven.

## 9. Recommendation per SHA

- **5c976d1: GO (conditional).** Evaluate path is already pure apart from one `node:crypto` import, bundles with config only, and is byte-identical to Node in a no-builtins vm and a real browser. ms1/sqlite is excluded from the tsconfig, so the build does not touch better-sqlite3. Conditions: alias/vendor route, collation pin, and Capacitor device spike before commitment. Manifest/provenance is weaker here (wall-clock `built_at`, never reproducible).
- **5a9cdeb: GO (conditional).** Identical evaluate-path behaviour and hashes; better manifest determinism (commit-time `built_at`, self-exclusion in dirty check). Extra caveats: `src/ms1` (with undeclared `better-sqlite3`) is now inside the kernel tsconfig, so any consumer that runs the kernel `tsc` build needs the workspace install or an upstream fix; manifest reproducibility requires LF checkout, POSIX path separators (Linux/CI), and accepting that the committed manifest lags one commit by design.
- Preferred: take the policy core from 5a9cdeb if/when the owner promotes it, but do not depend on its build pipeline; consume `evaluate.ts` + `decision.ts` as a pinned source snapshot (SHA + file hashes, LF) through our own bundler config.
