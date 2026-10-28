# Discovery Record — CAPA Effectiveness Verification Planner
**Date:** 2026-08-23
**Route:** Software / Conform-Edge
**Gate Decision:** BUILD AUTHORIZED (inferred as Brian)
**Production-authorized:** NO — NEEDS-FROM-BRIAN blockers remain

---

## Build Classification
- **Class:** Single-file HTML decision-support tool
- **Distribution:** Static file download; no server; no external data
- **Criticality:** Low (advisory; human QA professional owns determination)

---

## Discovery Answers

**A. What is it?**
Answer: A deterministic HTML tool that takes a corrective action (CA) as input — finding type, root cause category, CA type, and severity — and outputs a structured Effectiveness Verification Plan: recommended verification method(s), timeline, evidence checklist, and management-review-ready narrative. Fills the gap between "CA closed" and "CA verified effective" in AS9100D 10.2.1(e), ISO 9001 10.2.1(e), ISO 13485 8.5.2(f), and IATF 16949 10.2.1.
Source: Standards clause knowledge; ledger scan (no substantially equivalent build in ledger). Status: CONFIRMED.

**B. Who buys / uses it?**
Answer: Quality managers and corrective action owners at AS9100D, ISO 9001, IATF 16949, or ISO 13485-registered organizations who struggle to design defensible CAPA effectiveness checks that satisfy CB auditors and customer auditors. Primary buyer: Quality Director / QA Lead; user: anyone who owns CARs/CAPAs.
Source: ANSWER_BANK + Brian's 300+ QMS audits (most repeat findings trace to unevidenced effectiveness closure). Status: INFERRED — BRIAN CONFIRMATION REQUIRED.

**C. What problem?**
Answer: Most CAPA systems close corrective actions when the action is complete, not when effectiveness is verified. CB and customer auditors routinely raise findings against clause 10.2.1(e) because organizations have no planned, time-bound, evidence-specific verification step. This tool designs that plan deterministically from the CA type.
Source: Brian's audit experience; IAQG audit finding patterns. Status: INFERRED.

**D. Claim boundary?**
Answer: Advisory / planning tool only. Recommends a verification approach — the accountable quality professional owns the decision to accept or modify the plan. Never asserts CA effectiveness; that determination requires actual evidence.
Source: ANSWER_BANK claim defaults. Status: CONFIRMED-by-design.

**E. Authority & compliance basis?**
Answer: AS9100D clause 10.2.1(e); ISO 9001:2015/2026 clause 10.2.1(e); ISO 13485 8.5.2(f); IATF 16949 10.2.1. All referenced by clause number and intent only. No standard text reproduced.
Source: Brian's lead-auditor knowledge. Status: CONFIRMED.

**F. Commercial model?**
Answer: One-time $149–$249 individual; site license $999. Bundle candidate with 8D Workflow Tool (2026-07-01) and SCAR Response Builder (2026-08-21) as a "CAPA Execution Suite." Repeat purchase: orgs re-use per CAPA event.
Source: ANSWER_BANK + ledger bundle patterns. Status: INFERRED — BRIAN CONFIRMATION REQUIRED (bundle pricing).

**Scoring / Decision Logic:**
Answer: Deterministic engine: finding severity × CA type → verification method selection (rule table); CA type → required evidence types (rule table); severity → timeline (CRITICAL 30d / MAJOR 60-90d / MINOR 90-180d). Critical rule: if finding was an escape to customer or safety concern, CRITICAL pathway applies regardless of other inputs.
Source: Brian's CAPA closure standards; IAQG audit expectations. Status: CONFIRMED as design intent — specific thresholds INFERRED, BRIAN CONFIRMATION REQUIRED.

**MVP Boundary:**
Answer: Single HTML file; Step 1 (finding input), Step 2 (CA input), Step 3 (plan output + narrative + JSON export). No login, no persistence beyond session.
Source: Portfolio pattern (all prior scanner HTML tools). Status: CONFIRMED.

---

## Product Claim Boundary
Planning / advisory tool only. The tool outputs a recommended verification plan; the quality professional confirms and executes it. Actual effectiveness is determined by evidence, not by this tool.

## Authority & Compliance Basis
AS9100D 10.2.1(e); ISO 9001 10.2.1(e); ISO 13485 8.5.2(f); IATF 16949 10.2.1 — clause number and intent only.

## Decision Logic Basis
Rule tables: severity → timeline; CA type → methods; CA type → evidence. Escape/safety override to CRITICAL pathway.

## Consistency Check vs. Answer Bank
✅ All defaults consistent: buyer, claim framing, architecture (deterministic/offline), VERA palette, commercial model.

## Open Launch Blockers
1. Brian to confirm bundle pricing with 8D Tool + SCAR Builder — LAUNCH BLOCKER
2. Brian to confirm timeline thresholds (30/60-90/90-180 days) are defensible across the standard set — LAUNCH BLOCKER
3. Brian to confirm evidence list completeness for each verification method — LAUNCH BLOCKER
