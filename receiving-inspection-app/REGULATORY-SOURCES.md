# Regulatory Sources

Every regulation, standard and form the product's logic references.

## Verification status — read this first

**Nothing in this file has been verified against a controlled copy.** Every
citation below was recorded from the build specification and from general
knowledge, and every one is marked `UNVERIFIED` until checked against the
current controlled revision.

Verification is the owner's action, not the build's. A citation asserted as
verified when it is not is worse than one openly marked unverified: it invites
reliance the evidence does not support, and an auditor who finds one wrong
citation reasonably doubts the rest.

**The product reflects this.** Retention floors ship with `verified: false` and
the app says so in its own output. Check-pack regulatory hooks carry the same
caveat.

---

## Correction already applied

The build specification cited **14 CFR 145.213** as driving a **10-year**
retention floor for repair station records. That does not appear to hold:

- **145.213** concerns *inspection of maintenance performed* — not recordkeeping.
- The repair station recordkeeping rule is **145.219**, whose retention minimum
  is understood to be **2 years**, not 10.

Enforcing 10 years as a *regulatory floor* would make the product refuse
configurations that are lawful, and tell a customer that a regulator requires
something it does not.

The implementation therefore separates two different numbers:

| Concept | Value | Nature |
|---|---|---|
| Regulatory floor | Per operating basis, from the CFR | Legal minimum. Enforced. |
| Product default | 10 years | Policy. Configurable upward. |

The 10-year figure is retained as the **product default**, which is a defensible
position and what it always was. **Owner action: confirm both the section and
the duration against controlled copies, then set `verified: true` on the floor.**

---

## Retention floors as implemented

Defined in `src/engine/retention.ts`. All `verified: false`.

| Operating basis | Floor | Citation | Status |
|---|---|---|---|
| `faa-part-145` | 2 years | 14 CFR 145.219 — repair station recordkeeping | UNVERIFIED |
| `faa-part-21` | 5 years | 14 CFR 21.137 — production approval quality system | UNVERIFIED |
| `as9100` | 0 (none numeric) | AS9100D 7.5.3 — period set by the organisation, its customers and applicable regulation | UNVERIFIED |
| `as9120` | 0 (none numeric) | AS9120B 7.5.3 — as above | UNVERIFIED |
| `customer-defined` | 0 | No regulatory basis selected | N/A |

Floors are **injectable**: a customer operating under an authority this product
does not ship, or one who has verified a floor, supplies their own table.

---

## Citations referenced by the product

### Federal Aviation Regulations (14 CFR)

| Citation | Subject | Where used | Status |
|---|---|---|---|
| 145.213 | Inspection of maintenance performed | Cited by the source spec for retention; **believed misapplied** | UNVERIFIED |
| 145.219 | Repair station recordkeeping | Retention floor, Part 145 basis | UNVERIFIED |
| 145.155 / .157 | Inspection and personnel requirements | Referenced by the source spec | UNVERIFIED |
| 145.201 / .209 / .211 | Privileges, quality system, inspection system | Referenced by the source spec | UNVERIFIED |
| 21.137 | Production approval holder quality system, incoming inspection, supplier control | Retention floor, Part 21 basis | UNVERIFIED |
| 21 subpart E | Supplemental Type Certificates | Check `DOC-STC` | UNVERIFIED |
| 21 subpart K | Parts Manufacturer Approval | Check `DOC-PMA-MARKING` | UNVERIFIED |
| 45.15 | Part marking, PMA marking | Check `DOC-PMA-MARKING` | UNVERIFIED |
| 39 | Airworthiness Directives | Check `DOC-AD` | UNVERIFIED |

### FAA forms

| Form | Subject | Where used | Status |
|---|---|---|---|
| 8130-3 | Authorized Release Certificate | Primary router branch; check `DOC-8130-3` | UNVERIFIED |
| 8100-1 | Conformity inspection record | Required form on a full-inspection path | UNVERIFIED |

The 8100-1 layout is **not yet implemented**. The router requires a
`CONFORMITY_RECORD` on a full inspection, and the document builder for it is
outstanding — see HANDOVER.md.

### Industry standards

| Standard | Subject | Where used | Status |
|---|---|---|---|
| AS9100D 8.4.2 / 8.4.3 | Control of externally provided processes, products, services | Checks `PHY-PACKAGING`, `PHY-COUNT` | UNVERIFIED |
| AS9100D 8.1.2 | Configuration management | Checks `DOC-REVISION`, `DOC-MOD-STATUS` | UNVERIFIED |
| AS9100D 8.5.1.2 | Validation and control of special processes | Check `PHY-DIMENSIONAL` | UNVERIFIED |
| AS9100D 8.5.1.3 | Foreign object damage prevention | Check `PHY-FOD` | UNVERIFIED |
| AS9100D 8.5.4 | Preservation | Checks `PHY-ESD`, `DOC-SHELF-LIFE` | UNVERIFIED |
| AS9100D 8.6 | Release of products and services | Checks `PHY-DAMAGE`, `PHY-COSMETIC`, `DOC-ATP` | UNVERIFIED |
| AS9100D 7.5.3 | Control of documented information | Retention floor rationale | UNVERIFIED |
| AS9120B | Distributor / stockist requirements | Checks `DOC-PN-SN-MATCH`, `DOC-COC` | UNVERIFIED |
| AS9102 | First Article Inspection | Check `DOC-FAI` | UNVERIFIED |
| AS5553 / AS6174 | Counterfeit part avoidance | Check `DOC-COUNTERFEIT` | UNVERIFIED |

**Revision numbers are not recorded** because none were confirmed. When
verifying, record the revision and the date consulted in the Status column —
"AS9100 Rev D" without a date is not a verified citation, it is a guess with a
letter on it.

---

## Verification log

Record each verification here. Nothing has been verified yet.

| Date | Citation | Revision consulted | Verified by | Outcome |
|---|---|---|---|---|
| — | — | — | — | — |

---

## Scope of the product's claims

The app produces records and surfaces risk. **It does not determine, advise, or
represent whether any organisation, arrangement, article, or disposition
satisfies any legal or regulatory obligation in any jurisdiction.**
Responsibility for every determination, and for the sufficiency of any record it
produces, rests with the user and their certificated personnel. See LICENSE.
