# Phase A — Framework Preservation Record

**Date:** 2026-10-10 · **Author:** Claude Code (Sonnet 5.5) · **Status:** DRAFT for Brian's review
**Scope:** document what is proven vs. not in `2026-10-10-clause-map-framework`. No framework file was modified.

## 1. Verification performed this session

| Check | Result |
|---|---|
| `node tools/validate-pack.js packs/src/as9100d.pack.json` | **PASS** — pack as9100d v0.1.0, 8 items, 1 with quoted fragments |
| `src/core/resolver.js` loads; exports | `matchApplicability`, `resolvePack` (loaded only; no resolver test suite found) |
| Framework files changed | None |

## 2. Tested vs. not tested

| Component | Evidence of working | Not evidenced |
|---|---|---|
| `schema/clause-map.schema.json` | Used by validator (PASS run above) | Schema for obligation grain / NCR entities — **does not exist yet** |
| `tools/validate-pack.js` | PASS on the one pack | No negative-case tests found in the folder (handoff says "proven PASS/FAIL"; I ran PASS only) |
| `packs/src/as9100d.pack.json` | Validates | 8 items; not obligation grain; **no human technical review** |
| `src/core/resolver.js` | Exports present | No unit tests located; behaviour only via prototype |
| `prototype/index.html` | Owner-reviewed 2026-10-10 (per Governor record) | Simulated guidance, fictional org, represented offline/camera/PDF |
| `app/index.html` (153 lines) | — | **Not mentioned in the handoff.** Purpose unknown; to be classified before reuse. |

## 3. Preservation rules adopted
1. Framework folder is read-only to the production build. Production code lives in `2026-10-11-audit-toolkit-app/`.
2. Reuse of `resolver.js` = vendored copy with recorded source hash, so an audit can pin resolver version.
3. `validate-pack.js` is extended only by adding checks (handoff §5), never relaxed.

## 4. Architecture amendment (MAK/M-AI as background services)
Three layers per handoff §3. Based on the Phase C findings, the integration shape is:
- **Device:** deterministic resolver + gatekeeping + local store. Must not depend on any service. The TypeScript Kernel is the only candidate that could run on-device (library, no runtime deps).
- **Intelligence service:** MAK is a Python/SQLite server process — it cannot run inside the Capacitor shell. Reachable only as a versioned HTTP service, or stubbed.
- **Governed dev/release:** not shipped.

See `PHASE-C-MAK-MAI-CAPABILITY-BASELINE.md`.

## 5. Open items for Brian
- Identify `app/index.html` in the framework folder.
- Related prior builds exist and must be searched/linked, not duplicated (Search-Before-Create): `2026-09-27-pocket-auditor`, `2026-09-17-audit-finding-iq`, `2026-08-20-audit-program-iq`, `2026-09-07-audit-program-iq`. Their relationship to this product is undecided.
