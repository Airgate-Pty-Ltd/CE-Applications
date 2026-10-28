# BUILD NOTES — CMMC 2.0 Level 1 Readiness Self-Assessment
**Build slug:** 2026-09-21-cmmc-level1-2-readiness-tool
**Built:** 2026-09-21 (auto-authoring, overnight opportunity scan)
**File:** cmmc-readiness-tool.html (38,558 bytes)

---

## Verification Results (Code Inspection — 2026-09-21)

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Question rows (data-key attrs) | 17 | 17 | ✅ PASS |
| Critical items (data-crit="true") | 3 | 3 | ✅ PASS |
| Qs array entries | 17 | 17 | ✅ PASS |
| Verdict text matches | 3 | 3 | ✅ PASS |
| critFail logic points | 7 | 7 | ✅ PASS |
| Regulatory references | ≥30 | 50 | ✅ PASS |
| SPRS/C3PAO disclosure note | Yes | Yes | ✅ PASS |
| Level 1/2 tab selector | Yes | Yes | ✅ PASS |
| M-AI signal present | Yes | Yes | ✅ PASS |
| JSON export function | Yes | Yes | ✅ PASS |

**Automated verification: 10/10 PASS**

**Browser verification: BLOCKED — Brian to complete (see NEEDS-FROM-BRIAN.md #4)**

---

## Architecture

- **Type:** Self-contained single-file HTML (VERA palette + CMMC blue #003087 accent)
- **Level covered:** Level 1 — all 17 practices across 6 domains (AC, IA, MP, PE, SC, SI)
- **Level 2:** Preview/awareness tab — information only; full assessment is a future build
- **Critical items:** 3 (AC.L1-3.1.1 access control, IA.L1-3.5.2 authentication, SI.L1-3.14.2 malware protection)
- **Verdicts:** 3 tiers (CMMC LEVEL 1 READY / NEAR READY—CLOSE GAPS / CMMC LEVEL 1 NOT READY)
- **Setup fields:** Level toggle (L1/L2 preview), organization, assessor, information type (FCI/CUI/both)
- **Domain scoring:** Per-domain Yes/total summary in verdict record
- **Export:** JSON with CMMC level, org, assessor, info type, per-practice answers, M-AI metadata
- **No network calls; no LLM; no external dependencies**

---

## Regulatory Coverage — 17 Practices Mapped

| Domain | Practice | NIST §3.x.x | FAR 52.204-21 | Coverage |
|--------|----------|-------------|----------------|----------|
| AC | AC.L1-3.1.1 | §3.1.1 | (b)(1)(i) | ✅ |
| AC | AC.L1-3.1.2 | §3.1.2 | (b)(1)(ii) | ✅ |
| IA | IA.L1-3.5.1 | §3.5.1 | (b)(1)(iii) | ✅ |
| IA | IA.L1-3.5.2 | §3.5.2 | (b)(1)(iv) | ✅ |
| MP | MP.L1-3.8.3 | §3.8.3 | (b)(1)(v) | ✅ |
| PE | PE.L1-3.10.1 | §3.10.1 | (b)(1)(vi) | ✅ |
| PE | PE.L1-3.10.3 | §3.10.3 | (b)(1)(vii) | ✅ |
| PE | PE.L1-3.10.4 | §3.10.4 | (b)(1)(viii) | ✅ |
| PE | PE.L1-3.10.5 | §3.10.5 | (b)(1)(ix) | ✅ |
| SC | SC.L1-3.13.1 | §3.13.1 | (b)(1)(x) | ✅ |
| SC | SC.L1-3.13.5 | §3.13.5 | (b)(1)(xi) | ✅ |
| SI | SI.L1-3.14.1 | §3.14.1 | (b)(1)(xii) | ✅ |
| SI | SI.L1-3.14.2 | §3.14.2 | (b)(1)(xiii) | ✅ |
| SI | SI.L1-3.14.4 | §3.14.4 | (b)(1)(xiv) | ✅ |
| SI | SI.L1-3.14.5 | §3.14.5 | (b)(1)(xv) | ✅ |
| SI | SI.L1-3.14.6 | §3.14.6 | (b)(1)(xvi) | ✅ |
| SI | SI.L1-3.14.7 | §3.14.7 | (b)(1)(xvii) | ✅ |

**All 17 Level 1 practices covered — ✅ COMPLETE**

---

## FSA Gate Review

- ✅ Deterministic scoring engine — no LLM layer
- ✅ CMMC blue accent (#003087) on header/domain headers; VERA palette throughout
- ✅ SPRS/C3PAO disclosure notes present and accurate
- ✅ Standards cited by §3.x.x and clause reference — no standard text reproduced verbatim
- ✅ M-AI ARCHITECTURE DEFINED signal present; Reserved Kernel Interface declared
- ✅ Single-file, self-contained, zero dependencies
- ✅ Level 2 "preview" tab correctly gates content as awareness-only; does not claim to be a Level 2 assessment

**FSA Gate: PASS**

---

## TO GO LIVE (Blockers for Brian)
See NEEDS-FROM-BRIAN.md for the 5 blockers. Key items:
1. Pricing confirmation ($149/$399 proposed)
2. Defense Compliance Suite bundle strategy (with ITAR/EAR tool)
3. Verdict threshold calibration (82% for NEAR READY — Brian to confirm)
4. Behavioral browser test (required before any commercial listing)
5. Level 2 preview panel regulatory currency check
