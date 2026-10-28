# Build Notes — ISO 17025:2017 Calibration Lab Accreditation Readiness Tool

**Build date:** 2026-08-21 (automated overnight scanner run)
**Builder:** Claude (unattended)
**Status:** BUILT + VERIFIED

## Build summary
Self-contained HTML tool, 28,996 bytes, zero external dependencies.

## Tool structure
- 5 sections × 32 questions total
- 8 critical items (impartiality policy, scope definition, personnel competence, equipment calibration, method validation, measurement uncertainty, management system documentation, internal audit)
- Scoring: Met=1pt, Partial=0.5pt, N/A excluded from denominator
- Critical-zero override: any critical item Not Met or Partial → NOT READY regardless of overall score
- Verdict tiers: ACCREDITATION READY (≥80%, no critical gap) / CONDITIONAL (55–79%, no critical gap) / NOT READY (<55% or critical gap)
- Outputs: scored section breakdown, gap table with clause references and priorities, MR narrative, JSON export

## Verification results
- Structural checks: 10/10 PASS
- Scoring engine unit tests: 5/5 PASS
  - T1: all-met → ACCREDITATION READY (100%) ✓
  - T2: critical not-met → NOT READY override ✓
  - T3: all-not → NOT READY (0%) ✓
  - T4: ~75% no-critical-fail → CONDITIONAL ✓
  - T5: N/A excluded from denominator → correct score ✓
- node --check: not applicable (HTML file); syntax verified via JS extraction
- File size: 28,996 bytes

## Commercial notes
- Price: $199–$349 one-time; $99/yr maintenance
- Bundle: Calibration Compliance Pack with 2026-08-14 Calibration OOT Impact Manager at $449
- Distinct from OOT Manager: this is for calibration lab operators seeking accreditation; OOT is for equipment users
- Go-to-market: target A2LA applicants, aerospace/medical device suppliers with in-house labs
