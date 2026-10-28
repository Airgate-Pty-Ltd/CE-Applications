# FSA Design Notes — COPQ Quantifier
**Stage:** 2 — Future Systems Architect (BUILD mode)  
**Date:** 2026-08-16 (retroactive governance pass)  

---

## FSA Gate Decision

```
FSA BUILD MODE GATE: BLOCK — REDESIGN REQUIRED
The current artifact is a manual data-entry PAF calculator.
FSA Section 12 FAIL confirmed (consistent with Brian's interactive-session determination, 2026-08-15).
Required product: COPQ Intelligence System — see redesign path below.
```

---

## FSA Section 12 Evaluation

| Check | Score | Rationale |
|-------|-------|-----------|
| Eliminates work | 0 | The current tool CREATES work — user must manually enter 35 cost line items. It does not extract COPQ data from systems where it already exists. |
| Deterministic rules-based engine | +2 | PAF calculation and insight engine are deterministic and correct |
| Static forms as primary input | **−3** | PRIMARY mechanism is manual entry of financial figures into 35 form fields. This is the classic static-form anti-pattern: the value is locked behind a data-entry burden that most users will not complete accurately or consistently. |
| No enterprise equivalent | +2 | No competing COPQ Intelligence product in this exact configuration |
| Reusable IP | +1 | PAF model, insight engine, MR text block are reusable in the redesigned product |

**FSA Layer 2 modifier: +2 (net, after −3 static-form penalty)**

---

## Why This Is an FSA Section 12 Fail

**The problem:** COPQ data (scrap costs, rework hours, warranty claims, inspection costs) already exists in operational systems — ERP, MES, CMMS, NCR systems, MRO systems. The correct product connects to where the data lives, extracts it, and computes COPQ automatically. Requiring a quality manager to manually gather and enter 35 line items from separate systems is the failure pattern: it guarantees the tool is used rarely, inaccurately, and inconsistently.

**Brian's determination (2026-08-15 interactive session):** "COPQ Quantifier is the Section 12 FSA FAIL example (manual entry calculator; required product is COPQ Intelligence System)." This is CONFIRMED and governs.

**The MRA integration claim also fails:** The COPQ Quantifier claims to feed MRA via JSON export — but if the data is manually entered, the COPQ figures are unreliable inputs into a management review. MRA integration requires trusted, system-sourced data.

---

## What Passes FSA in the Current Artifact

- PAF model (Prevention/Appraisal/Internal/External failure) — sound framework
- Insight engine (3 intelligent observations from distribution) — correct pattern; reusable
- Management review summary + MR text block — valuable output
- JSON export structure — reusable in redesigned product
- VERA design — keep
- 6/6 engine tests — calculation logic is correct; keep as core

---

## Redesign Path — COPQ Intelligence System

**The product that passes FSA:**

| Element | Redesigned capability |
|---------|----------------------|
| Data input | Import from CSV/Excel export of NCR system, ERP scrap report, rework log, warranty register — NOT manual 35-field entry |
| Intelligence layer | Map imported records to PAF categories automatically using record type / cost code / disposition code |
| Insight engine | Same deterministic PAF insights — but now computed from actual records, not estimated figures |
| Trend analysis | Compare current period vs. prior period import (two-file input); direction + delta |
| MRA integration | Trusted data feed into MRA; period, category breakdown, trend visible in MR package |
| M-AI layer | M-AI DIM monitors COPQ trend over time; triggers MR alert when failure% exceeds configurable threshold; flags when external failure exceeds internal (escape-rate signal) |
| Pricing | $249–$399 (significantly higher than calculator tier) |

**What changes in the HTML prototype for the redesigned product:**
- Replace 35-field manual entry with a file-import area (CSV/Excel drop zone or paste)
- Add a column-mapping step (which column = scrap cost, which = rework hours, etc.)
- Keep the PAF calculation and insight engine unchanged
- Add prior-period import for trend
- Update JSON export for MRA import schema

**This is a materially better product.** It eliminates the data-entry burden, produces trusted outputs, enables the MRA integration claim, and supports the M-AI DIM pattern properly.

---

## Current Build Disposition

```
BUILD: BLOCKED — FSA FAIL
Current artifact: PROTOTYPE, pre-governance
Status: NOT publication-authorized, NOT commercialization-authorized
Path forward: Redesign as COPQ Intelligence System (see above)
When redesigned: Re-run full governance (Stages 1–10)
```

The existing HTML artifact is retained as a reference for the calculation engine and insight logic. It must NOT be published or sold in its current form.
