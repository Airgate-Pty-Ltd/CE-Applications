# Requirement Intelligence Library — Governance

**Status:** DRAFT v0.1 (2026-10-11) · Schema `1.0.0-rc.1` is a **freeze candidate**; it is frozen only when the owner approves it in the Migration Decision Log.
**Purpose:** a standalone Conform-Edge product asset. Audit Toolkit and Pocket Auditor are consumers; future uses (gap analysis, certification readiness, auditor training, supplier assessment, cross-standard mapping) are enabled by the same records.

## Contents of this folder
| Path | What |
|---|---|
| `src/library.js` | Reference implementation of the contract: citation grammar and validation, record/pack validation, completeness, content hashing, manifests, verification, diffs |
| `schema/obligation.schema.json` | Human-readable description of the canonical record (the executable contract is `library.js`) |
| `packs/as9100d-demo.library.json` | The only pack: 5 deep obligations, hierarchy sample, **INCOMPLETE and UNVERIFIED** |
| `tools/build-contentpack.js` | Validates and builds `dist/<pack>@<version>.contentpack.{json,js}`; `--release` refuses incomplete packs |
| `tools/_bootstrap/` | Provenance of how the first pack was created (one-time; do not re-run) |
| `consumers/consumer-views.js` | Published projections for the two consumers, pinned to pack and obligation hashes |
| `tests/library.test.js` | 11 tests |

## Rules
1. **One canonical copy.** Consumers receive built, hash-verified packs. No consumer authors or edits checklist content; corrections go to the library and ship as a new content version.
2. **Separate states.** Source verification and technical approval are separate; an obligation cannot be APPROVED while its source is unverified; a verified clause identifier does not imply a correct interpretation.
3. **No invented designators.** A reference is valid only as a catalogued hierarchy leaf. Where the source is not organised into lettered/numbered subdivisions, none is created.
4. **Complete means computed.** From hierarchy leaves and obligation identifiers, never from headings or question counts. A pack is not complete while applicable auditable obligations are missing.
5. **Authorship.** Content authored by AI assistance is marked and cannot be approved by its author. Reviewers and approvers are accountable humans (rules in the Toolkit's `verification.js` apply to release records; this library records `authoredBy`, `reviewers`, `technicalApproval`).
6. **IP.** No source text is carried (`licence.sourceTextIncluded=false`); verbatim requirement text is rejected unless the source is public domain; copied NOTE/EXAMPLE/definition phrasing is rejected. Counsel review gates every commercial pack.
7. **Versioning.** `contentVersion` per pack; per-obligation `contentHash` (authored content only). Approved obligations are never edited in place. Release notes list `diffManifests` output.
8. **Release.** Development builds are `NOT-RELEASABLE` and `UNSIGNED-DEVELOPMENT`. A release candidate requires completeness, validator release mode, counsel clearance, the pilot validation steps (complete deep checklist, coverage completeness, shared consumption, expert-reviewed scenarios), a signature by the library release authority (no key exists yet) and Product Governor approval.
9. **Standards revisions.** One pack = one source edition. New editions/amendments are new pack versions or packs; old ones remain available. Edition and transition status come from official sources (see the edition register in the Toolkit folder) and are re-verified before authoring.
10. **Confidentiality.** Burrana-proprietary and customer content never enters the library; Pocket Auditor private licensed content is not used.

## Open decisions (owner)
Approve schema `1.0.0-rc.1` for freeze · name the library release authority and signing process · select the pilot standard · confirm repository home and owning entity (not yet created) · confirm which state transitions require two-person review.
