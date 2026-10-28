# M-AI Product Integration Profile — AS13100A Aero-Engine Supplier Readiness Tool
**Stage:** 3 — M-AI Symbiotic Product Integration Gate  
**Date:** 2026-08-16 (retroactive governance pass)  
**Product version:** 1.0 (prototype, pre-release-authorized)  
**Domain ID:** `as13100a-readiness`  

---

## Integration Gate Decision

```
M-AI INTEGRATION GATE: ARCHITECTURE DEFINED
Required milestone: RESERVED INTERFACE — governed logic runs locally in current HTML prototype;
Kernel wiring pending platform host.
Production authorization: NOT YET — ARCHITECTURE DEFINED is sufficient for prototype release
pending Brian's Stage 9 validation.
```

Rationale: This is a static, self-contained HTML tool. It cannot `import @mai/kernel` at runtime and remain offline/self-contained. The governed decision logic is authored as a Kernel-shaped domain pack below. The Kernel dependency is RESERVED INTERFACE. The boundary is designed now; Kernel wiring is activated when this tool is promoted to the Conform-Edge platform.

---

## 1. Product Purpose Statement (M-AI)

The M-AI layer for this product provides: **governed readiness determination** — transforming 52 supplier evidence signals into structured conformance verdicts with an authority profile that distinguishes self-assessment from certified conformance. In the static prototype, this logic runs locally as the Kernel-shaped domain pack. When promoted to the platform, the Kernel issues governed decisions and tracks trend/KC signals across sessions.

---

## 2. Domain Pack (`as13100a-readiness`)

### Entity Registry

| Entity | Description |
|--------|-------------|
| `Supplier` | The organization being assessed |
| `RequirementFamily` | One of 8 AS13100A requirement families |
| `AssessmentElement` | One of 52 individual assessment items (weight, status, response) |
| `ReadinessAssessment` | A complete run: supplier, date, responses, verdicts, JSON export |
| `OEMContext` | GE/RR/PW/Safran/Honeywell — contextual overlay per family |

### Event Registry

| Event | Trigger |
|-------|---------|
| `AssessmentStarted` | User initiates assessment session |
| `ElementResponded` | User sets status for an element (IMPLEMENTED/PARTIAL/NOT_IMPLEMENTED/NA) |
| `FamilyScored` | All elements in a family responded; family verdict computed |
| `AssessmentCompleted` | All families scored; overall verdict computed |
| `FindingsExported` | JSON export triggered |

### Evidence Model

| Evidence | Weight | Source |
|----------|--------|--------|
| IMPLEMENTED response on Major element (weight 3) | High | User-entered |
| PARTIAL response on Major element | Medium | User-entered |
| NOT_IMPLEMENTED on Major element | Critical — hard-blocker | User-entered |
| N/A exclusion | Denominator-reducing | User-entered |

---

## 3. Governed Decisions (Kernel-shaped; local in prototype)

| Decision ID | Type | Logic | Authority |
|-------------|------|-------|-----------|
| `FamilyVerdict` | ADVISE | COMPLIANT (≥85% weighted) / CONDITIONAL (60–84%) / NON-COMPLIANT (<60%); any open Major → NON-COMPLIANT override | Self-assessment result; not a certification determination |
| `OverallReadiness` | ADVISE | Aggregate of family verdicts; flagged by count of NON-COMPLIANT families | Self-assessment summary |
| `PriorityRemediationOrder` | ADVISE | NON-COMPLIANT families ordered by strategic weight; CONDITIONAL next | Audit-prep guidance |
| `OEMContextAlert` | OBSERVE | Surface OEM-specific context note when relevant family is CONDITIONAL/NON-COMPLIANT | Informational; human verifies OEM requirement |

**M-AI Role:** Kernel issues ADVISE decisions only. No PROCEED/HOLD/BLOCK/ESCALATE on behalf of the supplier — the human quality manager owns the conformance determination.

---

## 4. Authority Profile

| Parameter | Value |
|-----------|-------|
| Max authority tier | ADVISE |
| Cannot issue | PROCEED / HOLD / BLOCK on conformance — those are auditor/CB determinations |
| Override mechanism | User can mark N/A or override any response; tool records as-entered |
| Audit lineage | JSON export captures all responses + verdicts + timestamp for record retention |
| Self-expanding authority | PROHIBITED — tool scope locked to AS13100A readiness |

---

## 5. Reserved Interfaces (for Platform Promotion)

| Interface | Status | Purpose |
|-----------|--------|---------|
| `@mai/kernel` import | RESERVED INTERFACE | Kernel wiring; activate on platform host |
| `ReadinessAssessment` → Kernel store | RESERVED INTERFACE | Trend tracking across sessions; KC monitoring signals |
| `FamilyVerdict` → platform notification | RESERVED INTERFACE | Alert when family status changes |
| Cross-app emit to SupplierQualityRiskScorecard | RESERVED INTERFACE | AS13100A readiness score feeds supplier risk profile |
| Cross-app emit to ManagementReviewAutopilot | RESERVED INTERFACE | Gap count and family verdict feed MR inputs |

---

## 6. Kernel Milestone Dependencies

| Dependency | Status | Note |
|------------|--------|------|
| Domain pack schema | AVAILABLE NOW (local logic) | Implemented in HTML engine |
| Kernel runtime | RESERVED INTERFACE | Not available in static HTML |
| Persistent store | RESERVED INTERFACE | JSON export is the interim persistence mechanism |
| Cross-app communication | RESERVED INTERFACE | JSON export enables manual transfer |

---

## 7. Risks

| Risk | Mitigation |
|------|------------|
| Kernel wiring not prioritized → tool stays static indefinitely | Document interface explicitly (this profile); roadmap entry |
| OEM context notes become stale as OEMs update CQR requirements | Note in NEEDS-FROM-BRIAN; add update trigger |
| User confuses ADVISE output with certified conformance | Disclaimer required in tool footer (FSA Stage 2 finding) |

---

## 8. Verification Tests (M-AI logic — local)

| Test | Input | Expected | Status |
|------|-------|----------|--------|
| T-MAI-1 | All IMPLEMENTED → COMPLIANT | `FamilyVerdict: COMPLIANT` for all 8 families | ✓ PASS (engine T1) |
| T-MAI-2 | All NOT_IMPLEMENTED → NON-COMPLIANT | `FamilyVerdict: NON-COMPLIANT`; hard-blocker override fires | ✓ PASS (engine T2) |
| T-MAI-3 | N/A entries reduce denominator | Denominator excludes N/A elements | ✓ PASS (engine T4) |
| T-MAI-4 | Single Major open drops COMPLIANT → NON-COMPLIANT | Hard-blocker override fires | ✓ PASS (engine T5) |

All 4 M-AI logic verification tests: **PASS** (derived from BUILD-NOTES engine verification 2026-08-15, 5/5).

---

## 9. Self-Audit Signals

In the static HTML version: none (no Kernel). On platform promotion: the Kernel emits self-audit signals when FamilyVerdict distribution is unusual (e.g., all families COMPLIANT in <5 minutes — possible gaming signal).
