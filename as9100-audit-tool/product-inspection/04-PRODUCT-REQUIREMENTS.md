# Product Inspection — Product Requirements

## Inspection types

| Type | Purpose | Sampling | SPC | Release docs |
|---|---|----------|-----|-------------|
| FAI | AS9102C first article — 100% characteristics | No | No | Optional 8130-3 / CIR |
| Incoming | Supplier / receiving inspection | Yes (Z1.4 / C=0) | No | CoC or 8130-3 |
| Production run | In-process SPC monitoring | No | Yes (Cpk) | No |
| Conformity | CE conformity record (CIR equivalent) | Optional | No | CIR + optional 8130-3 |

---

## Screen inventory

### 1. Part Setup (psi-* panels)

**Modes (toggle):** New · Open Existing · Load Template

- **New**: part number, revision, serial / lot, quantity, inspection type selector, drawing reference, customer, supplier, work order
- **Open Existing**: search by PN / serial / date; list of saved inspection jobs
- **Load Template**: search prior locked FAI records; select → inherit balloon layout + characteristic list; user enters new serial number to begin

**Sampling Plan card** (visible only when type = Incoming):
- Inputs: lot size, AQL (c0 / 0.65 / 1.0 / 1.5 / 2.5 / 4.0), inspection level (I / II / III / S1 / S2)
- Output: code letter, n, Ac, Re, plan note
- Algorithm: ANSI Z1.4 Table II-A; C=0 plan when AQL = c0
- Verified: lot 200 / AQL 1.5% / Level II → Code G → n=32 / Ac=1 / Re=2 ✓

**Auth Setup card** (visible when type = Final or Conformity):
- FAA: type select (PC / PMA / TSOA / Part 145 / ODA) + certificate number
- EASA: type select (Part 21G / Part 145) + approval number
- Auth note: auto-synced by `syncAuthNote()` — shows CoC-only / FAA enabled / EASA enabled / Dual available

### 2. Inspection Screen

**Characteristic row (char-row):**
- Balloon number, description, nominal ± tolerance, unit
- Status badge: pending / C (pass) / NC (fail) / OFI / N/A
- Record button → opens measurement entry card
- Photo pill (count badge if photos exist, tap to view gallery)
- Bluetooth Receive button (visible when BT instrument is paired)

**Measurement Entry Card:**
- BT status banner: instrument name, pair state, Receive button (→ `receiveBT()`)
- Measured value input (large, centred) + unit select
- Instrument select (calibrated instruments with cal-due date)
- Inspector select
- Photo row: count pill + Capture button (→ `capturePhoto(charId)`)
- Save & Compute Pass/Fail → auto-result from nominal ± tolerance
- Cancel

**SPC columns (production run only, Form 3 table):**
- n: count of measurements
- Cpk: computed; colour badge ≥1.33 green / 1.00–1.33 amber / <1.00 red / — if n<2
- Pp: similar (deferred display, data stored)

### 3. Form 1 — Part Number Accountability

Fields per AS9102C clause 4.2 (see `03-REGULATORY-MATRIX.md`). Read-only view of job header fields + FAI reason + baseline reference. Sign-off section.

### 4. Form 2 — Product Accountability

Material certs, special process certs, functional test results, software version, sub-cert list. Each row: description, cert number, issue date, result.

### 5. Form 3 — Characteristic Accountability

Table view: all characteristics with measured values, results, instruments, inspectors.

Columns (all): # · Description · Nominal · Upper Tol · Lower Tol · Actual · Unit · Result  
Additional columns (production run): n · Cpk

SPC legend below table: colour key + auto-calculate note.

### 6. NCR (Nonconformance Record)

Raised from a NC characteristic. Fields: description, disposition, root cause, corrective action reference (CAR link deferred).

**Status:** NCR creation + data capture built. Disposition loop and CAR link deferred.

### 7. Release Documents

- 8130-3 output screen: deferred (auth setup exists)
- EASA Form 1 output screen: deferred
- CoC output screen: deferred
- CIR (CE Conformity Inspection Record): deferred

### 8. Export

Lock → generate package → save to Downloads (MediaStore):
- JSON record + SHA-256 hash
- PDF Forms 1 / 2 / 3
- Photos subfolder

**Schema v1 field names are locked.** Changes need schema_version bump and migration note.

---

## Acceptance criteria

| Feature | Criteria | Status |
|---|---|---|
| Characteristic pass/fail | Value within nominal ± tolerance → C; outside → NC | Built |
| Sampling plan | Z1.4 code letter + n correct for lot/AQL/level | Verified ✓ |
| SPC Cpk | ≥1.33 green, 1.00–1.33 amber, <1.00 red, — if n<2 | Built |
| BT receive | Reading populates active measurement field | Simulated (dev) |
| Photo capture | Photo tagged to characteristic, count shown | Built |
| Load Template | Inherits balloon layout + char list from prior FAI | Built (UX) |
| Auth note | syncAuthNote() reflects FAA/EASA/dual state | Built |
| Sampling card | Shows/hides on inspection type change | Built |
| Form 3 SPC columns | n + Cpk columns in production mode | Built |

---

## Deferred features (out of scope for current build)

- Military: DD Form 250, MIL-STD-1916, ITAR flag
- 8130-3 / CoC / EASA Form 1 output screens
- NCR full disposition loop, CAR link
- Material cert traceability (Form 2 cert scan)
- FOD checklist
- PDF/A archival
- Multi-sheet drawing viewer / balloon link
- X̄/R chart (data collected; chart UI deferred)
- Mike's merged Capacitor repo review
