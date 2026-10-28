# Concession & Deviation Decision Builder — Build Notes
**Build date:** 2026-08-15  
**Build run:** Overnight automated (opportunity-scanner-overnight)  
**Status:** VERIFIED — engine 6/6 tests PASS

## Verification
- File size: 19,578 bytes (self-contained, no external deps)
- T1 customer-prohibits → STOP: PASS
- T2 KC+aviation+concession → STOP (MRB/regulatory required): PASS
- T3 safety-unknown + FFF-not-confirmed → STOP: PASS
- T4 before-production + FFF-confirmed → DEVIATION LOW severity: PASS
- T5 KC-safety (non-aviation) → CONCESSION HIGH + Design Authority required: PASS
- T6 monotone: medical device flag adds Regulatory Affairs approval: PASS

## Architecture
- Single-file HTML; zero external network calls
- Dual-mode: Deviation/Production Permit (before production) or Concession/Waiver (after production)
- 3-gate decision engine:
  - Gate 1: Hard stops (customer prohibition, KC+aviation+after-production, unknown safety without FFF)
  - Gate 2: Departure type classification (Deviation vs Concession)
  - Gate 3: Risk severity (LOW/MEDIUM/HIGH) + required approval matrix
- Auto-generates a formatted concession/deviation request record with signature lines
- Record copyable to clipboard; print/PDF ready
- Scope: AS9100D 8.7 / ISO 9001 8.7 / IATF 16949 / ISO 13485; aviation and medical device overlays
- VERA navy/steel design system applied

## FSA Gate
- Deterministic rules-only: PASS
- No fabricated regulatory conclusions (cited by intent, recommends verification): PASS
- No network/persistence: PASS
- VERA design system: PASS
- M-AI: N/A (future DIM candidate: concession history tracking, repeat-concession escalation trigger)

## Product Brief
See PRODUCT-BRIEF.md
