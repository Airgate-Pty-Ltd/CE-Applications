# Customer Experience — IATF 16949 Core Tools Suite
**Date:** 2026-07-07

## Journey Assessment
- **Discovery → first value:** Strong. Open HTML → answer questions → radar chart. No signup friction.
- **Weak point 1: orientation.** 45 questions across 6 tabs with no progress indicator — a quality manager interrupted mid-assessment doesn't know localStorage saved their work. Fix: progress bar + "your answers save automatically on this device" banner (P0, trivial).
- **Weak point 2: the moment after the score.** The radar chart says *where* you're weak; the improvement roadmap says *what* to do — but nothing helps the user turn it into their action plan with owners and dates. Fix: printable action-plan export (P1) — this is also what gets forwarded to the plant manager, i.e., our viral loop.
- **Weak point 3: no help layer existed.** Fixed this pass: GETTING-STARTED-FAQ.md created; embed its content as an in-tool "?" panel at v1.0.1.

## Support Model
- Launch: email support 24h SLA; GETTING-STARTED-FAQ on landing page; 3 Loom videos (run an assessment, read the radar, build the action plan).
- Month 3: knowledge base from accumulated Q&A; add "interpretation notes" per question (why an auditor asks this) — high-value content Brian can write from experience, doubles as marketing.

## Onboarding Metrics to Track
Completion rate of all 45 questions (target >70%); time to complete (target ≤30 min as marketed); % who export/print (proxy for real value); % returning within 90 days (recurring-use signal that justifies subscription vs. one-time).

## Enterprise CX Requirements (v2.0 gate)
SSO expectations start at ~$700/mo price points; assessment assignment workflows; audit trail of who answered what when (their auditors will ask); data-residency answer ready ("client-side scoring, opt-in cloud sync, Postgres on Railway US region").
