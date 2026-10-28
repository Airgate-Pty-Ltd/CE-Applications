# Discovery Record — FAA Part 145 SMS Readiness Toolkit

**Build Classification:** Software — Static HTML self-assessment tool  
**Route:** Software / Conform-Edge  
**Discovery Date:** 2026-08-25  
**Gate Decision:** BUILD AUTHORIZED (inferred as Brian, auto-authoring mode)  
**Production-Authorized:** NO — launch blockers outstanding (see NEEDS-FROM-BRIAN.md)

---

## Important Regulatory Status Note
**[ASSUMPTION]** As of this build date, the FAA has not finalized a mandatory SMS rule for Part 145 repair stations. The FAA SMS ARC (2014) and subsequent NPRMs proposed SMS for aviation service providers; the FAA Reauthorization Act of 2024 includes SMS implementation direction. The regulatory trajectory is clearly toward mandatory SMS. This tool is framed as **readiness preparation** — not compliance to a final rule — and explicitly discloses this regulatory status to the user.

---

## Gate 0–5 Status

| Gate | Status | Notes |
|------|--------|-------|
| G0: Problem / Need | PASS | Repair stations need to prepare for likely SMS requirements; EASA bilateral stations already need SMS per MAG CHG 10 §20 |
| G1: Buyer / Market | PASS | Quality/Safety managers at FAA Part 145 repair stations |
| G2: Claims | PASS | Readiness self-assessment only; regulatory status disclosed |
| G3: Authority Basis | PASS | ICAO Annex 19 / CAST SMS framework (international foundation); FAA Advisory Circulars on SMS |
| G4: Decision Logic | PASS | 30 questions, 5 SMS elements, scored readiness verdict |
| G5: MVP | PASS | Single-file HTML, offline, self-contained |

---

## Discovery Answers (as Brian)

### A. Problem / Need
A: FAA Part 145 repair stations face growing SMS pressure from multiple directions: (1) EASA bilateral (MAG CHG 10 §20 requires SMS/SMSVP for EASA-approved stations — built Aug 2026); (2) FAA rulemaking trajectory; (3) major airline customers (Delta, American, United) increasingly requiring SMS evidence in their repair station oversight programs. Most small-to-mid repair stations have never built an SMS and have no roadmap. This tool gives them a structured gap assessment before engaging a consultant.  
Source: Brian's Burrana EASA Part 145 + AS9110C experience; MAG CHG 10 §20 work; about-me  
Status: INFERRED — BRIAN CONFIRMATION REQUIRED  
Confidence: HIGH

### B. Target Buyer / User
A: Safety Manager / Quality Director at a US FAA Part 145 repair station, especially those with EASA bilateral (already need SMS), or those serving major airlines who require SMS.  
Source: ANSWER_BANK  
Status: INFERRED  
Confidence: HIGH

### C. Product Claim Boundary
A: SMS readiness self-assessment and gap identification tool. Does NOT claim a repair station is SMS-compliant or that any FAA final SMS rule requirement is met. Explicitly notes regulatory status (no final rule as of tool date). User retains all safety determinations.  
Source: ANSWER_BANK (permitted/prohibited framing)  
Status: CONFIRMED-by-design

### D. Authority & Compliance Basis
A: ICAO Annex 19 SMS framework (4 components, 12 elements); FAA Advisory Circulars on SMS (AC 120-92B); EASA MAG CHG 10 §20 SMSVP requirements (for bilateral stations). No standard text reproduced; intent-based mapping only. Regulatory status note included on tool face.  
Status: INFERRED — BRIAN CONFIRMATION REQUIRED (specific AC references, element weighting)

### E. Decision / Scoring Logic
A:  
5 SMS components from ICAO Annex 19:  
1. Safety Policy & Objectives (Accountable Manager, SMS Manual, Goals)  
2. Safety Risk Management (Hazard ID, Risk Assessment, Risk Controls)  
3. Safety Assurance (Performance Monitoring, Change Management, Continuous Improvement)  
4. Safety Promotion (Training, Communication)  
5. Emergency Response (for EASA bilateral stations: SMSVP Declaration)  

30 questions total (~6 per component). Response: IN PLACE / PARTIAL / NOT IN PLACE / N-A  
Verdict: READY / DEVELOPING / NOT-STARTED based on aggregate + critical items  
Critical override: Safety Risk Management + Safety Policy mandatory — NOT IN PLACE on either forces NOT-STARTED regardless of score  
Output: component-level gap table, prioritized action list, bilateral advisory (EASA/MAG CHG 10 §20 callout), MR narrative, JSON export  
Status: INFERRED — BRIAN CONFIRMATION REQUIRED (element weighting, critical-item list, scoring thresholds)

### F. MVP Boundary
A: Single HTML file, self-contained, offline. 30 questions, 5 components, scored verdict, gap table, bilateral advisory, MR narrative, JSON export.  
Status: CONFIRMED-by-design

### Commercial Model
- One-time: $149–$299 individual / ~$799 site  
- Natural complement to EASA SMSVP Starter Kit (2026-08-16) — bundle opportunity  
- Path to $250k/yr: ~840–1,675 unit sales  
Source: ANSWER_BANK  
Status: INFERRED — BRIAN CONFIRMATION REQUIRED

### FSA Scoring
Base: 9 (Automation HIGH, Edge DEEP, Buildability NOW)  
FSA modifiers: +2 eliminates work (manual SMS gap assessment), +2 deterministic rules, +2 no enterprise equivalent for Part 145 SMS specifically  
Strategic: +4 evidence-backed recommendations, +4 reusable CE IP, +3 supports regulated quality, +3 Brian's moat (Part 145 SMS = niche), +3 bundle potential with EASA kit  
**Total: ~32** — BUILDS

---

## Consistency Check vs. Answer Bank
✅ Audience: quality/safety manager at regulated repair station — CONSISTENT  
✅ Claim: readiness only, regulatory status disclosed — CONSISTENT  
✅ Architecture: deterministic rules, offline HTML — CONSISTENT  
✅ Brand: Conform-Edge software — CONSISTENT

---

## Open Launch Blockers
1. Regulatory status disclosure wording — needs Brian review before any commercial sale
2. Scoring thresholds confirmation
3. Critical-item list (which elements are mandatory-minimum) needs Brian sign-off
4. FAA AC references — confirm AC 120-92B is current; search for more recent SMS guidance
5. Pricing confirmation
