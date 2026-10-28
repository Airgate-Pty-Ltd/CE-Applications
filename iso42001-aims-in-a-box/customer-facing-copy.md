# Customer-Facing Copy — ISO/IEC 42001 AIMS-in-a-Box

**Brand:** Conform-Edge Quality Consulting LLC
**Use:** landing page / storefront listing copy. Draft — Brian should review pricing and claims against
current market conditions before publishing (see `RISKS-AND-BOUNDARIES.md` and `NEEDS-FROM-BRIAN.md` for
open items that affect what can be truthfully claimed).

**Updated 2026-07-12:** as of the 2026-07-12 fix pass, the AIMS Command Center app (`app\`) has a real,
working record-creation UI across all 7 registers (the field-name mismatch documented in an earlier
version of this file is fixed and re-verified — see `RISKS-AND-BOUNDARIES.md` section 7). It is now safe
to describe the app as a real, usable product, not just a database with a broken front end. This copy
still needs Brian's pricing/positioning review before publishing, but the "do not publish" blocker tied
to the broken UI no longer applies.

---

## Headline

**Your AI Management System — continuously verified, not periodically guessed at.**
ISO/IEC 42001 readiness assessment, a full document kit, and a real governance application that checks
every record the moment it changes — not once a quarter.

### Subhead

Free 5-minute gap-check tool tells you exactly where you stand against ISO/IEC 42001. Then get the
AIMS Command Center: a real application that keeps checking your AI governance evidence every time a
record changes, so you're never presenting a compliance snapshot that's already gone stale.

---

## The problem (for the page's opening section)

Regulators, enterprise customers, and insurers are starting to ask the same question: *"How do you
govern your AI systems?"* ISO/IEC 42001 is the first international management-system standard written to
answer that — but it reads like every other ISO standard: dense, clause-numbered, and written for
auditors, not for the engineering or compliance lead who has to actually implement it.

Most teams either:
- Pay a consultant tens of thousands of dollars to translate the standard into documents, or
- Try to DIY it from the standard's raw clause text and end up with generic boilerplate that doesn't
  hold up under audit scrutiny, or
- Buy a general-purpose GRC platform (ServiceNow GRC, LogicGate, Vanta, and similar tools) that treats
  compliance as a **periodic questionnaire** — someone logs in every quarter, re-answers a checklist, and
  the tool reports whatever was true on that one day. Between those check-ins, a control can quietly
  fall out of compliance — a treatment goes overdue, a competence review lapses, an applicable control
  loses its linked treatment — with nobody notified until the next scheduled review catches it.

## The offer — what actually makes this different

**AIMS-in-a-Box** solves this a different way: instead of a periodic questionnaire, the **AIMS Command
Center** evaluates every single record mutation the instant it happens, using an embedded deterministic
rules engine (the "M-AI Kernel" — no LLM, no black box, just auditable rule logic) and writes the result
to a cryptographically hash-chained, restart-surviving audit trail. A risk becomes overdue at 12:01am on
its due date — not at the next quarterly review. A Statement-of-Applicability control loses its only
linked treatment — flagged immediately, not three months later. The product surfaces this literally: the
Command Center's Overview screen shows "Continuously monitored since [real timestamp]," built from real
governance-event data, not a marketing claim.

Alongside that:

1. **A free, self-contained readiness tool** — score yourself across all 8 sections of ISO/IEC 42001
   (Clauses 4–10 plus Annex A controls) in your browser. No signup, no data leaves your device, no
   sales call required to find out where you stand.
2. **A plain-language, intent-based document kit** — not standard text copy-pasted into a template.
   Every document is written so your team understands *why* the requirement exists, not just what box
   to check.

## What's included, by tier

| Tier | What you get | Price |
|---|---|---|
| **Starter** | Core AI policy, AIMS scope statement, and risk/impact assessment templates — the minimum viable AIMS paper trail | **$600** |
| **Full Kit** | All 23 documents across the AIMS lifecycle (policy → risk → operation → audit → improvement), the Statement of Applicability, and a clause-by-clause implementation guide | **$1,500** |
| **Full Kit + Gap-Check** | Everything in Full Kit, plus the interactive HTML gap-check tool and one guided AI-assisted gap-check run against your specific organization | **$2,250** |
| **Command Center (Monitored)** | Everything in Full Kit, plus the real AIMS Command Center application — continuous, event-driven M-AI monitoring across all 7 registers, hash-chained audit trail, evidence export | **$750/mo** |

*(Pricing shown is the current proposed schedule per `KIT-CONTENTS.md`; confirm final pricing with Brian
before publishing — see `NEEDS-FROM-BRIAN.md` item 2.)*

## Why this, why now

- **ISO/IEC 42001:2023 is new** — published January 2024, it's the first ISO management-system standard
  written specifically for AI. Early movers get ahead of a wave of customer/vendor-questionnaire demand
  before "does your AI vendor have 42001-aligned governance" becomes a standard checkbox.
- **Continuous beats periodic.** ServiceNow GRC, LogicGate, Vanta, and similar platforms are built around
  a point-in-time compliance questionnaire model — accurate on the day someone fills it in, stale the
  next day a record changes. The AIMS Command Center evaluates every record mutation immediately and
  keeps a tamper-evident, restart-surviving log of every evaluation, so "are we still compliant" has a
  real, current answer instead of "as of our last review."
- **You don't need to be certified to benefit.** Most buyers use this kit to build real internal
  governance and answer customer/vendor security questionnaires credibly — certification (if you pursue
  it) comes later, through an accredited certification body, using this kit as your starting evidence
  base.
- **Plain language, not legalese.** Every document uses intent-based drafting: it explains what the
  clause is trying to achieve and gives you an editable, real-world version — not a copy of the standard
  itself (which would infringe ISO's copyright and wouldn't help you anyway).

## What this is *not* (set expectations, avoid disappointment/chargebacks)

- This is **not** a certification. No document kit or software tool can certify you — only an accredited
  certification body auditing your actual implementation can.
- This is **not** legal advice. It's advisory documentation to accelerate your own AIMS build.
- This is **not** an AI-powered "smart" compliance assistant. The M-AI Kernel is deliberately rules-only —
  deterministic, auditable logic, never an LLM or a black-box model — so every finding it surfaces can be
  traced back to an exact, human-approved rule.
- The bracketed placeholders (`[Your Organization]`, `[AI System Name]`, etc.) in every document need to
  be filled in and reviewed by your own team before use — see `GETTING-STARTED.md`.

## Call to action

**Run the free gap-check first.** It takes about 5 minutes, works entirely in your browser, and tells
you which of the 8 sections need the most attention — so you know exactly which kit tier fits before you
spend a dollar.

**[Run the free ISO/IEC 42001 Gap-Check →]**
*(links to `ISO42001-Readiness-GapCheck-Tool.html` once deployed — see `RAILWAY-DEPLOYMENT.md`)*

**Ready for continuous, not periodic, AI governance? [See kit tiers and buy →]**

---
© 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
ISO/IEC 42001 AIMS-in-a-Box is proprietary software of Conform-Edge Quality Consulting LLC
(Idaho LLC No. 6463380), Pocatello, Idaho, USA. Unauthorized reproduction, distribution, modification,
or resale is prohibited. "Conform-Edge" and the Conform-Edge mark are trademarks of Conform-Edge Quality
Consulting LLC. Advisory documentation aid — does not certify compliance and does not replace the
judgment of the user's organization or top management.
