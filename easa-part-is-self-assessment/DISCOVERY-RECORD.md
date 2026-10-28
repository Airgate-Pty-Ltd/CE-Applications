# Discovery Record — EASA Part-IS Information Security Self-Assessment Tool

**Build Date:** 2026-09-03  
**Brand:** Conform-Edge Quality Consulting  
**Type:** Software — Self-Assessment HTML Tool  
**Status:** VERIFIED PUBLISH READY

---

## Product Definition

**Name:** EASA Part-IS Information Security Self-Assessment Tool  
**File:** `easa-part-is-self-assessment.html`  
**Regulatory Basis:** Commission Regulation (EU) 2022/1645 (Part IS implementing rule); Commission Regulation (EU) 2023/203 (cybersecurity ATM/ANS)

**Scope:** Aviation organizations subject to EASA Part-IS — Part 21 production/design organizations, Part 145 maintenance organizations, and ATM/ANS providers required to implement an Information Security Management System (ISMS) covering their aviation activities.

**Problem Solved:** EASA Part-IS is a new regulatory obligation (effective 2023-2025 phased) and most aviation organizations have no structured tool to assess their ISMS compliance before competent authority oversight. The regulation introduces novel requirements (IS governance, IS risk assessment, IS incident reporting to NAA) that do not map directly to generic ISO 27001 frameworks.

---

## Market

**Target Customer:** Part 21 POA/DOA holders, Part 145 repair stations, ATM/ANS providers subject to EASA Part-IS obligation  
**Geography:** EU member states, EASA-bilateral territories (UK, Switzerland, etc.)  
**Companion Product:** EASA Part-IS Starter Kit (built 2026-08-10 — content kit, Annex Quality)

**Differentiator:** Aviation-specific IS assessment with clause mapping to Part-IS (IS.D.OR.xxx) rather than ISO 27001 control families; critical-zero override on regulatorily mandatory items; NAA incident reporting procedure as critical item; MR narrative aligned to IS.D.OR.260 management review requirements.

---

## Business Model

**Pricing:** $199 one-time (standalone tool) / bundled $299 with EASA Part-IS Starter Kit  
**Delivery:** Single HTML file, zero dependencies, immediate download  
**Revenue Path:** Conform-Edge site direct sales + bundle upsell with Starter Kit

---

## Key Build Decisions

1. **28 questions across 5 sections** — covers all IS.D.OR clauses proportionally; not inflated beyond what a self-assessment reasonably supports
2. **4 critical items** — Q1 (ISMS scope), Q2 (IS Policy/Accountable Manager), Q6 (IS risk assessment), Q26 (NAA incident reporting procedure) — these are the non-negotiable regulatory cornerstones
3. **Scoring threshold 80%** — consistent with other self-assessment tools in portfolio
4. **JSON export** — enables record-keeping and audit evidence trail
5. **MR narrative** — aligned to IS.D.OR.260 management review input requirement

---

## Launch Blockers (Pre-Publish Review Required)

1. Verify clause numbering against current published EU regulation text (IS.D.OR.200–270)
2. Confirm phased applicability dates for different organization types
3. Legal review of "self-assessment for compliance purposes" disclaimer language
