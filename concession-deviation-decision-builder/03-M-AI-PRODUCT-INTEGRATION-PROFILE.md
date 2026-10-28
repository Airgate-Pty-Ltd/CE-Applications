# M-AI Product Integration Profile — Concession & Deviation Decision Builder
**Stage:** 3 — M-AI Symbiotic Product Integration Gate  
**Date:** 2026-08-16 (retroactive governance pass)  
**Domain ID:** `concession-deviation-decisions`  

---

## Integration Gate Decision

```
M-AI INTEGRATION GATE: ARCHITECTURE DEFINED
Required milestone: RESERVED INTERFACE — governed logic runs locally in static HTML prototype;
Kernel wiring pending platform host.
```

Rationale: Static self-contained HTML; cannot import @mai/kernel at runtime. Governed decision logic authored as Kernel-shaped domain pack below. The concession history tracking and repeat-escalation signals are the primary M-AI value on platform promotion.

---

## Domain Pack (`concession-deviation-decisions`)

### Entity Registry
| Entity | Description |
|--------|-------------|
| `Departure` | A nonconforming condition (product, material, or process) requiring disposition |
| `DepartureType` | Deviation (before production) vs. Concession (after production) |
| `SeverityClass` | LOW / MEDIUM / HIGH per Gate 3 logic |
| `ApprovalMatrix` | Required approval roles per SeverityClass × DepartureType |
| `ConcessionRecord` | The generated formatted request record |

### Event Registry
| Event | Trigger |
|-------|---------|
| `DepartureOpened` | User initiates a new concession/deviation |
| `Gate1Evaluated` | Hard-stop conditions assessed (customer prohibition, KC+aviation+after, safety unknown) |
| `Gate2Classified` | Departure type determined (Deviation vs. Concession) |
| `Gate3Scored` | Severity and approval matrix determined |
| `RecordGenerated` | Formatted concession/deviation request record produced |

### Governed Decisions (Kernel-shaped; local in prototype)
| Decision ID | Type | Logic |
|-------------|------|-------|
| `HardStop` | BLOCK | Customer prohibition → STOP; KC+aviation+concession → STOP; safety unknown + FFF unconfirmed → STOP |
| `DepartureClassification` | ADVISE | Before production → Deviation; After production → Concession |
| `SeverityDetermination` | ADVISE | LOW/MEDIUM/HIGH per Gate 3 rules |
| `ApprovalRequirement` | ADVISE | Approval matrix per Severity × Type |
| `RepeatConcessionEscalation` | OBSERVE | (Reserved) — detect when same part/drawing recurs in concession history; escalate to SCAR |

**M-AI Role:** BLOCK on hard stops (STOP is a governed decision, not advice). ADVISE on departure classification, severity, and approvals. The human MRB makes the final disposition determination.

### Authority Profile
| Parameter | Value |
|-----------|-------|
| Max authority tier | BLOCK (Gate 1 hard stops only) |
| ADVISE authority | Classification, severity, approval roles |
| Cannot issue | Approved disposition / regulatory clearance |
| Self-expanding | PROHIBITED |

### Reserved Interfaces (Platform Promotion)
| Interface | Purpose |
|-----------|---------|
| `@mai/kernel` import | Kernel wiring on platform host |
| `Departure` → Kernel store | Concession history; repeat-pattern detection |
| `RepeatConcessionEscalation` | SCAR trigger on repeat-part pattern |
| Cross-app emit to 8D Workflow Tool | Concession → SCAR → 8D handoff |
| Cross-app emit to ManagementReviewAutopilot | Concession rate by severity feeds MR inputs |

### Kernel Milestone Dependencies
| Dependency | Status |
|------------|--------|
| Domain pack logic | AVAILABLE NOW (local) |
| Kernel runtime | RESERVED INTERFACE |
| Persistent departure history | RESERVED INTERFACE |
| Cross-app communication | RESERVED INTERFACE |

### M-AI Verification Tests
| Test | Expected | Result |
|------|----------|--------|
| T-MAI-1: Customer-prohibits → BLOCK/STOP | HardStop fires | ✓ PASS (engine T1) |
| T-MAI-2: KC+aviation+concession → BLOCK/STOP | HardStop + MRB/regulatory flag | ✓ PASS (engine T2) |
| T-MAI-3: Safety unknown + FFF not confirmed → BLOCK | HardStop fires | ✓ PASS (engine T3) |
| T-MAI-4: Pre-production → DEVIATION classification | DepartureClassification: Deviation | ✓ PASS (engine T4) |
| T-MAI-5: KC+safety (non-aviation) → HIGH severity + DA required | SeverityDetermination HIGH; ApprovalRequirement: Design Authority | ✓ PASS (engine T5) |
| T-MAI-6: Medical device → Regulatory Affairs approval added | ApprovalRequirement extended | ✓ PASS (engine T6) |

**6/6 M-AI verification tests: PASS**
