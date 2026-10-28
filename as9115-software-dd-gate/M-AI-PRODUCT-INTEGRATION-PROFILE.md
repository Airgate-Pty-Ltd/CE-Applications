# M-AI Product Integration Profile — AS9115 Software D&D Gate Tool

**Governor Decision:** ARCHITECTURE DEFINED  
**Date:** 2026-09-11  
**Domain:** `as9115-software-dd-readiness`

## Integration Disposition

Standalone tool uses deterministic rule engine only. M-AI Kernel integration deferred to platform promotion.

## Reserved Interface

`window.__MAI_INTERFACE__` declared in shipped HTML file with:
- `domain: 'as9115-software-dd-readiness'`
- `dims: ['software-gate-completeness','sccb-authority-evidence','cdrl-status-evidence','software-vv-evidence']`
- `status: 'ARCHITECTURE_DEFINED'`

## DIMs on Platform Promotion

| DIM | Purpose |
|-----|---------|
| software-gate-completeness | Tracks overall gate completion rate across all 5 gates |
| sccb-authority-evidence | Verifies SCCB establishment and authority evidence |
| cdrl-status-evidence | Tracks CDRL/DRL completeness status |
| software-vv-evidence | Verifies software V&V method documentation |

## Scoring Architecture

- 5-gate deterministic engine (AS9100D 8.3.2 / 8.3.3 / 8.3.4+5 / 8.3.6+7 / AS9115 overlay)
- Per-gate verdict: HOLD (critical open or <65%) / CONDITIONAL (65–90%) / PROCEED (≥90%)
- Overall: any HOLD → HOLD; any CONDITIONAL → CONDITIONAL; else PROCEED
- Critical override: any critical item unchecked forces HOLD at that gate
- Total gate items: 37 (7 planning + 7 inputs + 7 outputs + 6 V&V + 12 software)
- Critical items: 21 across all gates (7 in software gate alone)
