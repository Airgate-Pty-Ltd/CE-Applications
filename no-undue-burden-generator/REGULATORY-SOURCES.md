# Regulatory sources

Every advisory circular, CFR part and FAA order the shipped rules rely on, with
the revision consulted and the date consulted.

**These citations have not been verified against controlled copies.** That
verification is an owner action before release — see the bottom of this file.

---

## Primary source

### FAA AC 21-55

*Process to Support FAA Findings of Undue Burden or No Undue Burden for PAHs
Requesting to Use a Manufacturing Facility Located Outside of the United States*

| | |
|---|---|
| **Dated** | 08/01/2016 |
| **Effective** | October 1, 2016 |
| **Revision** | None — original issue. There is no AC 21-55A. |
| **Initiated by** | AIR-100 |
| **Signed** | Susan J. M. Cabler, Acting Manager, Design, Manufacturing & Airworthiness Division |
| **Consulted** | 2026-07-24 |
| **Source** | `https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_21-55.pdf` |
| **Method** | PDF downloaded and text extracted; Appendix A transcribed item by item into `src/documents/acConformance.ts` |

Currency was cross-checked against the FAA advisory circular index on
2026-07-24, which lists no later revision.

**Note on status.** AC 21-55 §1.2 states the AC "is not mandatory and does not
constitute a regulation" and describes "an acceptable means, but not the only
means". The product's position is narrower than the AC's: the Appendix A format
is treated as mandatory because a submission in another format is materially
more likely to be returned, and the AC itself says other means "may prolong the
decision-making process".

### Paragraphs the engine implements

| AC paragraph | Implemented in |
|---|---|
| §7 Initial Notification (Sections 1 and 2) | `engine/risk.ts` routing |
| §7.1.1–§7.1.7 Project Information | `schema/plan.ts` Section 1, `engine/gaps.ts` |
| §7.2.1 CPL listing and critical characteristics | `engine/risk.ts`, `engine/gaps.ts` |
| §7.2.2 High-risk identification in the design data | `engine/risk.ts` — triggers are an aid, not the rule |
| §7.2.3 Fully inspectable upon receipt | `engine/risk.ts`, `engine/gaps.ts` |
| §7.2.4 Facility capabilities and experience | `engine/gaps.ts` |
| §8 Full project plan routing | `engine/risk.ts` |
| §8.1.1–§8.1.7 PAH control | `schema/plan.ts` Section 3, `engine/gaps.ts` |
| §8.2.1–§8.2.7 Facility approval | `schema/plan.ts` Section 4, `engine/gaps.ts` |
| §8.3.1–§8.3.2 Delegations and inspections | `schema/plan.ts` Section 5 |
| §8.4 Use of designees, including the travel commitment | `engine/gaps.ts` blocking rule |
| §6 Not a generic replication of the quality system | 40-character thin-narrative warning |
| Appendix A | `documents/projectInitiationPlan.ts`, `documents/acConformance.ts` |

---

## Where the AC differed from the build specification

The specification directed that the AC wins on any difference, and that the
difference be flagged. Six were found.

| # | Specification said | AC 21-55 Appendix A actually says | Resolution |
|---|---|---|---|
| 1 | Section 1 collects part numbers, governing drawing numbers and revisions, and who retains design and configuration authority | Item 3 asks for "Names and model numbers of products or articles". No part numbers, no drawing numbers, no design-authority question | Schema matches the AC. Extra identifiers go in the project description (item 4), which does invite detail |
| 2 | Section 2 has three answers | Section 2 has **six** items and an FAA Validation column. Item 6 (facility capabilities and experience) was absent from the specification entirely | All six implemented; item 6 is a blocking gap because §7.2.4 makes it part of the initial notification |
| 3 | Section 4 merges training and qualifications | Section 4 has **eight** items; specialized training (4.3) and personnel qualifications (4.4) are separate | Modelled separately |
| 4 | Section 4 item 7 is "English-language document availability" | Asks **two** questions: whether documents would be available in English, **and** whether a listing of them is attached to the plan | Both tracked. The attachment is its own warning-level gap |
| 5 | Section 5 covers "designee use and designee travel" | Item 3 asks for justification **and function codes**; item 1 asks whether the delegation listing is attached | Function codes and both attachment questions implemented |
| 6 | High risk is `Yes` if any of six checkbox triggers fire | §7.2.2 asks whether the PAH identified the articles as high-risk **in the design data**. The AC supplies no checklist | Triggers are an elicitation aid producing a suggestion and a rationale. The PAH's answer is authoritative; a contradiction is surfaced as a warning |

**One citation was removed.** The specification cited 14 CFR 21.309 for FAA
change notification in Section 3. AC 21-55 §8.1.3 does not cite it there. The
citation does not appear in the generated document; it is not this product's
place to attach a regulatory reference the AC did not make.

---

## Supporting sources

Referenced by AC 21-55 §13 and relevant to the logic, but not independently
implemented:

| Source | Relevance |
|---|---|
| 14 CFR part 21, subpart G — Production Certificates | PC extensions in scope of the AC |
| 14 CFR part 21, subpart K — Parts Manufacturer Approvals | PMA holders are PAHs within scope |
| 14 CFR part 21, subpart O — Technical Standard Order Approvals | TSO holders are PAHs within scope |
| FAA Order 8100.11D — *Requirements for Finding Undue Burden and No Undue Burden Under 14 CFR Part 21* | The FAA-side procedure this plan feeds |
| FAA Order 8000.95 — Designee Management Policy, Vol 5 Ch 2 ¶2; Vol 8 Ch 2 ¶2.a.(5) | Separate no-undue-burden finding before appointing a designee outside the US |
| FAA Order 8100.8 — Designee Management Handbook, ¶410, ¶411 | As above |
| FAA Order 8100.15 — ODA Procedures, ¶3-3 | Separate finding before an ODA appoints a unit member outside the US |
| AC 21-43 — *Production Under 14 CFR Part 21, Subparts F, G, K, and O*, appendix F | AC 21-55 §6 says the plan is in addition to appendix F requirements |
| AC 21-24 — *Extending a Production Certificate to a Facility Located in a Bilateral Airworthiness Agreement Country* | Referred to by §1.3 for PC extensions |
| AC 21-2 — *Complying with the Requirements of Importing Countries…* | Referenced by §8.4 for designee importing requirements |
| AC 21-18 — Bilateral Airworthiness Agreements | Bilateral status question |

## Live FAA resources the product does not embed

Both are live documents. A cached copy would go stale silently, and staleness
here changes a determination — so the product asks the user and records their
answer plus the basis for it.

| Resource | Where |
|---|---|
| AIR Category Parts List (CPL) | `faa.gov/aircraft/air_cert/production_approvals/mfg_best_practice/media/category_parts_list.pdf` |
| Bilateral agreements list | `faa.gov/aircraft/air_cert/international/bilateral_agreements/` |

---

## Unverified, and flagged

- **Every citation in the shipped rules.** Transcribed from the downloaded PDF,
  not checked against a controlled copy.
- **Addressable PAH population.** Not published in aggregate. Must come from FAA
  DRS; no number is asserted anywhere in this repository.
- **Market scan.** "No competing software found" is a claim from the original
  specification, not independently verified here.
- **Price band for this product category.** Not set. No price is hardcoded
  anywhere; a test asserts it.

## Owner actions before release

1. Verify every citation above against controlled copies of AC 21-55, 14 CFR
   part 21 subpart K, and FAA Order 8100.11D.
2. Confirm AC 21-55 is still at original issue on the release date.
3. Legal review of the disclaimer in `LICENSE`, in the application footer, and
   at the foot of the gap report.
4. Pull the addressable PAH population from FAA DRS.
5. Set pricing.
