# Build Specification — COPQ Intelligence System
**Stage:** 4 — Build Specification  
**Date:** 2026-08-18

---

## Deliverable

Single file: `copq-intelligence-system.html`  
Self-contained; 0 external dependencies; print/PDF/JSON export

---

## Functional Requirements

### FR-1 CSV Import
- File drop zone and file-picker button
- Accept .csv and .txt (comma or semicolon delimited)
- Preview first 5 rows after load
- Parse with vanilla JS; handle quoted fields, BOM, CRLF

### FR-2 Column Mapping
- User selects which column maps to: Description, Amount, Category (optional), Date (optional)
- Provide "Auto-detect" button that tries to match column headers to expected names
- Show mapped preview with first 5 records after mapping

### FR-3 PAF Classification Engine (deterministic)
- If Category column provided: use explicit PAF mapping table (user-visible)
- Fallback: description keyword matching → P/A/I/E
- Always show classification results table before computing totals
- User can override individual record classifications via dropdown

### FR-4 PAF Calculation
- Sum amounts by P/A/I/E category
- Compute % of total for each
- Compute total COPQ, record count, average cost per record

### FR-5 Prior Period Comparison (optional)
- Second file upload labeled "Prior Period (optional)"
- Same column mapping step
- Compute delta per category: amount change + % change
- Direction: improving / stable (< 5% change) / degrading

### FR-6 Insight Engine (deterministic, 3 insights)
- Insight 1: Largest category by amount + what it signals
- Insight 2: Escape rate signal (external/internal ratio) — flag if external > internal
- Insight 3: Prevention investment ratio — flag if < 10% of total COPQ

### FR-7 Management Review Narrative
- 150–200 word paragraph suitable for paste into MR minutes
- States period, total COPQ, PAF breakdown, trend direction, and top driver
- Templated; no LLM required

### FR-8 JSON Export
- Schema per 02-FSA-DESIGN-NOTES.md
- Download as `copq-intelligence-[date].json`
- MRA-compatible structure

### FR-9 Print/PDF Export
- Print-optimized CSS
- Summary view: PAF chart, top-10 drivers, insights, narrative, timestamp

---

## Visual Design (VERA system)

- Background: #0a0f1e (near-black)
- Panel: rgba(15, 25, 60, 0.85) with navy border #1e3a6e
- Primary accent: #4a9eff (steel blue)
- Prevention: #22c55e (green)
- Appraisal: #3b82f6 (blue)
- Internal failure: #f59e0b (amber)
- External failure: #ef4444 (red)
- Text: #e2e8f0
- Font: system-ui / -apple-system

---

## Acceptance Tests

| ID | Test | Pass Criteria |
|----|------|---------------|
| AT-01 | Load CSV with explicit P/A/I/E column | All records classified correctly; totals match manual sum |
| AT-02 | Load CSV with description-only (no category column) | Keyword engine classifies at least 80% of typical NCR/scrap records correctly |
| AT-03 | Prior period delta | Delta amounts and direction correct for all 4 categories |
| AT-04 | Insight: escape rate trigger | When external > internal, Insight 2 flags it |
| AT-05 | Insight: prevention underinvestment | When prevention < 10%, Insight 3 flags it |
| AT-06 | JSON export | Exported JSON parses cleanly; all required fields present |
| AT-07 | Zero-record import | Shows error; does not crash |
| AT-08 | Large file (1000+ rows) | Processes without browser hang; completes in < 3 seconds |
