# Product Inspection — Build Governance

## Locked decisions

These are final. Do not change without explicit Brian approval and a decision log entry.

| # | Decision | Locked | Rationale |
|---|----------|--------|-----------|
| G-01 | Stack: Vanilla JS + Capacitor — no Ionic/React | 2026-10-20 | Mirror FieldAudit; Ionic decision deferred until Mike's stack confirmed |
| G-02 | No INTERNET permission in Capacitor manifest | 2026-10-20 | Offline-first; data stays on device; no accidental phone-home |
| G-03 | CE-authored forms — not word-for-word copies of FAA/SAE forms | 2026-10-20 | Copyright and regulatory. CIR is CE's own form, not a copy of 8100-1 |
| G-04 | JSON export schema v1 field names locked | 2026-10-21 | QMS integration depends on stable field names; changes need schema_version bump |
| G-05 | Sampling: ANSI Z1.4 Table II-A + AS9138 C=0 | 2026-10-21 | Industry standard for aerospace incoming inspection |
| G-06 | SPC: Cpk ≥1.33 capable / 1.00–1.33 marginal / <1.00 incapable | 2026-10-21 | Standard aerospace Cpk thresholds (AS9100D / Boeing D1-9000) |
| G-07 | IndexedDB storage (Dexie pattern from FieldAudit) | 2026-10-20 | No filesystem permission needed; works offline; consistent with FieldAudit |
| G-08 | Export to Downloads via Android MediaStore | 2026-10-20 | No WRITE_EXTERNAL_STORAGE permission needed on API 29+ |
| G-09 | PDF package + JSON record as dual export artefacts | 2026-10-20 | PDF = human-readable; JSON = machine-readable for QMS integration |
| G-10 | Burrana data must not appear in CE product | 2026-10-20 | CLAUDE.md confidentiality rule; Burrana proprietary = separate |

## What is in scope (current build)

- FAI inspection workflow (all 3 forms)
- Incoming inspection with Z1.4 / C=0 sampling plan
- Production-run inspection with SPC / Cpk
- Conformity inspection (CE CIR)
- Characteristic measurement entry (manual + simulated BT)
- Photo capture tagged to characteristics
- FAI template inheritance
- Authorization setup (FAA / EASA / CoC)
- NCR creation (data capture; disposition deferred)
- Export: JSON + hash (PDF generation deferred)

## What is deferred (not in scope until explicitly authorized)

| Feature | Reason deferred |
|---|---|
| Military add-on (DD Form 250, MIL-STD-1916, ITAR) | Separate product scope decision needed |
| 8130-3 / EASA Form 1 / CoC output screens | Auth setup complete; output form design deferred |
| NCR full disposition loop + CAR link | Needs NCR workflow design |
| Material cert traceability (cert scan) | Form 2 UX not yet started |
| FOD checklist | Separate checklist module — design not started |
| PDF/A archival | Archival format decision deferred |
| Multi-sheet drawing viewer | Complex; separate design task |
| X̄/R chart UI | Data collected; chart rendering deferred |
| Mike's merged Capacitor repo review | Mike has not supplied his repo yet |
| QMS direct API push | Separate future project; JSON schema is ready |
| Actual Bluetooth protocol (non-simulated) | Need Capacitor BLE plugin + device testing |
| Physical device testing (Android 11+) | Dev only tested in browser and emulator |

## What is not in scope (permanently excluded)

| Item | Rule |
|---|---|
| Modification of FieldAudit | CLAUDE.md prohibition |
| Modification of Pocket Auditor or AI-QMS | CLAUDE.md prohibition |
| Burrana data in CE product | CLAUDE.md confidentiality |
| Redistribution of AS9102C / AS9100D text | Licensed; not redistributable |
| Word-for-word copy of FAA 8100-1 or 8130-3 | CE forms must be CE-authored |

## Decision authority

| Type of decision | Authority |
|---|---|
| Locked decisions above | Brian (b.r.olea.gqm@gmail.com) |
| Deferred feature activation | Brian |
| Schema v1 field name change | Brian — requires schema_version bump |
| Stack change (add framework / plugin) | Brian |
| Release to production | Brian |

## Change log

| Date | # | Change | Authority |
|---|---|--------|-----------|
| 2026-10-21 | G-01 to G-10 | Initial governance baseline locked | Brian |
