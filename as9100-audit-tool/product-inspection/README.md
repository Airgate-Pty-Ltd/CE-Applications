# Conform-Edge Product Inspection

Offline-first inspection data capture and first article inspection (FAI) tool for aerospace manufacturing under AS9102C, AS9100D, and FAA/EASA regulatory frameworks.

This folder is the canonical governance location for the Product Inspection product. It is intentionally separate from the Pocket Auditor and AI-QMS products. Do not modify those products from this folder.

## What this provides

- AS9102C First Article Inspection — Forms 1, 2, and 3 (Part, Product, and Characteristic Accountability)
- Incoming and production-run inspection workflows with configurable sampling plans
- ANSI Z1.4 / AS9138 attribute sampling (standard and C=0 plans)
- SPC / Cpk tracking per characteristic for production runs (n ≥ 2)
- Bluetooth instrument capture (Mitutoyo U-Wave / Digimatic protocol)
- Photo capture tagged to individual characteristics
- FAI template inheritance ("Load Template" from prior locked FAI)
- Authorization setup: FAA 8130-3, EASA Form 1, dual-release, CoC-only paths
- Structured JSON export + PDF package; append-only hash-chained record ledger
- CE QMS integration — JSON schema is stable from v1 and versioned

## Stack

Vanilla JS · Capacitor 8.5.3 · IndexedDB · No INTERNET permission · Offline-first

Single-file app (`src/base.html`) built with `build-single.js` → Capacitor Android target (API 24+). Dev server on port 7421.

See `02-ARCHITECTURE.md` for full technical detail.

## Source location

The current working source is at:

```
../ProductInspection/src/base.html      (active dev, 177 KB single-file app)
../ProductInspection/serve.js           (dev server, port 7421)
../ProductInspection/docs/DISCOVERY-RECORD.md
```

Migration of those files into this folder (as `src/`, `serve.js`, `docs/`) is **pending Brian's approval**. Until then, this folder holds governance, schemas, sampling data, and exported samples only.

## Reading order

Start at `00-START-HERE.md`.

## Completion gate

This product is not approved for release until:

- AS9102C characteristic fields verified against licensed standard (licensed copy must not ship in binary)
- FAA 8130-3 equivalent form uses CE's own wording (not word-for-word copy of official form)
- JSON export schema v1 locked and recorded in `content/schemas/`
- Sampling plan verified: lot 200 / AQL 1.5% / Level II → Code G → n=32, Ac=1, Re=2 (VERIFIED)
- SPC: Cpk ≥1.33 green, 1.00–1.33 amber, <1.00 red (VERIFIED)
- Mike's merged Capacitor repo reviewed (reference at `_reference-from-Mike/` — not yet supplied)
- Test suite and validation scripts pass from `tests/`
- APK runs on physical device (Android 11+)
