# Product Inspection — Discovery Record (Phase 0 Summary)

**Date:** 2026-10-20  
**Full record:** `../ProductInspection/docs/DISCOVERY-RECORD.md`  
**Status:** Phase 0 complete · Phase 1 (feature build) in progress

This file is an index and summary. The authoritative full record lives at the path above.

---

## What exists on E: (verified 2026-10-20)

### FieldAudit — primary reference implementation

| Item | Fact |
|---|---|
| Path | `../FieldAudit/` |
| Version | 1.0.1 (code 3) · package `com.conformedge.fieldaudit` |
| Stack | Vanilla JS modules, Capacitor 8.5.3, min API 24 / target 36 |
| Build | `build-single.js` → single-file HTML; `build-android.js` → APK/AAB; esbuild Chrome 70 |
| Tests | 327 checks (224 feature + 50 scenario + 14 probe + 39 native), zero failures on 1.0.0 |
| Reusable patterns | App lock (PBKDF2/Keystore), backup/restore, PDF writer, versioned template engine, native export plugin, NCR upload, entitlement states, test harness |

**Do not modify FieldAudit.** Use it as the canonical reference only.

### ProductInspection — active build

| Item | Fact |
|---|---|
| Path | `../ProductInspection/` |
| Source | `src/base.html` (~177 KB single-file app, vanilla JS) |
| Dev server | `serve.js` · port 7421 |
| Phase | Phase 1 feature build — core inspection screens built |

---

## Key decisions made in Phase 0

1. **Stack**: Vanilla JS + Capacitor (mirror FieldAudit). No Ionic/React until Mike's implementation is reviewed.
2. **No INTERNET permission** — all storage is IndexedDB; no network calls in app binary.
3. **CE-authored forms** — 8130-3 equivalent uses CE's own wording. Not a word-for-word copy of FAA official forms.
4. **JSON export schema v1** — field names locked from Phase 1. QMS API integration is a future project. Schema must be stable.
5. **Sampling plan** — ANSI Z1.4 Table II-A + AS9138 C=0. Full lookup table implemented in JS; extracted to JSON in `content/sampling/`.
6. **SPC thresholds** — Cpk ≥1.33 capable, 1.00–1.33 marginal, <1.00 incapable. Auto-calculated; X̄/R chart on tap (deferred).

---

## Open questions (as of Phase 0 — Brian to answer)

See full record for complete list. Key unresolved items:

| # | Question | Impact |
|---|----------|--------|
| Q1 | Which Capacitor plugins does Mike use? | Plugin version alignment |
| Q2 | Does Mike's build add dark mode theme tokens? | Theme parity |
| Q3 | Mike to push merged repo to `_reference-from-Mike/` | Can't verify stack alignment without it |
| Q4 | FAA Order 8130.21J — current revision? | 8130-3 block requirements |
| Q5 | Is EASA Form 1 needed in v1 or v2? | Auth screen scope |

---

## Standards referenced (licensed — do not redistribute)

- AS9102C (SAE/IAQG) — FAI form field structure. Read-only reference; verbatim text must not ship in app binary.
- AS9100D clause 8.4 / 8.5.1 — inspection record retention
- ANSI Z1.4 Table II-A — sampling code letter and sample size lookup
- AS9138 — C=0 plan for critical characteristics
- FAA 8100-1 — Conformity Inspection Record (CE creates equivalent in own words)
- FAA 8130-3 — New Manufacture (Block 13) / Maintenance Part 145 (Block 14)
