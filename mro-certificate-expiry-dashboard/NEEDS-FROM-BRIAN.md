# Needs From Brian — MRO Certificate Expiry Intelligence Dashboard
**Created:** 2026-08-27

---

## LAUNCH BLOCKERS

### LB-1 — Pricing confirmation
**Question:** Confirm $149 one-time vs. $249 one-time, and whether the bundle with Repair Station Readiness Dashboard at $349 is the right go-to-market move.
**Owner:** Brian

### LB-2 — Browser behavioral verification by Brian
**Question:** Please open mro-certificate-expiry-dashboard.html in a browser:
1. Click "Load Demo Data" → "Run Assessment"
2. Confirm all 5 tier badges appear (CURRENT, MONITOR, WARNING, CRITICAL, EXPIRED)
3. Confirm CAAC annual deadline alert appears
4. Confirm management review narrative generates correctly
5. Export JSON and spot-check output structure
**Owner:** Brian
**Note:** All 7 AT tests PASS in automated checks. Browser-open verification is the final step before launch.

---

## CONFIRM THESE (INFERRED)

1. Competitive claim: no self-contained multi-authority cert-expiry HTML tool at <$250 exists in the market — confirm or adjust positioning
2. Renewal lead time defaults (90 days FAA/EASA/UK CAA/CASA/TCCA; 120 days CAAC) — do these match your operational experience?
3. Bundle strategy: Repair Station Readiness Dashboard + this tool as a "Part 145 Compliance Bundle" — confirm this is the right packaging

---

## M-AI DECISIONS NEEDING BRIAN

1. When promoted to platform: confirm CertExpiryCritical event should emit to QMS notification queue (email QD + log in QMS event stream)
2. Multi-station enterprise version (aggregate posture across 3+ stations) — confirm whether to build as premium tier or separate product
