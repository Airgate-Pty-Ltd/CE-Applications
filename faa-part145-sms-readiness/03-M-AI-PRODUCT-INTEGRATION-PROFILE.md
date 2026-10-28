# M-AI Product Integration Profile — FAA Part 145 SMS Readiness Tool

**Product:** FAA Part 145 SMS Readiness Tool  
**Version:** 1.0 (2026-08-25)  
**Domain ID:** `part145-sms-readiness`  
**Integration Gate Decision:** ARCHITECTURE DEFINED  
**Runtime Dependency:** RESERVED INTERFACE — governed logic runs locally; Kernel wiring pending platform host  
**Production-Authorized:** NO

---

## M-AI Purpose Statement
The M-AI domain pack governs the SMS readiness determination: given component-level self-assessment inputs, the pack issues governed decisions (READY / DEVELOPING / NOT-STARTED) with critical-item overrides for mandatory SMS elements (Safety Policy and Safety Risk Management). It also flags bilateral advisory conditions for EASA/MAG CHG 10 §20 SMSVP requirements.

---

## Domain Pack

### Entity Registry
| Entity | Description |
|--------|-------------|
| `assessment_session` | One organization's SMS readiness run |
| `sms_component` | One of 5 ICAO Annex 19 SMS components |
| `element_response` | Per-question response (IN PLACE / PARTIAL / NOT IN PLACE / N-A) |
| `critical_element` | Mandatory minimum element (Safety Policy, Risk Management) |
| `bilateral_flag` | EASA-bilateral station indicator — triggers SMSVP advisory |
| `verdict` | Overall SMS readiness determination |

### Event Registry
| Event | Trigger |
|-------|---------|
| `response_submitted` | User answers an SMS element question |
| `critical_element_gap` | Safety Policy or Risk Management = NOT IN PLACE |
| `bilateral_detected` | User indicates EASA Part 145 approval |
| `verdict_computed` | All 30 questions answered; engine runs |
| `bilateral_advisory_triggered` | bilateral_flag = true → MAG CHG 10 §20 callout appended |

### Evidence Model
| Evidence Type | Description |
|--------------|-------------|
| `component_score` | Per-component: IN PLACE / PARTIAL / NOT IN PLACE response counts |
| `critical_gap` | Whether mandatory-minimum elements are not-in-place |
| `bilateral_exposure` | Whether EASA MAG CHG 10 §20 SMSVP applies |
| `implementation_depth` | IN PLACE vs. PARTIAL distinction (policy vs. operational implementation) |

### Governed Decisions
| Decision | Signal | M-AI Action |
|----------|--------|-------------|
| `sms_readiness_verdict` | Component scores + critical gaps | ADVISE (READY / DEVELOPING / NOT-STARTED) |
| `critical_override` | Safety Policy or Risk Mgmt = NOT IN PLACE | HOLD (forces NOT-STARTED) |
| `bilateral_advisory` | bilateral_flag = true | ADVISE (EASA SMSVP requirements callout) |
| `gap_priority` | element_response gaps | ADVISE (ordered remediation: critical first) |

### Authority Profile
- Standards basis: ICAO Annex 19, FAA AC 120-92B, EASA MAG CHG 10 §20
- Claim boundary: readiness/gap identification; regulatory status disclosed; no compliance claim
- Human override: always permitted; verdict advisory
- Regulatory disclaimer: FAA has not finalized Part 145 SMS rule as of tool date; tool is readiness preparation

### Host-Execution Model
Static offline HTML — Kernel wiring is RESERVED INTERFACE.

---

## Kernel Milestone Dependencies

| Capability | Status |
|-----------|--------|
| `@mai/kernel` import | RESERVED INTERFACE |
| DIM: `part145-sms-readiness` | Designed here; not registered in Kernel-MASTER |
| Cross-app emit | `verdict_computed` → feeds Repair Station Readiness Dashboard (2026-07-04) SMS dimension |

---

## Reserved Interfaces
1. **`@mai/kernel` import** — platform host required
2. **Repair Station Readiness Dashboard integration** — SMS readiness = one of three dashboard dimensions (FAA regulatory status, AS9110C maturity, SMS readiness)
3. **EASA SMSVP Starter Kit complement** — gap items from this tool naturally feed the document kit workflow

---

## Verification Tests (for future Kernel integration)
- AT-1: Safety Policy = NOT IN PLACE → NOT-STARTED regardless of other scores
- AT-2: Risk Management = NOT IN PLACE → NOT-STARTED regardless of other scores
- AT-3: All 5 components partially implemented → DEVELOPING
- AT-4: All IN PLACE, no critical gaps → READY
- AT-5: EASA bilateral flag set → SMSVP advisory section appears in output
- AT-6: N-A responses excluded from component score denominator

---

## Integration Gate Decision
**ARCHITECTURE DEFINED** — Kernel dependency is a future milestone; interface reserved. Working prototype. Not production-authorized until INTEGRATION AUTHORIZED.
