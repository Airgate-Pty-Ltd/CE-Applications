# 01 — Discovery Record: Pocket Auditor

Gate: product-discovery-build-gate · Classification: **C + D** (commercial, regulated/audit-evidence product)
Status: **PASS WITH RECORDED ASSUMPTIONS** (see §9)

---

## 1. Product Opportunity Statement

Auditors working on site (supplier visits, internal audits, repair-station and production audits) build checklists by hand from several sources that overlap and sometimes conflict: regulations, certification standards, customer contract requirements, and the auditee's own manuals. They then audit with paper or spreadsheets, often without reliable connectivity, and rewrite everything into a report afterward.

Pocket Auditor turns those sources into one intent-based, risk-weighted checklist, lets the auditor work it offline on a phone or tablet, captures objective evidence against each requirement, and produces a traceable report when back online. Every finding traces to the requirement's intent, every source clause it covers, and the evidence reviewed.

## 2. Product Definition Record

| Field | Status | Definition |
|---|---|---|
| Product name | DEFINED | Conform-Edge · Pocket Auditor |
| Brand | DEFINED | Conform-Edge (software) |
| Product type | DEFINED | Offline-first mobile/tablet audit application + cloud service |
| Deployment (V1) | DEFINED | Standalone Pocket Auditor Cloud; CE-QMS Next ready (LD-01) |
| Target market | ASSUMPTION | Regulated-industry audit work: aerospace (AS9100/9110/9120, FAA/EASA Part 145/21), medical device (ISO 13485, QMSR, MDSAP), automotive (IATF 16949), general ISO 9001/14001 |
| Economic buyer | ASSUMPTION | (a) Independent / contract auditors and consultants; (b) Quality Manager or VP Quality buying for an internal/supplier audit team |
| Primary user | DEFINED | Auditor performing on-site or remote audits (internal, supplier, second-party, certification preparation) |
| Secondary users | ASSUMPTION | Lead auditor (reviews, classifies findings, issues report); Library manager (approves requirement content); Auditee contact (receives report) |
| Desired outcome | DEFINED | Audit planned from intent in minutes, executed offline, report issued same day with full traceability |
| Buying trigger | ASSUMPTION | Upcoming certification/surveillance or authority audit; supplier audit program; new customer flow-down requirements |
| Regulatory basis | DEFINED | Product supports audits against the sources in §4. It is not itself a regulated article. |
| Compliance claim | DEFINED | See §5. Bounded. |
| Pricing | USER DECISION REQUIRED | Not needed for prototype |
| App store route | RESEARCH REQUIRED | Apple/Google rules for B2B subscriptions sold outside the store must be checked before production |
| MVP boundary | DEFINED | §7 |

## 3. Commercial Product Definition

- **What is sold:** an audit system that converts every requirement source an auditor must cover into one intent-based checklist, runs offline in the field, and produces a defensible report — not a checklist template or a form app.
- **Current alternatives:** paper/Excel checklists; generic inspection apps (form builders); enterprise QMS audit modules (online only, clause-by-clause, no intent layer, no multi-source crosswalk).
- **Differentiation:** (1) multi-source ingestion with authority-level labeling (regulation vs contract vs standard vs internal never blended); (2) crosswalk merges duplicate intent across sources into one question; (3) intent-based assessment (Documented / Implemented / Effective), "keyword absent but intent met" guard; (4) governed intelligence (M-AI) with replayable determinations; (5) offline-first.
- **Time to first value:** first checklist generated from the shipped library in under 10 minutes (validation target).
- **Expansion path:** CE-QMS Next sync; audit program analytics (audit-reporting-analytics-engine); findings → CAR in CE-QMS.

## 4. Regulatory / Standards / Authority Basis

**Authority hierarchy used everywhere in the product** (from Enterprise Audit Intelligence Engine, Layer 4):

| Level | Type | Examples |
|---|---|---|
| 1 | Law / Regulation | 14 CFR Parts 21/43/145, EASA Part-145/Part 21, 21 CFR 820 (QMSR), EU MDR |
| 2 | Airworthiness Directive | FAA/EASA ADs |
| 3 | Order / Interpretation / Program (3a) and Guidance (3b) | 3a: FAA Orders, MAG, MDSAP audit model. 3b: ACs, EASA AMC/GM, FDA guidance — guidance never generates a finding on its own (06 §1) |
| 4 | Customer contract requirement | OEM quality clauses, PO flow-downs |
| 5 | Certification standard | AS9100D, AS9110C, AS9120B, ISO 9001, ISO 13485, IATF 16949, ISO 14001 |
| 6 | Internal policy | Auditee's manual, procedures, work instructions |

**Library content available now (verified 2026-09-27 by running `content/convert_catalogs.py` on Brian's PC against `E:\Conform-Edge\ClaudeCowork\_Skills\Auditor-Profile-and-Audit-Engine\Skills-Library\`; catalog SHA-256 values recorded in the seed):** 329 requirements across 10 sources (AS9100D 84, ISO 9001 47, ISO 13485 56, IATF 16949 37, ISO 14001 26, AS9110C 25, AS9120B 18, QMSR 15, MDSAP 14, EU MDR 7), 354 closure-table rows, 119 candidate crosswalk relations, 16 proposed applicability triggers. All PROPOSED, none approved. See `content/CONVERSION-REPORT.md`. Note: the root `_Skills\` folder is missing the ISO 9001, QMSR and MDSAP catalogs; the complete set is in `Skills-Library`.

**Library content NOT available:** FAA Part 145, FAA Part 21, EASA Part-145, EASA Part 21 atomic catalogs. The `conform-edge-pocket-auditor` skill lists these but its `references/` folder contains only `easa-form8-reqs.md` and `mag-chg10-reqs.md`. The regulator packs in `aerospace-regulatory-audit-router/packs/` are metadata and detection patterns, not atomic requirement catalogs.

**Content rules (LD-10):**
- Shipped library = clause reference + title + Conform-Edge-authored intent, expected evidence, failure modes. Paraphrase only. Source revision and effective date recorded per source.
- Full standard text only when the customer uploads their licensed copy; it stays private to that organization and is never used to build shared library content.
- Record: revision and effective date per source; revision monitoring via regulatory-intel skills (manual process in V1).

**Human-authority boundary (required field):**

| The product MAY | The product MAY NOT |
|---|---|
| Generate a checklist from approved requirements | State that an organization "is compliant" or "is certified-ready" |
| State "Evidence recorded does not demonstrate conformity with requirement X" | Classify a finding (A3 — human) |
| Surface System-Detected Conditions (M-AI) about record completeness | Close, issue, or release an audit report without a human |
| Propose decompositions, intent statements, crosswalk links (A0/A2) | Put unapproved requirement content into any checklist |
| Offer a semantic intent review with provenance (JudgmentProvider, A0) | Treat "UNKNOWN" evidence as a nonconformity |

## 5. Compliance Claim (bounded)

Allowed: "Pocket Auditor helps auditors plan, perform, and document intent-based audits against the requirement sources they select, with traceability from each finding to its requirements and evidence."

Prohibited: any claim of certification, regulatory approval, guaranteed audit outcome, or automated compliance determination. No claim that the library is complete for any standard until coverage is verified and approved per source.

## 6. Product Requirements

Full PRD in `04-PRODUCT-REQUIREMENTS.md`.

## 7. MVP Scope (prototype = V1 candidate)

| Capability | Class |
|---|---|
| Accounts, organizations, auditees, sites, roles (A0–A3) | Must |
| Requirement Library: import core pack, browse, approve per pack/record | Must |
| Ingestion of customer requirements & internal documents (upload → segment → propose → human review) | Must (semantic proposal step behind a feature flag until IC-003 extension approved — see 13) |
| Crosswalk review (approve/reject candidate MAPS_TO; flag CONFLICTS_WITH) | Must |
| Audit planning wizard + deterministic checklist generation | Must |
| Audit package download for offline use | Must |
| Offline execution: intent card, 3-dimension assessment, evidence capture (photo, file, record ref, note), sampling counter, interview mode | Must |
| Finding composer (requirement / evidence / statement) with proposed type & severity | Must |
| Sync (outbox, idempotent, evidence hash verification, conflict flagging) | Must |
| M-AI sidecar + `pocket-audit-integrity` DIM (rules DRAFT, activate only after approval) | Must (wired), rules inactive until approved |
| JudgmentProvider intent review online (evaluateRequirementIntent / evaluateEvidence) | Should |
| Report generation (PDF + DOCX) and close-out | Must |
| Android + iOS builds (internal testing tracks only) | Should |
| CE-QMS Next connector | Future |
| Audit program analytics, repeat-finding trends across audits | Future |
| On-device M-AI evaluation | Future (reserved interface) |
| Voice capture/transcription, OCR of paper records | Future |
| Payments, public app-store release | Out of scope for prototype |

**Explicit exclusions:** no automated legal applicability determination; no auto-classification of findings; no ERP integration; no public release; no Burrana data in any fixture, demo, or test.

## 8. Verification & Validation (summary)

Verification plan in `07-BUILD-SPEC.md` §5–§6 (milestone evidence and the PR→test matrix Claude Code must run and record). Validation plan (did we build the right product) — to be expanded into `12-VALIDATION-PLAN.md` by the build:
- V-01 An auditor with no training generates a checklist for a supplier audit (AS9100D + one customer requirements document) in ≤ 10 minutes.
- V-02 A full-day audit is executed in airplane mode on a mid-range Android phone without data loss; sync completes after reconnect.
- V-03 Brian reviews 20 generated checklist items from a crosswalked scope and judges intent statements correct and non-duplicative.
- V-04 A lead auditor issues a report from synced findings the same day; every finding traces to requirement(s), evidence, and auditor.
- V-05 No finding raised solely because a keyword was absent (spot-check 10 findings).

## 9. Recorded Assumptions (review before production)

| ID | Assumption |
|---|---|
| A-01 | Buyers are independent auditors/consultants and internal audit teams (not certification bodies in V1). |
| A-02 | Pocket Auditor Cloud is multi-organization (each subscriber firm = one `organization`). CE-QMS Next on-prem is single-organization; data model carries `organization_id` everywhere so both work. |
| A-03 | QMSR and EU MDR entries are authority level 1 (regulation); MDSAP is level 3 (regulatory audit program). Needs Brian's confirmation. |
| A-04 | Railway supports the Laravel + Node sidecar + PostgreSQL topology (verify during M0; fall back to separate services). |
| A-05 | Auditors accept evidence stored in the cloud with encryption at rest; some clients may require on-prem (served later by CE-QMS Next). |

## 10. Product Decision Log

| ID | Date | Decision | Rationale | Approver | Status |
|---|---|---|---|---|---|
| PAD-001 | 2026-09-27 | Standalone + CE-QMS ready (LD-01) | Sellable now; no dependency on unfinished CE-QMS Next host | Brian R. Olea | Approved |
| PAD-002 | 2026-09-27 | Ionic React + Capacitor client (LD-02) | One TypeScript codebase for Android/iOS/web; reuses React skills in existing CE tools; mature offline SQLite, camera, file plugins | Brian (delegated) | Approved |
| PAD-003 | 2026-09-27 | Laravel + PostgreSQL host (LD-03) | Binding CE-QMS Next ADR-001/002; Mike's PHP direction | ADR | Approved |
| PAD-004 | 2026-09-27 | Canonical M-AI as Node sidecar (LD-04) | ADR-001: M-AI not ported to PHP | ADR | Approved |
| PAD-005 | 2026-09-27 | Dev on E:, prod on Railway (LD-08) | Home PC unreliable for customers | Brian R. Olea | Approved |
| PAD-006 | 2026-09-27 | Prototype only (LD-09) | Constitution still DRAFT; gates 6–10 not done | Brian R. Olea | Approved |
| PAD-007 | 2026-09-27 | No on-device M-AI in V1 | Canonical kernel imports `node:crypto`/`node:fs` (verified 2026-09-27); a browser build is a kernel change, not a product change. Reserved interface. | Governance | Approved |
| PAD-008 | 2026-09-27 | Requirement decomposition by JudgmentProvider needs a new contract operation (`decomposeRequirements`) | IC-003 defines 8 operations; none decomposes documents. Contract change needs ADR revision. Deterministic segmentation ships first. | Pending Brian | Open (13) |
| PAD-010 | 2026-09-27 | The prototype proceeds under the CE-QMS Next Architecture Constitution while it is DRAFT. Covers: creating this product's own repository/folder and prototype code that implements the Constitution's contracts. Does not cover: CE-QMS Next repository creation, production release, or real client data. Constitution approval (N-07) is required before production. | Brian answered the direct question "Prototype now, production later" on 2026-09-27 | Brian R. Olea | Approved |
| PAD-009 | 2026-09-27 | Rejected: Flutter (new language, no reuse), React Native (weaker web client for library/planning screens), NativePHP Mobile (younger ecosystem, higher offline/store risk) | See PAD-002 | Governance | Recorded |
