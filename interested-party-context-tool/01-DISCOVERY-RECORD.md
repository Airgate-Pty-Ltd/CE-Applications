# Discovery Record — Interested Party & Context Analysis Tool
**Date:** 2026-08-23
**Route:** Software / Conform-Edge
**Gate Decision:** BUILD AUTHORIZED (inferred as Brian)
**Production-authorized:** NO — NEEDS-FROM-BRIAN blockers remain

---

## Build Classification
- **Class:** Single-file HTML data-entry and analysis tool
- **Distribution:** Static file; browser-only; no external data
- **Criticality:** Low (self-assessment / planning tool)

---

## Discovery Answers

**A. What is it?**
Answer: An HTML tool that guides QMS practitioners through ISO 9001 / AS9100D Clause 4.1 (context of the organization) and 4.2 (interested parties) documentation. User adds interested parties (type, requirements, QMS relevance, monitoring method), logs external and internal context factors, and receives: an Interested Party Register table, a completeness assessment (required party types present?), a context summary, and a management-review-ready narrative. JSON export for QMS records.
Source: Standards knowledge (4.1/4.2); ledger scan — no substantially equivalent build in ledger. Status: CONFIRMED.

**B. Who buys / uses it?**
Answer: Quality managers at ISO 9001 or AS9100D-registered organizations preparing for CB certification or surveillance audits, or updating their QMS after structural changes. CB auditors increasingly target 4.1/4.2 as a weak area. Also useful for management review Clause 9.3 inputs.
Source: ANSWER_BANK + Brian's audit experience (4.1/4.2 evidence quality is consistently weak at SME suppliers). Status: INFERRED — BRIAN CONFIRMATION REQUIRED.

**C. What problem?**
Answer: Most QMS practitioners document interested parties and context as a one-time exercise that quickly becomes stale. CB auditors cite 4.1/4.2 for weak evidence that context is actively reviewed and that interested party requirements flow into QMS planning. This tool structures the documentation, flags missing required party categories, and generates a live MR-ready summary.
Source: Brian's 300+ audits; IAQG finding patterns. Status: INFERRED.

**D. Claim boundary?**
Answer: Documentation planning and self-assessment tool only. Does not certify context analysis completeness — that is the CB auditor's determination. Never asserts ISO 9001 or AS9100D compliance.
Source: ANSWER_BANK. Status: CONFIRMED-by-design.

**E. Authority & compliance basis?**
Answer: ISO 9001:2015/2026 Clauses 4.1 and 4.2; AS9100D Rev D Clauses 4.1 and 4.2. Referenced by clause number and intent only. No standard text reproduced.
Source: Brian's lead-auditor knowledge. Status: CONFIRMED.

**F. Commercial model?**
Answer: One-time $149–$249 individual; site license $999. Bundle candidate with ISO 9001:2026 Transition Readiness Assessor as a "QMS Foundation Bundle." Also cross-sells into AS9100D and AS9110C context.
Source: ANSWER_BANK + ledger patterns. Status: INFERRED — BRIAN CONFIRMATION REQUIRED.

**Scoring / Decision Logic:**
Answer: Completeness engine: required party type categories (Customer, Regulatory, Employees, Suppliers) checked against registry — missing = flag. HIGH relevance parties without monitoring method = gap. Context: requires ≥1 external issue and ≥1 internal issue — empty sections flagged. Overall verdict: COMPLETE / GAPS IDENTIFIED / INCOMPLETE.
Source: CB audit expectations for 4.1/4.2. Status: INFERRED — thresholds BRIAN CONFIRMATION REQUIRED.

**MVP Boundary:**
Answer: Single HTML file; add/remove parties; add context factors; generate register + completeness + narrative; JSON export. No login, no persistence beyond session.
Source: Portfolio pattern. Status: CONFIRMED.

---

## Product Claim Boundary
Documentation and planning tool. The organization's management team owns the context determination. CB auditors make the conformity assessment.

## Open Launch Blockers
1. Brian to confirm required party type categories (are 4 categories sufficient for AS9100D scope?) — LAUNCH BLOCKER
2. Brian to confirm completeness verdict thresholds — LAUNCH BLOCKER
3. Brian to confirm pricing and bundle strategy — LAUNCH BLOCKER
