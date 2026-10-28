# Calibration & OOT Impact Manager — Product Brief

**Brand:** Conform-Edge (software) · **Built:** 2026-08-14 (overnight scanner run)

## Problem
When a gauge returns **out of tolerance (OOT)** at calibration, AS9100 7.1.5.2 requires the organization to assess and act on the validity of previous measurements. In practice most SME quality teams handle this with panic and guesswork: they don't have a repeatable way to decide *which* product between the last-good calibration and discovery is suspect, and whether the situation is a document-and-monitor event or a full recall. Under- or over-reacting both hurt.

## Product
A single self-contained HTML tool. The user enters the instrument, the OOT error, the characteristic tolerance, the direction of error, whether it's a KC/airworthiness feature, the exposure window, quantity affected, ship status, and whether an independent re-verification path exists. The engine runs a deterministic **reverse-traceability decision**:
- computes the **error/tolerance ratio** (how much of the acceptance band the OOT could have masked),
- weights escape risk (falsely-accepting direction), KC/safety criticality, shipped exposure, and re-verify availability,
- outputs a **RECALL / CONTAIN & SCREEN / DOCUMENT & MONITOR** verdict with a risk score, and
- generates an **ordered required-action list** (freeze instrument → define suspect population → screen vs. scrap → customer/escape review → record the 7.1.5.2 validity assessment → fix root cause).

Deterministic, no back-end, nothing leaves the page.

## Differentiation
No existing portfolio tool covers calibration recall / OOT reverse-traceability. Natural cross-sell to every QMS buyer (AS9100/ISO 9001/IATF/13485 all carry the same measurement-traceability obligation). Complements the 8D workflow tool (the OOT event often spawns a CAR).

## Market & pricing (path to $250k+/yr)
Universal quality-team pain; ~$149–$299 single / $999 site. Broad addressable base across all standards makes the threshold reachable on volume; strong as a bundle add-on.

## Status
Built and **verified functional** (JS valid, risk engine tested across 4 boundary cases, self-contained, VERA palette, FSA-gate compliant). Publish-ready.
