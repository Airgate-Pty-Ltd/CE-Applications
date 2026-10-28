# Discovery Record — DO-178C / DO-254 Evidence Readiness Checklist

**Build Date:** 2026-09-19  
**Session:** Overnight autonomous run (Phase 2 — new opportunity)  
**Route:** software (Conform-Edge)

## Product Definition

**Name:** DO-178C / DO-254 Software & Hardware Evidence Readiness Checklist  
**Type:** Self-contained HTML tool  
**Target buyer:** Avionics OEMs, airborne software/hardware development teams, DER consultants, certification project managers preparing for FAA/EASA software/hardware approval. Also any AS9115-certified supplier with airborne software or complex hardware in scope.  
**Problem solved:** DO-178C and DO-254 certification evidence sets are large, DAL-dependent, and easy to under-specify. Certification project teams routinely discover missing lifecycle data artefacts only after DER review is scheduled. A self-assessment tool that enforces DAL-specific evidence requirements — with SW and HW separate panels — prevents late-stage surprises. No low-cost self-service tool addresses both standards in a single interface.  
**Revenue model:** One-time purchase, $299–$349  
**Bundle opportunities:** DO-178C/DO-254 + AS9115 D&D Gate bundle; airworthiness certification suite (FAA PAH + DO-178C/DO-254 + DAL evidence)  
**Differentiator:** Dual SW/HW mode with DAL A-D selector that grays out non-required items — avoids the common error of applying DAL A requirements to DAL C/D projects or treating DAL C as optional at DAL B.

## FSA Design Gate

**Gate:** PASS  
**Architecture:** Single-file HTML, zero dependencies  
**Scope:** SW panel: 17 items across Plans (5: PSAC/SDP/SVP/SQAP/SCMP), Requirements (2: HLR/LLR), Design/Code (2), Verification (4: coverage, MC/DC, independence, LLR target), CM (3: SCI/PRs/SAS), Tool Qualification (1). HW panel: 12 items across Plans (4: PHAC/HDP/HVAP/HVRP), Requirements/Design (2), Validation/Verification (3), CM (3: HCI/HAS/PRs).  
**Intelligence:** DAL A-D selector with `data-min-dal` attribute system; items gray/disable when above selected DAL. 4-option responses (Yes/Partial/No/N-A). 3-tier verdict: DER REVIEW READY (≥90%) / CONDITIONAL (≥75%) / NOT DER-READY (<75% or critical NO). Highest bar of any tool in portfolio, reflecting DER submission stakes.  
**M-AI:** ARCHITECTURE DEFINED — domain: do178c-do254-evidence-readiness  
DIMs: plan-documents, requirements-data, verification-evidence, configuration-management, tool-qualification  
**Visual:** RTCA green (#1a5c38) + teal (#0d7377) badge over Conform-Edge card system

## Build Verification

| Check | Result |
|-------|--------|
| File present | YES |
| File size | 45,154 bytes |
| SW/HW dual mode toggle | YES |
| DAL A-D selector with visibility control | YES |
| DO-178C/DO-254/PSAC/PHAC/SAS/HAS/DAL refs (124) | YES |
| 3-tier verdict engine (≥90%/≥75%/<75%) | YES |
| JSON export | YES |
| M-AI domain tag | YES |
| Zero external dependencies | YES |

**Verification result: PASS (9/9)**  
**Build status: PUBLISH-READY**
