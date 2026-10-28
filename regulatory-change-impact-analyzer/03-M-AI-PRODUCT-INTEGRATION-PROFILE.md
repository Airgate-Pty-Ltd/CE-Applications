# M-AI Product Integration Profile — Regulatory Change Impact Analyzer

**Product:** Regulatory Change Impact Analyzer  
**Version:** 1.0 (2026-08-25)  
**Domain ID:** `regulatory-change-impact`  
**Integration Gate Decision:** ARCHITECTURE DEFINED  
**Runtime Dependency:** RESERVED INTERFACE — governed logic runs locally; Kernel wiring pending platform host  
**Production-Authorized:** NO

---

## M-AI Purpose Statement
The M-AI domain pack governs the impact classification and action-urgency determination: given a regulatory change input (authority + change-type) and an organization's certification scope, the pack issues governed decisions mapping change to affected QMS process areas, document types, and action urgency tiers (IMMEDIATE / SHORT-TERM / MONITOR).

---

## Domain Pack

### Entity Registry
| Entity | Description |
|--------|-------------|
| `regulatory_change` | The change event (authority, type, effective date, summary) |
| `org_scope` | Organization's certification/approval scope |
| `impact_mapping` | Change × scope → affected clause families |
| `action_item` | Required action with urgency tier and owner category |
| `impact_report` | Complete assessment output |

### Event Registry
| Event | Trigger |
|-------|---------|
| `change_entered` | User documents the regulatory change |
| `scope_confirmed` | User selects their certification scope |
| `impact_computed` | Engine maps change → clause families → process areas → documents → actions |
| `urgency_override` | Safety-of-flight or production-approval change triggers IMMEDIATE |
| `report_generated` | Impact matrix rendered |

### Evidence Model
| Evidence Type | Description |
|--------------|-------------|
| `change_authority` | Which authority issued the change (FAA/EASA/ISO/IATF/FDA) |
| `change_type` | New rule / amendment / guidance update / standard revision / NPRM |
| `scope_intersection` | Which of user's certifications are touched by this change |
| `urgency_classification` | IMMEDIATE (safety/production) / SHORT-TERM (6 mo) / MONITOR (12+ mo) |

### Governed Decisions
| Decision | Signal | M-AI Action |
|----------|--------|-------------|
| `impact_scope` | change_authority × change_type × org_scope | ADVISE (list of affected clause families) |
| `action_urgency` | change_type + safety/production flag | ADVISE (IMMEDIATE / SHORT-TERM / MONITOR) |
| `safety_override` | safety-of-flight or production-approval change | HOLD (forces IMMEDIATE regardless of timeline) |
| `action_plan` | impact_scope + urgency | PREPARE (ordered action list with owner categories) |

### Authority Profile
- Claim boundary: impact identification only; user confirms applicability and takes action
- Human override: always permitted; all outputs advisory
- No regulatory submission generated; no compliance claimed

### Host-Execution Model
Static offline HTML — Kernel cannot be imported at runtime. Taxonomy-based decision logic implemented locally as JavaScript; Kernel wiring is RESERVED INTERFACE.

---

## Kernel Milestone Dependencies

| Capability | Status |
|-----------|--------|
| `@mai/kernel` import | RESERVED INTERFACE |
| DIM: `regulatory-change-impact` | Designed here; not registered in Kernel-MASTER |
| Cross-app emit | `impact_report` could feed MRO Regulatory Intel Digest and Management Review Autopilot (action register) |

---

## Reserved Interfaces
1. **`@mai/kernel` import** — platform host required
2. **MRO Intel Digest integration** — change from Digest → this tool's intake = natural subscription→action flow
3. **MRA integration** — `action_item` entities could auto-populate MRA action register with regulatory change items

---

## Verification Tests (AT, for future Kernel integration)
- AT-1: FAA Part 145 amendment + scope includes FAA Part 145 → EASA Part 145 clauses NOT flagged
- AT-2: ISO 9001 standard revision + scope includes AS9100D → both ISO 9001 and AS9100D clause families flagged (AS9100D is superset)
- AT-3: Change type = safety-of-flight related → IMMEDIATE urgency regardless of effective date
- AT-4: NPRM (proposed) change → MONITOR tier + "proposed, not final" advisory
- AT-5: Scope has no intersection with change authority → "No direct impact identified — verify applicability"

---

## Integration Gate Decision
**ARCHITECTURE DEFINED** — Kernel dependency is a future milestone; interface reserved. Working prototype. Not production-authorized until INTEGRATION AUTHORIZED.
