# Future Systems Architect Design Notes
## EASA Form 8 Self-Prep HTML Assessment Tool

**FSA Gate:** PROCEED  
**Date:** 2026-08-18  
**Governed by:** future-systems-architect skill

---

## Section 12 Evaluation: Does This Tool ELIMINATE Work?

**Input method:** Direct question response (0/1/2 scoring, qualitative)  
**FSA Section 12 verdict:** PASS — justified exception to CSV-import preference.

Rationale: The EASA Form 8 is itself a structured checklist of 22 sections. The oversight visit follows the Form 8 exactly. A self-prep tool that mirrors that structure is not a static form — it is a structured compliance navigator that eliminates the work of manually cross-referencing the MAG text, identifying EASA-vs-FAA deltas, and writing the pre-audit gap summary. The assessor's input is qualitative expert judgment; there is no data file to import. The tool output (prioritized gap report + MRA narrative) is the work product that would otherwise take 4–8 hours of manual effort.

Direct question input = appropriate here. Compare: COPQ Quantifier (static calculator — failed Section 12 because CSV data existed and was being re-keyed). EASA Form 8 (structured expert judgment — no upstream data file; the assessment IS the work).

---

## Architecture

**Pattern:** 22-section scored questionnaire → gap report → MRA narrative → JSON export  
**Sister tool:** ISO 45001 OH&S Self-Assessment (identical pattern, proven build)

### Sections (mirroring MAG Supplement structure)

| # | Section | Critical | Basis |
|---|---------|----------|-------|
| 1 | General / Accountable Manager | Yes | MAG §4.1; AM must be named and accountable for EASA compliance |
| 2 | EASA Supplement — currency and structure | Yes | MAG CHG 10 required 22-section structure |
| 3 | Quality System — independence and oversight | Yes | EASA requires independent quality function |
| 4 | Certifying Staff — authorization and currency | Yes | EASA B1/B2/Cat-A must be current, authorized, qualified for scope |
| 5 | Approved Data — EASA-accepted maintenance data | Yes | AMM/CMM/SRM must be EASA-accepted revision |
| 6 | Facilities and Equipment — EASA scope | No | Must cover approved scope; no unapproved equipment in use |
| 7 | Contracted Maintenance — annual audit of non-EASA contractors | Yes | MAG CHG 10 §B requires annual audit of all contractors |
| 8 | Component Acceptance — Form 1/8130-3 dual-release | Yes | EASA Form 1 required for components returned to EASA operators |
| 9 | Airworthiness Directives — EASA AD compliance tracking | No | Must track EASA ADs; FAA AD tracking insufficient for EASA ops |
| 10 | Duplicate Inspections / Independent Checks | No | Where required by data, must be performed and recorded |
| 11 | Shift Handover | No | MAG requires documented shift handover where applicable |
| 12 | Technical Records — EASA format and retention | No | EASA retention 24 months post-release; format per AMC M.A.306 |
| 13 | Release to Service — dual-release procedures | Yes | CRS/EASA Form 1 procedures must be documented and controlled |
| 14 | Defect Reporting — EASA occurrence reporting | No | Significant defects → report to EASA (not just FAA ASDR) |
| 15 | Personnel Training and Assessment | No | EASA training records must be current for authorized scope |
| 16 | Safety Management System (SMS) | Yes | MAG CHG 10 §20 new: SMS/SMSVP now required |
| 17 | Internal Audit Program — EASA scope | No | Internal audits must cover EASA-specific requirements |
| 18 | EASA Authority Interface — communications and notifications | No | Station must know who to contact at EASA vs. FAA; notification obligations |
| 19 | Scope of Approval — currency with EASA approval doc | No | Approved capabilities must match EASA approval document exactly |
| 20 | Management Review — EASA inputs included | No | MR must include EASA compliance inputs and outputs |
| 21 | Continuous Airworthiness — instructions for continued airworthiness | No | ICA requirements under EASA scope must be addressed |
| 22 | Oversight Visit Readiness — documentation and personnel availability | No | Records, personnel, facilities must be available for Form 8 visit |

**Total questions:** 22 (one per section; the Form 8 itself has one assessment per section)  
**Critical sections:** 9 (Sections 1, 2, 3, 4, 5, 7, 8, 13, 16)

### Scoring

- 0 = Not Established / Non-Compliant
- 1 = Partial / In Progress  
- 2 = Established / Compliant

### Priority Logic

- Score 0 + Critical section → **CRITICAL** (oversight finding risk; potential EASA approval suspension)
- Score 0 + Non-critical section → **MAJOR** (likely Form 8 finding)
- Score 1 (any section) → **MINOR** (observation / area for improvement)

### Verdict Logic

- Any CRITICAL gap → **NOT READY — Do not schedule oversight visit**
- 0 critical, score ≥ 85%, ≤ 1 major → **READY — Schedule Form 8 oversight visit**
- 0 critical, score ≥ 70%, ≤ 3 majors → **CONDITIONAL — Address majors before visit**
- Otherwise → **IN PROGRESS — Significant preparation required**

---

## M-AI Interface

`window.FORM8_MAI_INTERFACE` — RESERVED, v1.0  
Domain pack: `easa-form8-readiness`

---

## VERA Design System

Identical to ISO 45001 tool: `#0a0f1e` background, `rgba(15,25,60,0.85)` panels, `#4a9eff` accent, critical/major/minor color coding per VERA palette.

One additional color: EASA-specific delta questions highlighted with `rgba(74,158,255,0.08)` background tint to distinguish them from baseline Part 145 requirements.
