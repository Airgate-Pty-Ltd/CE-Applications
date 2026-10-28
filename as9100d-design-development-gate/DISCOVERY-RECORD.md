# Discovery Record — AS9100D Design & Development Gate Tool

**Date:** 2026-09-09
**Status:** BUILD AUTHORIZED
**Brand:** Conform-Edge (software)
**Opportunity Source:** Ledger gap scan — Cl. 8.3 is a top CB audit nonconformance area; no D&D gate tool in portfolio

## Product Definition

**Product:** AS9100D Design & Development Gate Tool v1.0
**File:** as9100d-dd-gate-tool.html (self-contained, 0 external deps)
**Clause coverage:** AS9100D Cl. 8.3.2 (Planning), 8.3.3 (Inputs), 8.3.4 (Outputs), 8.3.5 (Reviews), 8.3.6 (Verification & Validation), 8.3.7 (Changes)

## Market & Revenue

- Target: AS9100D / ISO 9001 certified manufacturers, aerospace Tier 1/2 suppliers, D&D functions
- Price: $149–$199 one-time; bundle candidate with AS9100D Self-Assessment and 8D tools
- Revenue path: ~$250k/yr at ~1,500 sales/yr (conservative Conform-Edge volume)
- Startup cost: <$100 (hosting only)

## Gate Stages Built

1. Gate 1 — Planning (8.3.2): 8 items, 3 critical
2. Gate 2 — Inputs (8.3.3): 7 items, 3 critical
3. Gate 3 — Outputs + Reviews (8.3.4/8.3.5): 8 items, 4 critical
4. Gate 4 — V&V + Transfer (8.3.6/8.3.7): 8 items, 4 critical

**Total:** 31 items, 14 critical items, PROCEED/CONDITIONAL/HOLD verdict engine

## Differentiators

- First D&D stage-gate tool in the Conform-Edge portfolio
- Covers all six 8.3 sub-clauses in one tool
- Critical-item override forces HOLD regardless of overall score
- AS9100D-specific items (KC, configuration management, product safety, production readiness)
- MR narrative auto-generates a formal gate review record
- JSON export for integration with QMS records

## Governance

- FSA Gate: PASS — deterministic assessment tool with reserved M-AI interface; no manual data entry calculator failure mode (gate inputs are checkboxes, not manual calculations)
- M-AI Integration: ARCHITECTURE DEFINED (domain: as9100d-design-development); interface reserved at id=mai-interface
- Build Governor: PROCEED
