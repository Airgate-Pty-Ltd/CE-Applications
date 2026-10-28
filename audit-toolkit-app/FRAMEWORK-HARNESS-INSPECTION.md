# Framework Harness Inspection — Clause Map Framework `app/index.html`

**Date:** 2026-10-11
**Subject folder (read-only):** `E:\Conform-Edge\ClaudeCowork\04 Product Portfolio\_Opportunity-Scans\Builds\2026-10-10-clause-map-framework\`
**Method:** Static reading of all files, plus one read-only run of `tools/validate-pack.js` under Node v22.19.0 (stdout only, no files written). The HTML was **not** opened or executed in a browser; all statements about its runtime behaviour are from reading the code.

---

## 1. Files inspected

| File | Role |
|---|---|
| `app/index.html` (153 lines) | Framework test harness UI (subject of this review) |
| `src/core/resolver.js` | Pure scope-applicability resolver (`matchApplicability`, `resolvePack`), UMD export |
| `packs/src/as9100d.pack.json` | Sample AS9100D content pack, v0.1.0, 8 items |
| `schema/clause-map.schema.json` | JSON Schema 2020-12, `schemaVersion` 1.0.0 |
| `tools/validate-pack.js` | Dependency-free pack validator (IP and word-budget rules) |
| `prototype/index.html` | Phase B interactive product prototype (~42 KB) |
| `07-BUILD-SPEC.md`, `CODE-HANDOFF.md`, `BUILD-GOVERNANCE-STATUS.md`, `directive-0{1,2}-*.md` | Governance and claims context |

---

## 2. Purpose

A test harness that renders the output of the scope resolver for one pack. The user toggles "Activities" checkboxes (Design, Manufacture, Distribute, Maintain) and sees which AS9100D items are Applicable versus Out of Scope, each with the resolver's stated reason. Its own header describes it as "the FRAMEWORK test UI, not the shipping Audit Toolkit UI" and "a framework test harness, not a product screen."

## 3. Inputs

- **User input:** four activity checkboxes (`.act`; Manufacture pre-checked) and a pack `<select>` (only option: `as9100d`).
- **Hard-coded profile** (`profile()`): `regulators: []`, `certifications: ['AS9100D']`, `flags: []`. Only activities are live; regulator, certification and flag scope cannot be changed from the UI.
- **Data:** `fetch('../packs/src/as9100d.pack.json')` at load time.

## 4. Dependencies

- **External CDNs / network:** None. No `<script src="https://...">`, no stylesheets, no web fonts. The CSS names `JetBrains Mono` and `Inter` but does not load them, so it falls back to system fonts.
- **Local:** `../src/core/resolver.js` (script tag) and `../packs/src/as9100d.pack.json` (fetch). Both use relative paths, so the folder structure must stay intact.
- **Storage:** none (no localStorage, sessionStorage or IndexedDB).

## 5. Behaviour it exercises (from reading the code)

- Calls `CEResolver.resolvePack(pack, profile)`, which is the real resolver module.
- Pack-level applicability, then per-item `appliesWhen` evaluation. The resolver records a reason string for every decision.
- Renders applicable and excluded counts, and cards showing clause, label, reason, intent, question, evidence, NC pattern, finding stem and quoted fragment.
- Shows the pack's `license.externalDocumentNotice` as the IP notice.
- Escapes `&`, `<` and `>` before injecting text into `innerHTML`. It does not escape quotes, which is acceptable here because values are only used as text content, not in attributes.

It does **not** exercise: the validator, the schema, regulator/certification/flag conditions, persistence, the NCR logic, or any M-AI/MAK integration.

## 6. Test coverage

**No automated tests exist for this harness or for the resolver.** I searched the whole folder: there are no test files, no test runner config (jest, mocha, node:test), and no `package.json`. `resolver.js` has no unit tests. The only executable check is the validator.

- `tools/validate-pack.js` on `packs/src/as9100d.pack.json` (executed by me): **PASS**, 8 items, 1 with a quoted fragment.
- Negative cases for the validator (copied NOTE, requirement text on a non-public-domain source, oversize fragment, >25% fragment ratio) are claimed in `07-BUILD-SPEC.md` §2 but **no test files or fixtures for them exist in the folder**. I did not run them; they are unverified.
- The harness "renders, scope toggles drive the applicable set live" (`07-BUILD-SPEC.md` line 31) is a claim I could not verify without executing it.

## 7. Findings and limitations

1. **Fetch fails when opened from disk.** `fetch()` of a local JSON file is blocked in most browsers under `file://`. The page will likely show no cards unless served over HTTP (for example `npx serve` from the folder root). This is a static-reading conclusion, not an observed result.
2. **Resolver is not wired to the validator or schema.** Nothing in the harness validates the pack before rendering. Invalid packs would render without complaint.
3. **Limited scope conditions in the UI.** Only `activitiesAny` can vary. `regulatorsAny`, `certificationsAny`, `flagsAll` and `excludeIfFlagsAny` are fixed by the hard-coded profile.
4. **The product prototype does not use the resolver.** `prototype/index.html` (line 14) claims scope resolution is "same model as the validated framework resolver," but its own `applies()` (line 219) checks only `ob.activities`, ignoring regulators, certifications and flags. The claim of shared logic is inaccurate.
5. **Self-asserted review stamp.** The header comment says "FSA REVIEW PASSED (test harness)". That is an internal annotation, not an independent review or test result.
6. **Schema drift risk.** The validator says it checks structure manually, not against the schema (`07-BUILD-SPEC.md` line 45). The schema's `additionalProperties: false` and enum constraints are not enforced by the validator.
7. **Sample content only.** The pack is 8 items and states it is "not a complete AS9100D decomposition." The harness exercises a template, not a usable standard.
8. **Pack filename vs. governance:** `CODE-HANDOFF.md` and `directive-01` say no claim of "tested" or "validated" without evidence. The only evidence is the one PASS run above.

## 8. Recommended classification

**Keep as the framework demonstration harness. Do not treat as the product prototype.**

Rationale: it is a correct, small, dependency-free renderer of the resolver output and is useful for demonstrating the resolver and the pack format. It is explicitly labelled as a test UI, and the directive (`directive-01`) says not to treat the earlier Clause Map test harness as the completed Audit Toolkit prototype. `prototype/index.html` is the product prototype candidate, but it has its own applicability logic that diverges from the resolver and should be reconciled before it is cited as using the validated model.

Suggested next steps (for owner decision, not executed):
- Add a small `node:test` suite for `resolver.js` (activity, regulator, certification, flag, and pack-exclusion cases) and negative fixtures for `validate-pack.js`.
- Either make `prototype/index.html` import `resolver.js` or correct its "same model" claim.
- Document that the harness must be served over HTTP, or inline the pack JSON.
- Replace the self-asserted "FSA REVIEW PASSED" comment with a reference to a dated review record.

---

## Summary of what was and was not done

- **Done:** static reading of all listed files; read-only run of `validate-pack.js` (PASS).
- **Not done:** the HTML was not opened or executed in a browser; no rendering, click-through, or console check was performed; no files in the subject folder were modified.
