# Discovery Record — ISO 42001 AIMS Self-Assessment Tool

**Build Date:** 2026-09-03  
**Brand:** Conform-Edge Quality Consulting  
**Type:** Software — Self-Assessment HTML Tool  
**Status:** VERIFIED PUBLISH READY

---

## Product Definition

**Name:** ISO 42001 AI Management System (AIMS) Self-Assessment Tool  
**File:** `iso42001-aims-self-assessment.html`  
**Standard Basis:** ISO 42001:2023 — Artificial Intelligence Management Systems

**Scope:** Organizations implementing or preparing to certify an AI Management System under ISO 42001:2023 — covering AI developers, AI deployers, and organizations using AI systems in their operations. Applicable across all industries and organization sizes.

**Problem Solved:** ISO 42001:2023 is the first international standard for AI management systems (published December 2023). Organizations are at varying stages of AIMS implementation and lack structured tools to gauge readiness before engaging certification bodies. The standard's Annex A controls (responsible AI, fairness, transparency, human oversight) introduce requirements unfamiliar to most ISO management system practitioners.

---

## Market

**Target Customer:** AI developers, AI-deploying enterprises, organizations preparing for ISO 42001 certification, organizations responding to EU AI Act compliance pressure  
**Geography:** Global — particularly EU (EU AI Act alignment), UK, ANZ, North America  
**Companion Product:** ISO 42001 AIMS-in-a-Box (built 2026-06-17 — content kit, Annex Quality)  
**Regulatory Tailwind:** EU AI Act (in force), expanding AI governance requirements globally

**Differentiator:** Management system practitioner lens (clause-mapped to ISO 42001 structure) rather than technical AI audit approach; includes Annex A responsible AI controls (bias/fairness impact, transparency, human oversight) as assessable items with critical override on foundational requirements.

---

## Business Model

**Pricing:** $249 one-time (standalone) / bundled $399 with AIMS-in-a-Box  
**Delivery:** Single HTML file, zero dependencies, immediate download  
**Revenue Path:** Conform-Edge site direct + bundle upsell with AQ AIMS-in-a-Box

---

## Key Build Decisions

1. **30 questions across 6 sections** — covers Cl. 4–10 proportionally plus Annex A responsible AI controls
2. **5 critical items** — Q1 (context), Q3 (AIMS scope), Q4 (AI policy), Q9 (lifecycle process), Q15 (bias/fairness impact assessment) — the AIMS would not be certifiable without these
3. **EU AI Act question** (Q29) included as a non-critical item to add regulatory dimension beyond pure ISO 42001
4. **Scoring threshold 80%** — consistent with portfolio
5. **JSON export** — audit evidence trail

---

## Launch Blockers

1. Clause reference accuracy — verify against ISO 42001:2023 published text (Annex A control numbering)
2. EU AI Act alignment note — confirm accuracy of Q29 scope statement
3. Disclaimer language: self-assessment tool, not a substitute for CB assessment
