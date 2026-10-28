# Customer Experience — Repair Station Readiness Dashboard
**Date:** 2026-07-07

## Getting Started (embed on landing page + first-run screen)
1. Open the dashboard and pick "Try demo station" — see a full compliance posture in 30 seconds.
2. Click "Set up my station": enter certificate number, ratings, EASA approval (if dual), staff counts.
3. Upload or enter your open corrective actions, training due dates, and staff authorization expiries (CSV template provided).
4. Connect Supplier Scorecard (optional) for the third scoring dimension.
5. Your posture score and prioritized alerts generate immediately; print the management-review report from the report menu.

**Time to first value target: under 10 minutes.** Track activation = "user sees own-data posture score."

## FAQ (draft)
- **Where does the regulatory data come from?** v1.0: your own records plus public FAA/EASA records refreshed monthly with visible currency dates. Live integrations are on the roadmap — we will never present stale data as live.
- **Does my data leave my browser?** No. v1.0 runs entirely client-side. Nothing is uploaded.
- **Is this an official FAA/EASA tool?** No, and it doesn't guarantee audit outcomes. It encodes the readiness methodology of a practicing AS9110C/Part 145/EASA lead auditor.
- **How is the score calculated?** Three weighted dimensions (Regulatory 35% / QMS 40% / Supplier 25%); every alert shows its causal reasoning — nothing is a black box.
- **Can I use it for management review?** Yes — the printable report is structured to feed clause 9.3 inputs directly.
- **Multi-station?** Coming v1.2; join the enterprise waitlist.

## Support Model
- Launch: email support, 24h SLA (Brian), FAQ page, 3 short Loom walkthroughs (setup, alerts, report).
- Month 3+: knowledge base (reuse FAQ + walkthrough transcripts), in-app "?" tooltips on every score element.

## Experience Gaps to Close (ranked)
1. **First-run onboarding wizard** — currently the demo drops users into alerts with no orientation (P2 in Feature-Priorities, but the *copy* above can ship on the landing page now).
2. **CSV template download** — must exist before first paid customer (P0 companion to feature #3).
3. **Empty-state design** — what a new station sees before entering data; currently undefined.
4. **Alert fatigue control** — let users acknowledge/snooze alerts; an alert-driven product lives or dies by signal-to-noise.
5. **Walkthrough videos** — 3 Looms, ~15 min total effort, disproportionate trust payoff.
