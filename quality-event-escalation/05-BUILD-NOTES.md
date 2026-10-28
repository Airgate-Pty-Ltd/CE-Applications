# Build Notes — Quality Event Classification & Escalation Decision Tool

**Build date:** 2026-08-21 (automated overnight scanner run)
**Builder:** Claude (unattended)
**Status:** BUILT + VERIFIED

## Build summary
Self-contained HTML tool, 29,634 bytes, zero external dependencies.

## Tool structure
- Phase 1: org type + standard selection (8 standards: AS9100D, AS9110C, FAA Part 145, EASA Part 145, ISO 13485, FDA QMSR, IATF 16949, ISO 9001)
- Phase 2: 10 event characterisation questions
- Critical overrides: escape to customer (Yes or Unknown) and safety concern → automatic CRITICAL regardless of other inputs
- Severity tiers: CRITICAL / MAJOR / MINOR / OFI with deterministic weighted-factor logic
- Action matrix: per-standard output of Hold, CAPA, Customer Notification, Regulatory Notification, Process Pathway requirements
- Timeline commitments: severity-appropriate (Immediately / 24hr / 72hr / 30-day for CRITICAL; scaled for lower severities)
- Evidence capture checklist: standard-specific items (FAA/EASA SDR/MOR prompt, ISO 13485/QMSR MDR evaluation prompt)
- JSON export for QMS record

## Verification results
- Structural checks: 12/12 PASS
- Classification engine unit tests: 8/8 PASS
  - T1: escape=yes → CRITICAL override ✓
  - T2: safety concern → CRITICAL ✓
  - T3: event type = safety → CRITICAL ✓
  - T4: single contained audit finding → MINOR ✓
  - T5: unknown escape → MAJOR ✓
  - T6: field event + recurrence → MAJOR ✓
  - T7: all product affected → MAJOR ✓
  - T8: minor process deviation → MINOR/OFI boundary ✓
- File size: 29,634 bytes

## Commercial notes
- Price: $149–$249 one-time; $399/yr site license
- Portfolio position: fills the FIRST RESPONDER gap — before the 8D tool and before the SCAR Response Builder; the three together = Quality Event Response Suite
- Go-to-market: universal QMS market; every aerospace, medical device, and automotive supplier has quality events that trigger this decision
- ~$250k/yr path at ~1,200 units/yr or 600 site licenses
