# Competitive Analysis — Management Review Autopilot

## Landscape

| Competitor type | Examples | What they offer | What they miss |
|---|---|---|---|
| Blank template sellers | Etsy/Gumroad "ISO 9001 management review template" ($5–25 one-time) | A Word/Excel agenda skeleton | No auditor-sampling logic, no gap detection, no standard-specific inputs (treats AS9110C safety/HF inputs the same as generic ISO 9001), no output-action discipline |
| QMS software suites | Qualio, MasterControl, ETQ, Intellect | Full eQMS with MR as one module among dozens | $15k–100k+/yr contracts, 3–6 month implementations, massive overkill for an org that just needs MR done right; MR is buried, not the product |
| Consultants | Independent QMS consultants (Brian's own prior market) | Hands-on facilitation, real judgment | $2,000–5,000 per review cycle; doesn't scale, isn't available on demand, and the org still owns the paperwork after the consultant leaves |
| Spreadsheets / generic AI | Homegrown Excel trackers, ChatGPT-drafted agendas | Free or near-free | No standard-specific input list, no completeness scoring, no defensibility — a generic AI draft doesn't know what a CB auditor actually samples, and a spreadsheet doesn't catch an unjustified N/A |
| Generic project/checklist tools | Notion, Asana templates | Task tracking for the output actions | Nothing for the input side; no clause mapping; requires the QM to build the checklist logic themselves |

## Where MRA wins

- **Auditor-sampling intelligence is the moat.** The `g:` guidance text on every input card
  ("What an auditor samples") comes from 20+ years of CB audit calibration, not a template
  vendor's guess. No competitor at any price point encodes this.
- **Standard-aware, not generic.** AS9110C gets safety/HF and airworthiness inputs; ISO 13485
  gets its own 5.6-clause structure (not ISO 9001 relabeled) — most template sellers use one
  generic ISO 9001 skeleton for every standard, which is itself an audit risk.
- **Deterministic, defensible-by-construction output.** The gap banner and coverage score mean
  the org sees exactly what an auditor would flag *before* the review happens, not after a
  finding. No spreadsheet or generic-AI competitor does this.
- **Price point sits in a gap.** $79/mo is far below eQMS suites ($15k+/yr) and far below one
  consultant-run cycle ($2–5k), while delivering more rigor than a $15 template.

## Where MRA is exposed

- **No brand recognition yet** vs. incumbent eQMS vendors who bundle MR "for free" inside
  contracts orgs already pay for — MRA's pitch must be to the *unbundled* buyer (SMB certified
  orgs without a full eQMS, and consultants who want a faster tool than Word).
- **Single-user, browser-local data (localStorage)** is a strength for privacy/simplicity but a
  weakness for teams who want shared, cloud-persisted state — v2.0+ roadmap item, not yet built.
- **No proof of adoption.** Zero customers today. Competitive advantage on paper only converts to
  revenue after the Stripe gate ships and the first 10–20 customers validate the pricing
  hypothesis (see 03-Buyer-and-Pricing.md).
