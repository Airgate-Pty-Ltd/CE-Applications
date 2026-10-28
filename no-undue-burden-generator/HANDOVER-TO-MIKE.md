# Handover

What is done, what is deliberately unstyled, where the seams are, and what is
yours.

---

## Start here

```bash
npm install
npm run dev
```

Then open `#/dev/test-dashboard` and click **Load** on the first scenario. That
gives you the whole product in about thirty seconds: intake populated, routing
decided, document generated, gaps listed.

```bash
npm run gate          # typecheck + build + both CI gates
npm run test:coverage # full suite, 159 tests, engine at 100% branch coverage
```

---

## What is done and verified

- **The rules engine.** AC 21-55 risk determination, routing, gap analysis and
  cross-section consistency checks. Pure functions, 100% branch coverage,
  determinism asserted over repeat runs.
- **The document.** AC 21-55 Appendix A as a `.docx`, verified item by item by
  unzipping the generated file and checking its contents.
- **The intake.** Adaptive — fields appear and disappear based on the
  determination.
- **The gap report**, the review surface, and the refusal to generate.
- **The Organization Profile**, persisted to IndexedDB.
- **PWA manifest and offline service worker.**
- **Billing scaffold**, flagged off.
- **CI**: typecheck, build, both gates, full suite with coverage threshold.

## What is NOT verified, and you should not assume it is

- **The Tauri desktop build has never been compiled.** No Rust toolchain existed
  on the build machine. `src-tauri/` is scaffolded — `Cargo.toml`,
  `tauri.conf.json`, `build.rs`, `main.rs`, CSP configured, bundle targets set —
  but `cargo build` has not run once. Treat it as a starting point, not a
  working target. It also needs icons: `src-tauri/icons/icon.ico`, `icon.icns`
  and `128x128.png` are referenced and do not exist. `npx tauri icon
  public/icon.svg` will generate them.
- **The service worker has not been exercised in a real browser.** It is skipped
  in dev by design, so first real test is a production build served over HTTPS.
- **Layout fidelity in Word.** The tests prove every Appendix A item is present
  in the document. They do not prove the table column widths and page breaks look
  right. Open one and compare against the AC PDF.
- **Cross-browser.** Smoke tests run in jsdom. No Playwright suite.
- **Regulatory citations.** Transcribed from the downloaded AC, not checked
  against controlled copies. Brian owns that.

---

## What is deliberately unstyled — this is your half

The UI is functionally complete and visually plain. Tailwind utility classes,
default type scale, no design system, no brand. That was the intent: get the
behaviour right and leave the surface to you.

**Specifically unstyled and yours to own:**

| Area | File | Note |
|---|---|---|
| Overall shell, nav, typography | `src/ui/../App.tsx` | Header, nav and footer are placeholder. Product name is a single constant in `src/config.ts`. |
| Field primitives | `src/ui/fields.tsx` | `TextField`, `NarrativeField`, `AnswerField`, `CheckboxField`, `EvidenceBadge`. Restyle freely — the behaviour lives in the props, not the classes. |
| Intake layout | `src/ui/IntakeForm.tsx` | Currently one long scroll per section. A stepper or one-decision-per-screen would be better; the engine already supports it (see below). |
| Review surface | `src/ui/ReviewPanel.tsx` | Gap cards and the consistency table. |
| Profile form | `src/ui/ProfileForm.tsx` | Driven by a `GROUPS` array — add or reorder fields there, not in JSX. |
| Landing page | *does not exist* | Local-first is the selling point and should be on it. |

**The dashboard (`src/dev/TestDashboard.tsx`) is not yours.** It is an internal
tool, it never ships to production, and it does not need to be pretty.

---

## Where the seams are

**The engine is sealed.** `src/engine/` has no React, no I/O and no dependency on
anything above it. Everything the UI displays comes from one object:

```ts
const determination = determine(plan, profile)
```

`determination` carries the risk answers and their rationales, the routing
outcome and why, every gap, every consistency check, the banner, and a full rule
trace. **Nothing in the UI re-derives a regulatory conclusion** — if you need a
value, it is on that object. If it is not, add it to the engine with a test
rather than computing it in a component.

**Restyling cannot break correctness.** The rules, the gap classification, the
document content and the refusal to generate are all below the UI layer. The
worst a CSS change can do is look wrong.

**Three things live below the UI on purpose — do not move them up:**

1. **Refusal to generate** is a throw in `documents/render.ts`. The disabled
   button in `ReviewPanel` is the visible half, not the mechanism.
2. **The status banner** is one definition in `engine/banner.ts`, three values,
   re-exported by the CI claim gate. Do not add a fourth and do not hardcode the
   strings in a component.
3. **Adaptive visibility** is driven by `determination.risk.routing` and the
   plan's own answers. Reorganising the layout is fine; replacing the conditions
   with your own is not.

**If you restructure the intake into a stepper**, routing is derived rather than
stored, so screen order is purely a UI concern. `determination.risk.routing`
tells you whether Sections 3–5 are in play at any moment.

---

## Things you will hit

- **Hash routing**, not history routing (`#/plan`, `#/review`, `#/profile`). The
  same build has to work from a static host, from a service-worker cache with no
  server to rewrite paths, and from Tauri. A history router 404s on refresh in
  two of those three. If you add routes, keep the hash.
- **The scrub gate will fail your build if you paste a real phone number,
  address or email into a fixture or a mock.** That is working as intended. Use
  the reserved fictional ranges — `555-01xx`, `example.invalid`, and "Example" in
  street names. See `DESIGN-NOTES.md` §2.
- **The claim gate will fail your build if marketing copy promises the FAA will
  accept the package.** Also intended — and it caught this very file while it was
  being written, which is the best evidence it works. The FAA managing office
  makes that determination; we format the paperwork. Say what the document
  contains and what is missing, never what the outcome will be.
- **`exactOptionalPropertyTypes` is on.** Passing `foo={undefined}` to an
  optional prop is a type error — spread it conditionally, as the existing
  components do.
- **Bundle is split**: `docx` + `jszip` are a separate ~450 KB chunk. Keep it
  that way; it means a UI change re-downloads kilobytes, not the whole app.

---

## Open decisions that affect you

These are Brian's, not mine and not yours, but they land on the UI:

1. **Product name.** `PRODUCT_NAME` in `src/config.ts` is the only place it
   appears. One edit.
2. **Pricing and tier boundaries.** Nothing is hardcoded; a test enforces that.
   No pricing UI exists yet.
3. **The owning legal entity.** `LICENSE` names Conform-Edge Quality Consulting
   LLC (Idaho); the repo sits under Airgate-Pty-Ltd. Those need to agree before
   sale, and whatever wins goes in the footer and the document metadata too.

---

## If something looks wrong

Load the closest scenario in the dashboard and read panel 2, the rules inspector.
It shows every rule that ran with its inputs and output, so "why did it say full
project plan" has a literal answer rather than a guess. Panel 7 covers
contradictions, panel 8 covers omissions.
