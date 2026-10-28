# Regulatory sources

This file records the authority this product is built against, and — just as importantly — the
limits of what the product does with it.

**The product never draws a regulatory conclusion.** It quotes authority, it captures evidence, and
it reports what it captured. Whether any of that answers an obligation is a judgement for the
operator, their counsel, and the authority. A CI gate enforces this in the source text itself; see
`DESIGN-NOTES.md`, "Two gates".

**Every citation below is flagged for owner verification against controlled copies at current
revision before launch.** This is listed in the build prompt as the owner's action, not the
builder's. Nothing here has been verified against a controlled copy by the build.

---

## Primary foundation

| Source | Title / scope | Status |
|---|---|---|
| **PS-AIR-21-1901** (March 2020) | *Use of Remote Technology During the Performance of Inspections and Tests*. Covers prototype conformity inspection, engineering and ground tests, engineering compliance inspection, production conformity inspection, and inspection for issuance of FAA Form 8130-3. Expressly contemplates PMA holders issuing 8130-3 using remote technology. | **Revision and current status UNVERIFIED — owner to confirm** |
| **VCT Memorandum**, Executive Director, Flight Standards Service (22 April 2020) | Current FAA orders and regulations do not prohibit industry use of remote technology. | **Current status UNVERIFIED — owner to confirm** |
| **FAA Order 8900.1, Vol. 1, Ch. 3, Sec. 9** | Collaborative Use of Remote Technology. Risk-based decision-making framework, including compliance history as an evaluation criterion. | **Revision UNVERIFIED — owner to confirm** |
| **FAA Order 8900.1, Vol. 6, Ch. 9, Sec. 23** | Contract Maintenance. Relevant to the approval-only boundary and the intent behind the contract-maintenance restriction. | **Revision UNVERIFIED — owner to confirm** |
| **AC 145-9A, §5.7** | Repair Station Guide — contract maintenance. | **Revision UNVERIFIED — owner to confirm** |

## Regulations

| Citation | Why it is load-bearing here |
|---|---|
| **14 CFR 145.217** | Contract maintenance, including the restriction on providing *only* approval for return to service of a complete type-certificated product. Drives the hard block and the separate-certificate-holder warning in `src/engine/eligibility.ts`. |
| **14 CFR 145.3(b)** | Definition of *article*: aircraft, airframe, aircraft engine, propeller, appliance, or component part. The distinction between an article and a complete type-certificated product is the pivot of the eligibility gate. |
| **14 CFR 21.1** | Defines *product* as an aircraft, aircraft engine, or propeller. See the classification note below. |
| **14 CFR 145.155 / .157 / .201 / .209 / .211 / .213** | Inspection, personnel, privileges and record requirements. Drive the roster model, the inspector-only determination capability, and the retention floor. |
| **14 CFR 43.9** | Maintenance record content, form and disposition. |
| **14 CFR 21.137** | Quality system requirements. |
| **14 CFR 45.15** | Part marking — verified during the session as a check in the standard content pack. |

## Forms

| Form | Use in this product |
|---|---|
| **FAA Form 8100-1** | Conformity inspection record. `src/documents/` renders this layout, or a customer-configured equivalent, populated from the session. |
| **FAA Form 8130-3** | Authorized release certificate. Referenced as the downstream artefact; this product does not issue it. |

---

## Citation warning — a prohibition, deliberately recorded

The source material referenced **N 8900.689**. <!-- SCRUB-ALLOW: cancelled-notice-citation -->

**This product must not cite it.** It was issued by AFS-800, addresses administrative airman
certification functions, and carried a cancellation date of 20 March 2025. It is neither current nor
on point for article inspection.

The number is on the identifier gate's block list. The line above is the single place in this
repository where it may appear, marked with an explicit opt-out so the exception is visible in
review, and pinned by a test in `tests/scrub.test.ts` so a second occurrence anywhere fails CI.

---

## Two interpretation decisions the build made, for the owner to confirm

Both are conservative — they block or warn on more than the narrowest reading. Both are recorded
here rather than buried in code because they are regulatory judgements, not engineering ones.

### 1. Propellers are treated as complete products

The build prompt describes the hard block as "complete aircraft or complete engine". 14 CFR 21.1
defines a *product* as an aircraft, aircraft engine, **or propeller**. Since the block exists to
mirror the contract-maintenance restriction on a complete **type-certificated product**, the engine
classifies a complete propeller the same way and blocks it.

*Effect if wrong:* the app blocks scheduling for an article class it need not block. Failure is
toward refusal, never toward permission. Change one entry in `COMPLETE_PRODUCT_CLASSES` in
`src/engine/eligibility.ts` to reverse it.

### 2. The block's rationale text asserts nothing about legality

14 CFR 145.217 restricts a certificated repair station from providing *only* approval for return to
service of a complete type-certificated product it did not maintain. It is not, on its face, a
prohibition on using remote technology to look at a complete product.

So the block does not say "remote inspection is prohibited for complete products" — that would be
the product rendering a regulatory conclusion, which section 1.2 forbids. It says the operator has
classified the article as a complete type-certificated product, that this class sits inside the
contract-maintenance restriction, and that the configured policy for this class is to stop. The
determination stays with the operator; the app records that the stop happened.

### 3. The retention floor citation needs checking

The build prompt attributes the ten-year retention floor to 14 CFR 145.213. **The build could not
verify that attribution and flags it as the most likely citation error in the specification** —
Part 145's recordkeeping obligation is generally understood to sit in §145.219 and to run to a
shorter period, with longer retention typically arising from customer contract, quality-system
policy, or another authority's requirement rather than from Part 145 itself.

The engine is unaffected either way: `src/engine/retention.ts` implements a **configurable floor,
adjustable upward only, defaulting to ten years**, and the citation is a display string. If the
correct basis turns out to be contractual or policy-derived rather than regulatory, change
`RETENTION_FLOOR_BASIS` — no logic moves.

**Owner action:** confirm the basis for the ten-year floor before any customer sees the text.
