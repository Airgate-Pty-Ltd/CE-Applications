# DISCOVERY RECORD — ITAR/EAR Export Control Compliance Self-Assessment
**Build slug:** 2026-09-21-itar-ear-export-control-tool
**Date written:** 2026-09-21 (auto-authoring mode, overnight opportunity scan)
**Gate Decision:** BUILD AUTHORIZED (inferred, auto-authoring mode)
**Production-Authorized:** NO — launch blockers outstanding; M-AI Profile required

---

## Build Classification
- **Class:** Software — self-contained single-file HTML assessment tool
- **Distribution:** Static file, licensed via Conform-Edge product page
- **Criticality:** Moderate-High — advisory self-assessment for export control; determinations rest with the organization and qualified export control counsel
- **Route:** Software / Conform-Edge

---

## Discovery Snapshot

Defense and aerospace manufacturers, their subtier suppliers, and research organizations that develop, manufacture, or transfer defense articles, defense services, or dual-use items are subject to ITAR (22 CFR Parts 120–130, administered by DDTC/State) and/or EAR (15 CFR Parts 730–774, administered by BIS/Commerce). ITAR violations carry criminal penalties up to $1M per violation and 20 years imprisonment. EAR criminal penalties reach $1M per violation. Civil penalties under ITAR reach $1.3M per violation.

Despite extreme regulatory exposure, no low-cost structured self-assessment tool exists for SMEs in the defense supply chain. Organizations typically rely on law firm audits ($15,000–$50,000+) or attempt manual gap review against reams of regulatory text. This tool provides a structured, scored internal readiness assessment covering the five core compliance pillars, in under 45 minutes.

**Problem sharpness:** CMMC and ITAR/EAR compliance are the two most active enforcement concerns for the defense industrial base in 2025–2027. Voluntary disclosure to DDTC/BIS can significantly reduce penalty exposure — organizations that don't know they have violations cannot disclose. This tool identifies gaps before an enforcement action.

**Addressable market:** Any US manufacturer, distributor, university, or research organization that designs, manufactures, exports, re-exports, or transfers defense articles, defense services, or controlled dual-use commodities or technology. Estimate 30,000–50,000 organizations in the DIB supply chain with ITAR exposure; 100,000+ with some EAR exposure.

---

## Gate 0–5 (Inferred as Brian, Auto-Authoring Mode)

### A. Buyer
- **Primary user:** Export Compliance Manager, Quality Manager, or Regulatory Affairs Lead at an aerospace/defense SME
- **Economic buyer:** VP Operations, VP Quality, General Counsel, or owner-operator
- **Urgency:** HIGH — criminal and civil penalty exposure; DDTC registration renewals annual; CMMC 2.0 rollout is creating compliance awareness cascade across the DIB
- **Organization profile:** 50–1,000 employee defense manufacturer or subtier supplier; CAGE code holder; potential PMA or STC holder; university technology transfer office
- **Status:** INFERRED — Brian confirmation required

### B. Product Claim Boundary
- Permitted: internal readiness self-assessment / gap identification / compliance program maturity rating / internal audit tool
- Prohibited: "ITAR-compliant / EAR-compliant / approved / cleared" — this tool does not make compliance determinations; legal counsel must make final determinations
- Warning displayed prominently in UI: "This tool identifies compliance gaps for internal use. Not legal advice."
- Standards cited: 22 CFR Parts 120–130 and 15 CFR Parts 730–774 by part/section reference and intent only — no regulatory text reproduced verbatim

### C. Authority & Compliance Basis
- ITAR: 22 CFR Part 120 (purpose/scope/definitions), Part 121 (USML), Part 122 (registration), Part 123 (licenses for export/temp import), Part 124 (manufacturing license agreements), Part 125 (licenses for technical data/software), Part 126 (general policies/procedures), Part 127 (violations/penalties), Part 128 (administrative procedures), Part 129 (registration of brokers), Part 130 (political contributions)
- EAR: 15 CFR Part 730 (purpose), Part 732 (steps to EAR), Part 734 (scope of EAR), Part 736 (general prohibitions), Part 738 (CCL/ECCN structure), Part 740 (license exceptions), Part 742 (control policy), Part 744 (end-user controls), Part 762 (record retention), Part 774 (CCL)
- Deemed export controls — technology transferred to foreign nationals in the US (22 CFR §120.17, 15 CFR §734.13)
- EMCP (Empowered Official and Compliance Program) requirements under ITAR

### D. MVP Boundary
- 5-section assessment: Jurisdiction Determination / Registration & Authorization / EMCP/TCP / Deemed Exports & Personnel / Records & Enforcement
- 19 questions; 5 critical items
- Regime selector: ITAR Only / EAR Only / Both
- 3-tier verdict: COMPLIANT POSTURE (≥85%) / DEVELOPING PROGRAM (65–84%) / COMPLIANCE ACTION REQUIRED (<65% or critical fail)
- JSON export with regime, organization, assessor metadata
- M-AI ARCHITECTURE DEFINED signal
- Single self-contained HTML file; no network calls; no LLM

### E. Commercial Model
- **Price:** $199–$249 one-time individual; $599–$799 site license (INFERRED — regulatory/legal-adjacent premium vs. standard QMS tools; higher than AS9100 tools given penalty severity of underlying regulations)
- **Revenue path:** $250k/yr on volume (~1,000–1,500 individual licenses or ~300–500 site licenses/yr)
- **Bundle candidate:** "Defense Compliance Suite" — ITAR/EAR Export Control + CMMC 2.0 Readiness, two-tool bundle at $299–$349 (vs. ~$450 separate)
- **Upsell:** Conform-Edge ITAR/EAR full program development consulting engagement ($3,000–$8,000)

### F. Consistency Check vs. Answer Bank
- Buyer: consistent (quality/compliance manager at aerospace/defense SME) ✓
- Claim: consistent (readiness / self-assessment / gap identification) ✓
- Architecture: deterministic, no LLM, self-contained HTML — consistent ✓
- Commercial model: pricing slightly above ANSWER_BANK default ($149–$399) due to legal-adjacent regulatory severity — flagged for Brian; reason recorded ✓
- Warning displayed in UI consistent with ANSWER_BANK legal disclaimer requirements ✓

---

## Open Launch Blockers

| # | Item | Why it blocks | Source |
|---|------|---------------|--------|
| 1 | **Pricing confirmation** — $199–$249 individual / $599–$799 site is above the default ANSWER_BANK range of $149–$399. Brian to confirm premium pricing rationale or adjust. | Cannot publish without Brian pricing decision | INFERRED |
| 2 | **Legal disclaimer scope** — confirm the "Not legal advice" warning is sufficient or whether a more detailed disclaimer is needed for a tool touching ITAR criminal exposure | Regulatory liability | INFERRED |
| 3 | **"Defense Compliance Suite" bundle** — confirm pairing with CMMC 2.0 Readiness tool and bundle pricing | Affects product page structure | INFERRED |
| 4 | **Behavioral verification** — Brian to open `itar-ear-export-control-tool.html` in a browser, run a test assessment (regime = Both; mix Yes/No/critical fail), confirm verdict, gap table, JSON export render correctly | Automated code inspection PASS is not a substitute for live browser test | Required |
| 5 | **EAR99 guidance language** — confirm whether the assessment correctly positions EAR99 items (no ECCN, no license required for most destinations) vs. controlled EAR items; legal review recommended | Product accuracy | INFERRED |

---

## M-AI Integration Note
Qualifying software requiring M-AI-PRODUCT-INTEGRATION-PROFILE.md. Profile written alongside this record (auto-authoring mode). Estimated DIMs: jurisdiction-determination-evidence, ddtc-registration-status, emcp-program-implementation, deemed-export-risk-assessment, export-record-compliance. Domain: `itar-ear-export-control`. Gate status: ARCHITECTURE DEFINED — Reserved Kernel Interface.
