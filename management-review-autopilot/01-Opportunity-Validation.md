# Opportunity Validation — Breakthrough Screen & Scan Results

## STEP 2 — Opportunities scanned (2026-07-08)

### 1. Management Review Autopilot (MRA) — SELECTED

**What it is**
A web product that compiles a complete, clause-compliant management review package from
raw QMS data. The user works through a guided input board covering every required input
of ISO 9001:2015 §9.3.2 (plus AS9100D, AS9110C, ISO 13485 §5.6 deltas), enters data or
marks justified N/A, and the engine deterministically generates: input coverage report
with completeness score, meeting agenda, pre-populated minutes, executive summary, and
an output-action register covering all §9.3.3 required outputs.

**Automated mechanism**
Self-serve subscription. Customer signs up, selects standard(s), runs reviews all year.
No per-customer configuration; standard packs are data files. Human touch after setup:
support email only.

**Target buyer / persona**
Quality Manager / Management Representative at any certified organization (ISO 9001,
AS9100D, AS9110C, ISO 13485). Pain: assembling MR takes days, inputs get missed, CB
auditors write findings on incomplete inputs and untracked output actions.

**Pricing + math to $250k/yr**
$79/mo Professional (single standard) × 220 customers = $208,560/yr.
$199/mo Multi-Standard/Consultant × 25 = $59,700/yr. Total ≈ $268k/yr.
Market: >1M ISO 9001 certificates worldwide [ASSUMPTION: based on ISO Survey historical
scale]; capture required ≈ 0.02%.

**Startup cost (<$1,000, itemized)**
- Railway hosting: ~$5–20/mo → $240/yr max
- Domain (or subpath of annexquality/conform-edge site): $0–15
- Stripe payment link: $0 upfront (transaction fees only)
- Everything else built from existing skills/vault assets: $0
Total: <$300. Requires Brian: Stripe + Railway account actions.

**Time to first dollar**
2–4 weeks (deploy + payment link + one LinkedIn post to existing QMS network).

**Automation level**
High. Deterministic engine, no content refresh needed except when standards revise
(ISO 9001:2026 pack = planned premium update — itself a revenue event).

**First concrete step this week**
Push artifact/app to GitHub, deploy on Railway, run the smoke test, attach a Stripe
payment link to the landing copy.

---

### 2. Regulatory Change Impact Analyzer
Change bulletin → affected clauses → affected documents impact matrix + action plan.
Strong fit but overlaps the built MRO Regulatory Intelligence Digest (2026-06-19) on the
content-feed side, and the feed requires ongoing human curation (lower automation).
**Score below MRA; not selected.**

### 3. Competence & Training Evidence Engine
Generates competence matrices, training effectiveness evaluations, and §7.2 evidence
records from role/course data. Good moat via AQ training assets; buyer (Training Manager)
has less budget urgency than the QM facing an audit date. **Not selected.**

### 4. Procedure-to-Work-Instruction Converter
Transforms procedures into task-level WIs using the qms-document-kit-generator patterns.
One-time value per document — weak repeat-subscription pull; partially covered by the
existing consultant tooling. **Not selected.**

### 5. Clause-to-Evidence Matrix Generator
Standard clause → expected evidence/records matrix. Useful, but it is a feature (already
implicit in the self-assessment tools built 06-22 → 07-06), not a standalone product.
**Not selected — folded into MRA premium roadmap.**

---

## Breakthrough Screen (selected idea must pass ≥7/10)

| # | Criterion | MRA | Note |
|---|-----------|-----|------|
| 1 | Recurring pain for quality/compliance leaders | ✅ | 1–4×/yr, every certificate holder |
| 2 | Uses Brian's assets competitors can't replicate | ✅ | management-review-intelligence skill, CB-auditor evidence calibration |
| 3 | Subscription from Annex Quality / Conform-Edge site | ✅ | self-serve SaaS |
| 4 | Paid repeatedly, not once | ✅ | every review cycle |
| 5 | ≥50% labor reduction | ✅ | 2–5 days → <30 min assembly |
| 6 | Clear buyer | ✅ | Quality Manager / Mgmt Rep |
| 7 | Multi-customer without rebuild | ✅ | standard packs are data, not code |
| 8 | Defensible compliance angle | ✅ | ISO 9001 §9.3, AS9100D/AS9110C, ISO 13485 §5.6 |
| 9 | Executive-ready artifact | ✅ | exec summary + minutes + action register |
| 10 | Demonstrable immediately | ✅ | working HTML app in this folder |

**Result: 10/10 — passes.**

## STEP 3a — Scoring (1–5 each, selection rule)

| Opportunity | Revenue | Automation | Speed | Uses assets | Repeat value | Urgency | Defensible | Demo today | Total |
|---|---|---|---|---|---|---|---|---|---|
| **MRA** | 4 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | **38** |
| Reg Change Analyzer | 4 | 3 | 3 | 4 | 5 | 4 | 5 | 3 | 31 |
| Competence Engine | 3 | 4 | 3 | 4 | 4 | 3 | 4 | 3 | 28 |
| Proc→WI Converter | 2 | 4 | 4 | 4 | 2 | 2 | 3 | 4 | 25 |
| Clause-Evidence Matrix | 2 | 5 | 4 | 4 | 3 | 2 | 4 | 4 | 28 |

**FSA modifier (software ideas):** MRA: eliminates MR-assembly work (+2), deterministic
rules-based intelligence, M-AI aligned (+2), human decision-only on outputs (+2), forms
remain a primary input in MVP (−3) → net +3. Reg Change Analyzer net +1 (curation keeps
human in execution loop). MRA remains top after modifiers.

## Sources
- Ledger `_picks-ledger.md` (41 entries, dedupe verified — no management review product)
- `_STATE.md` 2026-07-07/2026-07-08 entries (portfolio status, launch-enablement note)
- Conform-Edge skills: management-review-intelligence, iso9001/as9100d/as9110c/iso13485
  auditors, mai-kernel-integration, future-systems-architect
- [ASSUMPTION] Certificate population and CB finding frequency from training-data
  knowledge; not re-verified online this run (unattended, resource ceiling).
