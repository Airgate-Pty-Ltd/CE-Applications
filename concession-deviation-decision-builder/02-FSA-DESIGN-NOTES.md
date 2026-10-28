# FSA Design Notes — Concession & Deviation Decision Builder
**Stage:** 2 — Future Systems Architect (BUILD mode)  
**Date:** 2026-08-16 (retroactive governance pass)  

---

## FSA Gate Decision

```
FSA BUILD MODE GATE: PROCEED
Architecture is sound. No redesign required.
The 3-gate deterministic decision engine + record generation is the correct pattern.
```

---

## FSA Section 12 Evaluation

| Check | Score | Rationale |
|-------|-------|-----------|
| Eliminates work | +2 | Replaces informal MRB deliberation + manual concession record drafting (30–60 min → 5 min) |
| AI is the OS | 0 | Deterministic; no LLM in tool (correct) |
| Knowledge-graph node | +1 | Concession records feed M-AI KC history; repeat-concession escalation pattern |
| No enterprise equivalent | +2 | No self-contained HTML 3-gate Concession/Deviation tool with record generation identified |
| Deterministic rules-based assessment | +2 | 3-gate logic is fully deterministic; approval matrix is rule-based |
| Static forms as primary input | 0 | Primary value is the 3-gate decision engine; form inputs are the mechanism, not the value |
| LLM-only assessment | 0 | No LLM |

**FSA Layer 2 modifier: +7**

---

## Architectural Principles Applied

### What the architecture does right
1. **3-gate sequential decision logic:** Mirrors how an experienced MRB lead actually works — hard stops first, then classification, then severity. Not a checklist; a decision tree.
2. **Dual-mode:** Correctly distinguishes Deviation (before production, less severe because nonconformity not embedded yet) vs. Concession (after production, requires customer/DA involvement depending on severity).
3. **Approval matrix:** Different approval requirements per severity level is the insight that prevents under-escalation. This is Brian's audit pattern.
4. **Record generation:** Highest-value output — produces a formatted, signature-ready request record that mirrors what auditors expect to find in a QMS file. No competing tool does this.
5. **Aviation + medical overlays:** Correct treatment — these overlays tighten the Gate 1 hard-stop conditions; they don't change the base decision framework.

### What requires attention
1. **Disclaimer absent:** The record generated must include a disclaimer that it is a draft pending authorized signatures, not an approved disposition.
2. **M-AI disposition:** Addressed in Stage 3 (RESERVED INTERFACE).
3. **IATF/13485 notification trigger language:** Brian to confirm.

---

## FSA Gate Checks

| Check | Status | Note |
|-------|--------|------|
| 3-gate logic is deterministic | ✓ PASS | Engine T1–T6 all verified |
| No fabricated conclusions | ✓ PASS | All decisions derive from user inputs; tool recommends verification |
| No network / no persistence | ✓ PASS | Self-contained |
| VERA design applied | ✓ PASS | |
| Record generation is the primary value add | ✓ PASS | Not a form; a decision engine that generates a record |
| Disclaimer on record | ✗ NEEDS ACTION | "DRAFT PENDING AUTHORIZED SIGNATURES" banner required |
| M-AI integration determined | ✗ NEEDS ACTION | Stage 3 |
| Authority-basis language for overlays | ✗ NEEDS ACTION | LAUNCH BLOCKER LB-1 / LB-4 |

**Gate checks: 5/8 PASS; 3 require action (none block architecture)**

---

## Layer 1–3 Score (reference)

| Component | Score |
|-----------|-------|
| L1: Automation HIGH, Edge DEEP, Buildability NOW | 9 |
| L2: FSA modifiers | +7 |
| L3: data→decision (+5), evidence-backed (+4), reusable IP (+4), recurring/bundle (+4), QMS/audit support (+3), Brian's moat (+3), sells without customization (+3), visible demo (+2), reusable M-AI rule (+3) | +31 |
| **Total** | **47** |
