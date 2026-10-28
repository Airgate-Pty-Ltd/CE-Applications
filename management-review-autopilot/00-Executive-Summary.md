# Executive Summary — Management Review Autopilot (MRA)

**Date:** 2026-07-08 | **Device:** Desktop | **Scanner run:** automated (unattended)

## The product
Management Review Autopilot converts raw QMS data into a complete, clause-compliant
management review package in under 30 minutes — input coverage check, agenda, pre-populated
minutes, executive summary, and an output-action register — for ISO 9001:2015, AS9100D,
AS9110C, and ISO 13485:2016.

Every certified organization on earth must run management review (clause 9.3 / 5.6) at
planned intervals, and nearly all of them assemble it by hand: chasing inputs from six
departments, rebuilding slide decks, and getting written up by CB auditors for missing
inputs or untracked outputs. MRA turns that 2–5 day scramble into a guided, deterministic
workflow whose output is audit-defensible by construction.

## Why this pick
- **Universal recurring pain:** every certificate holder, 1–4 times per year, forever.
  Missing MR inputs are a top-5 CB finding across ISO 9001 and AS91xx registrars.
- **Zero portfolio overlap:** 41 prior ledger entries; none touch management review.
  It fills the priority category "management review auto-builder" from the scan mandate.
- **Brian's moat:** the input checklists, evidence expectations, and NC patterns come
  straight from the management-review-intelligence skill and 20+ years of CB audit
  calibration — competitors sell blank agenda templates; MRA encodes what an auditor
  actually samples.
- **Deterministic by design:** completeness scoring is rules-only (M-AI kernel aligned),
  advisory-only, human retains all decisions. No LLM dependency in the MVP.
- **Demo-ready today:** working single-page app + zero-dependency Node server with
  health check, deployable to Railway from GitHub in minutes.

## Revenue path (summary)
$79/mo Professional × 220 orgs = $208k/yr, plus $199/mo Multi-Standard × 25 = $60k/yr
→ ~$268k/yr at fewer than 250 customers from a market of >1M certified organizations.
Full math in 03-Buyer-and-Pricing.md.

## What was built
Working web app (artifact/app) with deterministic clause-9.3 input engine, four standard
packs, completeness scoring, agenda/minutes/exec-summary/action-register generation, and
Markdown export — plus full deployment package (README, UI test plan, Railway guide,
GitHub guide, smoke tests) and the 10-document product folder.
