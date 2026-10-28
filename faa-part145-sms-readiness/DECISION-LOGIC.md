# Decision Logic — FAA Part 145 SMS Readiness Tool

**M-AI Role:** Domain `part145-sms-readiness` — governed decisions: `sms_readiness_verdict` (ADVISE), `critical_override` (HOLD), `bilateral_advisory` (ADVISE), `gap_priority` (ADVISE). Logic runs locally in JavaScript; Kernel wiring RESERVED INTERFACE.

---

## Core Engine

### Input Variables
- 30 responses, one per SMS element question
- Response options: `IN-PLACE` | `PARTIAL` | `NOT-IN-PLACE` | `NA`
- Organization flags: `easaBilateral` (bool), `airlineSMS` (bool)

### Scoring

```
FOR each question q in all 4 components:
  IF response = 'IN-PLACE' → totalIn++
  ELIF response = 'PARTIAL' → totalPartial++
  ELIF response = 'NOT-IN-PLACE' → totalGap++; IF q.critical → criticalGaps++
  ELIF response = 'NA' → exclude from denominator
  ELSE (unanswered) → totalGap++; IF q.critical → criticalGaps++

totalApplicable = total questions - NA count
inRate = totalIn / totalApplicable
```

### Verdict Engine (governed decision: `sms_readiness_verdict` / `critical_override`)

```
IF criticalGaps > 0 → NOT-STARTED (critical_override HOLD — mandatory minimum not met)
ELIF inRate ≥ 0.80 AND totalPartial = 0 → READY
ELIF inRate ≥ 0.50 → DEVELOPING
ELSE → NOT-STARTED
```

### Critical Items (mandatory-minimum — any NOT-IN-PLACE triggers NOT-STARTED override)
- Q1.1: Safety Policy signed by Accountable Manager
- Q1.4: Accountable Manager appointed
- Q2.1: Hazard identification process documented
- Q2.2: Risk assessment methodology in place

### EASA Bilateral Advisory Engine
```
IF easaBilateral = true → render MAG CHG 10 §20 advisory callout + SMSVP reference
```

### Gap Priority Ranking
```
allGaps = [gapItems where critical=true] + [gapItems where critical=false]
(critical items always rank before non-critical)
```

---

## SMS Component Coverage

| Component | ICAO Reference | # Questions | Critical Items |
|-----------|---------------|-------------|---------------|
| Safety Policy & Objectives | ICAO Annex 19 §1 | 6 | 2 (Q1.1, Q1.4) |
| Safety Risk Management | ICAO Annex 19 §2 | 6 | 2 (Q2.1, Q2.2) |
| Safety Assurance | ICAO Annex 19 §3 | 6 | 0 |
| Safety Promotion | ICAO Annex 19 §4 | 6 | 0 |

---

## Regulatory Basis
- ICAO Annex 19, 3rd Edition — SMS framework (4 components, 12 elements)
- FAA AC 120-92B — SMS implementation guidance for aviation service providers
- EASA MAG Change 10, Section 20 — SMSVP requirement for bilateral stations
- No FAA final SMS rule for Part 145 as of tool publication date
