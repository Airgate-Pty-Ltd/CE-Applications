# Code Handoff Update — 2026-10-11 (supersedes the "state" sections of CODE-HANDOFF-UPDATE-2026-10-10.md)

**Release status: `RELEASE_NOT_AUTHORIZED`.** Prototype and development validation only. Nothing here is deployed, published or production-ready.

## 0. Open the prototype (as an auditor)
- **Easiest:** double-click `Start-Prototype.cmd` in this folder (starts a local server, opens `http://127.0.0.1:8765/prototype/index.html`; needs Python). 
- **Or** open the self-contained file `prototype\dist\audit-toolkit-prototype.html` directly in a browser (no network, no server).
- Toolbar (review aids, not product UI): Phone / Tablet / Auto, Theme, **Acceptance scenarios A–F**, **Guided audit thread**, Reset all.
- Suggested review order: Guided audit thread (12 steps, ends with an NCR awaiting your approval) → scenarios B, E, F by hand → try the incorrect citations in the NCR builder → switch audits on Home → reload the page.

## 1. Actual tested capabilities
| Area | Evidence |
|---|---|
| Governed Audit Runtime: applicability with reasons, attribute-level evidence assessment, conclusion governance, seeded sampling, citation verification, 12-gate NCR issuance, audit-record sha256, discard, persistence restore | `tests/scenarios.test.js` — 22 tests |
| Validators: framework baseline (12), documented framework gaps (10), extended (23), gate/packaging/exit codes/evidence records (20) | `tests/framework/*.test.js` — 65 tests. **Total headless: 87 pass.** |
| Browser UI sweep: A–F, duplicate evidence, discard, audit switching, persistence across reload, storage failure/corruption, no internal names, phone 375 px and tablet 820 px layout across 13 screens | `ACCEPTANCE-SWEEP-REPORT.md` — 75 + 12 + 1 checks pass, 3 manual checks pass |
| Kernel pure-evaluate bundle: byte-equal output Node vs no-builtins VM vs Chromium at both SHAs | `KERNEL-WEBVIEW-SPIKE.md` (spike evidence, **not** Capacitor) |

## 2. Source verification status — **NOT VERIFIED**
- Owner directive (2026-10-11): titles of 8.5.1.1 (equipment, tools, software programs), 8.5.1.2 (validation and control of special processes), 8.5.1.3 (production process verification) independently checked. Title level only.
- Everything else (every other clause, all lettered/numbered paragraphs, every authored interpretation) is **unverified**. `CLAUSE-DESIGNATOR-REVIEW.md` lists each designator; `data/source-verification-record.json` has one entry per obligation with **clause hierarchy** and **interpretation** reviewed separately — all PENDING.
- Corrections: this build already mapped special processes to 8.5.1.2. The **Phase B prototype in the framework folder wrongly labels 8.5.1.3 as special-process validation**; it is outside this workstream's write boundary and must not be reused for content. Index title for 8.5.1.1 corrected.
- Do not authorize release on recollection, model interpretation or third-party summaries; verification must use the controlled licensed edition. Do not manufacture designators where the source is not organized that way.

## 3. Validator gate status
- **Entry point:** `tools/validate-content.js <pack> --index <idx> [--mode dev|release] [--verification-record <rec>]`. It runs the **unmodified** framework validator (its sha256 is recorded in each evidence file) and then the extended validator v0.3.0.
- **Dev mode:** demo pack passes with warnings (unverified source/index, clause-grain items).
- **Release mode:** demo pack **fails** (exit 1): unverified source, unverified index, and all 10 obligation verifications pending.
- **Packaging:** `tools/package-content.js` always validates (release by default; `--dev` produces a package labelled NOT FOR RELEASE). No skip flag exists (tested).
- **Evidence record:** validator version, pack/index/record/framework-validator sha256, mode, result, exit code, failure and warning text — `evidence/validation/`.
- Status: approved as the **development validation baseline**. Not designated the sole commercial release gate.
- Separation kept: development checks vs production-content release requirements (release adds source verification, index verification, and a complete per-obligation verification record).

## 4. NCR construction (retained and extended)
Should Be (paraphrase of the governing obligation + edition + exact clause/paragraph), As Found (date, record identifiers, linked evidence), **Statement of nonconformity** (requirement vs verified condition). 12 gates in the logic layer: source, exact citation, applicability, Should Be (key terms + attestation), As Found specificity, verified contradicting evidence linked, an unmet aspect exists, alternatives evaluated and no unresolved contradictory evidence, scheme classification with rationale, authorized-auditor approval, **content-verification (11)**, **auditor NC conclusion recorded (12)**. In `demonstration` mode gate 11 passes but marks the NCR and report DEMONSTRATION; in `production` mode it blocks issuance unless clause hierarchy and interpretation are both VERIFIED. An absent preferred form never creates a finding where the intent is met another way (scenario E).

## 5. Prototype limitations (see `ACCEPTANCE-SWEEP-REPORT.md` §4 for the full table)
Browser `localStorage` only (unencrypted); no sync/backup; no multi-user, roles, real approval separation; no attachments/camera/real PDF; no concurrent-tab handling; no browser-back/deep links; no accessibility audit; no real-device or WebView run; evidence cannot be removed; no withdrawal workflow for issued NCRs; sample content is 5 obligations; organization responses are preset. Suggested Follow-Up is a deterministic **engineering stub** and is **not** MAK intelligence; it is labelled as such in the prototype's About screen.

## 6. MAK integration blockers
`MAK-ISSUE-RECORD-GATE-001.md` — Gate 001 quarantine does not re-run (failing test `test_gate_001_concepts_are_preserved_but_ineligible`; uncommitted guard on a string-compared `governance_revision`, also written by `integrity.py`). **Blocker.** MAK untouched (HEAD `6cac29ee698d6d469c17b01c30dd41959dc8853d`, 11 modified + 2 untracked preserved); correction only in MAK's governed environment. Trusted MAK-derived conclusions remain disabled. The two other originally reported failures are not provenance blockers (conversation text / clock-dependent "today" filter) but 8 further failures exist in the untracked `test_conversational_acceptance.py`.

## 7. Kernel compatibility blockers
Protected checkout unchanged at `5c976d121371bbf634db1c5d083c20b645023db1`; no pull/merge; no fork. Spike result: pure `evaluate` path bundles with a config-only `node:crypto` alias and is byte-equal across Node, a no-builtins VM and Chromium at 5c976d1 and 5a9cdeb (evaluate-path source identical between them). Remaining: Capacitor/Android WebView run unproven; `localeCompare` makes the hash locale-dependent (simulated Swedish collation changed it) — needs pinning; consuming via package export `./evaluate` keeps `node:crypto`; the full Kernel entry pulls Node-only modules; `better-sqlite3` (native) is imported by `ms1/adapters/sqlite-adapter.ts` and undeclared in `kernel/package.json`; Windows manifest hashes differ (CRLF confirmed as one cause, path separators another); a Windows full checkout needs `core.longpaths` (over-long paths, committed `.git.backup/`). **Direction adopted:** platform-independent policy core + persistence adapter; no native persistence dependency in the WebView; the 282 upstream tests support evaluation, not acceptance.

## 8. Naming issue
`NAMING-GOVERNANCE-RECOMMENDATION.md`. Working name unchanged pending the product-governance decision.

## 9. Remaining legal and operational gates
Counsel review of standards-authoring IP rules · technical review (incl. source verification) of every standards pack · name clearance · conform-edge.com DNS TXT · Google Play phone verification · MAK Gate 001 · Kernel WebView proof · Stage 6–9 governance stages · security design (encryption, auth, RBAC, tenant segregation, tamper-evident log).

## 10. Next-stage acceptance criteria
See `PRODUCTION-BUILD-READINESS-RECOMMENDATION.md` §D (ten criteria, all evidence-based).

## 11. Folder map (new this round)
`src/walkthrough.js`, `tools/{validate-content,package-content,export-demo-pack,build-prototype}.js`, `packs/as9100d-demo.pack.json`, `data/{source-verification-record,as9100d-clause-index.sample}.json`, `evidence/`, `tests/ui/acceptance-sweep.js`, `spikes/kernel-webview/`, `Start-Prototype.cmd`, and the reports named above.

---
## Addendum — owner technical-authority decisions (2026-10-11, later)
**Decisions recorded:** Conform-Edge retains technical authority over the Requirement Intelligence Packs; the owner is final technical approver of the initial AS9100D production pack · product identity: working name **Conform-Edge Audit Toolkit** retained; AuditFindingIQ is an existing capability/reference workstream (historical files preserved); independent governed repo and product folder; Conform-Edge as commercial owner **subject to verification of the legal entity and approved GitHub organization before any repository is created (none created)**; no merging with Pocket Auditor, CE-QMS, MAK, M-AI or the Clause Map Framework · MAK Gate 001 must be fixed in MAK's governed environment first; stub continues and is never described as live MAK · Kernel not authoritative until reproducibility is established across environments; Chromium ≠ Capacitor · prototype is **not independently accepted** until the owner's direct review.

**Changes made in this round**
| Change | Evidence |
|---|---|
| Verification record upgraded to **v2**: source identity/edition/controlled copy; separate states for clause structure, interpretation, intended outcome, applicability; evidence refs; reviewer/date/status; final approval; no AI reviewers/approvers; no self-approval (`src/verification.js`, used by validator v0.4.0 and the production NCR gate) | T-GATE (+5), T-SCN |
| Per-obligation verification worksheets | `verification-package/`, `VERIFICATION-PACKAGE-GUIDE.md` |
| Audit-depth regression guard | T-DEP (9 tests) |
| Prototype wiring guard (a required script was missing in the browser page and not caught by Node tests; caught by the browser sweep, fixed) | T-WIRE (3 tests) |
| Content defect fixed: alternative-explanation check for 7.2(c) had no action that could perform it | T-DEP |
| Browser sweep re-run after changes | UI: 75/75 |
| Blocking dependency register | `BLOCKING-DEPENDENCY-REGISTER.md` |
| Kernel reproducibility plan with source-line findings (4 locale-sensitive sort sites in `evaluate.ts`, 1 in the ms1 SQLite adapter) | `KERNEL-REPRODUCIBILITY-PLAN.md` |
| Production architecture, data model, NCR lifecycle, storage, auth, tenancy, sync, Capacitor proof, test plan | `PRODUCTION-ARCHITECTURE-v0.1.md` |
| Production-build readiness matrix (implementation / isolated testing / blocked) with acceptance criteria and evidence references | `PRODUCTION-BUILD-READINESS-MATRIX.md` |
| Owner review guide and simulated-functionality inventory | `OWNER-REVIEW-GUIDE.md` |

**Test status now:** 105 headless (22 + 9 + 3 + 46 + 25) + 75/12/1 browser checks. The 87 reported earlier are preserved; two tests were adapted only for the stricter v2 record shape.
**Still true:** `RELEASE_NOT_AUTHORIZED`; no production NCR against unverified interpretations; nothing deployed; no repository created.
