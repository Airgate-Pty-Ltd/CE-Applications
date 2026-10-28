# EU AI Act Obligation Cross-Map (High-Risk AI Systems → AIMS Clauses/Controls)

**Document ref:** [ORG-AIMS-022]
**Applies to:** Organizations subject to Regulation (EU) 2024/1689 (the "EU AI Act") operating an AIMS aligned to ISO/IEC 42001:2023
**Owner:** [Compliance/Legal Lead + AIMS Manager]
**Version:** [1.0] **Effective date:** [DATE] **Next review: [every 6 months — this area is moving fast]**

**Sources verified (web search):** Verified 2026-07-10 against: (1) European Commission "AI Act Service Desk" official timeline page, ai-act-service-desk.ec.europa.eu; (2) Travers Smith LLP legal briefing "EU agrees to delay key AI Act compliance deadlines," 8 May 2026; (3) DLA Piper GENIE article on the Digital Omnibus package's final Council adoption (referencing 29 June 2026 Council green light following European Parliament endorsement); (4) artificialintelligenceact.eu (Future of Life Institute) implementation timeline (baseline dates; page itself last shows a full update dated 1 August 2024, i.e., **pre-dates** the 2026 Digital Omnibus deferrals — used only for the original/unamended dates, cross-checked against the other three sources for the amended dates). **This is an actively moving regulatory file. Confirm current status and exact Official Journal citations before commercial sale or reliance in a compliance decision.**

---

## 1. Purpose

This document lets a buyer who already has (or is building) an AIMS see, at a glance, which EU AI Act high-risk-system obligation maps to which part of their AIMS — so they aren't building two parallel compliance programs. It does not replace legal advice; the EU AI Act carries its own penalty regime and legal definitions that an AIMS alone does not satisfy.

## 2. Scope

Covers obligations applicable to **providers and deployers of high-risk AI systems** under the EU AI Act, cross-mapped to the AIMS documents in this kit. Does not cover: prohibited-practice obligations (Chapter II, already in force — see timeline), general-purpose AI (GPAI) model provider obligations (Chapter V — a separate obligation set), or Member-State-level implementing rules, which vary by country. [Buyer: confirm whether your AI systems fall under Annex I (product-embedded) or Annex III (standalone use-case) high-risk classification, or under GPAI, before relying on this map.]

## 3. Verified Timeline Summary (as of 2026-07-10)

The EU AI Act applies in stages. Following the "Digital Omnibus on AI" amendments (provisional political agreement reached 7 May 2026; per DLA Piper, Council gave final green light 29 June 2026 following European Parliament's formal endorsement, with the act entering into force shortly after Official Journal publication), the **high-risk system dates were deferred**. Confirmed dates:

| Date | Obligation | Status |
|---|---|---|
| 1 August 2024 | AI Act enters into force (published in Official Journal 12 July 2024) | ✅ Passed |
| 2 February 2025 | Prohibited AI practices (Chapter II) and AI literacy duties apply | ✅ Passed |
| 2 August 2025 | GPAI model provider obligations, EU/national governance bodies, notified bodies, and the penalty regime apply | ✅ Passed |
| **2 December 2026** | Transparency obligations for AI-generated/synthetic content (Article 50, e.g., watermarking/labeling) — deferred from original 2 Aug 2026 date, delay reduced from 6 to 3 months | Upcoming — **[unverified: exact article scope beyond Art. 50 — confirm with counsel]** |
| **2 December 2027** | High-risk AI system obligations for **Annex III** (use-case) systems — new/substantially-modified systems in areas such as biometrics, critical infrastructure, education/vocational access, employment (recruitment, monitoring, promotion, termination), credit/insurance risk scoring, and public-sector functions (benefits, border/asylum, law enforcement, justice, elections) — **deferred 16 months from the original 2 August 2026 date** | Upcoming |
| 2 August 2027 | National AI regulatory sandboxes deadline (deferred from 2 Aug 2026) | Upcoming |
| **2 August 2028** | High-risk AI system obligations for **Annex I** (product-embedded/safety-component) systems — e.g., medical devices, lifts, toys, radio equipment governed by existing EU product-safety law — **deferred 12 months from the original 2 August 2027 date** | Upcoming |
| 31 December 2030 | Compliance deadline for AI components of the large-scale EU IT systems listed in Annex X | Upcoming |

**[UNVERIFIED — flag for buyer/legal review]:** The precise Official Journal publication date and citation number for the Digital Omnibus amending regulation were not confirmed via this search session; only secondary legal-briefing sources (Travers Smith, DLA Piper) were checked, dated May–June 2026. Confirm the amending regulation's final published text and in-force date directly against eur-lex.europa.eu before relying on these dates for a compliance deadline. Also unconfirmed in this session: whether the general AI-literacy duty (Article 4) was retained, narrowed, or dropped in the final Digital Omnibus text — Travers Smith's 8 May 2026 briefing noted this was still unclear as of publication.

## 4. Obligation → AIMS Cross-Map

| EU AI Act Obligation (high-risk system) | Who it applies to | Verified Phase-In Date | Corresponding AIMS Document/Clause Intent | Notes |
|---|---|---|---|---|
| Risk management system across the AI system lifecycle | Provider | Annex III: 2 Dec 2027 / Annex I: 2 Aug 2028 | Documents 6–7 (AI Risk Assessment & Treatment, Clause 6.1.2/6.1.3 intent) | AIMS risk process is the natural home for this; buyer should confirm it addresses the Act's specific risk categories (health, safety, fundamental rights) explicitly |
| Data and data governance (training/validation/testing data quality) | Provider | Same as above | Document 14 (Data Management for AI, Annex A.7 intent) | AIMS data control should reference bias/representativeness checks the Act expects |
| Technical documentation | Provider | Same as above | Document 3 (AIMS Manual/process map) + Document 13 (AI System Lifecycle, Annex A.6 intent) | Act's technical file requirements are more prescriptive than AIMS documented-information intent alone — buyer needs a dedicated technical-file template beyond this kit |
| Record-keeping / automatic logging | Provider | Same as above | Document 13 (AI System Lifecycle) + Document 21 (Monitoring & Measurement) | Logging depth required by the Act (e.g., duration, event types) should be confirmed against the Act text |
| Transparency and provision of information to deployers | Provider | Same as above | Document 15 (Information-for-interested-parties / model-card template, Annex A.8 intent) | |
| Human oversight | Provider/Deployer | Same as above | Document 16 (Responsible-Use Procedure, Annex A.9 intent) | Act requires oversight measures be "built in" — verify design-stage evidence, not just an operating procedure |
| Accuracy, robustness, cybersecurity | Provider | Same as above | Document 13 (AI System Lifecycle) + Document 21 (KPI: drift rate, availability) | |
| Quality management system for the provider organization | Provider | Same as above | The AIMS as a whole (this kit) | This is the clearest direct overlap — a conformant AIMS is intended to satisfy much of this obligation's *intent*, subject to legal confirmation |
| Conformity assessment (self-assessment or third-party, depending on system type) | Provider | Same as above | Document 8 (Statement of Applicability) + Document 18 (Internal Audit) | AIMS internal audit is not a substitute for the Act's formal conformity assessment procedure — flag this distinction clearly to buyers |
| EU database registration (for standalone high-risk systems) | Provider/Deployer | Annex III: 2 Dec 2027 | Document 2 (AIMS Scope) — registration status should be tracked as a scope/context item | Registration also applies, with reduced information requirements, to certain systems seeking exemption from high-risk classification |
| Deployer obligations (use in accordance with instructions, human oversight, monitoring, incident reporting) | Deployer | Annex III: 2 Dec 2027 / Annex I: 2 Aug 2028 | Document 16 (Responsible Use) + Document 20 (Nonconformity & Corrective Action) | Deployer duties are lighter than provider duties but not absent — buyer must identify which role(s) their organization holds per system |
| Serious incident reporting to market surveillance authority | Provider | From applicable high-risk date | Document 20 (NCR Log) — external notification duty is **additional to**, not replaced by, internal NCR process | AIMS NCR log can capture the internal record; external regulatory notification is a separate legal step with its own deadline (buyer to confirm exact reporting window with counsel) |
| Transparency for AI-generated content (labeling/watermarking) | Provider/Deployer (of applicable systems, not limited to high-risk) | **2 December 2026** | Document 15 (Information/model card) | Applies more broadly than just high-risk systems; earliest of the still-upcoming deadlines in this map |

## 5. How to Use This Map

1. Classify each AI system: prohibited / high-risk Annex III / high-risk Annex I / GPAI / limited-risk / minimal-risk. [This kit does not include a classification tool — use official EU guidance or qualified counsel.]
2. For each high-risk system, confirm your role: provider, deployer, importer, or distributor — obligations differ materially.
3. Use the right-hand column above to locate the AIMS document that should already contain the supporting process; treat any gap as a nonconformity (Document 20) and a corrective action.
4. Track the verified phase-in dates in Section 3 as risk-register entries (Document 6) with review triggers — do not treat any date here as final without checking eur-lex.europa.eu and the EU AI Act Service Desk directly, given how recently (May–June 2026) these dates changed.

---
© 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
EU AI Act Obligation Cross-Map is proprietary software of Conform-Edge Quality Consulting LLC
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
