# 08 — SharePoint Scope: Conform-Edge · Pocket Auditor (aerospace)

| Field | Value |
|---|---|
| Status | **PROPOSED — not approved. No code written.** Scope for review by Brian R. Olea before any build starts |
| Date | 2026-10-08 (revised same day: standalone model and existing-tools rule) |
| Product root | `04 Product Portfolio\_Opportunity-Scans\Builds\2026-09-27-pocket-auditor\` — the only place this build writes |
| Standing rule | **Existing tools are never altered.** No change to `m365-qms`, the audits module, any existing SharePoint list, library, schema, permission, template or seed. Read-only reference only (R-9) |
| Model | **Standalone.** Works with no QMS. Can later stack on the auditor tool (checklist generation and auditing), additively (R-10) |
| Supersedes (if approved) | Locked decisions LD-02, LD-03, LD-04, LD-08 and build spec `07-BUILD-SPEC.md` (Ionic / Laravel / Node sidecar / Railway). Change requires Decision Log entries PAD-011 and PAD-012 (§13) |
| Pattern source (read only) | `Conform-Edge-QMS-git/m365-qms/` and the SPFx reference `02 Active Projects/CE-QMS-M365/_ref/Sharepoint-Page-Build/` |
| Scope | Aerospace only: Part 145 repair station (CAAC, UK CAA, EASA, FAA, MX AFAC), Part 21 production (FAA, EASA), AS9100D, AS9110C |

Tags: **[BINDING]** owner decision or inherited rule · **[PROPOSED]** recommendation for review · **[VERIFY]** regulatory reference recalled and not yet checked against the official text · **[OPEN]** not decided.

---

## 1. What is being built

A SharePoint-hosted audit tool that stands on its own. An auditor opens a SharePoint page, selects what is being audited (one or several authorities and standards, plus the parts, clauses and organization documents in scope), and the tool generates a checklist **only from approved requirement data**. The auditor records objective evidence (photos, documents, record references, observations, interviews) against each item, raises findings, and the lead auditor classifies them and issues the report.

It is used in one of two ways, and neither requires the other:

- **Standalone:** an organization that does not use the QMS runs the Pocket Auditor on its own SharePoint site with its own lists and libraries.
- **Stacked:** an organization that uses the auditor tool adds the Pocket Auditor beside it for checklist generation and field auditing. The two exchange data only through the integration boundary in §3.5. The existing tool is not changed.

Everything lives in the customer's Microsoft 365 tenant.

### 1.1 Rules the tool must enforce [BINDING unless marked]

| # | Rule | Source |
|---|---|---|
| R-1 | **No real data, no checklist.** An item is generated only from an APPROVED requirement row whose source is LOADED. A source with no approved data shows NOT LOADED and produces no items. The tool never invents clauses, questions or requirement text. | Owner directive (this request); LD-10 |
| R-2 | **Standard text is not shipped.** Library content is clause reference, title, Conform-Edge-authored intent, expected evidence and failure modes. Customer-uploaded licensed copies stay private to that customer's site. | LD-10; M365 Data Placement (licensed content) |
| R-3 | **Human classifies, tool does not.** The tool never states that an organization is compliant, certified or ready. It never classifies a finding (lead auditor only). "Unknown" evidence is not a nonconformity. | Discovery §4 human-authority boundary |
| R-4 | **Keyword absent is not a finding.** A finding needs a statement of the nonconformity against a requirement, and the auditor confirms the intent was not met. | 01 §7 differentiator (3) |
| R-5 | **Objective evidence only.** Each evidence item carries a type, a rank, what was seen, who saw it, when, and a SHA-256 hash for every file. Definitions follow ISO 19011 and AS9104 (see §5). | Owner directive |
| R-6 | **Authority levels are never blended.** Regulation, certification standard, customer requirement and internal document are shown with their own label. | 01 §4 |
| R-7 | **SharePoint-native storage** (M365 Constitution D-19): lists and libraries hold the record. No database, custom application server or external backend unless an exception is approved. **No Railway hosting in any form** for this product once SharePoint is the direction (owner, 2026-10-08): Railway, the Laravel server, PostgreSQL and the Node M-AI sidecar are all removed from the build. | M365 Constitution D-19 [BINDING for the M365 program]; owner message 2026-10-08 |
| R-8 | **Dual-use boundary for AS9110 / Part 145 / Part 21.** Where manufacturing and repair authority overlap, the tool follows the aerospace boundary auditor rules and does not merge authorities. | Skill `aerospace-mro-manufacturing-boundary-auditor` |
| R-9 | **Existing tools are never altered.** This build does not change, add to, rename, re-permission, re-provision or re-seed any existing tool: not `m365-qms`, not the audits module, not any existing SharePoint list, library, column, view, permission or template. Existing tools are read only, and only by an integration the owner of that tool has approved. Work is written only under the product root. | Owner directive 2026-10-08 ("do not alter existing tools, ever") |
| R-10 | **Standalone first; stacking is additive.** Every function works with no QMS present. The Pocket Auditor has its own lists, sources, evidence library, reports and step rules. Integration is an optional module that adds a connection; it is never a prerequisite for any function and never changes what the existing tool does. | Owner directive 2026-10-08 |
| R-11 | **Works online or offline; nothing is lost.** The tool runs with no connection. Every result is stored on the device before it is confirmed on screen, and reaches SharePoint automatically when the connection returns. An audit is never lost track of because the internet went down. Rules C-1 to C-10 in §9 are binding. | Owner directive 2026-10-08 ("the tool needs to work on or offline … we cannot have it lose track of the audit if internet goes down") |

---

## 2. Audit selection tool (the entry point)

The selection tool is step 1 of every audit. It answers: *what are we auditing, against what, and which parts of it.* It writes a **scope record** that the checklist generator reads. One audit can cover several sources at once (for example, Part 145 FAA plus AS9110C).

### 2.1 Selection flow

| Step | Screen | What the auditor selects | Rule |
|---|---|---|---|
| 1 | **Audit type** | Repair station (Part 145), production (Part 21), quality system (AS9100D / AS9110C), combined | Type sets the default sources offered; any source can still be added |
| 2 | **Authorities and standards** (multi-select) | CAAC CCAR-145-R4 · UK CAA Part-145 · EASA Part-145 · FAA 14 CFR Part 145 · MX AFAC Part 145 · FAA 14 CFR Part 21 · EASA Part 21 · AS9100D · AS9110C | Each shows its data status: LOADED (approved rows, revision, effective date), PARTIAL, or NOT LOADED. NOT LOADED sources can be selected but produce no items; the screen says so |
| 3 | **Parts, subparts and clauses** (per source) | "Full source" or a tree of subparts / clauses / sections | Tree comes from the loaded source only. Partial scope is recorded as a scope line, not a deletion |
| 4 | **Organization documents reviewed** | Procedures, manuals, forms, certificates, uploaded to the Pocket Auditor's own document library, with the revision and effective date each one is at | Each document selected becomes a **Document Review** line (§4.3). This is how the report shows "we reviewed document X rev Y" |
| 5 | **Crosswalk preview** | Items that two or more sources cover (approved MAPS_TO only) are merged into one question with all covering clauses listed | Duplicate intent is merged only when an approved crosswalk exists |
| 6 | **Lock scope** | Scope becomes an immutable snapshot (version, hash, lock time, locked by) | Same rule as audit plan lock in `04-PRODUCT-REQUIREMENTS.md` W3 |

### 2.2 Selection examples (for acceptance tests)

- **Example A — FAA Part 145 + AS9110C.** Sources 2 and 9 selected. Checklist = union of the FAA Part 145 clauses in scope and the AS9110C clauses in scope, with approved overlaps merged. Each item shows both covering sources.
- **Example B — EASA Part-145 only.** One source, full scope. If the EASA Part-145 source is NOT LOADED, the scope is saved, the checklist is empty, and the screen says "EASA Part-145: no approved requirement data — upload the source or request the library pack."
- **Example C — Part 21 production (FAA + EASA).** Two sources; overlap is shown but not merged unless an approved crosswalk exists.

---

## 3. Source data: how checklists get their real data

### 3.1 Data status today (verified against the local library, 2026-09-27)

| Source | Type (authority level) | In the library today | Status for this tool |
|---|---|---|---|
| AS9100D | Certification standard (5) | 84 records, PROPOSED | Loaded after Brian approves (N-01) |
| AS9110C | Certification standard (5) | 25 records, PROPOSED | Loaded after approval (N-01) |
| AS9120B | Distributor standard (5) | 18 records, PROPOSED | Not in scope of this request; available |
| ISO 9001 / 13485 / IATF / 14001 / QMSR / MDSAP / EU MDR | Standard / regulation (1, 3a, 5) | Records exist (non-aerospace) | Out of scope for this build; do not offer in the aerospace selection |
| **FAA 14 CFR Part 145** | Regulation (1) | **No atomic catalog** (N-03) | **NOT LOADED** |
| **FAA 14 CFR Part 21** | Regulation (1) | **No atomic catalog** (N-03) | **NOT LOADED** |
| **EASA Part-145** | Regulation (1) | **No atomic catalog** (N-03) | **NOT LOADED** |
| **EASA Part 21** | Regulation (1) | **No atomic catalog** (N-03) | **NOT LOADED** |
| CAAC CCAR-145-R4 (《民用航空器维修单位合格审定规则》, MOT Order 8 of 2022, in force 2022-07-01) | Regulation (1) | Official R4 text extracted: 43 articles (Chinese), `content\rows-caac-maint-org.json`. No approved rows. The vault's R4 training series (`Teachable Lessons\CAAC-CCAR145-R4-Series`) is a teaching aid, not a requirement catalog | **NOT LOADED** (text extracted; translation and approval needed) |
| UK CAA Part-145 | Regulation (1) | None | **NOT LOADED** |
| MX AFAC Part 145 | Regulation (1) | None | **NOT LOADED** |
| EASA Form 8 / MAG CHG 10 | Form / program (1, 3a) | Two reference files in `_Skills\conform-edge-pocket-auditor\references\` (different format; needs a second converter pass) | Not offered until converted and approved |

**Conclusion:** the five aviation authorities for Part 145 and the two Part 21 sets have **no requirement data in the product today.** The skill lists them; the data does not exist. The tool will not generate their checklists until the data is loaded. That is the honest state, and the build must show it on screen.

### 3.2 Three ways a source gets loaded

| Route | How | Phase | Who approves |
|---|---|---|---|
| **A. Conform-Edge library pack** | Conform-Edge authors atomic rows (clause ref, title, intent, expected evidence, failure modes) from the official text the owner holds. Converted with a converter in the same format as `content/convert_catalogs.py` and imported to the Pocket Auditor's own *PA Sources* and *PA Requirements* lists (§7) | P2 | Library Manager, then owner (A3) |
| **B. Customer upload** | Customer uploads its licensed copy or its own requirement list (PDF / DOCX / XLSX). Segmented into candidate rows; a reviewer accepts, edits, splits or rejects each one. Stays in that customer's site | P2 | Customer Library Manager (A3) |
| **C. Regulator polling** | A scheduled Power Automate flow checks the official regulator source (for example, the eCFR or EUR-Lex for FAA and EASA text) and writes a **snapshot** with its hash and date to a library. It never changes approved rows. A human reviews the change and approves the new revision | P6 (optional) | Library Manager (A3) |

Polling is not built first. The regulator sites differ (some publish XML or JSON, some PDF, some block automated access); each source's terms of use must be checked before polling it. Until then, Routes A and B are the way data gets in.

### 3.3 Source metadata (per source, required)

Source code · name · issuer · **revision** · **effective date** · authority level (1–6) · source type (REGULATION / AD / REGULATORY_PROGRAM / GUIDANCE / CONTRACT / STANDARD / INTERNAL) · jurisdiction · licence scope (SHARED_LIBRARY or ORG_PRIVATE) · catalog SHA-256 · status (NOT LOADED / PARTIAL / LOADED) · approved by · approved on.

### 3.4 Standalone data model; no changes to existing lists [BINDING, R-9 and R-10]

The Pocket Auditor creates **its own** lists and libraries on its own site, all prefixed `PA`. It does not add to, rename, or reuse the columns of any existing list. The audits module's `lists\schema.py` and `lists\steps.py` are read for design reference only; they are not imported, edited or provisioned by this build.

Why not reuse the audits module directly: doing so would require adding columns to lists the existing tool owns (a change to an existing tool, prohibited), and would make the Pocket Auditor unusable without the QMS (a breach of R-10). The records are kept separate; §3.5 covers how they are joined when the two are stacked.

The Pocket Auditor's own list set is in §7.

### 3.5 Integration boundary (optional; additive; never required)

Stacking on the auditor tool is a separate, optional module. It is built in its own solution and only when the owner of the existing tool approves it. Three modes, from least to most coupled:

| Mode | What it does | Changes the existing tool? | Recommended |
|---|---|---|---|
| **I-0. None** | Standalone. No exchange | No | **Default** |
| **I-1. Export package** | The Pocket Auditor exports a checklist or findings set as a versioned file (JSON plus SHA-256, with a schema and version). The existing tool's owner decides whether and how to import it, through whatever channel that tool already offers. The Pocket Auditor does not write into the existing tool | No. The existing tool is only given a file | **Recommended first integration** |
| **I-2. Read-only copy-in** | The Pocket Auditor reads the existing tool's question banks or standards through a read-only permission the existing tool's admin grants, and copies them into its own *PA Requirements* list with the source hash and date. It never writes back | No. Read permission only, granted by its admin | Later, if I-1 is not enough |
| I-3. Two-way sync or direct writes into existing lists | Writes into lists the existing tool owns | Yes | **Not permitted by R-9** |

Acceptance for any integration mode: the existing tool passes its own checks unchanged, the Pocket Auditor passes its checks with the existing tool absent, and no existing list, library, schema, permission or template shows a change in its change history.

---

## 4. Features and functions

Priority: **M** = must for the first usable build · **S** = should · **L** = later. IDs are proposed; they are traced to tests in the build's verification report.

### 4.1 Selection and scope (§2)

| ID | Function | Pri |
|---|---|---|
| PA-SP-01 | Choose audit type and one or more authorities / standards | M |
| PA-SP-02 | Show data status per source (LOADED / PARTIAL / NOT LOADED) with revision and effective date | M |
| PA-SP-03 | Choose parts, subparts, clauses or "full source" per source | M |
| PA-SP-04 | Choose organization documents reviewed (revision and effective date captured) | M |
| PA-SP-05 | Preview merged items from approved crosswalks | S |
| PA-SP-06 | Lock scope as an immutable snapshot with hash; later changes need a new version | M |

### 4.2 Checklist generation (rules in `06-DECISION-LOGIC.md`)

| ID | Function | Pri |
|---|---|---|
| PA-SP-10 | Generate items only from approved rows in LOADED sources (R-1) | M |
| PA-SP-11 | Group items by process area (default) or by clause | M |
| PA-SP-12 | Show, per item: intent, the question to ask, covering sources and clauses, evidence to seek, interview prompts, prior open findings | M |
| PA-SP-13 | Deterministic: same scope and same source hashes give the same checklist and the same hash | M |
| PA-SP-14 | Risk level and sampling plan per item (inherited from `06-DECISION-LOGIC.md` §2–3) | M |
| PA-SP-15 | Lead auditor can reorder, remove (reason required) or add a library item; removals are kept in history | M |
| PA-SP-16 | Lock the checklist (copies into *PA Checklist Items*; later source revisions do not change a locked audit) | M |

### 4.3 Audit execution

| ID | Function | Pri |
|---|---|---|
| PA-SP-20 | Item card: intent first, then question, covering sources (with authority labels), evidence to seek, sampling counter | M |
| PA-SP-21 | Assess each item: Documented / Implemented / Effective, each MET, PARTIAL, NOT MET or UNKNOWN; overall auditor judgment; "intent met without standard wording" guard | M |
| PA-SP-22 | Not applicable as an item-level choice with a required justification | M |
| PA-SP-23 | Record a **document review** (PA-SP-04 items) with revision, date, reviewer, result and sample | M |
| PA-SP-24 | Attach evidence: photo (camera or file picker), document, record reference, observation note, interview note (role, date) | M |
| PA-SP-25 | Compute SHA-256 in the browser before upload; store it with the file; verify again after upload | M |
| PA-SP-26 | Evidence is never overwritten; same-name files get item-unique names (Data Placement DP-23) | M |
| PA-SP-27 | Interview mode: prompts by role; quick note linked to the item | S |
| PA-SP-28 | Progress view: coverage by process area, items left, regulatory items not started | M |

### 4.4 Evidence record (fields on the Pocket Auditor's own *PA Evidence* library)

Evidence type (RECORD · DOCUMENT · SYSTEM_DATA · OBSERVATION · INTERVIEW · VERBAL) · rank 1–6 from type · description · record reference · interviewee role (interviews) · SHA-256 (captured) · SHA-256 (stored) · captured at · captured by · source linkage (audit, checklist line, finding).

### 4.5 Findings, classification and report

| ID | Function | Pri |
|---|---|---|
| PA-SP-30 | Raise a finding from an item: requirement(s), evidence selected, statement of nonconformity, proposed type (Major NC, Minor NC, Observation, OFI) | M |
| PA-SP-31 | Completeness check (requirement, evidence, statement) before submission; incomplete findings save as DRAFT | M |
| PA-SP-32 | Classification and status are set by the lead auditor only (A3). Not set by the auditor or by the tool | M |
| PA-SP-33 | Report: scope and sources with revisions, method, documents reviewed with revision, coverage, findings (requirement / evidence / statement / classification), observations and OFIs, signatures | M |
| PA-SP-34 | Report saved to the Pocket Auditor's *PA Reports* library as DOCX and PDF with SHA-256 and version; a new version never overwrites an issued one | M |
| PA-SP-35 | Close-out: items not assessed, open findings, report request. Report issue requires a named lead auditor | M |
| PA-SP-36 | Repeat-finding check against the Pocket Auditor's own prior findings on the same clause. Prior findings from an existing tool come only through an approved integration mode (§3.5) | S |

### 4.6 Roles and access (A0–A3)

| Role | Can | Authority |
|---|---|---|
| Library Manager | Load sources, approve requirement rows, approve crosswalk links | A3 approve, A2 edit |
| Lead Auditor | Create and lock scope and checklist, classify findings, issue reports | A3 |
| Auditor | Execute assigned audit items, record evidence and document reviews, draft findings | A0 local, A2 on submit |
| Organization Admin | Users, site membership, licence scope | A3 for role changes |
| Auditee (future) | Read issued report | A0 |

Access is enforced by SharePoint permissions on each Pocket Auditor list and library, with the app checking role on every write. The app is the enforcement point for the A3 steps (SharePoint permissions alone cannot express "only the lead auditor may classify"). The Pocket Auditor has its own step rules (`pa-steps.ts`, to be written in P1, not copied into or from the audits module).

### 4.7 Explicitly out of scope for the first build

On-device M-AI · JudgmentProvider (VERA) semantic review · OCR of paper records · voice · payments · app-store release · CE-QMS Next sync · automated legal applicability · automatic finding classification · non-aerospace standards in the selection screen · any write into an existing tool (R-9).

---

## 5. Evidence definitions (ISO 19011 and AS9104)

The owner asked that evidence follow the definitions in ISO 19011 and AS9104. These are the working definitions the tool implements. **Check the wording against the owner's licensed copies before the report template is issued** (standard text cannot be reproduced in the product, R-2).

| Term | Working definition used by the tool | Source to verify |
|---|---|---|
| Audit evidence | Records, statements of fact or other information, which are relevant to the audit criteria and verifiable | ISO 19011 §3 and the evidence clauses in §6.4 |
| Audit findings | Results of the evaluation of the collected audit evidence against audit criteria | ISO 19011 §3 and §6.4 |
| Objective evidence | Verifiable information, recorded or as a statement of fact, that the auditor saw or obtained | AS9104 definitions (confirm the wording against the licensed AS9104 text) |
| Verifiable | Another person could check it: the record, its date, its source | ISO 19011 |

**Evidence rank (for display and sufficiency):** rank 1 = direct observation of the activity or a controlled record (highest), down to rank 6 = verbal statement without support. Rank is set from the evidence type (§4.4) and the auditor can only lower it, with a reason. This is a proposal to confirm with the owner.

---

## 6. Architecture (SharePoint-native, standalone)

### 6.1 Components

| Layer | Component | Why |
|---|---|---|
| Page | **SPFx web part** "Pocket Auditor" (one solution, several web parts: Selection, Checklist, Execute, Findings, Sources) | Same pattern as the reference `headcount-requests` solution: SPFx 1.23.2, Heft build, Fluent UI, TypeScript |
| Records | The Pocket Auditor's own SharePoint lists (§7) on its own site | Constitution D-19: SharePoint-native default; standalone under R-10 |
| Files | The Pocket Auditor's own libraries: *PA Evidence*, *PA Sources* (documents, ORG_PRIVATE by default), *PA Reports* | Versioning, retention, co-authoring native |
| Offline store (device) | Encrypted local database (IndexedDB) with an outbox, evidence blobs, and a hash-chained device event log (§9). Holds all work until SharePoint acknowledges it | R-11; §9 |
| Identity | Entra ID (the user's sign-in). Delegated token for any API the app calls, if one is ever used | Constitution IC-007 |
| Integration (optional) | Export package (I-1) or read-only copy-in (I-2), in a separate module (§3.5). Power Automate for regulator polling (P6), email, notifications | Constitution IC-series |
| Provisioning | `pa-provision.py` (PnP CLI for Microsoft 365) with `pa-schema.py` as the single definition for the Pocket Auditor's own lists, kept in the product root | Reference pattern; no change to any other module's schema |

### 6.2 What is NOT in the architecture (and why)

| Removed from the locked design | Replacement in this scope | Decision needed |
|---|---|---|
| Ionic React + Capacitor client (LD-02) | SPFx web part on the SharePoint page | D-1 |
| Laravel + PostgreSQL server (LD-03) | SharePoint lists | D-1 |
| Node M-AI sidecar (LD-04) | Not in the first build. Deterministic checks run in the web part; any M-AI integration later is an exception under D-19 | D-1 |
| Railway hosting (LD-08) | The customer's SharePoint tenant | D-1 |
| Offline-first local SQLite (PR-080 to PR-082) | Online-first. Offline is OQ-08 | D-3 |

### 6.3 Limits that shape the design (from the M365 Data Placement Matrix)

- A list view threshold of 5,000 items: indexed filter first; Graph filters one indexed field at a time. Design queries around indexes; keep one audit's checklist as its own folder or a filtered child list.
- 5,000 unique permission scopes per list or library. Per-audit folders with inherited permissions avoid this.
- No row-level visibility on a list: anyone who can read a list reads all its rows. Confidential audits go in their own library or site.
- Lists do not sync offline. Libraries can be synced for offline reading (useful for the printed checklist and source documents, not for capture).

### 6.4 Client-side rules

- All checklist rules run in the web part, in TypeScript, unit-tested (same approach as `hcLogic.ts` in the headcount app).
- The checklist generator is a pure function: inputs = scope snapshot + approved rows + crosswalk links; output = checklist + hash. Same inputs, same output.
- Hash function: SHA-256 via the browser's Web Crypto API.

---

## 7. Data model (Pocket Auditor's own lists — all new, all prefixed PA)

Nothing in this table exists in, or is added to, any existing list. Each list has its own columns and its own permissions.

| List / library | Purpose | Key columns |
|---|---|---|
| **PA Sources** | Regulatory and standard sources | Source code, name, issuer, revision, effective date, authority level, source type, jurisdiction, licence scope, catalog hash, status (NOT LOADED / PARTIAL / LOADED), approved by, approved on |
| **PA Requirements** | Approved and proposed rows per source (clause level) | Source ref, clause ref, title, intent, expected evidence, failure modes, risk level, sampling minimum, status (PROPOSED / APPROVED / RETIRED), approved by, approved on |
| **PA Crosswalk** | Candidate and approved links between requirement rows | From ref, to ref, relation (MAPS_TO / CONFLICTS_WITH), status, basis, approved by |
| **PA Audits** | One row per audit | Title, audit type (repair station Part 145 / production Part 21 / AS9100D / AS9110C / combined), auditee, sites, lead auditor, status, scope snapshot ref, scope hash, checklist hash |
| **PA Scope Lines** | Scope selection | Audit ref, source ref, subpart / clause ref, in-scope flag, scope version, scope hash |
| **PA Document Reviews** | Organization documents reviewed | Audit ref, document title, document number, revision, effective date, reviewed by, review date, result, sample size, notes |
| **PA Checklist Items** | Locked checklist lines, copied at lock | Audit ref, item no, process area, intent, question, covering sources (multi), covering clauses (multi), Documented / Implemented / Effective results, auditor judgment, N/A justification, document-review link, sampling count |
| **PA Findings** | Findings | Audit ref, checklist item ref, requirement refs (multi), evidence refs (multi), statement, submission status (DRAFT / SUBMITTED), proposed type, classification (lead only), classified by, classified on, status |
| **PA Evidence** (library) | Evidence files, one folder per audit, sub-folder per finding | Evidence type, rank, description, record reference, interviewee role, SHA-256 captured, SHA-256 stored, captured at, captured by, checklist item ref, finding ref |
| **PA Reports** (library) | Issued reports, versioned | Version, format (DOCX / PDF), SHA-256, issued by, issued at |
| **PA Sources library** (library) | Uploaded source documents and customer licensed copies | Source ref, revision, hash, licence scope, uploaded by |

The Pocket Auditor's `pa-schema.py` is its single definition. No other module's schema file is read into it, imported from it, or edited by it. If an integration (§3.5) needs a mapping, the mapping lives in the integration module, not in either tool.

---

## 8. Build phases

Each phase ends with evidence (tests and a short report). Nothing starts until the decisions in §12 are answered for that phase.

| Phase | Content | Exit test |
|---|---|---|
| **P0 — Decisions** | §12 answered; this document approved or amended; PAD-011 and PAD-012 logged | Decision Log shows approved entries |
| **P1 — Foundation** | Tenant and site confirmed; SPFx solution skeleton (1.23.2, Heft); `pa-schema.py` and `pa-provision.py` in the product root; dry-run and apply on the test site; role mapping; one web part renders on a page | Dry-run diff reviewed; web part renders on the test page; the PA lists exist and match `pa-schema.py`; a change-history check shows no existing tool touched |
| **P2 — Sources and selection** | Source register screen (status per source); Route A import of AS9100D and AS9110C (after N-01 approval); Route B upload with segmentation and review; selection flow §2; scope lock | Example A (§2.2) produces a locked scope; Example B shows NOT LOADED correctly |
| **P3 — Checklist generation** | Pure-function generator (R-1, PA-SP-10 to 16); crosswalk merge; deterministic hash | Same inputs give the same hash (100 runs); a NOT LOADED source produces zero items; unit tests for each rule |
| **P4a — Offline store and PoC** | Offline store with outbox and device event log (C-1 to C-10); proof of concept of options A and B (§9.4) on iOS and Android; audit package download and readiness check | OF-01 and OF-02 pass on the chosen option; the option is recorded as a decision |
| **P4b — Execution and sync** | Item card; D/I/E assessment; document review; evidence capture with SHA-256; progress view; sync engine (§9.3) with status per item | Full audit of 20 items in airplane mode, then sync; OF-03 to OF-07 pass |
| **P5 — Findings and report** | Finding composer; A3 classification; DOCX and PDF report; version and hash | Report issued from synced findings; each finding traces to requirement, evidence and classifier |
| **P6 — Integration (optional)** | I-1 export package first; I-2 read-only copy-in only if I-1 is not enough and the existing tool's owner approves. Regulator polling (Power Automate) separately | Existing tool unchanged (change-history check); Pocket Auditor passes with the existing tool absent |
| **P7 — Offline (only if OQ-08 approves)** | Decision on the offline approach (see §9) | Defined in its own scope |

---

## 9. Offline: a real gap, not a small item

The Pocket Auditor was first defined as offline-first (PR-080: three days with no connection). SharePoint and SPFx do not provide that. The M365 Data Placement Matrix says lists do not sync offline, and the Application Experience §11 marks offline field audit as OQ-08.

| Option | What it gives | Cost and risk |
|---|---|---|
| **1. Online-first now; offline deferred (recommended)** | Full function when connected. Capture on a phone needs signal | Does not meet PR-080. Auditors at remote sites lose work if signal drops — mitigated only by "save fails visibly, nothing discarded" |
| 2. Offline queue inside the SPFx web part (IndexedDB + retry) | Captures while offline; sends on reconnect | Browser storage limits; SPFx is not a service worker; large evidence files need care; work-in-progress in browser storage conflicts with the "records in SharePoint" rule. Needs a proof of concept |
| 3. Power Apps canvas app | Native offline in mobile apps | Licence per user; a second client stack; not in the SPFx pattern. Needs a decision |
| 4. Separate native app | Full offline | Reintroduces the custom server and store release that D-19 excludes |

**Recommendation:** option 1 for the first build, with a proof-of-concept of option 2 in P4 to decide. This changes the product definition (01 §2, PR-080 to PR-082), so it needs the owner's decision (D-3).

---

## 10. Regulatory and governance boundaries

- The tool supports planning, performing and documenting audits. It does not determine legal applicability, state compliance, or classify findings.
- Regulatory references in this document marked [VERIFY] (for example, the Part-145 and Part-21 regulation numbers and the Mexican RAC 145 reference) must be checked against the official text before any source is labelled LOADED.
- Customer uploads stay in that customer's site. No customer text is used to build shared library content.
- Burrana material is not used in any fixture, seed, demo or screenshot. The `configurations\burrana` folder in the M365 repo is not used for the Pocket Auditor.
- Standards and regulations are not redistributed (LD-10). The library holds Conform-Edge paraphrase and clause references only.
- Existing tools are read only (R-9). Nothing in this build writes outside the product root. Any future integration that touches an existing tool needs that tool owner's approval first.

---

## 11. Risks

| # | Risk | Effect | Mitigation |
|---|---|---|---|
| RK-1 | No atomic catalog for FAA / EASA / CAAC / UK CAA / AFAC Part 145 or Part 21 | Tool shows empty checklists for those sources; "generated from real data" cannot be met for them | Show NOT LOADED; load by Route A or B before any aerospace launch (N-03) |
| RK-2 | Offline requirement dropped | Field use fails on sites without signal | Owner decision D-3; PoC in P4 |
| RK-3 | Two audit records for the same audit (Pocket Auditor and the existing tool) | Duplicate records and drift | Standalone model (R-10); integration only by approved export or read-only copy-in (§3.5); no shared lists |
| RK-4 | Architecture discovery says "no implementation authorized" for the M365 program | Build could be blocked by the program's own gate | Owner approval recorded in PAD-011 for the Pocket Auditor build; no file in the M365 repo is written |
| RK-5 | Regulator sites block or restrict polling | Route C fails | Route C is optional; Route A and B first |
| RK-6 | Standards text reproduced by mistake | Licence breach | R-2; reviewer check on every imported row |
| RK-7 | Dates and revisions wrong on a source | Report cites a superseded revision | Revision and effective date required before LOADED; source hash recorded |
| RK-8 | Large photo volumes in SharePoint libraries | Slow views, storage | Compress on capture, keep the original hash; per-audit folders |
| RK-9 | Lists view threshold and permission scopes | Slow queries, permission failures | Index design; per-audit folders with inheritance (§6.3) |
| RK-10 | An integration step accidentally writes into an existing list | Breaks R-9 and the existing tool | Integration module has no write credentials to existing lists; change-history check in acceptance (§3.5) |
| RK-11 | SharePoint page or SPFx cannot run offline reliably (no service worker at page scope; storage eviction on mobile) | Offline capture fails on the devices that matter | Proof of concept in P4a (options A and B, §9.4); rules C-1 to C-10 are the acceptance criteria whichever option wins |
| RK-12 | Device lost or wiped with unsynced work | Audit evidence lost | C-9: sync prompts, encrypted local store, supervisor view of unsynced audits; owner decision D-3b on device management |
| RK-13 | Duplicate records on retry after a dropped connection | Double-counted results | Idempotency key per outbox entry, stored on the SharePoint row; repeated sends return the existing row (§9.3, OF-05) |

---

## 12. Decisions needed from Brian (before P1)

| ID | Question | Recommended answer | Blocks |
|---|---|---|---|
| **D-1** | Confirm the move to SharePoint-native for this product: supersede LD-02, LD-03, LD-04, LD-08 and the Ionic/Laravel build spec, and record it as PAD-011 | Yes. Keep the Ionic/Laravel design as a dormant reference, not a build target | Everything |
| **D-2** | Integration with the auditor tool: none, export package (I-1), or read-only copy-in (I-2) | Standalone first (I-0). Add I-1 later when the auditor tool's owner agrees. No writes into existing lists, ever | P6 |
| **D-3** | Offline approach: which client option (A: SPFx + local store, or B: standalone PWA) | Run PoCs of A and B in P4a against §9.2 and §9.5; choose by test result. Hosting a PWA is a D-19 question for owner approval | P4a |
| **D-3b** | Device management for lost or wiped devices (C-9): accept the residual risk, or require Intune-managed devices with a wipe policy | Require managed devices for field use; owner to confirm | P4b |
| **D-4** | Which tenant and site (Conform-Edge tenant, not Burrana) and who the test users are | Conform-Edge tenant, a new test site. Not the Burrana or ExCo sites | P1 |
| **D-5** | Who authors the aerospace content (Route A) for FAA, EASA, CAAC, UK CAA and AFAC Part 145, and Part 21 FAA / EASA. Official texts are needed | Conform-Edge authors paraphrase rows from the official text; owner signs off per source | P2 (aerospace launch) |
| **D-6** | Regulator polling in scope now or later | Later (P6). Manual upload first | P6 |
| **D-7** | Report format and signature method | DOCX and PDF, versioned, with SHA-256; signatures as typed names with date until a signing method is chosen | P5 |
| **D-8** | Evidence rank scale (§5) | Adopt the proposed six-level scale; owner to confirm against ISO 19011 and AS9104 | P3 |
| **D-9** | Approve AS9100D and AS9110C library rows (N-01) so they can load | Approve after review of the 109 proposed rows | P2 |

Earlier open items still apply: N-02 (authority levels), N-07 (CE-QMS Constitution approval), N-08 (pricing), N-09 (app stores — not needed for SharePoint), N-12 (credential files to move out of synced folders, not product-specific).

---

## 13. Proposed Decision Log entries (for `01-DISCOVERY-RECORD.md` §10)

| ID | Date | Decision | Rationale | Approver | Status |
|---|---|---|---|---|---|
| PAD-011 | 2026-10-08 | Build Pocket Auditor as a SharePoint-hosted SPFx application using its own SharePoint lists and libraries. Supersedes LD-02, LD-03, LD-04, LD-08 for this product. No Railway hosting. | Owner directive 2026-10-08: "fully scoped as a SharePoint tool that we can use in our SharePoint"; "when I state SharePoint, Railway goes away"; M365 Constitution D-19 (SharePoint-native default) | Brian R. Olea | **PROPOSED — awaiting approval (D-1)** |
| PAD-012 | 2026-10-08 | Standing rule: existing tools are never altered. The Pocket Auditor is standalone (works without the QMS). Stacking on the auditor tool is additive, optional, and limited to the integration modes in §3.5. No Pocket Auditor build writes into an existing list, library, schema, permission or template. | Owner directive 2026-10-08: "this does not impact the existing tools at all … do not alter existing tools, ever" | Brian R. Olea | **PROPOSED — standing rule; awaiting approval** |
| PAD-013 | 2026-10-08 | Offline operation is in scope. The tool works with or without a connection; results are held on the device until SharePoint acknowledges them; sync is automatic on reconnect; rules C-1 to C-10 (§9) are binding. Supersedes the online-first recommendation for D-3 in the earlier draft of this scope | Owner directive 2026-10-08: "the results feed into sharepoint as soon as they reconnect. we cannot have it lose track of the audit if internet goes down" | Brian R. Olea | **PROPOSED — awaiting approval (D-3)** |

---

## 14. Source documents read for this scope

- `04 Product Portfolio\_Opportunity-Scans\Builds\2026-09-27-pocket-auditor\` — 00, 01, 04, 05, 13, BUILD-GOVERNANCE-STATUS, content\CONVERSION-REPORT
- `Conform-Edge-QMS-git\m365-qms\` (local copy, **read only**; the GitHub repo `Airgate-Pty-Ltd/Conform-Edge-QMS` is private and was not reachable from this session) — architecture (Constitution, Integration Contracts, Data Placement, Application Experience), `audits\` (README, GAP-ANALYSIS, WIRING, `lists\schema.py`, `lists\steps.py`). Nothing in this tree was written.
- `02 Active Projects\CE-QMS-M365\MODULE-BUILD-BRIEF.md`, `deploy-facts.md` — read only
- `02 Active Projects\CE-QMS-M365\_ref\Sharepoint-Page-Build\headcount-requests\` — SPFx pattern (package.json, config, README), read only
- `_Skills\conform-edge-pocket-auditor\` — SKILL.md and two reference files (not the full aerospace catalog)

**Not read in depth (time):** the M-AI DIM drafts in `mai\dims-draft\` (only needed if M-AI is reintroduced), `content\library-seed.json` (329 rows, all PROPOSED), the aerospace regulatory router packs, and the `pocketaudit.zip` in `hermes-files` (not extracted: unknown contents, treated as untrusted until reviewed).

---

## 15. What can be delivered today

- This scope (08) and the decisions in §12.
- With D-1, D-3 and D-4 answered: P1 foundation (SPFx skeleton, the Pocket Auditor's own list schema, provisioning dry-run on the test site) can start the same day. No existing tool is touched.
- P2–P3 cannot produce aerospace checklists today. The sources (D-5) are the blocker, not the software.
