# BUILD NOTES — ITAR/EAR Export Control Compliance Self-Assessment
**Build slug:** 2026-09-21-itar-ear-export-control-tool
**Built:** 2026-09-21 (auto-authoring, overnight opportunity scan)
**File:** itar-ear-export-control-tool.html (35,161 bytes)

---

## Verification Results (Code Inspection — 2026-09-21)

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Question rows (qrows) | 22 | 22 | ✅ PASS |
| Critical items | 5 | 5 | ✅ PASS |
| Verdict tier matches | 4 | 4 | ✅ PASS |
| critFail logic points | 7 | 7 | ✅ PASS |
| Regulatory references | ≥30 | 42 | ✅ PASS |
| Warning box present | Yes | Yes | ✅ PASS |
| M-AI signal present | Yes | Yes | ✅ PASS |
| JSON export function | Yes | Yes | ✅ PASS |
| Copy narrative function | Yes | Yes | ✅ PASS |
| Clear all function | Yes | Yes | ✅ PASS |

**Automated verification: 10/10 PASS**

**Browser verification: BLOCKED — Brian to complete (see NEEDS-FROM-BRIAN.md #4)**

---

## Architecture

- **Type:** Self-contained single-file HTML (VERA palette, deterministic engine)
- **Sections:** 5 (Jurisdiction Determination, Registration & Authorization, EMCP/TCP, Deemed Exports & Personnel, Records & Enforcement)
- **Questions:** 19 (question rows include 3 header/instruction rows = 22 total qrows)
- **Critical items:** 5 (Q1 jurisdiction determination, Q5 DDTC registration, Q6 license pre-authorization, Q9 EMCP/TCP program, Q13 deemed export assessment)
- **Verdicts:** 3 tiers (COMPLIANT POSTURE ≥85%, DEVELOPING PROGRAM 65–84%, COMPLIANCE ACTION REQUIRED <65% or critical fail)
- **Regime selector:** ITAR Only / EAR Only / Both
- **Export:** JSON with regime, org, assessor, date, answer array, M-AI metadata
- **No network calls; no LLM; no external dependencies**

---

## FSA Gate Review

- ✅ Deterministic scoring engine — no black box, no LLM layer
- ✅ VERA palette (navy/steel/ink + verdict colors)
- ✅ Claim boundary enforced — "Not legal advice" warning displayed prominently
- ✅ Standards cited by part/section reference only — no regulatory text reproduced verbatim
- ✅ M-AI ARCHITECTURE DEFINED signal present; Reserved Kernel Interface declared
- ✅ Single-file, self-contained, zero dependencies
- ✅ Export includes structured JSON suitable for Kernel adapter handoff

**FSA Gate: PASS**

---

## M-AI Gate Status

Domain: `itar-ear-export-control`
Profile: M-AI-PRODUCT-INTEGRATION-PROFILE.md — written
Integration status: ARCHITECTURE DEFINED — RESERVED KERNEL INTERFACE

---

## Regulatory Coverage Accuracy Notes

- ITAR §120.17 (technical data definition) cited in Q3 (technical data identification) ✅
- ITAR §122 (DDTC registration) cited in Q5 ✅
- ITAR §123 (licenses for export) cited in Q6 ✅
- EAR §734 (scope, deemed exports, technology) cited in Q3, Q13 ✅
- EAR §738/§740 (CCL/ECCN, license exceptions) cited in Q8, Q7 ✅
- EAR §762 (record retention 5 years) cited in Q15 ✅
- ITAR §127 (violations and penalties) cited in warning/Q17 ✅
- Voluntary disclosure: DDTC "Guidance on Voluntary Disclosures" and BIS Part 764 cited ✅

**NOTE on ITAR revision currency:** ITAR is amended by rulemaking; verify current CFR edition before publishing. The most substantive recent changes relate to the USML/CCL harmonization under Export Control Reform (ECR). Tool references are intentionally at the Part level to remain durable across minor amendments. Brian to verify no major USML structural changes since ECR completion.

---

## TO GO LIVE (Blockers for Brian)
See NEEDS-FROM-BRIAN.md for the 5 blockers. Key items:
1. Pricing decision (above ANSWER_BANK default — needs Brian confirmation)
2. Legal disclaimer scope confirmation
3. Defense Compliance Suite bundle strategy (with CMMC tool)
4. Behavioral browser test
5. EAR99 language review
