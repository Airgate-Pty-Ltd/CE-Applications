# 04 — Product Requirements: Pocket Auditor (prototype, baseline PA-BASELINE-001)

Requirement IDs (PR-xxx) are traced to tests in the PR→test matrix Claude Code maintains in `11-VERIFICATION-REPORT.md` (required by `07-BUILD-SPEC.md` §6).

## 1. Roles and authority

| Role | Can do | Authority |
|---|---|---|
| Organization Admin | Users, roles, auditees, sites, subscription settings | A3 for role changes |
| Library Manager | Import packs, approve/reject requirements and crosswalk links, upload sources | A3 approve; A2 edits |
| Lead Auditor | Plan audits, lock plan, classify findings, override HOLD, issue reports | A3 |
| Auditor | Execute assigned audits, capture evidence, draft findings, sync | A0 local, A2 on sync |
| Auditee Viewer (future) | Read issued report | A0 |

One person may hold several roles. Authority is enforced in Laravel middleware on every route (Authority Matrix §4.1). Client checks are for UX only.

## 2. Workflows (end to end)

### W1 — Load the library
1. Library Manager imports `CE-PA-LIB-CORE` (from `content/library-seed.json`). All records arrive PROPOSED.
2. Library Manager reviews by source; approves individually or in bulk per source. Only APPROVED requirements can enter checklists (PR-001).
3. Candidate crosswalk relations are reviewed; approved MAPS_TO links drive checklist merging (PR-002).

### W2 — Ingest customer requirements and internal documents
1. Upload PDF, DOCX or TXT. User sets: source type, authority level (system suggests from detection patterns), title, revision, effective date, auditee it applies to, license scope (ORG_PRIVATE by default) (PR-010).
2. Server stores file (hash recorded), extracts text, segments deterministically into candidate requirements (clause numbering, "shall/must/will" statements, numbered lists) (PR-011).
3. Optional semantic step (feature flag `JP_DECOMPOSE`, off until PAD-008 approved): JudgmentProvider proposes intent, expected evidence and atomic splits for each segment (PR-012).
4. Reviewer sees segment text beside proposed requirement; accepts, edits, splits, merges or rejects. Accepted = APPROVED with reviewer and time (PR-013).
5. System proposes MAPS_TO links from new requirements to library requirements (same clause family; for JP-enabled, semantic candidates). Reviewer approves (PR-014).
6. Conflicts (e.g., different retention periods) flagged CONFLICTS_WITH with the precedence rule that applies (06 §4). Unresolvable same-level conflicts require a human note (PR-015).

### W3 — Plan an audit
1. Lead Auditor creates audit: auditee, site(s), audit type (internal, supplier, second-party, pre-certification, regulatory readiness, document conformance), dates, team.
2. Selects sources in scope (library + auditee-private). Selects processes/clauses or "full system".
3. Answers applicability questions generated from requirement triggers (e.g., "Does the auditee have design responsibility?"). Each "No" needs a justification (PR-020).
4. System generates the checklist (06 §2–3): ordered by process (default) or clause; each item merges requirements that share intent; risk level, sampling plan, question, evidence hierarchy, interview prompts, prior open findings (PR-021).
5. Lead Auditor reviews, reorders, removes items (removal needs reason), adds items from library. Locks plan → immutable plan snapshot with version and SHA-256 (PR-022). Event `audit.plan.locked`.

### W4 — Prepare for the field
Auditor opens the app, sees assigned audits, taps "Prepare offline". Device downloads plan snapshot, requirement records referenced, auditee-private document excerpts referenced, prior findings. Readiness check shows: package complete, storage free, last sync time (PR-030). The package must allow the whole audit with no connectivity.

### W5 — Audit on site (offline)
1. Audit cockpit: coverage by process, items remaining, risk heat, time used vs planned (PR-040).
2. Item card (core screen, §5): intent first, then the question, sources (with authority badges), evidence to seek, sampling counter, interview prompts, prior findings (PR-041).
3. Capture evidence: photo (camera), file (device picker), record reference (typed or scanned barcode — scanning is Should), observation note, interview note with role. Each evidence item gets type and rank 1–6 automatically from type; device computes SHA-256 at capture (PR-042).
4. Assess three dimensions: Documented / Implemented / Effective = MET, PARTIAL, NOT_MET, UNKNOWN. Not-applicable is an item-level choice ("N/A" with required justification), not a dimension value. Overall intent judgment = auditor's choice; guard toggle "Intent met without the standard's wording" prevents a finding for wording alone (PR-043).
5. Raise finding: prefilled requirement(s) and selected evidence; auditor writes statement; proposes classification (Major NC, Minor NC, Observation, OFI) using severity guidance (06 §6). Offline UX validation shows missing triad parts; incomplete findings can still be saved and synced as DRAFT (06 §9) so the lead sees them (PR-044).
6. Interview mode: list prompts by role; quick-note to item (PR-045).
7. Everything saved locally within 1 second of change; nothing lost on app kill or battery loss (PR-046).

### W6 — Sync
When online (auto or manual), outbox sends batched proposals; evidence files upload with hash check; host validates each item → ACCEPTED, REJECTED (reason), CONFLICT (needs human). Device shows sync center (PR-050). Host is arbiter (Constitution A.5).

### W7 — Review, classify, report
1. Lead Auditor sees synced findings, System-Detected Conditions (M-AI), and optional semantic intent review (JudgmentProvider) per item/finding (PR-060).
2. Classifies each finding (A3) (PR-061).
3. Close-out: coverage summary; regulatory items not assessed; open conditions. Report issue request → M-AI may HOLD; override needs justification (PR-062).
4. Report generated as PDF and DOCX: scope, sources and revisions, method, coverage, findings (requirement / evidence / statement / classification), observations and OFIs, conditions summary, signatures. Versioned, hashed, stored (PR-063).

## 3. Data and evidence requirements
- Every record carries `organization_id`; site-scoped records carry `site_id` (ADR-003).
- Traceability: for any finding, show requirement(s) with source and revision, evidence with capture time/device/hash, auditor, sync acceptance, classifier, report version (PR-070).
- Provenance record for every intelligence result (M-AI, JudgmentProvider, ingestion proposals) (Constitution J) (PR-071).
- Records are never hard-deleted; superseded or voided with reason (PR-072).
- Retention: configurable per organization; default keep (PR-073).

## 4. Non-functional
| ID | Requirement |
|---|---|
| PR-080 | Offline: all W5 functions with no network for ≥ 3 days; ≥ 2,000 evidence photos per audit on a 64 GB device |
| PR-081 | Device data encrypted at rest (SQLCipher-backed SQLite; files encrypted); app lock by device biometrics or PIN |
| PR-082 | Tokens in Keychain/Keystore (secure storage), never in plain storage |
| PR-083 | TLS only; server encryption at rest for database and storage |
| PR-084 | Cross-organization access impossible (tested on every list/fetch/sync/export route) |
| PR-085 | Revoked device: server rejects sync; app purges local data on next launch after revocation notice |
| PR-086 | Accessibility: WCAG 2.2 AA contrast; 48 px touch targets; dynamic type; usable with gloves and in sunlight (high-contrast theme) |
| PR-087 | Performance: item card opens < 300 ms on mid-range Android; checklist generation < 10 s for 300 requirements |
| PR-088 | US English spelling in all UI text and reports |
| PR-089 | No Burrana or real client data in seeds, fixtures, screenshots or demos |

## 5. Screens (how it looks)

Visual system: Conform-Edge brand chrome and tokens from `vera-molecule-design-system` (brand line `CONFORM-EDGE · Pocket Auditor`), **no 3D canvas on mobile**, dark and light themes, high-contrast field theme. Authority badges use one consistent color per level across the app: REG (1), AD (2), PROGRAM (3a), GUIDANCE (3b), CONTRACT (4), STD (5), INTERNAL (6), always with text label (color never carries meaning alone).

### 5.1 Today (home) — mobile
```
┌─────────────────────────────────────┐
│ CONFORM-EDGE · Pocket Auditor   ⟳ ● │  ● = offline/online, last sync 08:12
├─────────────────────────────────────┤
│ NEEDS ATTENTION                     │
│ ▲ 2 conditions on ACME-SUP-014      │  (M-AI, after last sync)
│ ⧗ 3 items awaiting semantic review  │
├─────────────────────────────────────┤
│ IN PROGRESS                         │
│ ACME Supplier Audit · Site 2        │
│ ███████░░░ 68%  · 14 items left     │
│ Next: 8.4.1 Supplier control  ›     │
├─────────────────────────────────────┤
│ UPCOMING · Prepare offline          │
│ Orion MRO internal · Tue            │
│ [ Prepare offline ]  package 0%     │
└─────────────────────────────────────┘
```
7 questions: happening (audits in progress), why (assignment), changed (since last sync), matters most (attention block), needs attention (conditions, pending reviews), next (next item), consequences (items left vs time).

### 5.2 Audit cockpit
```
┌─────────────────────────────────────┐
│ ‹ ACME Supplier Audit      2h10 / 6h│
├─────────────────────────────────────┤
│ Purchasing          ●●●●○○  4/6  HIGH│
│ Production control  ●●○○○○  2/6  HIGH│
│ Nonconforming output●●●●●●  6/6  MED │
│ Calibration         ○○○○    0/4  MED │
├─────────────────────────────────────┤
│ Regulatory items not started: 3  ▲  │
│ Findings drafted: 2 · Evidence: 41  │
└─────────────────────────────────────┘
```

### 5.3 Item card (the core screen)
```
┌─────────────────────────────────────┐
│ ‹ Purchasing · Item 4 of 6     HIGH │
├─────────────────────────────────────┤
│ INTENT                              │
│ Purchased product and services      │
│ conform because suppliers are       │
│ selected, monitored and controlled  │
│ on their ability to meet reqs.      │
├─────────────────────────────────────┤
│ ASK                                 │
│ "Walk me through how a new supplier │
│  is approved and how you know its   │
│  performance is acceptable."        │
├─────────────────────────────────────┤
│ COVERS  [STD] AS9100D 8.4.1         │
│         [STD] ISO 9001 8.4.1        │
│         [CONTRACT] Customer QR-7 §3 │
│         [INTERNAL] QP-740 §4.2      │
├─────────────────────────────────────┤
│ SEEK  1 approval records 2 ASL      │
│       3 scorecards  4 observe RI    │
│ SAMPLE  ▢▢▣▣▣  3 of 5 min  +        │
├─────────────────────────────────────┤
│ ⚑ Prior: Minor NC 2025 (open)       │
├─────────────────────────────────────┤
│ Documented   [MET][PART][NOT][ ? ]  │
│ Implemented  [MET][PART][NOT][ ? ]  │
│ Effective    [MET][PART][NOT][ ? ]  │
│ ☐ Intent met without std wording    │
│ [ N/A — needs justification ]       │
├─────────────────────────────────────┤
│ [📷] [📎] [#Rec] [✎ Note] [🗣 Int.] │
│ [ Raise finding ]   [ Next item › ] │
└─────────────────────────────────────┘
```

### 5.4 Finding composer
```
┌─────────────────────────────────────┐
│ New finding · Purchasing 4          │
│ REQUIREMENT  AS9100D 8.4.1 (+2) ✎   │
│ EVIDENCE     3 selected ✎           │
│ STATEMENT                           │
│ [ Supplier XYZ approved 03/2026     │
│   without the evaluation QP-740     │
│   requires; no performance data...] │
│ PROPOSED  (•) Minor NC  ( ) Major   │
│           ( ) Observation ( ) OFI   │
│ ⓘ Classification is confirmed by    │
│   the lead auditor after sync.      │
│ Checks: ✓ requirement ✓ evidence    │
│         ✓ statement                 │
│ [ Save draft ]                      │
└─────────────────────────────────────┘
```

### 5.5 Sync center · 5.6 Close-out · 5.7 Condition "Why" drawer
Sync center lists outbox items, file upload progress, results (accepted / rejected with reason / conflict → resolve). Close-out shows coverage by process, not-started regulatory items, open conditions, HOLD state, "Request report". Why drawer: rule text, clause refs (if any), fields evaluated, snapshot time and hash, Confirm / Dismiss with note.

### 5.8 Web (same codebase, tablet/desktop layout)
- **Library:** sources list with authority level, revision, approval progress; requirement detail (intent, evidence, failure modes, relations); bulk approve per source.
- **Ingestion review:** split view — source segment left, proposed requirement right; Accept / Edit / Split / Merge / Reject.
- **Crosswalk review:** candidate pairs with basis; approve/reject; conflicts with precedence rule.
- **Audit planner:** wizard (auditee → sources → scope → applicability → generate → review → lock).
- **Lead review:** findings list with conditions and semantic review; classify; close-out; issue report.
