# Build Notes — CAPA Effectiveness Verification Planner
**Build date:** 2026-08-23
**Route:** Software / Conform-Edge
**File:** capa-effectiveness-planner.html (25,832 bytes)

## Gate Status
- Discovery Gate: BUILD AUTHORIZED (inferred as Brian)
- M-AI Gate: ARCHITECTURE DEFINED (RESERVED INTERFACE — static HTML offline)
- Production-authorized: NO — launch blockers in NEEDS-FROM-BRIAN.md

## What Was Built
Single-file self-contained HTML effectiveness verification planning tool:
- 3-step wizard: finding details → CA input → verification plan output
- Deterministic engine: pathway engine (CRITICAL/MAJOR/MINOR + 3 override triggers), methods-by-CA-type rule table (8 CA types × 2-3 methods each), timeline engine (30/90/180 days)
- Override logic: escape to customer / safety concern / repeat finding → forces CRITICAL pathway
- VERA palette (navy #1e2a47, steel #4a6fa5, no external CDN)
- MR-ready narrative generator
- JSON export
- Reset capability
- `window.__MAI_RESERVED` interface marker

## Verification (run 2026-08-23)
- Structural checks: 16/16 PASS
- Engine tests: 6/6 PASS (CRITICAL, MINOR+escape→CRITICAL, MAJOR+safety→CRITICAL, MINOR+repeat→CRITICAL, MAJOR unchanged, MINOR unchanged)
- External dependencies: 0 (fully offline)
- File size: 25,832 bytes

## FSA Gate Check
✅ Eliminates work (user gets a designed plan, not a blank template) — score +2
✅ Decision product (pathway + methods + timeline + evidence = governed output) — +2
✅ No enterprise equivalent for this specific CAPA effectiveness sub-problem — +2
✅ Deterministic rules-based assessment — +2
✅ Data → decision (inputs → structured plan) — +5 Layer 3
✅ Reusable Conform-Edge IP — +4 Layer 3
✅ VERA palette applied — consistent with design system

## Scoring Summary
Base: 9 (Automation High 3 / Edge Deep 3 / Buildability Now 3)
FSA: +8 (eliminates work, decision product, no equiv, deterministic)
Strategic: +33 (data→decision, evidence-backed, reusable IP, QMS support, Brian moat, exec support, sells without custom, demo)
Total: 50

## Key Assumptions
- INFERRED: Timeline thresholds (30/90/180 days) defensible across AS9100/ISO/IATF/ISO 13485 — Brian to confirm
- INFERRED: 2 methods per CA type is sufficient MVP — Brian may want to add more
- INFERRED: Training/supplier pass-score thresholds shown as placeholders in evidence text — Brian to define

## TO GO LIVE — BRIAN DOES THESE
1. Confirm pricing and CAPA Execution Suite bundle strategy
2. Approve timeline thresholds (30/90/180d) and evidence completeness
3. Define training/supplier pass-score thresholds (currently shown as "[confirm threshold]")
4. Host on Conform-Edge product page and payment platform
5. Write LinkedIn launch post

## Why Built
Fills a specific, high-auditor-attention gap: §10.2.1(e) effectiveness verification planning. Pairs directly with 8D Tool (CA execution) and SCAR Builder (supplier CA). First tool in portfolio specifically for the post-CA / pre-closure phase. Highest total score (50) in this scan.
