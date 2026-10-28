# Clause Map Framework — Build Spec & Handoff to Claude Code

**Date:** 2026-10-10
**Owner:** Brian Olea / Conform-Edge Quality Consulting LLC
**Status:** Framework PROVEN. Handoff to Code for heavy lifting.
**Prepared by:** Claude (Opus) — architecture and proof slice. Code executes the volume build.

---

## 1. What this framework is

The shared content platform behind the Audit Toolkit app (and later the Conform-Edge QMS desktop
product). It turns Brian's intent-based audit knowledge into versioned, signed JSON "Clause Map"
packs, resolves which items apply to an organization's scope of business, and does it without ever
reproducing copyrighted standard text.

The IP model is the whole point: **clause numbers are facts and ship freely; the intent, question,
evidence, NC pattern, and finding language are Conform-Edge authorship.** Requirement text is never
a field unless the source is public law (regulations). The validator enforces this at the gate.

---

## 2. What is already built and PROVEN (do not rebuild)

| Artifact | Path | Status |
|---|---|---|
| Pack JSON Schema | `schema/clause-map.schema.json` | Done. The contract. |
| Pack validator (IP rules enforced) | `tools/validate-pack.js` | Done. PASS on clean pack, FAIL on violations (copied note, requirement text on non-public-domain source, oversize fragment, >25% fragment ratio). |
| Sample AS9100D pack (8 items) | `packs/src/as9100d.pack.json` | Done. Authoring template. Validates PASS. |
| Scope resolver (deterministic, explainable) | `src/core/resolver.js` | Done. Distributor → 6/8 applicable with reasons; manufacturer → 8/8. |
| Test harness UI (FSA design system) | `app/index.html` | Done. Renders, scope toggles drive the applicable set live. |

Run `node tools/validate-pack.js packs/src/as9100d.pack.json` to confirm the chain.

---

## 3. What Code builds next (the heavy lifting)

### 3a. Authoring pipeline
- A compiler that takes an authoring-friendly source (spreadsheet or YAML) and emits pack JSON,
  running `validate-pack.js` at compile time. Source format is a convenience; the released artifact
  is always validated JSON.
- Wire `validate-pack.js` into CI so no pack merges unless it passes.
- (Optional, stronger) Add `ajv` for full JSON-Schema validation alongside the authoring-rule checks.
  The current validator is dependency-free and checks structure manually; ajv would make schema drift
  impossible. Keep the authoring-rule checks regardless — ajv does not enforce the IP ratio/word-budget.

### 3b. Pack production (volume — this is the bulk of the work)
Author full Clause Maps from Brian's existing auditor skills, one pack per standard. Each pack:
two to three days WITH Brian's review. **Author from the skills, validate, then Brian signs off.**
First wave (covers Audit Toolkit's first buyers):
- `as9100d` (expand the 8-item sample to full), `iso9001-2015`, `faa-part145` (public-domain —
  requirementText permitted), `easa-part145`.
Second wave: `as9110c`, `as9120b`, `iso9001-2026` (transition pack), `iso13485`, `iso19011` (competency),
`iatf16949`, `iso14001`, `iso45001`, `faa-part21`.

### 3c. Content delivery
- Sign packs (detached signature or embedded hash + signature block). Host a `manifest.json`
  (packId, mapVersion, effectiveDate, url, hash, sig) on the Conform-Edge content endpoint
  (Railway or a static bucket — Brian's Railway account exists).
- App checks the manifest at launch, pulls deltas. **Content only — never executable code.**
  (Google Play prohibits downloading code; permits data.)
- On device: packs unpack into SQLite keyed by `(packId, mapVersion, clauseRef)`.

### 3d. Audit-integrity rule (non-negotiable architecture)
An audit opened under a pack version stays pinned to that version until closed. New audits get the
newest version. The audit record stores the `mapVersion` used. The DB schema must support multiple
pack versions resident at once.

### 3e. The Audit Toolkit app (separate build folder)
The four modules (Finding Builder, Audit Program Builder, Competency, SCAR) ported onto this
framework in a Capacitor shell (reuse the FieldAudit toolchain and signing). Shared SQLite record
model: program → finding → SCAR → auditor. That is its own governed build; this framework is its
dependency. **Do not co-mingle the two build folders.**

---

## 4. Hard constraints (from the governance + IP review this session)

1. **No requirement text** in any pack field unless `source.publicDomain === true`. The validator
   enforces it; do not disable that check.
2. **Quoted fragments:** ≤6 words, quoted, and ≤25% of items per pack. Validator enforces.
3. **Scope resolver stays deterministic and explainable.** Every include/exclude carries a reason
   string (FSA: intelligence must be explainable). Do not replace with an opaque rule.
4. **Target API 36** for the Android build (required for Play submissions from 2026-08-31).
5. **Brand separation.** This is Conform-Edge software. No Annex Quality branding in it.
6. **M-AI:** scope applicability is the live intelligence surface here. When the canonical M-AI
   Kernel is wired, the resolver's reasons become Kernel-governed decisions — keep the interface
   reserved per `mai-symbiotic-product-integration`. Do not fork the Kernel.

---

## 5. Governor gate status

This framework has passed: Discovery (intent settled across this session), FSA BUILD (design notes
below), and a proof-slice verification. **Before Code starts volume work, the Product Build Governor
should issue the Stage 4 BUILD-SPEC authorization** and confirm the Audit Toolkit app gets its own
product folder. The counsel review of the IP authoring rules (one pass) should happen before the
first *standards* pack ships — the `faa-part145` regulation pack is not gated by it.

---

## 6. FSA design notes (BUILD mode)

- **Problem eliminated:** re-authoring a checklist for every scope and every standard revision.
  The pack + resolver derive the applicable set and keep it current via content updates.
- **Intelligence layer:** the resolver surfaces the applicable clause set and the reason for every
  inclusion/exclusion without the user filtering by hand.
- **Human role:** select scope, read findings, decide. No manual checklist assembly, no manual
  clause filtering.
- **Knowledge-graph position:** each item carries `relatedItems`; in the app, program → finding →
  SCAR → auditor link into one audit record that re-imports into Conform-Edge QMS.
- **Comparison test:** not a checklist app (static lists) — the content is versioned, scope-resolved,
  and self-updating, and the audit record is a connected object, not a PDF.
