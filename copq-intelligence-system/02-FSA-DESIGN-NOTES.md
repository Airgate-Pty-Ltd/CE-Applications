# FSA Design Notes — COPQ Intelligence System
**Stage:** 2 — Future Systems Architect (BUILD mode)  
**Date:** 2026-08-18  
**References:** 2026-08-16 FSA FAIL analysis in 2026-08-15-copq-quantifier/02-FSA-DESIGN-NOTES.md

---

## FSA Gate Decision

```
FSA BUILD MODE GATE: PROCEED
The COPQ Intelligence System eliminates the data-entry burden of the prior calculator
by importing from existing operational data sources. This passes FSA Section 12.
```

---

## FSA Section 12 Evaluation

| Check | Score | Rationale |
|-------|-------|-----------|
| Eliminates work | +3 | Replaces 35-field manual entry with CSV import from systems where data already exists |
| Deterministic rules-based engine | +2 | PAF calculation and insight engine are deterministic |
| No enterprise equivalent | +2 | No comparable COPQ import intelligence product at this price point |
| Reusable IP | +2 | PAF model, insight engine, MRA export reused and improved |
| Import-based rather than manual | +3 | Primary input is file import, not form fields |

**FSA Layer 2 total: +12 — PROCEED**

---

## Architecture Decisions

### Data flow
1. User drops/selects a CSV file (current period COPQ records)
2. System previews first 5 rows; user maps columns: `description`, `category_code`, `amount`, `date` (optional), `type` (optional)
3. PAF classification engine maps each record to P/A/I/E category using:
   - Explicit `type` column if present (user-mapped)
   - Category code pattern matching (configurable rules)
   - Description keyword matching (fallback)
4. Sums totals, computes percentages, runs insight engine
5. Optional: repeat for prior-period CSV; compute deltas
6. Output: PAF donut chart, top-10 cost drivers table, 3 insights, MR narrative block, JSON export

### PAF classification rules (deterministic, transparent)
- Prevention: training records, audit costs, SPC, calibration, supplier assessment
- Appraisal: inspection, testing, first-article, incoming inspection, QC labor
- Internal failure: scrap, rework, re-test, yield loss, material review
- External failure: warranty, returns, field failures, customer complaints, concessions

### Intent-based mapping
If the user's CSV has a `type` column already coded (e.g., "I" for internal failure), that takes precedence. Otherwise, description keyword matching provides a reasonable automatic classification. The tool always shows the user what category each record mapped to before computing totals, so they can correct misclassifications.

### Prior-period comparison
Optional second file upload. Same column-mapping step. Delta computed per category. Trend direction flagged: improvement / stable / degrading per PAF category and overall.

### M-AI Reserved Interface
DIM: `copq-intelligence`. Governed decisions reserved:
- `COPQTrendAlert` (OBSERVE): flag when external failure % exceeds internal failure % (escape signal)
- `PreventionRatioAlert` (OBSERVE): flag when prevention < 10% of total COPQ (underinvestment signal)
- `MRAlertTrigger` (ADVISE): recommend MR agenda item when period-over-period total COPQ increases > 20%

No Kernel fork. No private rules engine. RESERVED INTERFACE — interface points documented; Kernel dependency injected when available.

### MRA JSON export schema
```json
{
  "copq_period": "string",
  "copq_total": "number",
  "prevention": {"amount": "number", "pct": "number"},
  "appraisal": {"amount": "number", "pct": "number"},
  "internal_failure": {"amount": "number", "pct": "number"},
  "external_failure": {"amount": "number", "pct": "number"},
  "trend": {"direction": "improving|stable|degrading|unavailable", "delta_pct": "number|null"},
  "top_drivers": [{"description": "string", "category": "string", "amount": "number"}],
  "insights": ["string"],
  "mr_narrative": "string",
  "generated": "ISO8601 timestamp"
}
```

---

## Visual Design
- VERA navy/steel design system
- 4-segment PAF donut chart (vanilla Canvas API — no external deps)
- Top-10 cost driver table with category color bands
- Prior-period delta indicators (↑ degrading red, ↓ improving green, → stable grey)
- Single HTML file, 0 external deps, print/PDF export
