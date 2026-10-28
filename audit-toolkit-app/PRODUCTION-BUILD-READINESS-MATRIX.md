# Production-Build Readiness Matrix

**Date:** 2026-10-11 · **Authority:** Owner decisions of 2026-10-11 (technical authority, identity, MAK, Kernel, acceptance, next activities) · **`RELEASE_NOT_AUTHORIZED` remains in effect.**
**Supersedes** `PRODUCTION-BUILD-READINESS-RECOMMENDATION.md` (kept for history).
**Evidence key:** **T-SCN** `tests/scenarios.test.js` (22) · **T-DEP** `tests/depth-invariants.test.js` (9) · **T-WIRE** `tests/prototype-wiring.test.js` (3) · **T-VAL** `tests/framework/validator.test.js` (46) · **T-GATE** `tests/framework/gate.test.js` (25) · **UI** `ACCEPTANCE-SWEEP-REPORT.md` + `tests/ui/acceptance-sweep.js` (75+12+1 browser checks, re-run 2026-10-11) · **KS** `KERNEL-WEBVIEW-SPIKE.md` · **KU** `KERNEL-UPSTREAM-REVIEW.md` · **MAK** `MAK-ISSUE-RECORD-GATE-001.md`, `MAK-TEST-FAILURE-ANALYSIS.md` · **ARCH** `PRODUCTION-ARCHITECTURE-v0.1.md` · **BDR** `BLOCKING-DEPENDENCY-REGISTER.md` · **VP** `VERIFICATION-PACKAGE-GUIDE.md`.
Headless total: **105 pass, 0 fail** (the 87 reported earlier are preserved; two gate/validator tests were adapted only to the stricter v2 verification-record shape and 18 tests were added).

## 0. Depth guarantee (applies to every row)
The production slice may not regress to a checklist. These are non-negotiable and guarded by T-DEP: obligations at the subordinate-paragraph grain with intent, objective, method, aspects (≥3), verification steps (≥4), expected evidence, sampling, common weaknesses and a Should Be paraphrase; no positive or negative conclusion without corroborated objective evidence; interview-only statements never satisfy an aspect; alternative explanations must be evaluated before an NC; reproducible sampling; one evidence item assessed in every obligation it touches; exact-citation NCR with Should Be / As Found / statement of nonconformity and authorized approval; tamper-evident, version-pinned audit record. **A change that breaks T-DEP, T-SCN or the UI sweep is a regression, not a refactor.**

## 1. APPROVED FOR IMPLEMENTATION (defined well enough to build now)
| # | Component | Definition | Acceptance criteria | Supporting evidence |
|---|---|---|---|---|
| I-1 | **Governed Audit Runtime** port (applicability, attribute-level assessment, conclusion governance, seeded sampling, citation verification, 12-gate NCR, audit-record hash) from prototype logic to the production language/module | `src/audit-core.js`, `session.js`, `verification.js`; ARCH §3–5 | Golden-vector parity: every T-SCN/T-DEP scenario and the 12-step thread produce identical assessments, gate results and record hashes in the production module; same hash for the same audit across runs and platforms | T-SCN, T-DEP, UI |
| I-2 | **Audit and evidence data model** (entities, IDs, invariants, versioning stamps) | ARCH §4 | Migrations create the model; invariants enforced at the data layer (not only UI); property tests for evidence single-sourcing, sample membership, append-only log | T-SCN (duplicate/reuse/persistence cases), ARCH |
| I-3 | **NCR lifecycle** (Draft → In auditor review → Issued; Discarded; Withdrawn) | ARCH §5 | State machine tests: illegal transitions rejected; Issued cannot be edited or discarded; withdrawal needs authority + reason and keeps the record; gate failures return a draft to Draft | T-SCN (gates, discard, approval), UI |
| I-4 | **Content validation pipeline** — `validate-content` mandatory entry; release mode separate; packaging cannot bypass | `tools/validate-content.js`, `package-content.js` | CI runs dev mode on every content change and release mode on every release build; evidence JSON stored; no packaging path without validation; non-zero exit on every failure | T-VAL, T-GATE |
| I-5 | **Verification workflow tooling** (v2 record; worksheets; shared rules: four separate states, human reviewers, no self-approval, final approval) | `src/verification.js`, `verification-package/`, VP | Release validator and production NCR gate reject incomplete, AI-reviewed or self-approved records (existing tests stay green); reviewers can fill a worksheet and update the record without engineering help | T-GATE |
| I-6 | **Intelligence provider and decision-governance contracts** with the labelled engineering stub and in-runtime rules | `ARCHITECTURE-AND-CONTRACTS.md`, ARCH §6 | Contract tests run against the stub and against a second fake provider; provider output can never create evidence, change a requirement or convert inference to fact (negative tests); stub self-identifies in diagnostics | T-SCN (follow-up behaviour), T-DEP |
| I-7 | **Phone/tablet UI information architecture** (Home, Plan, Audit, requirement card, Findings, NCR builder, Report; rail on tablet) | `prototype/index.html` is the reference | Same screens/flows in the Capacitor app; scenarios A–F and the 12-step thread pass as UI tests; no overflow at 375/820 px; tap targets ≥ 44 px | UI, T-WIRE |
| I-8 | **Golden regression fixtures**: the 12-step thread, scenarios A–F and the depth invariants as release-blocking tests | `src/walkthrough.js`, T-SCN, T-DEP | Any failure blocks merge | T-SCN, T-DEP |
| I-9 | **Customer-wording guard** (no internal system names anywhere in the customer experience) | UI sweep + T-WIRE | Automated scan of every screen, string table and the store listing text | UI, T-WIRE |
| I-10 | **Regression and security test plan** (documents) | ARCH §10 | Plan reviewed and traced to risks before each implementation stage | ARCH |

## 2. APPROVED FOR ISOLATED TESTING (interfaces exist; environment/integration validation required)
| # | Component | Interface | Isolation rule | Acceptance criteria | Evidence / plan |
|---|---|---|---|---|---|
| T-1 | **Capacitor compatibility proof** — runtime and UI inside an Android WebView | I-1 module + prototype UI | Throw-away shell project; no production data; do not infer from Chromium | Six scenarios and the thread pass on a physical phone and tablet, offline; hashes equal desktop vectors; results recorded | UI (desktop only today); ARCH §8 |
| T-2 | **Kernel reproducibility and WebView proof** | Browser evaluation bundle from the spike | Isolated clone only; no pull, no fork, no edit of the protected checkout | All items in `KERNEL-REPRODUCIBILITY-PLAN.md` pass: locale-independent sorting, canonical serialization, path/line-ending normalization, dependency declaration/lock, cross-platform manifest, persistence abstraction; WebView hash equality | KS, KU, plan |
| T-3 | **Device storage** (encrypted store behind a storage adapter) | ARCH §7 adapter | Spike with synthetic data | Survives force-stop; encryption at rest verified; corrupt-store recovery; export/import with identical record hash; no native dependency inside shared logic | UI (persistence on localStorage only) |
| T-4 | **Offline synchronization design** (outbox, idempotent apply, conflict policy) | ARCH §9 | Test server with synthetic tenants | Offline edit → sync → identical hashes; conflicting edits never lose evidence; replay is idempotent | ARCH |
| T-5 | **Authentication and authorization** (identity, roles, approval separation) | ARCH §6 | Test identity provider; no real accounts | Author ≠ approver enforced where policy requires; only authorized auditors can approve; denied actions logged | ARCH |
| T-6 | **Tenant segregation** | ARCH §6 | Two synthetic tenants | Cross-tenant read/write impossible by design and by test; no customer evidence reaches any learning pipeline | ARCH |
| T-7 | **Persistence-abstraction adapter** for the policy core | ARCH §7 | Spike | Policy core has no storage or Node dependency; adapters swappable; deterministic with each | KS |
| T-8 | **Evidence capture** (camera, files, signatures, redaction) | ARCH §4 | Synthetic media | Attachments hashed into the audit record; capture works offline | — |
| T-9 | **Intelligence-provider interface against the stub only** | `audit-intelligence/0.1` | No MAK connection | Contract tests (I-6) pass; a provider outage degrades to "additional analysis available when connected" | ARCH |

## 3. BLOCKED (cannot proceed until the named gate clears)
| # | Component | Blocked by | Unblock criteria | Evidence |
|---|---|---|---|---|
| B-1 | **Release-verified AS9100D pack** and any **production NCR** | Source and clause verification (BD-01): no clause structure, interpretation, outcome or applicability is verified; final approval pending (owner is final authority) | Every obligation has four VERIFIED states with named human reviewers, evidence references and dates, plus final approval; release validator passes; production NCR gate (11) passes on that content | T-GATE, VP, `CLAUSE-DESIGNATOR-REVIEW.md` |
| B-2 | **Live MAK-derived suggestions** | MAK Gate 001 (BD-02) | Fixed and regression-tested in MAK's governed environment (7 acceptance tests in MAK record), pinned commit integration-tested in isolation | MAK |
| B-3 | **Kernel as authoritative governance / evidence integrity** | Reproducibility (BD-03) | T-2 passes on every supported environment, including a WebView | KS, KU |
| B-4 | **Commercial standards-derived content** | Counsel IP review (BD-04) | Written counsel clearance of authoring rules | handoff gates |
| B-5 | **Repository creation** | Legal-entity and GitHub-organization verification (BD-05) | Verified owner entity and org recorded in the decision log; independent repo created only then | decision |
| B-6 | **Store listing, domain use, publication** | DNS TXT and Play phone verification (BD-06); release authorization | Both verified; release authorized in writing | governance |
| B-7 | **Independent acceptance of the prototype** | Owner direct review (BD-07) | Owner completes the review guide (`OWNER-REVIEW-GUIDE.md`) and records acceptance | UI |
| B-8 | **Production services deployment / release / "production-ready" claims** | `RELEASE_NOT_AUTHORIZED`; Stages 6–9; security design (T-5, T-6) proven | Written release authorization after all of the above | BDR |
| B-9 | **Merging MAK, M-AI, CE-QMS, Pocket Auditor or the Clause Map Framework into the product** | Owner decision (independence) | Not planned. Any dependency requires a declared adapter and written approval | decision |

## 4. Exact criteria for entering the first production vertical slice
1. I-1…I-9 golden vectors green; T-DEP and UI sweep unchanged or strengthened.
2. T-1 and T-3 passed on a physical Android phone and tablet.
3. At least one obligation set verified end to end (B-1 for that set) so the slice can issue a production NCR; otherwise the slice runs in demonstration mode and says so on every NCR and report.
4. The slice keeps the full thread: setup → exact requirement → verification steps → sample → evidence → sufficiency assessment → follow-up (stub) → conclusion → Should Be / As Found NCR → approval gates → traceable report.
5. Every defect and limitation in `CODE-HANDOFF-UPDATE-2026-10-11.md` §5 is either closed with evidence or carried forward.


---
## Addendum 2026-10-11 (product definition reset) — new components under the corrected scope
Evidence keys added: **T-TK** `tests/toolkit-v2.test.js` (25) · **T-LIB** library `tests/library.test.js` (11) · **T-WIRE** now 6 tests · **UI-TK** `tests/ui/toolkit-sweep.js` (40 checks, passes at 375 px and 900 px) · **UI-REF** `tests/ui/acceptance-sweep.js` (75, still passes on the reference component) · **RESET** `PRODUCT-DEFINITION-RESET-ARCHITECTURE-v0.2.md`. Headless now **133** + library **11**.
Corrected scope: the Toolkit is the planning / program / checklist / SCAR / NCR / competency toolbox; field execution belongs to Pocket Auditor. Items I-7 and T-1/T-3/T-4/T-8 above describe a field-execution app and are **re-scoped**: they apply to Pocket Auditor, not to the Toolkit's first commercial deliverable. I-1 (runtime), I-3 (NCR lifecycle), I-4–I-6 and I-8–I-10 remain valid for the Toolkit.

### Approved for implementation
| # | Component | Acceptance criteria | Evidence |
|---|---|---|---|
| R-1 | **Requirement Intelligence Library** reference implementation: canonical record, citation rules, completeness, hashing, manifests, diffs, consumer projections | Golden vectors identical in production language; `validatePack` negative tests ported; manifest/hash stable across platforms | T-LIB |
| R-2 | **Audit Planner** logic (applicability, checklist build, agenda/duration estimate, team checks, approval, pinning, drift) | Parity with T-TK vectors; plan export stable; drift never alters an approved plan | T-TK, UI-TK |
| R-3 | **Audit Program** logic (seven coverage measures, policy objects, overdue, repeat findings, risk schedule, effectiveness, revisions) | Coverage computed only from identifiers (T-TK inflation tests); unverified policy never reports compliance | T-TK, UI-TK |
| R-4 | **SCAR Response Builder** logic | No invented completion/cause/result (T-TK negative tests); response document states planned vs completed | T-TK, UI-TK |
| R-5 | **NCR Builder** for imported results with selectable schemes | 12 gates unchanged; scheme classes enforced | T-TK, T-SCN |
| R-6 | **Competency item generation and scoring** (practice mode) | Deterministic items from library records; free-text NCR scored by the real gates; never claims competence while unreviewed | T-TK |
| R-7 | **Content-pack consumption** (vendoring, verification on load, drift test) | Tampered or drifted pack refused (T-TK, T-WIRE) | T-TK, T-WIRE |

### Approved for isolated testing
| # | Component | Acceptance criteria |
|---|---|---|
| R-8 | **Signed content-pack contract** (signing key, authority, verification in consumers) | A consumer refuses an unsigned or tampered production pack; key custody documented |
| R-9 | **Toolkit ⇄ Pocket Auditor results-import format** (replace the synthetic export) | Round trip of a field-execution result into the Toolkit with identical obligation ids and content pins |
| R-10 | **Pilot-standard deep checklist** authoring and review environment | One pilot obligation set passes independent auditor review against expert scenarios |
| R-11 | **Device/storage proof for the Toolkit** (tablet/phone web app or Capacitor shell; encrypted store) | As T-1/T-3 but for planning/program data |
| R-12 | **Concept-graph cross-standard links** between two authored packs | Shared intent shown with both standards' obligations intact (no flattening) |

### Blocked
| # | Component | Blocked by |
|---|---|---|
| R-13 | Any commercial pack (the ten standards) | BD-01, BD-04, BD-10, BD-11, BD-14 |
| R-14 | Declaring a pack or the program coverage "complete" | BD-01 (verified hierarchy and obligations) |
| R-15 | Statement of scheme-coverage compliance | BD-12 (verification of ISO 19011 edition, AS9101, AS9104/1 and certification-body rules) |
| R-16 | Releasing/using competency results as determinations of competence | BD-11 (expert-reviewed scenarios and scoring) |
| R-17 | Signed library releases | BD-13 |
| R-18 | Live MAK-derived suggestions in planning | BD-02 |
| R-19 | Pocket Auditor integration | Pocket Auditor's own build, repo and approvals; R-8, R-9 |
