# COPQ Quantifier — Build Notes
**Build date:** 2026-08-15  
**Build run:** Overnight automated (opportunity-scanner-overnight)  
**Status:** VERIFIED — engine 6/6 tests PASS

## Verification
- File size: 21,911 bytes (self-contained, no external deps)
- T1 zero-input guard → null: PASS
- T2 failure-heavy → failure_high_reactive + prevention_underinvested: PASS
- T3 balanced/healthy → failure_healthy (pfail=20%): PASS
- T4 external>internal → external_exceeds_internal insight: PASS
- T5 2% revenue → world_class benchmark: PASS
- T6 monotone: adding external failure raises pfail (not decreases): PASS

## Architecture
- Single-file HTML; zero external network calls
- 4-tab input interface: Prevention / Appraisal / Internal Failure / External Failure
- PAF (Prevention-Appraisal-Failure) model — 35 cost line items across 4 categories
- Currency-agnostic (user enters in any currency; outputs in same units)
- Outputs:
  - KPI grid (4 categories + total + % revenue)
  - Visual category bar chart (proportional fill)
  - Prioritized insights (3 intelligent observations based on distribution)
  - Management review summary table
  - Copyable MR text block for direct paste into management review minutes
  - JSON export
- Insight engine: failure%, external vs. internal comparison, prevention investment ratio, revenue% benchmark
- VERA navy/steel design system applied; category colors: prevention=blue, appraisal=purple, internal=red, external=amber

## FSA Gate
- Deterministic calculation (no probabilistic scoring): PASS
- No fabricated conclusions (all insights derive from user-entered data): PASS
- No network/persistence: PASS
- VERA design system: PASS
- M-AI: N/A — excellent future DIM candidate (trend COPQ over time, trigger management review alert when failure% exceeds threshold)

## MRA Integration
This tool is the designated COPQ input feed for the Management Review Autopilot (MRA). The JSON export and text block are sized and formatted for MRA import.
