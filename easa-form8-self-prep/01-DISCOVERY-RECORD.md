# Discovery Record
## EASA Form 8 Self-Prep HTML Assessment Tool

**Build date:** 2026-08-18  
**Build folder:** `2026-08-18-easa-form8-self-prep`  
**Discovery Gate:** BUILD AUTHORIZED  
**Brand:** Conform-Edge Quality Consulting LLC

---

## Problem Statement

FAA Part 145 repair stations holding dual EASA Part-145 approval under the US-EU BASA (Bilateral Aviation Safety Agreement, Maintenance Annex Guidance Change 10, effective 2025-10-10) face EASA oversight audits (Form 8 visits) conducted by FAA Technical Agents on EASA's behalf. These are high-stakes visits — a finding can trigger suspension of EASA approval and loss of EASA-market customers.

No self-preparation tool exists for these stations. They typically rely on their DRS (Designated Repair Station) quality manager reviewing the MAG text manually, which is inconsistent and misses EASA-specific requirements that differ from the FAA-only checklist.

---

## Product Definition

**What it does:** A self-contained HTML self-assessment tool that walks a repair station quality manager through all EASA Form 8 oversight areas — all 22 MAG Supplement sections plus EASA-specific deltas — producing a prioritized gap report, management review narrative, and JSON export compatible with the Conform-Edge MRA workflow.

**Who uses it:** Quality Managers, Accountable Managers, and DRS compliance personnel at FAA Part 145 repair stations with EASA bilateral approval.

**Why it eliminates work:** Replaces manual MAG text review with a guided, scored, prioritized checklist. Surfaces EASA-specific requirements that are easy to overlook when the station's quality team is primarily trained to FAA standards. Generates the pre-audit gap report automatically.

**FSA gate consideration:** This tool imports no data files (no CSV). Instead the assessor answers questions directly — justified because EASA Form 8 oversight is a qualitative, evidence-based audit process, not a data import problem. The 22-section structure matches the Form 8 structure precisely, so the tool eliminates the cognitive overhead of mapping questions to the actual oversight form. Section 12 FSA exception: direct question input is appropriate when the artifact being assessed is itself a structured checklist (the Form 8 is the artifact; the tool mirrors its structure).

---

## Revenue Model

- Standalone tool: $199/yr per repair station
- Bundle with MAG CHG 10 Supplement Gap Analysis template: $349/yr
- Target market: ~4,000 EASA-bilateral FAA Part 145 stations globally
- Realistic addressable: 800–1,200 stations actively maintaining EASA approval
- Revenue path: $160k–$240k/yr at 3–4% penetration
- Strategic value: positions Conform-Edge as the go-to BASA/bilateral compliance resource

---

## Competitive Landscape

No direct competitor offers a self-prep tool for EASA Form 8 oversight. Repair stations typically use: (1) EASA Part-145 generic checklists that miss bilateral specifics, (2) Manual MAG text, (3) Consultant-led pre-audit reviews ($5,000–$15,000/engagement). This tool undercuts the consultant engagement cost while covering the same ground.

---

## Build Authorization

Discovery Gate: **BUILD AUTHORIZED**  
Reason: Clear user pain, no competitor, defensible $199/yr price point, content is governed by easa-form8-auditor skill, architecture mirrors proven ISO 45001 tool pattern.
