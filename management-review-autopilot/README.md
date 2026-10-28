# Management Review Autopilot (MRA)

A Conform-Edge / Annex Quality product. Converts raw QMS data into a complete, clause-compliant
management review package — input coverage check, agenda, minutes, executive summary, and an
output-action register — for ISO 9001:2015, AS9100D, AS9110C, and ISO 13485:2016.

**Status:** v1.0 built and evolved (2026-07-08 build, 2026-07-09 first evolution pass).
Deployment-ready; not yet live (see NEEDS-FROM-BRIAN.md and Deployment-Readiness.md).

## Folder guide

| File | Purpose |
|---|---|
| 00-Executive-Summary.md | The pitch, in one page |
| 01-Opportunity-Validation.md | Why this was picked from the scanner run |
| 02-Product-Brief.md | Full product definition |
| 03-Buyer-and-Pricing.md | Target customer, willingness to pay, pricing tiers |
| 04-MVP-Scope.md | What v1.0 does and doesn't do |
| 05-Premium-Roadmap.md / Product-Roadmap.md | Version-by-version feature roadmap |
| 06-Compliance-Alignment.md / Compliance-Gap.md | Standards coverage, native and planned |
| 07-Implementation-Instructions.md | How this was built |
| 08-Risks-Assumptions-Boundaries.md | What could go wrong, what's assumed |
| 09-Next-Build-Backlog.md / Feature-Priorities.md | Ranked next-feature backlog |
| BUILD-NOTES.md / DESIGN-NOTES.md | Build-time engineering notes |
| GITHUB-READY.md / RAILWAY-DEPLOYMENT.md | Deployment guides |
| UI-TEST-PLAN.md | Manual QA checklist |
| NEEDS-FROM-BRIAN.md | Manual actions only a human can take (GitHub push, Railway connect, Stripe, pricing/domain decisions) |
| Evolution-Report.md and the 9 other evolution deliverables | First evolution pass (2026-07-09) — competitive analysis, revenue expansion, tech debt, compliance gaps, deployment readiness, customer experience, marketing |
| artifact/app/ | The working product (zero-dependency Node server + static single-page app) |

## Run it locally
```
cd artifact/app
npm install    # no dependencies to install, but this is the standard entry point
node server.js
# open http://localhost:3000, health check at /health
```

## Deploy
Follow RAILWAY-DEPLOYMENT.md and GITHUB-READY.md. No environment variables are required beyond
the Railway-assigned `PORT`.

## What's blocking go-live
See NEEDS-FROM-BRIAN.md — five manual actions only Brian can take (account creation, payment
links, pricing/domain decisions). The product itself is complete and evolved.
