# AS9145 APQP & PPAP Readiness Tool — Product Brief

**Brand:** Conform-Edge (software) · **Built:** 2026-08-14 (overnight scanner run)

## Problem
Aerospace suppliers under Boeing/Airbus and prime flow-down are increasingly required to run AS9145 APQP and submit PPAP packages — but most SME suppliers have no structured way to know whether a launch is actually ready or whether a PPAP is defensible before they warrant it. Failed PPAP submissions and launch slips are expensive and relationship-damaging.

## Product
A single self-contained HTML tool. The user selects which of the five AS9145 phases (plus the PPAP submission set) are in scope, answers intent-based readiness elements, and gets:
- a **per-phase readiness verdict** (READY / CONDITIONAL / NOT READY) with a blocker-aware score,
- a **prioritized closure plan** (majors first, evidence-gaps flagged distinctly from not-started), and
- an overall **PSW submission gate** (GO / CONDITIONAL / NO-GO).

Deterministic, no back-end, no data leaves the page. Intent-based scoring — demonstrable evidence required, not a tick-box.

## Differentiation
Distinct from the existing IATF 16949 Core Tools Suite: this is aerospace AS9145 (five-phase model + PPAP + PSW gate, KC/airworthiness weighting), not automotive AIAG core tools. Complements the AS9102 FAI scorer and Supplier Scorecard product lines.

## Market & pricing (path to $250k+/yr)
Target: AS9100 suppliers new to prime flow-down; ~$249–$399 single / $1,200 site license. ~650 sales-equivalent/yr reaches the threshold; strong bundle glue with FAI, FOD, and Counterfeit kits.

## Status
Built and **verified functional** (JS valid, scoring engine tested 4/4 boundary cases, self-contained, VERA palette, FSA-gate compliant). Publish-ready.
