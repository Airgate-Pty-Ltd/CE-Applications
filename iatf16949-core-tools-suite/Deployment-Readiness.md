# Deployment Readiness — IATF 16949 Core Tools Suite
**Date:** 2026-07-07

## Checklist (verified against files on disk)

| Artifact | Status | Notes |
|---|---|---|
| README.md | ✅ | Complete with quick start + file map |
| Production HTML | ✅ artifact/index.html | Self-contained, 24 KB |
| Sample output | ✅ artifact/sample-output.md | |
| Sales copy | ✅ artifact/customer-facing-copy.md | |
| Pricing docs | ✅ 03-Buyer-and-Pricing.md | |
| Railway guide | ✅ 11-RAILWAY-DEPLOYMENT.md | |
| GitHub guide | ✅ 12-GITHUB-READY.md | |
| UI test plan | ✅ 10-UI-TEST-PLAN.md | Run before every deploy |
| Getting started / FAQ | ✅ GETTING-STARTED-FAQ.md (created 2026-07-07) | |
| .env.example | N/A | Static tool, no secrets until v2.0 |
| Health check | N/A static | Uptime monitor on URL |
| Screenshots | ❌ Capture at deploy | Radar chart is the hero shot |
| Payment link | ❌ Portfolio Decision #1 (Gumroad) | |
| Legal docs | ❌ Portfolio Decision #4 (Aug 10 sprint) | |
| **Content patch v1.0.1 (AIAG-VDA questions)** | ❌ **Do before launch** | 30-min edit; question text in Compliance-Gap.md |

## Launch Sequence
1. Apply v1.0.1 content patch (AIAG-VDA questions + edition citations + schemaVersion in localStorage payloads).
2. Run 10-UI-TEST-PLAN smoke test.
3. GitHub push per 12-GITHUB-READY.md (recommend **private** repo, not public as the guide says — the question set IS the IP; publish a landing page, not the source).
4. Railway deploy per 11-RAILWAY-DEPLOYMENT.md; custom domain + HTTPS.
5. Gumroad tiers once Decision #1 lands; gate the tool URL behind purchase or keep demo-with-watermark public.
6. Uptime monitor + analytics (privacy-respecting, e.g., Plausible).

## Go/No-Go
**Technically deployable today; commercially gated on the same two portfolio blockers as everything else (payment, legal) plus the 30-minute v1.0.1 content patch.** Recommend this product launches in Tier 2 of the Aug sequence, positioned for Q3–Q4 automotive audit season.
