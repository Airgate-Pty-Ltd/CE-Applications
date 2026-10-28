# Discovery Record — MRO Certificate Expiry Intelligence Dashboard
**Version:** 1.0 — 2026-08-27
**Gate:** STEP 2.5 Product Discovery & Build Gate
**Status:** BUILD AUTHORIZED (inferred as Brian)
**Production-authorized:** NO — launch blockers in NEEDS-FROM-BRIAN.md

---

## 1. Build Classification

| Field | Value |
|-------|-------|
| Class | Software — HTML tool for repeated operational use |
| Distribution | Static self-contained HTML; single file; offline capable |
| Criticality | Compliance tracking tool — missed cert expiry = loss of operating authority |
| Route | Software / Conform-Edge |
| Scope | FAA Part 145, EASA Part-145, CAAC CCAR-145, UK CAA, CASA, TCCA |

---

## 2. Gate Decision

| Gate | Decision | Notes |
|------|----------|-------|
| GATE 0 — Existence | PASS | Cert expiry tracking is a real pain point: repair stations juggle 4–10 approvals across authorities; missed expiry = grounded ops |
| GATE 1 — Buyer | PASS | Quality Director / Ops Manager at multi-authority Part 145 repair station |
| GATE 2 — Claim | PASS | "Certificate expiry tracker / expiry intelligence" — not "authority-approved" |
| GATE 3 — Authority | PASS | 14 CFR §145.51/145.53, EASA Part-145.B.15, CCAR-145 — renewal triggers; clause intent only |
| GATE 4 — Decision logic | PASS | Deterministic date-diff engine → urgency tier per cert; CAAC Dec-31 annual cycle hard-coded |
| GATE 5 — MVP | PASS | Static HTML; certificate register; urgency tiers; MR narrative; JSON export |
| **Overall** | **BUILD AUTHORIZED (inferred)** | |

**Production-authorized:** NO — 2 launch blockers remain.

---

## 3. Discovery Answers

### Section A — Problem & Buyer

| Question | Answer | Source | Confidence | Status |
|----------|--------|--------|------------|--------|
| Problem | Repair stations holding 4–10 approvals (FAA, EASA, CAAC, UK CAA, CASA, TCCA) track cert renewals in spreadsheets or not at all. Missed expiry = immediate loss of operating authority + customer notification obligations. | about-me, ledger 2026-06-24 entry | High | ANSWERED |
| Primary user | Quality Director / Ops Manager at multi-authority Part 145 repair station | ANSWER_BANK | High | ANSWERED |
| Economic buyer | Quality Director / VP Quality | ANSWER_BANK | High | ANSWERED |
| Urgency | High — a single missed CAAC renewal (Dec 31 hard deadline) or overlooked EASA renewal can ground all work under that approval. Management review requirement (cl.9.3 inputs) creates recurring demand. | about-me (CAAC CCAR-145 experience) | High | ANSWERED |
| Competitive gap | No self-contained, multi-authority, offline HTML cert-expiry tracker exists in the Conform-Edge portfolio or in any low-cost quality-tool market scan | ANSWER_BANK, ledger | Medium | INFERRED — BRIAN CONFIRMATION REQUIRED |

### Section B — Claim Boundary

- **Permitted:** certificate expiry tracking / renewal timeline intelligence / urgency alert / management review input
- **Prohibited:** "certificate valid / authority-approved / compliant with [authority]" — tool tracks dates; authority grants approvals
- **Standards by clause intent only** ✅

### Section C — Authority & Compliance Basis

| Authority | Renewal Clause Intent |
|-----------|-----------------------|
| FAA Part 145 | §145.51/145.53 — certificate renewal; operations specifications amendments |
| EASA Part-145 | Part-145.B.15 — approval renewal; competent authority annual review |
| CAAC CCAR-145 | Annual renewal hard deadline Dec 31; CAAC inspection required |
| UK CAA | CAP 562 — annual renewal post-Brexit; separate from EASA |
| CASA | CASR Part 145 — 12-month base certificate; amendment for scope changes |
| TCCA | CARs Part 573 — annual renewal; AMO certificate maintenance |

### Section D — Decision Logic

**Urgency tiers (per certificate, per authority):**

| Tier | Days to Expiry | Action |
|------|---------------|--------|
| CURRENT | > 180 days | Monitor |
| MONITOR | 91–180 days | Begin renewal prep |
| WARNING | 31–90 days | Initiate renewal application |
| CRITICAL | 1–30 days | Escalate — application must be submitted |
| EXPIRED | 0 or past | STOP — operating under expired authority; immediate corrective action |

**CAAC Dec-31 hard rule:** if authority = CAAC, expiry always treated as Dec 31 of current or next year regardless of user-entered date; tool enforces annual cycle.

**Aggregate posture:** worst-tier across all certificates → overall station readiness color (GREEN/AMBER/RED/BLACK).

### Section E — MVP Boundary

In scope: certificate register (authority, cert type, cert number, issue date, expiry date, renewal lead time); urgency tier per cert; CAAC Dec-31 logic; overall posture verdict; expiry timeline table sorted by urgency; management review narrative paragraph; JSON export.

Out of scope (premium): automated calendar reminders; email alerts; authority website integration; multi-station enterprise view.

### Section F — Commercial Model

| Field | Answer | Status |
|-------|--------|--------|
| Pricing | $149–$249 one-time single tool; bundle with repair-station-readiness-dashboard at ~$349 | INFERRED — BRIAN CONFIRMATION REQUIRED |
| Revenue path | 1,000+ Part 145 stations globally (FAA: ~4,500; EASA: ~2,800; CAAC: ~400+); $149 × 1,000 = $149k conservative; bundle uplift → $250k+ path | INFERRED |
| Delivery | Static HTML; hosting Brian's action | ANSWER_BANK |

### Consistency Check vs. Answer Bank

| Check | Result |
|-------|--------|
| Audience | ✅ Consistent |
| Claim framing | ✅ Consistent |
| Architecture (deterministic, no LLM, offline) | ✅ Consistent |
| Brand (Conform-Edge) | ✅ Consistent |
| Pricing range | ✅ Within portfolio default |

---

## 4. Open Launch Blockers

1. Pricing confirmation: $149–$249 one-time vs. subscription; bundle strategy with repair-station-readiness-dashboard
2. Behavioral verification: all AT tests run and confirmed PASS (see BUILD-NOTES.md)

*See NEEDS-FROM-BRIAN.md.*
