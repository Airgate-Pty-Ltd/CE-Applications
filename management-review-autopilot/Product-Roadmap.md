# Product Roadmap — Management Review Autopilot

This consolidates 05-Premium-Roadmap.md and 09-Next-Build-Backlog.md into a single dated view
and adds the evolution-pass findings. No conflicts found between the two source documents —
both agreed on sequencing; this file is now the single source of truth going forward.

## v1.1 — Revenue enablement (weeks 1–4 post-launch)
- Stripe-gated access + simple license key **(blocks all revenue — top priority)**
- Prior-review import: carry open actions forward automatically (append-only register)
- PDF export pack (print pipeline already built — `@media print` in styles.css)
- Cross-sell nav strip to the other 11 Conform-Edge tools, once 2+ are deployed and reachable

## v1.2 — Reach expansion (months 2–3)
- Standard packs: ISO 14001:2015, IATF 16949, ISO 45001, AS9120B (data-only additions to the
  `PACKS` object — no engine changes required, matching the current architecture's design)
- KPI spreadsheet upload (CSV) → auto-populate input cards
- Multi-cycle trend view + charts

## v2.0 — "Intelligence" tier (months 4–6)
- **M-AI kernel integration** (per MAI-ARCH-001 Rev C): DIMs for input-completeness,
  action-aging, and repeat-gap detection; Authority Charter; append-only ledger;
  advisory-only System-Detected Conditions. Replaces the v1 inline `evaluate()` function.
  The kernel already exists (`2026-07-03-MAI-KERNEL-BUILD/mai-kernel/`) — this is an
  integration task, not a build-from-scratch task.
- Auto-draft narrative summaries from entered data (deterministic templates first; LLM assist
  only with a deterministic fallback, per portfolio AI Architecture Requirement)
- Conform-Edge cross-product feed: pull audit results from the self-assessment tools, supplier
  data from Supplier Scorecard, readiness data from RSRD

## v2.1+ — Scale
- Multi-client consultant workspaces with white-label export
- ISO 9001:2026 transition pack (paid upgrade event when published, ~Sept 2026)
- Calendar integration + review-due reminders (retention driver)
- Cloud-persisted shared state (replacing localStorage-only) for teams

## Sequencing rationale
v1.1 is entirely about turning a finished product into a paid one — no new capability, pure
commercialization. This matches the 07-07 portfolio recommendation: the constraint on this
product (and the other 12) is not more features, it's the missing payment rail.
