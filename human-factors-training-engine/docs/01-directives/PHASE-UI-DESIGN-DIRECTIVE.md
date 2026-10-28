# UI / DESIGN-SYSTEM RUN DIRECTIVE — HF ENGINE (STANDALONE)
**Issued:** 2026-08-06 by owner (Brian R. Olea)
**Sequence:** runs BEFORE Phase 4 (Postgres). Presentation only.
**Standing law:** `CLAUDE.md` governs in full. Evidence standard applies to UI too — "looks done" is not done; screenshots of the running app are the evidence.

---

## 0. The one rule that makes this safe
**This is a presentation-only run. Do not change any service, schema, API contract, kernel, migration, or test assertion.** All behavior lives in `src/services/*` and API routes — leave them untouched. You are restyling `src/app/**/*Client.tsx`, `src/app/**/page.tsx`, `src/components/AppShell.tsx`, and `src/app/layout.tsx`, and adding a design-token/CSS layer. If a screen needs a data field the API doesn't return, log it in OPEN-QUESTIONS.md and move on — do not modify the service to get it.
**Guardrail (exit-blocking):** `npm test` must show the identical pass count before and after (208/208 as of this addendum — the 199/199 figure above predates the Standalone Packaging Directive's own additions, see §0a), `npx tsc --noEmit` 0 errors, license headers intact. If any test's *assertion* changed, you violated §0.

## 0a. MANDATORY ADDENDUM — real-machine finding, 2026-08-07 (DECISIONS.md D-055)
Added by owner instruction after real-machine testing of the packaged product found the admin
role, added by the Standalone Packaging Directive after this UI directive was originally
written, has no working navigation at all. **This explicitly narrows §1's "not a redesign of
workflows or navigation logic" rule** — the two items below ARE in scope for this run,
specifically because they were absent when §1 was written (the `/setup`, `/admin/users`,
`/admin/dashboard`, `/admin/enrollments` screens and the `admin` role did not exist yet).
Everything else in §1 still applies unchanged (no VERA import, no workflow redesign beyond
what's named here, no component-library spree).

**Confirmed root cause (already diagnosed, do not re-diagnose):** `src/components/AppShell.tsx`
already exists and already works — it's wired into 11 pages (`/intake`, `/kernel-conditions`,
`/content-authoring`, `/traceability`, `/dossier`, `/drift-watch`, `/burden-budget`,
`/policy-packs`, `/manager`, `/my-training`, `/health`) and its `NAV_ITEMS` correctly
role-filters for `qm`/`supervisor`/`learner` — confirmed working live, real browser, real nav
links rendered and clickable. The gap is narrower than "no navigation exists": (1)
`src/app/login/page.tsx`'s post-login redirect has no `admin` case, so admin accounts fall
through to `/dashboard` — the generic learner-style page, not a real admin landing; (2)
`/dashboard`, `/admin/users`, `/admin/dashboard`, and `/admin/enrollments` do not use
`AppShell` at all, so none of them have a nav menu, and `AppShell`'s own `NAV_ITEMS` has no
`admin`-role entries pointing at any of the three `/admin/*` screens.

**Requirement 1 — role-appropriate landing:** `admin` needs its own case in
`src/app/login/page.tsx`'s redirect logic, landing on a real admin dashboard (not the
learner's `/dashboard`) — `/admin/dashboard` already exists and is a reasonable candidate,
restyled as part of this run's own screen list rather than treated as a new screen.

**Requirement 2 — persistent navigation, every function reachable by clicking:** extend
`AppShell` (or wrap it) to cover `admin` as a real role with `NAV_ITEMS` entries for
`/admin/dashboard`, `/admin/users`, and `/admin/enrollments`, and apply `AppShell` to all four
currently-shell-less pages (`/dashboard`, `/admin/users`, `/admin/dashboard`,
`/admin/enrollments`). Every screen in the product must have a way back to its role's landing
page — no dead ends.

**Acceptance test (execute for real, evidence required same as §7):** starting from `/login`,
complete the full G3 lifecycle — admin creates a QM/supervisor/learner account, QM ingests
evidence through causal-status promotion through atom authoring/approval through
compile-and-assign, learner completes the assignment, supervisor records the effectiveness
observation that triggers automatic closure — **using only mouse clicks, zero typed URLs**
after the initial login. This is the literal exit gate for §0a, independent of and in addition
to the visual screenshot evidence §6/§7 already require.

**Interim measure already shipped, do not duplicate:** `docs/03-architecture/INSTALL-GUIDE.md`
has an "Admin Quick Reference" section listing every screen's direct URL, so the product is
usable without this fix landing first. Remove or shrink that section once §0a is closed —
leaving it in place after real navigation exists would be actively misleading.

## 1. What this is NOT
- **Not** a VERA integration. This product is standalone. Do not import, reference, or reproduce the VERA/Molecule design system. No shared brand chrome, no 3D canvas, no instrument-panel motif borrowed from that system.
- **Not** a redesign of workflows or navigation logic. Same screens, same flows, same routes. Better skin and layout only.
- **Not** a component-library dependency spree. See §3.

## 2. Design language — "Controlled" (define once, apply everywhere)
The HF Engine's own visual identity: a calm, dense, evidence-forward interface for regulated-industry professionals. It should read as a serious compliance instrument, not a consumer app and not an unstyled admin panel. Principles:
- **Evidence-forward:** status, provenance, and record state are always visible and color-coded. Honest empty states are first-class ("No data submitted", "Insufficient evidence") — style them clearly, never hide them.
- **Calm density:** professional, restrained, information-dense without clutter. Regulated users scan tables and queues — optimize for that, not for whitespace-heavy marketing layouts.
- **Legible authority:** clear typographic hierarchy; record IDs, hashes, and clause refs shown in monospace; approval/kernel states never ambiguous.
- **Accessible:** WCAG-minded contrast, full keyboard navigation, visible focus states, light + dark.

## 3. Implementation approach (pick and record in DECISIONS.md)
Two acceptable paths — choose one, justify it:
- **(A) Tailwind CSS** configured properly (`tailwind.config`, `globals.css`, `@tailwind` directives) with a token theme, OR
- **(B) A single hand-authored design-token CSS layer** (`globals.css` with CSS custom properties + a small set of real component classes) replacing the 176 inline `style={{}}` blocks.
Either way: **eliminate ad-hoc inline styles** in favor of reusable tokens/classes. No heavyweight UI kit (no MUI/Chakra/Ant) — this must stay a lean, self-contained, offline-capable app (onprem edition ships with no CDN). Fonts bundled locally, not fetched.

## 4. Design tokens (starting palette — refine, keep semantic)
Define as CSS variables in one place. Suggested semantic set (adjust values for contrast, keep the roles):
- Surfaces: `--bg`, `--surface`, `--surface-raised`, `--border`
- Text: `--text-1` (primary), `--text-2` (secondary), `--text-mono` (IDs/hashes)
- Brand accent (Conform-Edge software, standalone): one primary accent + one focus ring
- Semantic status (used everywhere consistently): `--ok` (verified/approved/covered), `--warn` (overdue/partial/pending), `--risk` (high-risk/blocked/gap), `--info` (advisory/kernel condition), `--neutral` (draft/archived)
- Kernel/advisory must be visually distinct from human-authority states (the "advisory only" badge stays prominent).

## 5. Component standards (build once, reuse)
Replace repeated inline markup with a small component set: AppShell (top bar with product name + version/copyright stamp + role, left/side nav), Card/Panel, DataTable (for queues — sortable, dense, honest empty state), StatusBadge (semantic colors from §4), KpiStat (dashboards), FormField (labeled input/select/textarea, error state), Button (primary/secondary/danger), Modal/Drawer, Toast (replace the inline success/error banners), and a Dossier/print stylesheet (the dossier and BOM must print cleanly — print CSS is part of this run).

## 6. Screen-by-screen exit gate (each needs a real before/after screenshot from the running app)
Every screen restyled and captured running: login, setup (added by the Packaging directive after this list was written — first-run admin creation), dashboard, my-training, manager (the five-minute view — make one-tap verify genuinely one glance), intake (queue as a real DataTable), content-authoring (draft-beside-source as a real two-pane layout), kernel-conditions (advisory badge + three-response buttons prominent), traceability (forward/reverse as a readable graph/tree, not raw text), dossier (print-clean, the flagship — it should look like an audit exhibit), drift-watch, burden-budget, policy-packs, health (real status board with the 5 states color-coded), admin/dashboard (this run's real admin landing page — see §0a), admin/users (also added by the Packaging directive — account creation, no styling existed for it at all), admin/enrollments. Dashboards use meaningful KPI stats and status, not flat form stacks.

## 7. Run mechanics
Journal `RUN-JOURNAL-UI.md` in `docs/05-run-records/`. Decisions D-036+. **Evidence = screenshots of the running dev server** (this run's evidence is visual — start the server, capture each screen; if screenshots are unavailable in-environment, capture DOM + computed-style assertions and say so honestly). Commit at logical boundaries (tokens/shell first, then screens in batches). `RUN-UI.done` last, listing each screen Verified (screenshot) / Partial. Before/after screenshots go in `docs/04-verification/ui-evidence/`. Independent validation on return: confirm test count unchanged, diff commits to prove no service/schema files changed, review the screenshots.
```
Files that MUST NOT appear in this run's diff: src/services/**, prisma/**, src/app/api/**, *.test.ts, migrations. If they do, the run is rejected.
```
