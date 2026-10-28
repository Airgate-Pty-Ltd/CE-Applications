# DISCOVERY RECORD — AIAG-VDA FMEA Action Priority (AP) Calculator

**Date:** 2026-09-17  
**Brand:** Conform-Edge (software)  
**Gate:** BUILD AUTHORIZED  
**Run:** Overnight automated, Desktop

## Product Definition

**What it is:** HTML tool that calculates AIAG-VDA (2019) Action Priority (AP) for DFMEA and PFMEA entries, replacing the legacy RPN number with the updated H/M/L priority framework.

**Problem it solves:** The AIAG-VDA 2019 FMEA handbook replaced RPN with Action Priority (AP) — but the AP table is complex and manual calculation is error-prone. Teams still use RPN out of habit or confusion. No free, self-contained AP calculator exists. This tool makes the 2019 methodology accessible to any IATF/AS9100 quality engineer.

**Who uses it:** IATF 16949 quality engineers, AS9100D design teams, process engineers, QMS managers facilitating DFMEA/PFMEA workshops, consultants.

**Why now:** IATF sanctioned interpretations enforce the 2019 handbook. Customer-specific requirements (GM, Ford, Stellantis) are auditing AP compliance. No AP calculator exists in the Conform-Edge portfolio. FMEA methodology is a high-volume training and tool search topic.

## Commercial Case

- $149–$199 one-time
- IATF Core Tools Suite bundle: $399 (PPAP + FMEA AP + LPA + Planned Change Gate)
- AS9100D bundle: pairs with 8D tool, CAPA Effectiveness Planner
- Path to $250k/yr: ~1,500 sales/yr at $149 — conservative given IATF market size

## M-AI Interface

`window.__MAI_INTERFACE__ = { domain: "fmea-action-priority", version: "1.0", reserved: true }`

**Status:** ARCHITECTURE DEFINED — reserved interface only. No M-AI Kernel embedded.

## Needs from Brian

1. Validate the AP decision logic against the AIAG-VDA 2019 table — particularly the S≥9 medium-priority threshold (O≤2, D≤6 → M in this build)
2. Confirm IATF and AS9100D market applicability framing for landing page
3. Review whether a v2 should add the full AIAG-VDA FMEA structure form (7 steps) or keep this as a focused AP calculator only
