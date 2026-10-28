# Sample Output: Supplier Quality Risk Scorecard Report

## Executive Summary Report
**Generated:** July 3, 2026 | **Organization:** [Your Company] | **Auditor:** [Your Name]

---

## Supplier Risk Dashboard

### Current Status
- **Total Suppliers:** 5
- **Low Risk (Green):** 2 suppliers
- **Medium Risk (Yellow):** 1 supplier
- **High Risk (Orange):** 1 supplier
- **Critical Risk (Red):** 1 supplier

### Risk Breakdown
```
Green  (75-100): ████████████████████ 40%
Yellow (50-74):  █████ 20%
Orange (25-49):  █████ 20%
Red    (0-24):   █████ 20%
```

---

## Supplier Risk Matrix

### Green Risk (Low) — 2 Suppliers
| Supplier Name | Score | Standard | Audit Status | Last Audit | Action |
|---|---|---|---|---|---|
| AeroTech Fasteners | 95 | AS9100D | Current | 3 mo ago | None required |
| MRO Electronics | 92 | EASA Part 145 | Current | 2 mo ago | None required |

**Recommendation:** Continue current audit schedule (24-month interval). No action required.

---

### Yellow Risk (Medium) — 1 Supplier
| Supplier Name | Score | Standard | Audit Status | Last Audit | Action |
|---|---|---|---|---|---|
| ISO Parts Distributor | 62 | ISO 9001:2015 | Expires in < 3 mo | 6 mo ago | Schedule re-certification |

**Recommendation:** Contact supplier immediately. Request certification renewal evidence. Schedule recertification audit within 60 days. Monitor compliance.

---

### Orange Risk (High) — 1 Supplier
| Supplier Name | Score | Standard | Audit Status | Last Audit | Action |
|---|---|---|---|---|---|
| Tier 1 Automotive | 48 | IATF 16949 | Current | 10 mo ago | Schedule audit within 14 days |

**Recommendation:** Schedule audit immediately (past due). Address 2 recent NCRs in root cause meeting. Request corrective action plan. Consider sourcing alternatives if NCRs repeat.

---

### Red Risk (Critical) — 1 Supplier
| Supplier Name | Score | Standard | Audit Status | Last Audit | Action |
|---|---|---|---|---|---|
| Medical Device Components | 22 | ISO 13485 | Certification Pending | 15 mo ago | DO NOT USE |

**Recommendation:** **CRITICAL** — Supplier certification pending (ISO 13485). 3 recent NCRs. Do NOT authorize new purchases until certification recovered. Escalate to Supply Chain director. Prepare backup sourcing plan.

---

## Detailed Supplier Profiles

### Profile 1: AeroTech Fasteners (Green, Score 95)

**Dimensions:**
- Certification Status: Current (AS9100D) → 5/5
- Process Capability: Excellent (4/5)
- Audit History: Recent (3 mo ago) → 5/5
- Compliance Gap: No NCRs → 5/5
- **Overall Score: 95 (Green)**

**Assessment:** Excellent supplier. Recommend for critical parts, special processes. Audit not due until Mar 2028.

**SQA Checklist Status:** ✅ Current (generated 2026-07-01)

---

### Profile 2: ISO Parts Distributor (Yellow, Score 62)

**Dimensions:**
- Certification Status: Expires soon (3 mo) → 3/5 ⚠️
- Process Capability: Fair (3/5)
- Audit History: 6 mo ago (within window) → 4/5
- Compliance Gap: 2 NCRs (minor) → 3/5
- **Overall Score: 62 (Yellow)**

**Assessment:** Acceptable supplier. Certification expiration is PRIMARY concern. Schedule recertification audit NOW.

**Action Items:**
- [ ] Contact supplier requesting certification renewal evidence
- [ ] Schedule re-audit within 60 days
- [ ] Update SQA with new certification date
- [ ] Follow up: 30 days (if not renewed, escalate)

**SQA Checklist Status:** ⚠️ Refresh Recommended (recertification)

---

### Profile 3: Tier 1 Automotive (Orange, Score 48)

**Dimensions:**
- Certification Status: Current → 5/5
- Process Capability: Adequate (3/5)
- Audit History: 10 mo old (approaching limit) → 3/5
- Compliance Gap: 2 recent NCRs → 3/5
- **Overall Score: 48 (Orange)**

**Assessment:** Conditional approval. NCRs must be investigated. Audit overdue.

**Action Items:**
- [ ] Schedule audit immediately (within 14 days)
- [ ] Root cause meeting on 2 NCRs
- [ ] Request corrective action plan
- [ ] Verify corrective actions before re-use
- [ ] If repeat NCRs found: escalate to Supply Chain

**SQA Checklist Status:** 🔴 Audit Overdue (last audit 2025-09-10)

---

### Profile 4: Medical Device Components (Red, Score 22)

**Dimensions:**
- Certification Status: Pending ❌ → 1/5
- Process Capability: Uncertain (pending cert) → 2/5
- Audit History: 15 mo old → 1/5
- Compliance Gap: 3 NCRs (pattern) → 1/5
- **Overall Score: 22 (Red - CRITICAL)**

**Assessment:** 🚨 **DO NOT USE** until certification recovered.

**Immediate Actions:**
1. [ ] STOP all new POs to this supplier (today)
2. [ ] Contact ISO 13485 body — what is certification status? (today)
3. [ ] Request detailed corrective action plan from supplier (48-hour response time)
4. [ ] Prepare alternate sourcing plan (identify 2 backup suppliers)
5. [ ] Escalate to VP Quality + Supply Chain director (emergency meeting)
6. [ ] Review any recent shipments for quality issues

**SQA Checklist Status:** 🔴 CERTIFICATION LAPSED (No valid cert since 2026-05-15)

---

## Compliance Evidence

### Audit Trail (Last 6 Months)
```
2026-07-03: Dashboard generated (this report)
2026-06-15: AeroTech Fasteners audit completed (95/100, Green)
2026-06-01: ISO Parts audit due reminder sent
2026-05-15: Medical Device cert expired (audit result: 22/100, Red)
2026-05-01: MRO Electronics audit completed (92/100, Green)
2026-04-20: Tier 1 Automotive NCR #2 logged (breach in control plan)
2026-03-15: AeroTech audit completed (95/100, Green)
```

### Regulatory Compliance Status
- **FAA Part 145:** 4/5 suppliers approved (1 pending)
- **EASA Part 145:** 2/5 suppliers compliant
- **ISO 13485:** 1/5 supplier certified (4 pending/expired)
- **IATF 16949:** 1/5 supplier PPAP-ready
- **Overall:** 8/20 audit points compliant (40%) ⚠️

---

## Recommendations for Executive Review

### Immediate (This Week)
1. **Medical Device Components:** Stop purchasing; escalate to Supply Chain
2. **ISO Parts Distributor:** Request certification status; re-audit within 60 days
3. **Tier 1 Automotive:** Schedule audit within 14 days; address NCRs

### Short-Term (This Month)
1. Update SQA checklists for Yellow/Orange suppliers
2. Complete root cause meeting on Tier 1 NCRs
3. Verify Medical Device certification path (will they recover? when?)

### Strategic (Q3 2026)
1. Develop backup sourcing for critical components (Medical Device + ISO Parts)
2. Implement quarterly supplier reviews (currently annual)
3. Add supplier safety metrics to dashboard (v2.0 roadmap)

---

## Next Steps
- [ ] Share report with Quality Manager & Supply Chain
- [ ] Schedule emergency supplier review (Medical Device)
- [ ] Update purchasing freeze list
- [ ] Confirm backup supplier contacts
- [ ] Schedule v1.1 update review (30 days)

**Report Generated By:** Supplier Quality Risk Scorecard v1.0
**Confidence Level:** High (all data verified as of 2026-07-03)
**Next Review Date:** 2026-08-03 (30-day review cycle)
