# NIST AI RMF Cross-Map (Govern / Map / Measure / Manage → AIMS Clauses/Controls)

**Document ref:** [ORG-AIMS-023]
**Applies to:** Organizations aligning to NIST AI 100-1, "Artificial Intelligence Risk Management Framework (AI RMF 1.0)" (published by the U.S. National Institute of Standards and Technology, 26 January 2023), alongside an ISO/IEC 42001:2023-based AIMS
**Owner:** [AIMS Manager / Risk Lead]
**Version:** [1.0] **Effective date:** [DATE] **Next review:** [DATE + 12 months]

**Sources verified (web search):** Verified 2026-07-10 against: (1) NIST AI Resource Center (AIRC), "AI RMF Core," airc.nist.gov/airmf-resources/airmf/5-sec-core/ (page metadata shows an updated timestamp of 18 June 2026, indicating NIST's own resource center content is current as of that date); (2) general web summaries confirming the AI RMF 1.0 Core structure of four functions (Govern, Map, Measure, Manage), with a total reported structure of **19 categories and 72 subcategories** across the four functions (Govern: 6 categories / 19 subcategories; Map: 5 categories; Measure: 4 categories / 22 subcategories; Manage: 4 categories / 13 subcategories). Unlike the EU AI Act, AI RMF 1.0 is a static, already-published 2023 document (not live legislation), so its Core structure is not expected to change — but NIST has published companion resources since (e.g., a Generative AI Profile) that are **not** cross-mapped here. **This document maps at the category level; exact subcategory wording was not individually re-verified against the NIST AI 100-1 PDF in this session — confirm subcategory-level text against nvlpubs.nist.gov/nistpubs/ai/nist.ai.100-1.pdf before commercial sale.**

---

## 1. Purpose

NIST AI RMF 1.0 is voluntary U.S. guidance, not a certifiable standard — but many buyers (especially U.S. federal contractors, and companies selling into U.S. enterprise/government customers) are asked to show AI RMF alignment alongside or instead of ISO/IEC 42001 certification. This cross-map lets an organization that already has (or is building) an AIMS show a credible AI RMF alignment story without maintaining two separate governance frameworks.

## 2. Scope

Covers the AI RMF 1.0 Core's four functions at category level, cross-mapped to this kit's AIMS documents. Does not cover NIST's separate Generative AI Profile (NIST AI 600-1) or other AI RMF companion resources, which a buyer with generative-AI-specific exposure should review separately.

## 3. Function-Level Cross-Map

| NIST AI RMF Function | Intent (plain-language) | Corresponding AIMS Document/Clause Intent |
|---|---|---|
| **GOVERN** (6 categories, 19 subcategories) | Organizational culture, accountability, and policy for AI risk — who decides, who's accountable, how resources get allocated, how third-party AI is brought in | Documents 1 (AI Policy, Clause 5.2), 3 (AIMS Manual, 4.4), 4 (Interested Parties Register, 4.2), 5 (Roles/Responsibilities/Authorities, 5.3/A.3), 17 (Third-Party/Customer Requirements, A.10) |
| **MAP** (5 categories) | Establishing context: what the AI system is for, who's affected, its boundaries and capabilities/limitations, and the risks/benefits at stake before you build or deploy | Documents 2 (AIMS Scope & Context, 4.1–4.4), 9 (AI System Impact Assessment, 6.1.4/A.5), 6 (AI Risk Assessment, 6.1.2) |
| **MEASURE** (4 categories, 22 subcategories) | Quantitative/qualitative analysis, testing, benchmarking, and ongoing monitoring of AI risk and system behavior | Document 21 (Monitoring, Measurement & KPI Sheet, 9.1), Document 13 (AI System Lifecycle — verification stage, A.6), Document 18 (Internal Audit, 9.2) |
| **MANAGE** (4 categories, 13 subcategories) | Allocating resources to prioritized risks, deciding response (mitigate/transfer/avoid/accept), documenting residual risk, and running incident response/recovery/communication | Document 7 (AI Risk Treatment, 6.1.3), Document 20 (Nonconformity & Corrective Action, 10.2), Document 19 (Management Review, 9.3) |

## 4. Category-Level Detail (representative — confirm exact subcategory text against the official PDF before sale)

| Function | Representative Category Theme | AIMS Cross-Reference |
|---|---|---|
| Govern 1 | Policies, processes, and procedures for AI risk management are in place, transparent, and implemented across the organization | Document 1 (AI Policy) + Document 3 (AIMS Manual) |
| Govern 2 | Accountability structures — roles and responsibilities for AI risk clearly assigned | Document 5 (Roles, Responsibilities & Authorities Matrix) |
| Govern 3 | Workforce diversity, equity, and competence considerations in AI risk management | Document 11 (Competence & Awareness Procedure) |
| Govern 4 | Organizational commitment to a culture that considers and communicates AI risk | Document 1 (AI Policy) + Document 19 (Management Review) |
| Govern 5 | Processes for robust engagement with relevant interested parties | Document 4 (Interested Parties & Requirements Register) |
| Govern 6 | Policies and procedures for third-party AI risk (vendors, suppliers, data/model providers) | Document 17 (Third-Party & Customer AI Requirements) |
| Map 1 | Context established and understood | Document 2 (AIMS Scope & Context) |
| Map 2 | AI system categorization | Document 9 (AI System Impact Assessment) |
| Map 3 | AI capabilities, targeted usage, goals, and expected benefits/costs understood | Document 13 (AI System Lifecycle — design stage) |
| Map 4 | Risks and benefits mapped for all components of the AI system, including third-party software/data | Document 6 (AI Risk Assessment) + Document 14 (Data Management for AI) |
| Map 5 | Impacts to individuals, groups, communities, organizations, and society understood | Document 9 (AI System Impact Assessment) |
| Measure 1 | Appropriate methods/metrics identified and applied | Document 21 (KPI Sheet) |
| Measure 2 | AI systems evaluated for trustworthy characteristics (validity, reliability, safety, security, fairness, privacy, explainability) | Document 13 (AI System Lifecycle — verification) + Document 21 (bias/fairness KPI) |
| Measure 3 | Mechanisms for tracking identified risks over time | Document 6–7 (Risk Register) |
| Measure 4 | Feedback about efficacy of measurement fed back into Govern/Map/Manage | Document 18 (Internal Audit) + Document 19 (Management Review) |
| Manage 1 | AI risks prioritized and acted on based on assessment | Document 7 (Risk Treatment) |
| Manage 2 | Strategies to maximize benefits and minimize negative impacts implemented | Document 7 (Risk Treatment) + Document 16 (Responsible Use) |
| Manage 3 | AI risks and benefits from third-party entities managed | Document 17 (Third-Party Requirements) |
| Manage 4 | Risk treatments monitored, incidents responded to, and recovery/communication plans in place | Document 20 (Nonconformity & Corrective Action) |

## 5. How to Use This Map

1. If a customer or contract requires "AI RMF alignment," use Section 3 to point to the AIMS document set already covering that function's intent.
2. Where AI RMF asks for something more specific than the AIMS documents currently capture (e.g., NIST's emphasis on measuring "trustworthy characteristics" like explainability as discrete, testable metrics), add the missing metric to Document 21 rather than creating a parallel AI RMF-only file.
3. Re-verify this map's category/subcategory counts against the current NIST AI 100-1 PDF and NIST AI Resource Center before using it in a customer-facing compliance claim — this session verified function-level structure and category counts, not full subcategory text.

---
© 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
NIST AI RMF Cross-Map is proprietary software of Conform-Edge Quality Consulting LLC
(Idaho LLC No. 6463380), Pocatello, Idaho, USA. Unauthorized reproduction,
distribution, modification, or resale is prohibited. "Conform-Edge" and the
Conform-Edge mark are trademarks of Conform-Edge Quality Consulting LLC.
Advisory documentation aid — does not certify compliance and does not replace the
judgment of the user's organization or top management.

**Regulatory currency notice:** This document is authored intent-based from general
knowledge of ISO/IEC 42001:2023's structure and has NOT been verified against a
licensed copy of the published standard. Confirm clause references and control
language against the current official standard text before commercial sale or use
in a certification audit.
