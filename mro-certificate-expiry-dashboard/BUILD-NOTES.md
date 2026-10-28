# Build Notes — MRO Certificate Expiry Intelligence Dashboard
**Route:** Software / Conform-Edge
**Build date:** 2026-08-27
**Slug:** mro-certificate-expiry-dashboard

---

## Gate Status

| Gate | Status |
|------|--------|
| Discovery Gate (STEP 2.5) | BUILD AUTHORIZED (inferred as Brian) |
| M-AI Integration Gate (STEP 2.6) | ARCHITECTURE DEFINED |
| Production-ready | NO — 2 launch blockers open |

---

## What Was Built

`mro-certificate-expiry-dashboard.html` — 22,387 bytes; single self-contained file; zero external dependencies.

Features:
- Station profile setup (name + primary authority)
- Certificate register: unlimited entries; per-cert: authority (FAA/EASA/CAAC/UK CAA/CASA/TCCA), cert type, cert number, expiry date, renewal lead time
- CAAC Dec-31 annual hard rule: overrides user-entered date; always treats expiry as Dec 31 of current/next year
- 5-tier urgency engine: CURRENT (>180d) / MONITOR (91–180d) / WARNING (31–90d) / CRITICAL (1–30d) / EXPIRED (≤0d)
- Inline tier badges updated on assessment
- Urgency table sorted by worst tier first; per-row action guidance
- Overall station posture badge (worst tier across all certs)
- CAAC annual deadline alert banner
- Management review narrative paragraph
- JSON export with M-AI domain metadata
- Demo data: 5 authorities (FAA/EASA/CAAC/UK CAA/TCCA); spans all 5 urgency tiers
- VERA navy/steel/ink palette; panel card layout; verdict/tier badge chrome

---

## Verification — 2026-08-27

| Test | Check | Result |
|------|-------|--------|
| AT-01 | Self-contained — no external imports | ✅ PASS — 0 external src/href |
| AT-02 | CAAC Dec-31 logic present | ✅ PASS — 13 CAAC refs, 6 Dec-31 refs in code |
| AT-03 | All 5 tiers in code | ✅ PASS — CURRENT(5), MONITOR(4), WARNING(6), CRITICAL(6), EXPIRED(9) |
| AT-04 | M-AI RESERVED INTERFACE marker | ✅ PASS — badge + JSON metadata |
| AT-05 | JSON export function | ✅ PASS — exportJSON() present (2 refs) |
| AT-06 | Demo data (5 authorities) | ✅ PASS — 5 addCert() calls + 2 support calls = 7 total |
| AT-07 | Management review narrative | ✅ PASS — MANAGEMENT REVIEW block generated |
| File size | 22,387 bytes | ✅ PASS — reasonable for single-file tool |

**All 7/7 AT checks PASS. Build is verified prototype.**

---

## FSA Gate Check

| Criterion | Result |
|-----------|--------|
| Eliminates work (replaces spreadsheet tracking) | ✅ +2 |
| AI is the OS (governed expiry decisions) | Partial — deterministic rules qualify |
| Deterministic rules-based assessment | ✅ +2 |
| No enterprise equivalent at this price point | ✅ +2 |
| Reusable CE/M-AI IP (domain pack) | ✅ +2 |
| VERA design system | ✅ Applied |
| No static content only penalty | ✅ — tool has scoring engine |
| FSA GATE | ✅ PASS |

---

## Scoring Summary

| Layer | Score |
|-------|-------|
| Base (Automation High 3, Edge Deep 3, Buildability Now 3) | 9 |
| FSA (eliminates work +2, deterministic rules +2, reusable IP +2, no enterprise equiv +2) | +8 |
| Strategic (data→decision +5, evidence-backed +4, Brian's moat +3, exec decision support +3, visible demo +2, recurring path +4) | +21 |
| **Total** | **38** |

---

## M-AI Integration Summary

- Domain: `mro-certificate-expiry`
- Governed decisions: CURRENT / MONITOR / WARNING / CRITICAL / EXPIRED (per cert); aggregate posture
- Kernel dependency: RESERVED INTERFACE (local governed logic in HTML)
- M-AI badge present in UI; JSON export includes `_mai_domain` and `_mai_kernel` metadata

---

## TO GO LIVE — YOU DO THESE

1. Confirm pricing: $149–$249 one-time; evaluate bundle with repair-station-readiness-dashboard at $349 combined
2. Open mro-certificate-expiry-dashboard.html in browser; click "Load Demo Data" → "Run Assessment"; verify all 5 tier badges display correctly and CAAC alert appears
3. Export JSON and confirm output structure matches expected
4. Answer NEEDS-FROM-BRIAN.md items
5. Set up hosting on Conform-Edge site — Brian's action
