# Decision Logic — CAPA Effectiveness Verification Planner

## M-AI Role
Kernel-shaped domain pack running locally in static HTML. Runtime `@mai/kernel` reserved — interface marked as `window.__MAI_RESERVED`. On platform promotion, governed decisions migrate to `@mai/kernel` adapter.

## Governed Decisions (local)

### 1. Pathway Assignment
Rule: IF escape OR safety OR repeat → CRITICAL (override, regardless of initial severity).
Otherwise: pathway = user-selected severity (CRITICAL / MAJOR / MINOR).
Signal: BLOCK-class (CRITICAL mandatory for escapes/safety) — enforces the most conservative path.

### 2. Verification Methods Selection
Rule table: CA type → method set (deterministic, 2 methods per CA type; "multiple" = 3):
- procedure → Re-Audit + Document Controlled-Change Verification
- training → Knowledge Assessment + OJT Observation
- equipment → Re-Calibration + Process Output Inspection
- process → Process Monitoring/KPI + Process Re-Audit
- supplier → Re-Incoming Inspection + Supplier Re-Assessment
- design → Test/Inspection + FAI (if AS9100 scope)
- management → Management Review Input + Internal Audit
- multiple → Multi-Process Re-Audit + KPI Dashboard + MR Acceptance

### 3. Verification Timeline
Rule table: pathway → days:
- CRITICAL: 30 days from CA completion
- MAJOR: 90 days
- MINOR: 180 days
Verification deadline = CA completion date + pathway days.

### 4. Evidence Requirements
Per method: specific documentary evidence defined (calibration certificate, inspection records, audit report, test scores, KPI charts, MR minutes, etc.). Required fields recorded in JSON export.

## Scoring Thresholds (INFERRED — BRIAN CONFIRMATION REQUIRED)
- Training pass score threshold: not specified in tool (shows "[confirm threshold]" in evidence text) — Brian to define
- Supplier re-assessment threshold: same placeholder
