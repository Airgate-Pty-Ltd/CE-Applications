# Code Handoff Update — Audit Toolkit (post Phase A/C review)

**Date:** 2026-10-10 · **Author:** Claude Code (Sonnet 5.5) · **Supersedes nothing**; extends `2026-10-10-clause-map-framework/CODE-HANDOFF.md`.
**Release status: `RELEASE_NOT_AUTHORIZED`.** Not production-ready. Not published. Play, DNS, legal and licensing gates remain open.

## 1. Delivered under the conditional authorization

| § | Directive item | Deliverable | State |
|---|---|---|---|
| 1 | Kernel version | `KERNEL-UPSTREAM-REVIEW.md` | Reviewed in an isolated clone. Protected checkout unchanged at `5c976d121371bbf634db1c5d083c20b645023db1`. **No commit pinned** (see §3). |
| 2 | MAK failures | `MAK-TEST-FAILURE-ANALYSIS.md` | 3 failures documented; MAK untouched (11 modified + 2 untracked files verified preserved, HEAD `6cac29ee698d6d469c17b01c30dd41959dc8853d`). **gate_001 = integration blocker.** |
| 3 | Architecture | `ARCHITECTURE-AND-CONTRACTS.md` | Contracts defined; follow-up provider is a labelled stub. |
| 4 | Scenarios A–F | `prototype/` + `tests/scenarios.test.js` | Working interactions + 13 headless tests (passing). |
| 5 | NCR requirements | `src/audit-core.js` `ncrGates` | 10 gates enforced in the data/logic layer, not the UI. |
| 6 | Framework coverage | `tests/framework/validator.test.js`, `tools/validate-pack-extended.js` | 45 tests: baseline (12), documented gaps (10), extended (23). Framework source **not modified**. |
| 7 | Harness | `FRAMEWORK-HARNESS-INSPECTION.md` | Kept as the framework demonstration; not the product prototype. |
| 8 | Overlap | `OVERLAPPING-BUILDS-RELATIONSHIP-MATRIX.md` | Reference-only; no code copied; product name collision flagged. |
| 9 | Prototype | `prototype/index.html` (+ single-file `prototype/dist/audit-toolkit-prototype.html`) | Navigable, phone + tablet, light/dark, synthetic data. |

Run: `node --test tests/scenarios.test.js tests/framework/validator.test.js` → **58 pass, 0 fail**. Prototype: serve the app folder over HTTP (e.g. `python -m http.server`) and open `/prototype/index.html`, or open the `dist` single file.

## 2. What is real vs. stub vs. not built

| Real (deterministic, tested) | Stub / simulated | Not built |
|---|---|---|
| Resolver-based applicability with reasons | Suggested Follow-Up (rule stub; **not intelligence**) | Capacitor/Android shell |
| Evidence assessment (attribute-level; interview-only statements not accepted as corroboration) | Synthetic org, records, interviews | Encrypted local store, sync, conflict handling |
| Conclusion governance (cannot record unsupported demonstrated / NC) | Clause index (**UNVERIFIED-SAMPLE**) | Camera/attachments, real PDF |
| Seeded, reproducible sampling | "Simulate outcome" review aids (scenario B) | Auth, RBAC, tenant segregation |
| Citation verification (parent / wrong paragraph / invalid / non-existent) | Auditor identity/authorization (synthetic) | Audit log tamper-evidence |
| 10-gate NCR issuance incl. authorized-auditor approval | | Pack update-without-changing-open-audits flow |
| Audit-record sha256 (pins versions) | | Real Kernel / MAK integration |

## 3. Decisions and gaps needing the owner
1. **Kernel pin.** Candidate: `5a9cdeb` (282/282 isolated-clone tests; tsc clean). **Not pinned**: compatibility with the WebView is unproven, manifest reproducibility on Windows is unexplained, and `better-sqlite3` is undeclared. Next step: a bundling spike in an isolated checkout of the legacy `evaluate` path (browser bundle, `node:crypto` shim).
2. **gate_001 (MAK).** Needs an owner decision on fixing MAK; Code was told not to modify it. Until resolved, no MAK-derived recommendation may influence an audit.
3. **Clause designators.** Every designator in `CLAUSE_INDEX` is authoring knowledge, **unverified**. While reviewing prior art I noticed the Phase B prototype labelled `8.5.1.3` as "Validation of special processes"; my index treats `8.5.1.2` as that clause and `8.5.1.3` as production-process verification. **Both are unverified** — a human check against the licensed edition is required before any pack ships. The extended validator's `--release` mode fails until a VERIFIED status with reviewer and date exists.
4. **Framework validator gaps** (pinned by tests, framework unchanged): invalid/nonexistent clause, itemId↔clauseRef mismatch, invalid paragraph, unsupported applicability rule, missing source metadata, broken `relatedItems`, unverified source version, empty evidence list, bad evidence refs. Approval requested to adopt `validate-pack-extended.js` as the gate (it wraps, never replaces, the framework validator). The framework's own fixture passes it with 6 warnings and fails `--release`, as it should.
5. **Fixture note.** The 8-item AS9100D pack is clause-grain; 4 items cite parent clauses (8.5.1, 8.7, 9.2, 10.2). Flagged as warnings, not errors.
6. **Product naming / bundle collision** with AuditFindingIQ's discovery record (matrix §).
7. **Should-Be accuracy gate** is key-term + auditor attestation only; the system cannot verify a paraphrase against licensed text. This is an inherent human review step, not a defect to engineer away.
8. **Classification aid** wording is generic; the certification-body scheme must supply real criteria.
9. The prototype's NCR **approval** is a single synthetic authorized auditor (author = approver). Independent-reviewer separation is a design question for the slice.

## 4. Open gates retained
Counsel review of IP authoring rules · technical review of every standards pack (incl. clause index) · conform-edge.com DNS TXT · Google Play phone verification · Stage 3 integration evidence · Stages 6–9. FAA/EASA public-law packs remain the unblocked content starting point.

## 5. Suggested next steps (in order)
1. Owner review of the prototype against the six scenarios (`/prototype`, "Acceptance scenarios A–F").
2. Decisions §3 items 1–4.
3. Kernel WebView bundling spike (isolated).
4. Phase D vertical slice on Capacitor: persistent encrypted store, evidence capture, audit-record export, update-pinning.
