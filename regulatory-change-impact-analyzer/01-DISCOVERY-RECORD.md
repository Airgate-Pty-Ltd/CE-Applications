# Discovery Record — Regulatory Change Impact Analyzer

**Build Classification:** Software — Static HTML interactive decision tool  
**Route:** Software / Conform-Edge  
**Discovery Date:** 2026-08-25  
**Gate Decision:** BUILD AUTHORIZED (inferred as Brian, auto-authoring mode)  
**Production-Authorized:** NO — launch blockers outstanding (see NEEDS-FROM-BRIAN.md)

---

## Gate 0–5 Status

| Gate | Status | Notes |
|------|--------|-------|
| G0: Problem / Need | PASS | Orgs lack a structured way to scope regulatory change impact on their QMS |
| G1: Buyer / Market | PASS | Quality managers at certified orgs facing regulatory/standard changes |
| G2: Claims | PASS | Impact identification / readiness gap only — no compliance claim |
| G3: Authority Basis | PASS | Change-to-clause mapping by intent; user confirms applicability |
| G4: Decision Logic | PASS | Change-type taxonomy → clause family → document type → action category |
| G5: MVP | PASS | Single-file HTML, offline, 3-step workflow |

---

## Discovery Answers (as Brian)

### A. Problem / Need
A: When a regulatory body or standards organization issues a change (new rule, amendment, revised standard, new guidance), quality teams must determine: which clauses are affected, which QMS documents need updating, which processes need adjustment, and what actions to take by when. Today this is done manually, inconsistently, and often incompletely — leading to missed impacts or over-reaction. Brian has expertise mapping changes across FAA, EASA, ISO, IATF, AS-series — this tool productizes that mapping.  
Source: Brian's regulatory change work (QMSR, MAG CHG 10, ISO 9001:2026, AS9100 Rev series); about-me  
Status: INFERRED — BRIAN CONFIRMATION REQUIRED  
Confidence: HIGH

### B. Target Buyer / User
A: Quality Director / VP Quality / compliance manager at an AS9100D-, ISO 9001-, IATF 16949-, ISO 13485-, or FAA/EASA Part 145-certified organization who needs to translate regulatory change notices into actionable QMS update plans.  
Source: ANSWER_BANK  
Status: INFERRED  
Confidence: HIGH

### C. Product Claim Boundary
A: Regulatory change impact identification tool — helps users identify potentially affected clauses, document types, and action categories. Does NOT claim the output constitutes a complete compliance determination. User retains responsibility for final applicability decisions and regulatory submissions.  
Source: ANSWER_BANK (permitted/prohibited framing)  
Status: CONFIRMED-by-design

### D. Authority & Compliance Basis
A: Tool covers change types across: FAA (Parts 21/43/145, ACs, NPRMs), EASA (Part 21/145, AMC), ISO 9001/AS9100-series/IATF 16949/ISO 13485/ISO 14001, MDSAP, FDA QMSR. Mapping logic: change-type → affected clause families → affected QMS process areas → affected document categories. All by intent; no regulatory text reproduced.  
Status: INFERRED — BRIAN CONFIRMATION REQUIRED (change-type taxonomy completeness)

### E. Decision / Scoring Logic
A:  
Step 1 — Change intake: authority, change type (new rule / amendment / guidance / standard revision / NPRM), effective date, summary  
Step 2 — Scope mapping: user selects their certification scope (AS9100D, ISO 9001, IATF 16949, ISO 13485, FAA Part 145, EASA Part 145, etc.)  
Step 3 — Impact engine: deterministic taxonomy maps change-type × scope → (a) affected clause families, (b) affected QMS process areas, (c) affected document types, (d) action categories with urgency tiers (IMMEDIATE / SHORT-TERM / MONITOR)  
Output: impact matrix table, action plan with estimated effort flags, JSON export  
Critical override: change affecting production approval, airworthiness, or safety-of-flight automatically flags IMMEDIATE  
Status: INFERRED — BRIAN CONFIRMATION REQUIRED (taxonomy completeness, urgency tier criteria)

### F. MVP Boundary
A: Single HTML file, self-contained, offline. 3-step workflow. Taxonomy-based deterministic engine. Impact matrix + action plan output. JSON export. No server, no accounts.  
Status: CONFIRMED-by-design

### Commercial Model
- One-time: $149–$249 individual / ~$999 site
- Strong bundle fit: pairs with MRO Regulatory Intelligence Digest (subscription feed → this tool = action layer)
- Path to $250k/yr: ~1,000–1,675 unit sales; or Digest + Analyzer bundle subscription path
Source: ANSWER_BANK  
Status: INFERRED — BRIAN CONFIRMATION REQUIRED

### FSA Scoring
Base: 9 (Automation HIGH, Edge DEEP, Buildability NOW)  
FSA modifiers: +2 eliminates work (manual impact mapping), +2 deterministic rules, +1 knowledge-graph node potential  
Strategic: +5 data→decision, +4 evidence-backed, +4 reusable IP (taxonomy reusable across products), +3 Brian's moat, +3 supports regulated QMS, +3 executive decision support, +4 recurring if bundled with Digest  
**Total: ~40** — BUILDS

---

## Consistency Check vs. Answer Bank
✅ Audience: quality manager at regulated SME — CONSISTENT  
✅ Claim: readiness/impact identification only — CONSISTENT  
✅ Architecture: deterministic rules, offline HTML — CONSISTENT  
✅ Brand: Conform-Edge software — CONSISTENT  
✅ Visual: VERA navy/steel — CONSISTENT

---

## Open Launch Blockers
1. Change-type taxonomy completeness — needs Brian review
2. Urgency tier criteria (IMMEDIATE / SHORT-TERM / MONITOR) threshold — needs confirmation
3. Scope mapping: confirm clause-family → document-type mapping for each standard
4. Pricing tier confirmation
