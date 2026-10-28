# Product Inspection — Regulatory Matrix

Maps app screens and fields to the standards they implement. Use this when adding regulated fields or verifying compliance scope.

**Licensed standards** — read-only reference. Verbatim text from AS9102C and AS9100D must not ship in the app binary.

---

## AS9102C First Article Inspection

### Form 1 — Part Number Accountability

| Field | AS9102C clause | App field | Screen |
|---|---|---|---|
| Part number | 4.2.1 | `job.part_number` | Part Setup |
| Part revision | 4.2.1 | `job.part_revision` | Part Setup |
| Serial number | 4.2.1 | `job.serial_number` | Part Setup |
| Drawing number | 4.2.2 | `job.drawing_number` | Part Setup |
| Drawing revision | 4.2.2 | `job.drawing_revision` | Part Setup |
| Quantity | 4.2.3 | `job.quantity` | Part Setup |
| Customer name | 4.2.4 | `job.customer` | Part Setup |
| Supplier / manufacturer | 4.2.5 | `job.supplier` | Part Setup |
| FAI reason | 4.2.6 | `form1.fai_reason` | Form 1 screen |
| Baseline FAI reference | 4.2.6 | `form1.prior_fai_ref` | Form 1 screen |

### Form 2 — Product Accountability

| Field | AS9102C clause | App field |
|---|---|---|
| Raw material / part certs | 4.3.1 | `form2.material_certs[]` |
| Special process certifications | 4.3.2 | `form2.special_process_certs[]` |
| Functional test results | 4.3.3 | `form2.functional_tests[]` |
| Software version | 4.3.4 | `form2.software_version` |
| Sub-contractor data | 4.3.5 | `form2.sub_certs[]` |

### Form 3 — Characteristic Accountability

| Field | AS9102C clause | App field |
|---|---|---|
| Balloon / characteristic number | 4.4.1 | `char.id` |
| Characteristic description | 4.4.2 | `char.description` |
| Nominal / tolerance | 4.4.3 | `char.nominal`, `.upper_tolerance`, `.lower_tolerance` |
| Measured actual value | 4.4.4 | `measurement.value` |
| Result (C / NC) | 4.4.5 | `char.result` |
| Inspector | 4.4.6 | `measurement.inspector` |
| Instrument / gauge ID | 4.4.7 | `measurement.instrument_id` |
| Calibration due date | 4.4.7 | `measurement.instrument_cal_due` |

**SPC extension (production run only):**

| Field | App field | Rule |
|---|---|---|
| n (sample count) | `len(char.measurements)` | Display only if n ≥ 2 |
| Cpk | `char.cpk` | Cpk = min((USL−X̄)/3σ, (X̄−LSL)/3σ) |
| Pp | `char.pp` | Pp = (USL−LSL)/6σ |
| Result colour | — | ≥1.33 green · 1.00–1.33 amber · <1.00 red |

---

## FAA 8130-3 Airworthiness Approval Tag

CE creates an equivalent Conformity Inspection Record (CIR) in CE's own words. This is NOT a word-for-word copy of the official FAA 8130-3 form.

| Block | Purpose | CE field |
|---|---|---|
| Block 1 | Nationality / registration mark | `release.faa.registration` |
| Block 4 | Order / contract number | `job.work_order` |
| Block 5 | Description of article | `job.part_number + description` |
| Block 6 | Part number | `job.part_number` |
| Block 7 | Serial / batch / lot number | `job.serial_number` or `job.lot_number` |
| Block 8 | Quantity | `job.quantity` |
| Block 9 | Eligible under (US TSO, etc.) | `release.faa.eligibility` |
| Block 10 | Approval reference number | `release.faa.number` |
| Block 12 | Bilateral statement | Auto-generated if dual release |
| Block 13 | New manufacture (PC / PMA / TSOA / ODA) | `release.faa.type` |
| Block 14 | Maintenance (Part 145) | `release.faa.type = "145"` |
| Block 19 | Signature / stamp | `release.inspector_signature` |

**Work types (Block 14):** Inspected/Tested · Repaired · Modified

**Dual release:** 8130-3 + EASA Form 1 simultaneously under BASA/TIP. Block 12 bilateral statement is auto-generated when `release.dual_release = true`.

---

## EASA Form 1 Authorised Release Certificate

CE creates an EASA-equivalent certificate. Not a copy of the official EASA Form 1 template.

| Field | CE field |
|---|---|
| Approval reference | `release.easa.number` |
| Approval basis | Part 21G (manufacturing) or Part 145 (maintenance) |
| Part description | `job.part_number + description` |
| Statement | CE-authored, references EASA type |

---

## ANSI Z1.4 / AS9138 Sampling

| Standard | Scope | App location |
|---|---|---|
| ANSI Z1.4 Table II-A | Code letter from lot size + inspection level | `content/sampling/ansi-z1.4-tables.json` |
| ANSI Z1.4 Table II-A | Sample size and Ac/Re from code letter + AQL | `content/sampling/ansi-z1.4-tables.json` |
| AS9138 C=0 | Zero-acceptance plan, lot size → n | `content/sampling/as9138-c0-plan.json` |

**Verified test case:** lot=200 / AQL 1.5% / Level II → Code G → n=32 / Ac=1 / Re=2 ✓

---

## AS9100D

| Clause | Requirement | App feature |
|---|---|---|
| 8.4 | Supplier control | Supplier field, Form 2 sub-cert capture |
| 8.5.1 | Controlled production conditions | Instrument calibration due date, inspector field |
| 8.6 | Release of products | Lock inspection record, release auth |
| 8.7 | Nonconforming outputs | NC characteristic flag, NCR creation |
| 10.2 | Corrective action | NCR links to CAR (deferred) |

---

## CE Conformity Inspection Record (CIR)

CE's equivalent of FAA 8100-1. CE-authored fields and layout. Not a word-for-word copy.

| CE field | Equivalent to FAA 8100-1 | Status |
|---|---|---|
| Part number / revision | Block 5 | Built |
| Drawing reference | Block 6 | Built |
| Inspection type | Block 7 (type of inspection) | Built |
| Characteristic results | Section III | Built (Form 3) |
| Inspector sign-off | Block 10 | Planned |
| CE form number + revision | — | Planned |
