# Discovery Record — AS9115 Software Design & Development Gate Tool

**Build Governor Stage:** DISCOVERY COMPLETE — BUILD AUTHORIZED  
**Date:** 2026-09-11  
**Run:** Overnight automated, Desktop  
**Brand:** Conform-Edge (software)  
**Product Root:** `E:\Conform-Edge\ClaudeCowork\04 Product Portfolio\_Opportunity-Scans\Builds\2026-09-11-as9115-software-dd-gate\`

---

## Product Identification

- **Name:** AS9115 Software Design & Development Gate Tool
- **Slug:** `as9115-software-dd-gate`
- **Type:** Self-contained HTML assessment tool
- **Parent:** Extends 2026-09-09 AS9100D D&D Gate Tool for software-intensive products under AS9115

---

## Discovery Gate Questions

**Q1: Who is the buyer and what problem do they have?**  
Quality Engineer or Systems Engineer at an AS9100D/AS9115-registered aerospace company delivering software-intensive products (avionics, IFE, in-seat power control systems, cabin management). They must demonstrate gate-compliant D&D reviews but lack a structured tool covering the software-specific overlays (SCCB, CDRL, DRL, configuration control, software V&V). The AS9100D D&D Gate Tool covers the hardware frame; AS9115 adds software artifact and control requirements that the base tool does not capture. · INFERRED · 2026-09-11

**Q2: How does the buyer find and buy this?**  
Same channel as AS9100D D&D Gate — Conform-Edge site, IAQG/AS9100 search terms, LinkedIn aerospace quality community. Bundle positioning: "AS9100D + AS9115 D&D Gate Pack" at ~$249 for both. · INFERRED · 2026-09-11

**Q3: What does the tool do?**  
Extends the 4-gate AS9100D model with a 5th software-specific gate covering: Software CDRL/DRL completeness; SCCB authority established; software configuration control baseline; software V&V method documented (SIL/DAL level captured); regression test strategy; software release record; interface control document status; applicable DO-178C/DO-254 level if applicable. Produces a software-specific gate record supplement to the AS9100D base review. · INFERRED · 2026-09-11

**Q4: Is there a competing tool?**  
No standalone tool exists. JAMA, IBM DOORS adjacent — but those are requirements management tools, not gate readiness assessors. No Conform-Edge peer product. · INFERRED · 2026-09-11

**Q5: Compliance claim?**  
Readiness assessment only. "Supports AS9115 Software Gate Review readiness" — never "AS9115 compliant or certified." Clause references by number and intent only. · CONFIRMED-by-design · 2026-09-11

**Q6: Revenue path?**  
- $149 standalone / $249 bundle with AS9100D D&D Gate Tool  
- ~1,500 sales/yr across aerospace software suppliers  
- ~$250k/yr path  
· INFERRED · 2026-09-11

**Q7: Startup cost?**  
Zero. Single HTML file, no hosting, no dependencies. Claude build session only. · CONFIRMED · 2026-09-11

---

## FSA Gate Decision

**Gate:** Future Systems Architect review  
**Decision:** BUILD AUTHORIZED  
**Rationale:** Self-contained HTML gate tool — same architecture as the approved AS9100D D&D Gate Tool, which passed FSA previously. Software-specific extension follows the same deterministic, rules-only, no-network, no-persistence model. FSA Section 12 check: NOT a manual data-entry calculator — it is a structured evidence-presence gate with deterministic verdict logic. VERA visual system applied. M-AI reserved interface required.

---

## M-AI Integration Profile

**Decision:** ARCHITECTURE DEFINED  
**Domain:** `as9115-software-dd-readiness`  
**Rationale:** Gate tool architecture same as sibling AS9100D gate. M-AI reserved for platform promotion; deterministic engine sufficient for standalone tool.  
**Reserved Interface:** `window.__MAI_INTERFACE__` present in shipped file.  
**DIMs on promotion:** software-gate-completeness, sccb-authority-evidence, cdrl-status-evidence, software-vv-evidence

---

## Build Authorization

BUILD AUTHORIZED — proceed with HTML build.  
No blockers requiring Brian input for initial build.

**Recommended Brian actions post-build:**
1. Review CDRL/DRL item list for accuracy against your specific programs (IFE, in-seat power)
2. Confirm whether DO-178C/DO-254 question is required for standard aerospace software suppliers vs. optional
3. Set bundle pricing and link to AS9100D D&D Gate Tool on Conform-Edge site
