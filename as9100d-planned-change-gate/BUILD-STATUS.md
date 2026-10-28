# Build Status — AS9100D Planned Change Gate Tool

**Built:** 2026-09-05 | **Status:** VERIFIED — PUBLISH READY

| Check | Result |
|-------|--------|
| File size | 32,750 bytes |
| Change types | 6 (design, process, supplier, software, facility, org) |
| Risk levels | 3 (LOW / MEDIUM / HIGH) |
| Impact checkboxes | 13 (5 product + 4 customer/regulatory + 4 QMS) |
| Gate: ESCALATE-safety | PRESENT — any safety/airworthiness flag → ESCALATE |
| Gate: ESCALATE-regulatory | PRESENT — reg required + not obtained → ESCALATE |
| Gate: HOLD | PRESENT — customer notif required or reviews incomplete |
| Gate: PROCEED | PRESENT — all conditions met |
| Evidence checklist | PRESENT — dynamic (change-type-aware, 8 base + up to 5 conditional items) |
| AS9100D clause refs | 20 (Cl. 8.1.2, 8.1.1, 8.1.3, 8.4, 8.5.1, 7.2, 7.5, 5.3) |
| Customer/regulatory notification determination | PRESENT |
| MR narrative / change record | PRESENT |
| JSON export | PRESENT |
| M-AI interface | PRESENT (domain: as9100d-planned-change, ARCHITECTURE DEFINED) |
| External dependencies | NONE |

## Needs from Brian

1. Pricing: $99 or $149 one-time? Include in "Change & CAPA Bundle"?
2. Should the ESCALATE path name a specific role (e.g., "Quality Director" vs "Engineering Authority")?
3. Validate the 13 impact checkboxes cover the most common AS9100D Cl. 8.1.2 audit finding triggers
4. Consider adding an IATF 16949 mode (PPAP trigger instead of FAI)?
5. Confirm "HOLD" vs "ESCALATE" threshold aligns with Brian's field experience
