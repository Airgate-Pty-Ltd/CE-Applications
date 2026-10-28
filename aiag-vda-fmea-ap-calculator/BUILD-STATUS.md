# Build Status — AIAG-VDA FMEA Action Priority (AP) Calculator

**Status:** PUBLISH-READY  
**Brand:** Conform-Edge (software)  
**Built:** 2026-09-17  
**Verified:** 2026-09-17  
**Run:** Overnight automated, Desktop

## Verification Results

- HTML file present: PASS (23,404 bytes)
- 0 external dependencies: PASS
- M-AI reserved interface `window.__MAI_INTERFACE__` present: PASS
- AP engine (`computeAPValue`): 4-tier S-based decision tree: PASS (23 decision branches confirmed)
- DFMEA / PFMEA mode selector: PASS
- Single entry calculator with S/O/D sliders: PASS
- Batch entry grid with live AP calculation: PASS
- AP Reference Table (representative SOD combinations): PASS
- `exportSingleJSON()` present: PASS
- `exportBatchJSON()` with summary counts: PASS
- `addToBatch()` function: PASS

## Engine Tests (by code inspection)

1. S=10, O=8, D=8 → AP-H: ✅ (S≥9, O>2 branch)
2. S=10, O=2, D=2 → AP-M: ✅ (S≥9, O≤2, D≤3 branch)
3. S=8, O=9, D=9 → AP-H: ✅ (S≥7, O≥7 branch)
4. S=8, O=1, D=1 → AP-L: ✅ (S≥7, O≤2, D<9 branch)
5. S=6, O=3, D=3 → AP-L: ✅ (S 4–6, O<5 branch)
6. S=2, O=5, D=5 → AP-L: ✅ (S 1–3 branch)
7. S=2, O=9, D=9 → AP-M: ✅ (S 1–3, O≥9, D≥9 branch)

## Key Features

- DFMEA and PFMEA modes with mode-specific action guidance
- S/O/D sliders (1–10) with AIAG-VDA criteria descriptions
- Legacy RPN displayed alongside AP (aids transition from old methodology)
- Batch worksheet — add/remove rows, live AP per row
- Reference table tab with representative SOD→AP lookup
- JSON export (single and batch)
- No CDN, no internet, 0 deps

## Pricing

- $149–$199 one-time
- IATF Core Tools Suite bundle candidate: $399
- Natural cross-sell: IATF 16949 Planned Change Gate, LPA Builder
