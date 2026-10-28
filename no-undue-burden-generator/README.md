# No Undue Burden Generator

Generates **PAH Project Initiation Plans** under **FAA AC 21-55**, for Production Approval
Holders proposing to use a manufacturing facility located outside the United States.

The user answers a structured intake. A deterministic rules engine classifies the article's
risk and routes to either a Full Project Plan or an Initial Notification. The application emits
a Word document following AC 21-55 Appendix A, plus a gap report stating what is still missing.

**It does not tell you your package is acceptable to the FAA.** The FAA managing office makes
that determination. This software formats the paperwork and reports what is absent.

---

## Status

**Feature complete.** Engine, documents, intake, gap surfaces, test dashboard, profile
persistence, PWA and billing scaffold are all built and tested — 159 tests, engine at 100%
branch coverage.

Two things are **not** verified: the Tauri desktop build has never been compiled (no Rust
toolchain on the build machine), and layout fidelity in Word needs a human comparing the
generated `.docx` against the AC appendix. Both are called out in `HANDOVER-TO-MIKE.md`.

---

## Running it

```bash
npm install
npm run dev
```

Then open `#/dev/test-dashboard` and load a scenario — that is the fastest way to see the whole
product working.

## Verifying it

```bash
npm run gate
```

`gate` runs typecheck, build, and both CI gates in the order CI runs them. Run this before
pushing — the gates scan the emitted bundle, so they need a build to exist.

| Command | What it does |
|---|---|
| `npm run typecheck` | TypeScript project references, no emit |
| `npm run build` | Production bundle to `dist/` |
| `npm test` | Full Vitest suite |
| `npm run test:coverage` | Coverage, with a 100% branch threshold on `src/engine` |
| `npm run gate` | Typecheck + build + both CI gates |

## Building each target

```bash
npm run build
```

Produces `dist/` — a static, self-contained web app. Serve it from any static host. The PWA
manifest and service worker are included; the service worker registers only in a production
build and needs HTTPS (or localhost) to activate.

```bash
npx tauri build
```

Desktop for Windows and macOS. **Never compiled — requires a Rust toolchain and icon files that
do not yet exist.** See `HANDOVER-TO-MIKE.md` before relying on it.

---

## The two gates

These run in CI on every push and are the reason to trust anything else in this repository.

### Gate 1 — proprietary content scrub

The logic this product derives from was written for a single employer and contained that
employer's controlled data. None of it may reach this repository. `tests/gates/scrub.test.ts`
scans the source tree **and the emitted bundle** for PMA numbers, internal document numbers,
email addresses, phone numbers and street addresses.

It matches the **shape** of each value rather than the value itself. That is deliberate. The
specification asked for a grep against a list of specific proprietary strings while also
forbidding those strings from appearing in the repository, including in git history — and
storing the literals in order to grep for them would itself be the leak, permanently. Structural
patterns resolve the contradiction and are strictly stronger: they also catch sibling values
nobody thought to enumerate. The reasoning is written out in `scripts/scrub-patterns.ts`.

The cost is occasional false positives. **The rule for resolving one is to change the
repository, never to widen the exception.** In particular, fictional part and drawing numbers in
`src/fixtures` must avoid the `PREFIX-999-99` shape — use `PN-10024` or `DWG-4417-C` instead.
The allowlist is asserted empty by a test.

### Gate 2 — forbidden regulatory claims

This product prepares a submission to a federal regulator and is not competent to judge whether
that submission will be accepted. `tests/gates/forbidden-phrases.test.ts` blocks any string
claiming otherwise, across source, docs and bundle, so the claim cannot be reintroduced through
UI copy, a document template or a help string.

It also asserts that the status banner is a closed set of exactly three values:
`DRAFT — INTERNAL REVIEW ONLY`, `DRAFTED WITH GAPS`, `BLOCKED`.

### Both gates prove they work

Each gate file plants synthetic violations in a temp directory and asserts they are caught,
before it asserts the repository is clean. Without that half, a broken regex would leave the
gate permanently and silently green — which is the ordinary way a check like this fails. The
planted values are fictional by construction (`PQ0000ZZ`, the reserved `555-01xx` telephone
range, the reserved `.invalid` TLD) and live under `tests/gates`, which both gates exclude.

In CI the gates **fail rather than skip** when `dist/` is missing.

---

## Architecture

Local-first. All intake data and generated documents stay in the browser (IndexedDB). Customers
will not paste part numbers and drawing references into a cloud service they do not control.
There is no backend; the application runs fully offline once loaded.

```
src/
  engine/          pure deterministic rules — no React, no I/O, 100% branch coverage
    risk.ts        AC 21-55 risk decision tree and routing
    gaps.ts        blocking / warning / info classification
    validate.ts    consistency checks
  documents/       docx builders
  schema/          zod schemas + evidence-state types
  ui/              React components
  fixtures/        fictional test scenarios
  dev/             test dashboard (excluded from the production build)
```

The regulatory determinations are **rules-based and deterministic** — identical inputs produce
byte-identical output. An LLM may be used only for optional convenience extraction from uploaded
documents, and its output is always marked `LIKELY` for the user to confirm; never `CONFIRMED`,
and never the determination itself.

**Stack:** React 19, TypeScript, Vite 7, Tailwind 4, `docx`, `zod`, Vitest.

---

## Independence

This is a standalone, independently sellable asset. It has **zero code dependency** on
Conform-Edge QMS, VERA, M-AI Kernel, `PMA-Application-Management`, or anything else in the
portfolio. PMA application packages under 14 CFR 21.303 and AC 21.303-4 are a different product
in a different repository; this one covers AC 21-55 only.

---

## Build order

Engine first, UI last, so the regulatory logic was tested before anything rendered it.

1. ✅ Scaffold, CI, and both gates — failing tests before any feature code
2. ✅ Schemas and evidence-state types
3. ✅ `engine/` — risk, gaps, validate; 100% branch coverage
4. ✅ Document builders, verified against AC 21-55 Appendix A
5. ✅ Intake UI, adaptive
6. ✅ Gap report and validation surfaces
7. ✅ Test dashboard, all 8 panels
8. ✅ Organization Profile persistence
9. ✅ PWA manifest and offline service worker
10. ⚠️ Tauri desktop wrapper — scaffolded, never compiled
11. ✅ Billing scaffold behind `VITE_FEATURE_BILLING`, default off
12. ✅ Documentation and handover files

---

## Documentation

| File | What it covers |
|---|---|
| `DESIGN-NOTES.md` | The architectural gate, why the scrub gate matches shapes, where the AC overrode the specification, deliberate omissions |
| `REGULATORY-SOURCES.md` | Every AC, CFR part and FAA order relied on, with revision and date consulted — and the six places the AC differed from the brief |
| `TEST-PLAN.md` | What each gate, suite and dashboard panel proves, and what it does **not** |
| `HANDOVER-TO-MIKE.md` | What is done, what is unstyled, where the seams are, what is unverified |

Citations in the shipped rules require verification against controlled copies before release.
That is an owner action and it is listed in `REGULATORY-SOURCES.md`.

---

Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved. See `LICENSE`.
