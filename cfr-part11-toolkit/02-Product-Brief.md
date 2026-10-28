# 02 — Product Brief
## 21 CFR Part 11 / ALCOA++ Data Integrity Toolkit v1.0
**© 2026 Conform-Edge Quality Consulting LLC**

---

## Product Vision

A self-contained, interactive web application that gives FDA-regulated organizations a structured, scored data integrity readiness assessment aligned to 21 CFR Part 11 and ALCOA++ principles — delivered in under 30 minutes, with a printable gap report and CSV export, for a fraction of the cost of a consultant engagement.

**Answers the buyer's core question:** "Before the FDA auditor walks in, where exactly are my data integrity gaps, and which ones need to be fixed first?"

---

## 6-Section Assessment Structure

### Section 1: Data Integrity Culture & Governance (8 Questions)
Assesses the organizational foundation: written DI policy, designated responsibility, CAPA linkage, management review KPIs, internal audit program, speak-up culture, and annual risk review. A weak foundation here undermines all technical controls.

Key FDA reference: FDA Data Integrity Guidance (2018); 21 CFR 820.20 Management Responsibility; FD&C Act §399d

### Section 2: Record Creation & ALCOA++ (10 Questions)
One question per ALCOA++ attribute:
- **A**ttributable — unique identification of the record creator
- **L**egible — permanent, readable entries
- **C**ontemporaneous — recorded at time of action
- **O**riginal — first capture used as primary record
- **A**ccurate — correct, truthful, transparent error correction
- **C**omplete — no blank fields, no missing results
- **C**onsistent — internal date/time/lot consistency
- **E**nduring — durable media, protected from loss
- **A**vailable — retrievable on demand

Plus one question on paper record controls (controlled forms, version control).

Key FDA reference: FDA ALCOA+ principles; 21 CFR 820.184 (DHR); 21 CFR 820.186 (QSR)

### Section 3: Electronic Records & Audit Trails (10 Questions)
Covers 21 CFR Part 11 Subpart B operational requirements: validated system inventory, access controls, audit trail generation and review, audit trail protection from tampering, record retention periods, backup/recovery testing, record readability at system retirement, clock synchronization, and archival/migration validation.

Key FDA reference: 21 CFR Part 11 §11.10(a)–(k); FDA Guidance August 2003

### Section 4: Electronic Signatures (8 Questions)
Assesses 21 CFR Part 11 Subpart C: FDA certification of e-signature equivalency, uniqueness (no shared logins), cryptographic binding to records, component verification at signing, immediate credential revocation on termination, re-authentication after inactivity, signature manifestation requirements (name/date/meaning), and biometric validation (if applicable).

Key FDA reference: 21 CFR Part 11 §11.50, §11.70, §11.100, §11.200, §11.300

### Section 5: Training & Competence (7 Questions)
Evaluates DI training at onboarding, annual refresh cadence, training record integrity, competency verification (not just completion), supervisor/manager DI failure response training, consequences-of-falsification training, and contractor/temp worker inclusion.

Key FDA reference: 21 CFR 820.25 (Personnel); 21 CFR Part 11 §11.10(i)

### Section 6: Supplier Controls & Software Validation (7 Questions)
Covers Computer System Validation (CSV) program: formal CSV process existence, IQ/OQ/PQ documentation, vendor qualification for GxP systems, SaaS/cloud DI control assessment, change control before software upgrades, software anomaly management procedure, and periodic revalidation reviews.

Key FDA reference: 21 CFR Part 11 §11.10(a)(j)(k); FDA General Principles of Software Validation (2002); GAMP 5

---

## Scoring Architecture

### Likert Scale (Per Question)
| Score | Label | Meaning |
|-------|-------|---------|
| 1 | Not implemented | No evidence this control exists |
| 2 | Initial / Ad hoc | Informal, undocumented, inconsistent |
| 3 | Partial / Developing | Documented but not fully deployed or consistently followed |
| 4 | Mostly compliant | Consistently applied with minor gaps |
| 5 | Fully compliant | Verified, effective, with evidence readily available |

### Maturity Levels (Section and Overall)
| Score Range | Level | Description |
|-------------|-------|-------------|
| 4.5–5.0 | Level 5 — Optimized | Best-in-class; sustain and benchmark |
| 3.5–4.4 | Level 4 — Managed | Strong controls; close remaining gaps |
| 2.5–3.4 | Level 3 — Defined | Documented but inconsistent; enforce and train |
| 1.5–2.4 | Level 2 — Developing | Ad hoc; significant compliance risk |
| 1.0–1.4 | Level 1 — Initial | Critical gaps; high FDA inspection risk |

### Visual Dashboard
- **Radar chart** — six-axis spider chart showing maturity across all sections simultaneously
- **Section bar chart** — color-coded (green/amber/red) fill bars per section
- **Score ring** — animated circular progress showing overall score against 5.0 maximum
- **Completion progress bar** — tracks answered questions (0–50)

---

## User Stories

### Quality Manager (Primary)
"As a QA Manager preparing for an FDA inspection, I want to score my organization's data integrity posture across all Part 11 and ALCOA++ dimensions so I can identify and prioritize gaps before the inspector does."

**Acceptance criteria:** Completes 50 questions in <30 min. Gets a section-by-section score. Sees which questions scored 1–2 (critical gaps). Exports a CSV for CAPA tracking. Prints a formatted report for the inspection binder.

### Regulatory Affairs Director (Secondary)
"As the RA Director, I want a defensible, documented baseline assessment I can present to senior management to justify our data integrity remediation budget request."

**Acceptance criteria:** Report shows named organization, date, assessor, maturity level, and regulatory references for every gap. PDF-printable from the browser.

### FDA Inspection Preparation Lead (Tertiary)
"As the person coordinating our inspection readiness, I want to know which Part 11 Subpart B vs. Subpart C gaps are highest risk so we can sequence our remediation before the inspection window."

**Acceptance criteria:** Questions clearly map to 21 CFR Part 11 sections. Gap report separates Critical (score ≤2) from partial gaps (score 3). Priority rating visible in the gap table.

---

## Architecture

- **Single file:** `artifact/index.html` — fully self-contained, zero server required
- **Chart library:** Chart.js v4.4.0 via CDN (requires internet for initial load; degrades gracefully offline with fallback text)
- **State:** In-memory JavaScript object; no localStorage dependency
- **Export:** Native Blob/URL CSV download via browser API
- **Print:** `window.print()` with `@media print` CSS — all 50 questions render in print view
- **Dark mode:** CSS custom properties toggled by `data-theme` attribute on `<body>`
- **Demo mode:** Pre-loads 50 answers for "MediCore Devices, Inc." — demonstrates all scoring, chart, and gap report functionality without live data entry

---

## Demo Data Description (MediCore Devices, Inc.)

The built-in demo simulates a mid-market medical device manufacturer with a moderately mature data integrity program. Scores are set to reflect real-world variation:

- Strong areas: ALCOA++ record creation attributes (most scoring 4–5), CSV/IQ/OQ/PQ documentation (score 4–5)
- Moderate gaps: Audit trail review frequency (score 3), speak-up culture documentation (score 3), paper record controls (score 3)
- Critical gaps: Biometric e-signature validation (score 2), FDA Part 11 certification letter on file (score 3), SaaS vendor DI assessment (score 3)

Overall demo score: ~3.9 (Level 4 — Managed), with 2 questions in the critical gap zone for immediate action.

---

© 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
