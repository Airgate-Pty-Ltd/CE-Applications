# DISCOVERY RECORD — ISO 45001:2018 OH&S Readiness Self-Assessment

**Date:** 2026-09-17  
**Brand:** Conform-Edge (software)  
**Gate:** BUILD AUTHORIZED  
**Run:** Overnight automated, Desktop

## Product Definition

**What it is:** Self-contained HTML self-assessment tool for ISO 45001:2018 OH&S Management System readiness evaluation.

**Problem it solves:** Organizations pursuing ISO 45001 certification have no affordable self-directed readiness check. Consulting-based gap assessments cost $5,000–$15,000. This gives QMS managers a free-to-start, instantaneous readiness picture with actionable gap data.

**Who uses it:** EHS managers, HSE coordinators, QMS leads, ISO 45001 certification candidates, consulting firms servicing multi-standard clients.

**Why now:** IMS triple-standard kit (built 09-13) creates natural demand for a standalone OH&S tool. ISO 9001:2026 transition wave is pulling organizations to review all MS simultaneously. No OH&S self-assessment tool exists in the Conform-Edge portfolio.

## Commercial Case

- $149–$199 one-time purchase
- Bundle with ISO 14001 Self-Assessment: $199 package
- IMS Triple Bundle (9001+14001+45001 tools): $399
- Path to $250k/yr: ~1,500 sales/yr at $149 average — achievable given IAQG/IAF cross-sell network
- Startup cost: $0 (pure HTML, no hosting infrastructure required)

## Technical Specification

- 30 questions across 4 sections (7/8/8/7)
- 4 critical items: OH&S Policy (Cl. 5.2), Hazard ID process (Cl. 6.1.2.1), Legal compliance evaluation (Cl. 9.1.2), Incident investigation with RCA (Cl. 10.2)
- Critical-zero override: any unchecked critical → NOT-READY regardless of score
- Verdict engine: READY (≥85%, 0 criticals failed) / DEVELOPING (60–84%) / NOT-READY (<60% or any critical failed)
- Management review narrative: auto-generated per verdict
- Gap table: unchecked items with section attribution and priority
- JSON export
- 0 external dependencies
- ~27,575 bytes

## M-AI Interface

`window.__MAI_INTERFACE__ = { domain: "iso45001-ohs-readiness", version: "1.0", reserved: true }`

**Status:** ARCHITECTURE DEFINED — M-AI kernel interface reserved for future integration. No M-AI Kernel embedded in this build.

## Needs from Brian

1. Confirm question scope — are there sector-specific OH&S requirements (construction, chemical, healthcare) worth adding as optional modules in v2?
2. Confirm pricing tier and bundle packaging with ISO 14001 tool
3. Validate critical item list — are the 4 chosen criticals the right CB audit battleground items?
