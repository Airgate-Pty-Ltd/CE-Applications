# Discovery Record — EASA Part 21 POA Compliance Self-Assessment

**Build Date:** 2026-09-19  
**Session:** Overnight autonomous run (Phase 2 — new opportunity)  
**Route:** software (Conform-Edge)

## Product Definition

**Name:** EASA Part 21 Production Organisation Approval (POA) Compliance Self-Assessment  
**Type:** Self-contained HTML tool  
**Target buyer:** EU/bilateral aerospace manufacturers holding or seeking EASA POA under Part 21 Subpart G; regulatory consultants; organisations subject to EASA bilateral (BASA) production oversight  
**Problem solved:** EASA POA surveillance visits from POIs are unannounced or short-notice. POA holders need a tool to self-assess against the Part 21 Subpart G requirements that EASA inspectors evaluate — POE currency, Accountable Manager authority, conformity inspection, EASA Form 1 issuance, and PAS/internal audit. Zero low-cost POA prep tool exists in any competitor portfolio. Distinct from and complementary to FAA Part 21 PAH tool (BASA bilateral organisations need both).  
**Revenue model:** One-time purchase, $249–$299  
**Bundle opportunities:** FAA Part 21 PAH + EASA POA dual tool bundle ($449); MAG CHG 10 EASA Supplement bundle

## FSA Design Gate

**Gate:** PASS  
**Architecture:** Single-file HTML, zero dependencies  
**Scope:** 7 sections, 25 questions — POE, Accountable Manager, Conformity Inspection, EASA Form 1, PAS/Internal Audit, Suppliers, Facilities/Equipment  
**Intelligence:** 3-tier verdict (POA AUDIT READY ≥85% / CONDITIONAL 65–84% / NOT READY <65% or any Level 1 critical NO). EASA Part 21 Level 1/Level 2 finding nomenclature used throughout.  
**M-AI:** ARCHITECTURE DEFINED — domain: easa-part21-poa-compliance  
DIMs: poe-document-control, accountable-manager-authority, conformity-inspection-records, airworthiness-release-form1, production-assurance-system  
**Visual:** EASA blue (#003580) + yellow (#f9a800) badge over Conform-Edge card system

## Build Verification

| Check | Result |
|-------|--------|
| File present | YES |
| File size | 37,466 bytes |
| Critical items (13 Level 1 refs) | YES |
| Part 21 / 21.A. / POE / POA / EASA Form 1 refs (79) | YES |
| 3-tier verdict engine | YES |
| JSON export | YES |
| M-AI domain tag | YES |
| Zero external dependencies | YES |

**Verification result: PASS (8/8)**  
**Build status: PUBLISH-READY**
