# Compliance Alignment: IATF 16949:2016 + AIAG Core Tools

## IATF 16949:2016 Clause Coverage

### Clause 4: Context
- **4.1 Understanding the organization and its context** → APQP Tab (understanding product lifecycle, market context)
- **4.2 Understanding the needs and expectations of interested parties** → IATF Integration Tab (customer-specific requirements)

### Clause 5: Leadership
- **5.1 Leadership and commitment** → IATF Integration Tab (management responsibility, configuration management oversight)

### Clause 6: Planning
- **6.1 Actions to address risks and opportunities** → FMEA Tab (risk analysis, control verification)
- **6.2 Quality objectives and planning** → APQP + IATF Integration Tabs (product lifecycle planning, control plan alignment)

### Clause 7: Support
- **7.1 Resources** → MSA Tab (measurement system availability, adequate tools)
- **7.2 Competence** → All tabs (staff training, lead auditor certification, core tools knowledge)
- **7.3 Awareness** → Training integration (part of v2.5 roadmap)
- **7.4 Communication** → APQP Tab (cross-functional team communication)
- **7.5 Documented information** → PPAP Tab (documentation completeness, archiving)

### Clause 8: Operational Planning & Control
- **8.1 Operational planning and control** → APQP + PPAP Tabs (design control, process approval)
- **8.2 Product and service requirements** → PPAP Tab (customer requirements capture, PPAP submission levels)
- **8.3 Design and development** → APQP Tab (design control process, prototype validation)
- **8.4 Control of externally provided processes** → IATF Integration Tab (supplier control hierarchy)
- **8.5 Production and service provision** → SPC Tab (process control, statistical methods)
- **8.6 Control of changes** → IATF Integration Tab (configuration management, change control)

### Clause 9: Performance Evaluation
- **9.1 Monitoring and measurement** → SPC Tab (control charts, capability studies)
- **9.2 Internal audit** → All tabs (readiness assessment IS part of internal audit program)

### Clause 10: Improvement
- **10.1 General (continual improvement)** → FMEA Tab (root cause analysis, action effectiveness verification)
- **10.2 Nonconformity and corrective action** → FMEA Tab (escape point analysis, action closure)

---

## AIAG Core Tool Standards Alignment

### APQP (Advanced Product Quality Planning), 3rd Edition
| APQP Phase | Assessment Tab | Questions |
|----------|----------------|-----------|
| Phase 0: Concept & Planning | APQP Tab Q1–2 | Product lifecycle definition, team composition |
| Phase 1: Product Design | APQP Tab Q3–4 | Design controls, FMEA integration |
| Phase 2: Process Design | APQP Tab Q5–6 | Process capability, run-at-rate readiness |
| Phase 3: Product Validation | APQP Tab Q7–8 | Prototype testing, pilot production validation |
| Review & Launch | IATF Integration Tab | Customer sign-off, production readiness |

---

### PPAP (Production Part Approval Process), 4th Edition
| Submission Level | Assessment Tab | Questions |
|-----------------|----------------|-----------|
| Level 1 (Engineering drawings, supplier CoC) | PPAP Tab Q1 | Does supplier know PPAP level required? |
| Level 2 (Design FMEA, process FMEA, control plan, dimensional data) | PPAP Tab Q2–4 | Is design FMEA complete? Process FMEA? Control plan? |
| Level 3 (First Article Reports, MSA data, performance testing) | PPAP Tab Q5–6 | First Article Inspection results? Dimensional/functional testing complete? |
| Level 4 (All of Level 3 + production run analysis, capability) | PPAP Tab Q7 | SPC capability studies at launch? Run-at-rate achieved? |
| Resubmission (Changes post-approval) | IATF Integration Tab | Change control process, revalidation triggers |

---

### FMEA (Failure Mode and Effects Analysis), 5th Edition
| FMEA Type | Assessment Tab | Questions |
|-----------|----------------|-----------|
| Design FMEA (product) | FMEA Tab Q1–2 | Do you have design FMEA? Is it current (< 2 years)? |
| Process FMEA (manufacturing) | FMEA Tab Q3–4 | Process FMEA complete? Current post-PPAP? |
| Customer FMEA (customer use) | FMEA Tab Q5 | Does customer require their own FMEA? Reviewed? |
| S/O/D (Severity/Occurrence/Detection) | FMEA Tab Q6 | Do you rate S/O/D independently? Use scales? |
| Control Verification | FMEA Tab Q7 | Is every control verified (measurement data, trending)? |
| Action Effectiveness | FMEA Tab Q8 | Are FMEA actions closed with evidence (not just "complete")? |

---

### MSA (Measurement System Analysis), 4th Edition
| MSA Study Type | Assessment Tab | Questions |
|----------------|----------------|-----------|
| Discrimination Ratio (DR) | MSA Tab Q1 | Do you calculate DR for critical characteristics? DR > 5? |
| Stability (over time) | MSA Tab Q2 | Periodic MSA studies (annual/per tool)? Trends documented? |
| Repeatability & Reproducibility (R&R) | MSA Tab Q3 | Gauge R&R < 10% (preferred) or < 30% (minimum)? |
| Measurement Uncertainty | MSA Tab Q4 | Measurement system uncertainty < 10% of tolerance? |
| Competence | MSA Tab Q5 | Are operators/inspectors trained + certified on measurement? |
| Data Integrity | MSA Tab Q6 | Are measurement records (raw data, not just results) archived? |

---

### SPC (Statistical Process Control), 2nd Edition
| SPC Element | Assessment Tab | Questions |
|-----------|----------------|-----------|
| Control Charts (Xbar-R, Xbar-S, I-MR) | SPC Tab Q1 | Which control chart type? Correctly sized subgroups? |
| Process Stability | SPC Tab Q2 | Control limits established from baseline period? Out-of-control points investigated? |
| Action Rules (reaction plan) | SPC Tab Q3 | Do you have written action rules (e.g., "2 of 3 points near UCL = investigate")? |
| Reaction/Adjustment | SPC Tab Q4 | When out-of-control, do you execute planned reaction (adjust, investigate, stop)? |
| Capability Studies (Cpk) | SPC Tab Q5 | Do you calculate Cpk/Ppk? Target > 1.33? Trending toward 2.0? |
| Process Control Linkage | SPC Tab Q6 | Are control chart data tied to production batch/lot? Traceability documented? |

---

## Customer-Specific Requirements Mapping

### Ford CSR (Tier 2 Supplier Requirements)
- **CSR 4.3.2** (Product Change) → IATF Integration Tab (change control, revalidation triggers)
- **CSR 4.4.1** (Design Controls) → APQP Tab (design FMEA, prototype validation)
- **CSR 4.4.2** (Advanced Planning) → APQP + PPAP Tabs (product lifecycle, PPAP submission)
- **CSR 5.1.2** (Quality Planning) → IATF Integration Tab (management review, quality objectives)

### GM CSR (General Motors)
- **CSR 2.1.5** (FMEA Discipline) → FMEA Tab (design/process/customer FMEA completeness, action closure)
- **CSR 2.1.6** (Control Plan) → PPAP + FMEA Tabs (control plan integration, critical characteristics)
- **CSR 2.2** (Statistical Methods) → SPC Tab (control charts, capability studies)

### Stellantis CSR (Stellantis/PSA/FCA)
- **CSR 3.2** (Product Safety) → IATF Integration Tab (safety-critical characteristic identification, controls)
- **CSR 3.3** (Engineering Changes) → IATF Integration Tab (change impact assessment, re-FMEA triggers)

---

## Assessment Scoring Justification

### Maturity Scale 1–5
| Level | Characteristics | IATF Audit Result |
|-------|----------------|-------------------|
| **1: Not Started** | No evidence of tool/process; not discussed | Major NC, certification denial |
| **2: Initiated** | Process exists but incomplete; gaps evident | Minor NC, conditional approval |
| **3: Implemented** | Process documented, partially followed; some evidence | Observation, approval likely |
| **4: Managed** | Process consistently followed; metrics trending; evidence complete | Approval, possible commendation |
| **5: Sustained** | Process optimized; metrics excellent; continuous improvement evident | Approval, strong performance |

### Gap Calculation
- **Target maturity** for all tools: 4.0 (Managed)
- **Current score** = average of all Q responses (1–5 per Q)
- **Gap** = Target (4.0) – Current (user's avg)
- **Days to compliance** = Gap × 30 days (linear estimate)
- **Red flag** (actionable): Any tool < 3.0 → immediate action required

### Improvement Roadmap Logic
1. **Identify bottom 2 tools** (lowest maturity)
2. **Sort actions by severity** (Severity score × Occurrence in audit findings)
3. **Assign timeline**: 
   - Red (< 2.5) → 30 days
   - Yellow (2.5–3.5) → 60 days
   - Green (3.5–4.0) → 90 days
   - Sustain (> 4.0) → 180 days (optimization)

---

## Audit Evidence Requirements (Built Into Reporting)

### APQP Evidence Pack (auto-generated from assessment)
- Design and process FMEA reports
- Control plan (current version)
- Process capability studies
- Prototype validation reports

### PPAP Evidence Pack
- PPAP submission level documentation
- Dimensional report (or CoC for Level 1)
- Performance test results
- Material certs (if required)

### FMEA Evidence Pack
- FMEA worksheets (design, process, customer)
- Action item status log
- Effectiveness verification (post-action audit results)

### MSA Evidence Pack
- MSA study reports (R&R, stability)
- Calibration certificates
- Operator qualification records

### SPC Evidence Pack
- Control chart examples (last 3 months)
- Capability study (Cpk calculation worksheet)
- Operator/inspector training records

---

## Legal & Regulatory Boundaries

### What We Claim
"The IATF 16949 Core Tools Compliance Suite is a **self-assessment tool** designed to help suppliers evaluate their compliance against IATF 16949:2016 and AIAG core tool standards. Results are **not a substitute for a formal third-party audit** by an IATF-registered certification body."

### What We Don't Claim
- We do NOT perform formal audits
- We do NOT issue certifications
- We do NOT guarantee audit approval
- We are NOT a certification body (CBgap)
- We do NOT provide legal advice on compliance

### Disclaimer (in tool + T&Cs)
"This tool provides guidance based on IATF 16949:2016 standard text and AIAG core tool guidelines. For official certification or compliance assessment, consult an IATF-registered auditor. Conform-Edge accepts no liability for audit results or compliance outcomes."

---

## Standards References Used in Tool

- ISO/IEC 16949:2016 (Automotive Management System Quality)
- AIAG APQP, 3rd Edition
- AIAG PPAP, 4th Edition
- AIAG FMEA, 5th Edition
- AIAG MSA, 4th Edition
- AIAG SPC, 2nd Edition
- Ford CSR (Ford Production System)
- General Motors CSR
- Stellantis CSR
- IATF Handbook, 6th Edition

