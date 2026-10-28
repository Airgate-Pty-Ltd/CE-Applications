# pma-application-assessment — rule provenance

Every rule in this folder cites a **controlled Burrana document or an FAA source**.
Nothing here is inferred. If a check cannot be traced to one of the sources below, it
does not get a rule.

## Sources

| Source | Rev / date | What it governs |
|---|---|---|
| **F-851-45** FAA-PMA Submission Checklist | Rev C | The cross-document verification set (item 3.A), item/page counts, checklist attachment |
| **SOP-851-12** Development of PMA Supplements for the FAA | Rev C | Supplement filling instructions, basis-statement wording, page guidance, review flow |
| **F-851-46** Unnumbered PMA Supplement Burrana Form | Rev A | Supplement structure (6 columns, header block, PMA No. PQ05320NM) |
| AC 21.303-4 | 3/21/14 | §8 letter content, §9 enclosures, App. A/B/C formats |
| FAA Order 8110.42D | 03/21/14 | PMA procedures (named in SOP-851-12 Governing Standards) |
| FAA Order 8130.2J | latest | Airworthiness certification (named in SOP-851-12 Governing Standards) |
| AC 21-43A | 10/1/15 | Production / quality system |

## History

The first build of this DIM contained **15 rules that were invented, not sourced**. They
were deleted in full. Two of them would have blocked every real Burrana submission:

- `PMA-LINK-003` treated "PMA part number == OEM part number" as a BLOCKING 14 CFR
  45.15(a)(1) violation. Under STC-assist identicality the Article Number and the Approved
  Replacement for Article Number are **identical by design** — true on all 102 rows of the
  ST12351SE package.
- `PMA-BASIS-CONFLICT-001` treated the normal co-presence of an STC number and a TC holder
  as a conflict.

Rules are re-authored only from the sources above, and the rule table is reviewed by the
domain authority before it is loaded.

## Severity mapping

`blocking` is reserved for checks the controlled documents treat as must-pass before
submission. SOP-derived formatting guidance ("try not to exceed 10 pages") is `warning`,
because SOP-851-12 explicitly permits exceeding it **provided the FAA office is notified of
the total page count** — it is not a hard stop.
