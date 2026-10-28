# Pocket Auditor — Claude Handoff

This is the canonical Claude handoff filename.

The earlier `CODEX-HANDOFF-2026-10-08.md` contains the same initial handoff context. Continue using the current directives in this folder, in this order:

1. `CLAUDE-OPEN-THIS-FOLDER-FIRST.md`
2. `08-SHAREPOINT-SCOPE.md`
3. `CLAUDE-DIRECTIVE-FUTURE-STATE-2026-10-08.md`
4. `CLAUDE-CORRECTION-INTENT-CAR-SHAREPOINT-2026-10-08.md`
5. `SOURCE-LICENSING-DECISION-2026-10-08.md`
6. `CLAUDE-3-MINUTE-REVIEW-DIRECTIVE.md`

## Current owner/source decisions

- Burrana Inc. is the organization using the licensed AS9100D and AS9110C copies.
- Those sources are `ORG_PRIVATE_LICENSED` and may be used verbatim inside Burrana Inc.'s private Pocket Auditor environment.
- The source text must not be placed in shared customer packages or another organization's tenant.
- Public regulator availability does not by itself prove unrestricted redistribution rights. Each regulator source must retain its publication URL, retrieval date, hash, terms/basis, and permitted-use classification. If the source is approved for shared use, record the basis; otherwise keep it organization/customer-private or metadata-only.
- MX AFAC RAC 145 remains unavailable until an authorized source/checklist is supplied.

## Required continuation

Do not stop at the 52 passing tests. Continue implementing and testing the remaining product workflow:

- quality-manual-first applicability gate;
- full intent-based item behavior using the required skills and reference files;
- cross-framework crosswalk handling;
- 5-Why/8D root-cause support;
- CAR review UI and adapters;
- field evidence, photo, interview, and sampling workflows;
- SharePoint-native adapters and report snapshots;
- exact clause/subclause/lettered hierarchy reconciliation.

Report actual files, tests, and blockers. Do not return another roadmap-only response.
