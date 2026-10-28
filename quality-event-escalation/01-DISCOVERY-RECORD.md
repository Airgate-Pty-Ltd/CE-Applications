# Discovery Record — Quality Event Classification & Escalation Decision Tool

**Date:** 2026-08-21 (Automated overnight scanner run)
**Status:** BUILD AUTHORIZED
**Brand:** Conform-Edge (software tool)
**Opportunity source:** Gap in portfolio — no real-time event triage decision aid; MRA handles periodic reviews; 8D/SCAR tools handle post-event actions; nothing covers the first 15 minutes when someone finds a defect and doesn't know whether to stop the line, notify the customer, file an MDR, or issue a hold tag

---

## Gateway Questions

**1. Who is the exact buyer and what triggers the purchase?**
Quality engineer or production supervisor who has just discovered a quality event (defect, escape, supplier non-conformance, customer complaint, field failure, process exceedance). Trigger: they need to know in the next 15 minutes whether to: stop production, quarantine product, notify the customer, notify a regulator (MDR / EASA Occurrence Report / FAA Safety Report), issue a CAPA, or document only. Decision point is time-critical and multi-standard.

**2. What outcome does the buyer walk away with?**
A structured triage verdict: event severity classification (Critical / Major / Minor / OFI), required immediate actions (hold, containment, customer notification, regulatory notification), required formal process (CAPA, 8D, SCAR, none), timeline commitments (24-hr, 72-hr, 30-day), and an evidence-capture checklist. Multi-standard logic covers AS9100D, AS9110C, ISO 13485 / FDA QMSR, IATF 16949, and FAA Part 145 simultaneously — the tool asks the user which standards apply and routes accordingly.

**3. Why does this earn $250k+ per year?**
Every QMS organisation has quality events. Wrong triage = regulatory violation, customer notification failure, or missed CAPA. At $149–$249 one-time, or $399/yr site license: 1,200 units/yr = $250k path. High repeat-buy potential (tool is used every time an event occurs). Bundle potential with 8D Corrective Action tool and SCAR Response Builder as a Quality Event Response Suite.

**4. Is this buildable as a self-contained HTML tool?**
Yes. Decision logic is deterministic: severity inputs → classification rules → action matrix → notification triggers. Standard-specific branches are rule-based (no LLM). 20–25 triage questions, 4 severity tiers, output action table.

**5. Does this conflict with anything in the portfolio?**
No. This fills the gap BEFORE the 8D tool (reactive investigation) and BEFORE the MRA (periodic review). It is the first-responder decision aid in a Quality Event Response Suite. Distinct from all existing tools.

---

## Answers vs. Portfolio Defaults

All answers inherit portfolio defaults with no deviations. UX note: this tool is used under time pressure — interface must be fast, clear, and decisive. No lengthy introductions. Verdict must be prominent.
