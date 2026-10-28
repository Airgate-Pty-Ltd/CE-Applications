# FSA Design Notes — Food Safety FSMA/HACCP Self-Assessment
**Date:** 2026-08-20 | **Gate:** FSA BUILD MODE PASS

## Architecture
- **35 questions** across 7 FSMA/HACCP sections
- **6 critical items** (hazard analysis, preventive controls, PCQI designation, allergen controls, environmental monitoring, recall/withdrawal plan)
- Scoring: 0=Not Established / 1=Partial / 2=Established; critical items at 0 = NOT READY override
- Sections: (1) Management Commitment & Food Safety Culture, (2) Prerequisite Programs / GMP, (3) Hazard Analysis & HARPC, (4) Preventive Controls, (5) Allergen Controls, (6) Verification, Validation & Records, (7) Recall & Crisis Readiness
- Outputs: scored gap table with FDA citation references, MR narrative, JSON export
- M-AI reserved interface: domain `food-safety-readiness`, 3 DIMs

## FSA Distinctions Check
- §1: Real problem — yes, FSMA enforcement is live
- §2: Next-gen — deterministic HARPC logic, not generic checklist
- §3: Data model — 35 q, 7 sections, critical override, FDA clause citations
- §4: Misuse risk — low; disclaimer required re: not replacing PCQI training or FDA inspection preparation
- §5: Zero-dependency HTML — yes
- §6: M-AI reserved — yes
- §7: VERA design — yes, navy/steel palette

**Decision: PROCEED**
