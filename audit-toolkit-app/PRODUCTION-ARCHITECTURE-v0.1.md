# Production Architecture and Interfaces — v0.1 (design for controlled implementation)

**Date:** 2026-10-11 · **Status:** DRAFT design; implementation of "approved" parts only (see `PRODUCTION-BUILD-READINESS-MATRIX.md`). `RELEASE_NOT_AUTHORIZED`.
Builds on `ARCHITECTURE-AND-CONTRACTS.md` (component split and the two contracts). Nothing here is deployed.

## 1. Principles carried from the prototype
Audit depth is the product: exact obligations, evidence sufficiency, alternatives evaluated, exact-citation NCRs, authorized approval, reproducible record. Deterministic core; intelligence advises only; auditor decides; offline first; invisible intelligence in customer language; Conform-Edge only branding.

## 2. Layers
```
┌ Customer app (Capacitor/Android; tablet/phone UI) ─────────────────────────┐
│  UI (screens from prototype IA)                                            │
├ Governed Audit Runtime (pure logic, no I/O, no Node/DOM dependency) ───────┤
│  applicability · assessment · conclusion governance · sampling · citation  │
│  · NCR gates & lifecycle · record hashing · verification rules             │
├ Ports (interfaces) ────────────────────────────────────────────────────────┤
│  StorageAdapter · ClockPort · IdPort(auth) · MediaPort(evidence)           │
│  IntelligenceProvider (audit-intelligence/0.1) · DecisionGovernance        │
│  (decision-governance/0.1) · SyncPort                                      │
├ Adapters ──────────────────────────────────────────────────────────────────┤
│  device encrypted store · test stores · engineering stub provider ·        │
│  in-runtime decision rules (Kernel adapter later, only when BD-03 clears)  │
└────────────────────────────────────────────────────────────────────────────┘
Service side (separate, later): sync API, tenant store, identity, pack distribution, optional intelligence provider.
```
The runtime takes time, randomness and storage as injected ports so that the same audit input yields the same assessments, gate results and record hash on every platform.

## 3. Runtime functions (specified by the prototype and its tests)
| Function | Contract (see source) | Tests |
|---|---|---|
| `resolveScope(profile, obligations)` | Deterministic applicability with a reason per obligation; vendored framework resolver | T-SCN |
| `assess(obligation, evidence, sample)` | Per-aspect status `met / unmet / unconfirmed / claimed / untested`; recommended outcome `demonstrated / nc-supported / potential / insufficient`; interview-only support is `claimed`; rebuttals tracked | T-SCN, T-DEP |
| `checkConclusion(...)` | Permitted/prohibited conclusions with reasons | T-SCN, UI |
| `drawSample(pop, k, seed)` | Seeded, reproducible | T-SCN |
| `verifyCitation(index, ref, obligation)` | `ok / incomplete / mismatch / invalid` | T-SCN, UI |
| `ncrGates(...)` | 12 gates incl. content verification (11) and recorded conclusion (12) | T-SCN, T-GATE |
| `auditRecord(audit)` | Canonical serialization + sha256 | T-SCN |
| `Verification.check(entry)` | Four states, human reviewers, no self-approval, final approval | T-GATE |

Port notes: production implementation must use canonical serialization with code-point (not locale) ordering, normalized line endings and a defined text encoding for every hashed artifact.

## 4. Audit and evidence data model
IDs are stable, opaque, tenant-scoped; every row carries `createdAt`, `createdBy`, `version`, and is append-only except where noted.

| Entity | Key fields | Invariants |
|---|---|---|
| **Tenant** | id, name | Everything below is tenant-scoped; no cross-tenant references |
| **Organization / Site** | id, name, activities, regulators, certifications | Scope drives applicability |
| **Audit** | id, scheme/standard + edition, type, date, scope profile, auditor(s), `contentMode` (demonstration/production), **stamps** {pack version+hash, resolver version+hash, logic version, reference-index status, follow-up provider id+version} | Stamps are fixed at creation; pack updates never alter an open or historical audit |
| **Requirement** | source, edition, clause ref (through subdivision), title | Immutable per pack version |
| **AuditableObligation** | id, requirement, intent, objective, method, aspects[], verification steps[], expected evidence[], sampling guidance, common weaknesses, rebuttal checks[], Should Be paraphrase, applicability, **verification record** | Production use requires all four verification states + final approval |
| **VerificationActivity** | obligation, kind (record/interview/document/observation), instructions | |
| **SamplePlan / AuditSample** | audit, obligation, population description + size, method (`manual`/`seeded`), seed, members[] | Members must exist in the population; reproducible when seeded |
| **Evidence** | id, type, ref, date, text/attachment hashes, `verified`, source activity, **links[]** {obligation, aspect, effect: supports/contradicts/neutral, open/key/resolves, question}, rebuttal tag, flags | One evidence item, many links; never duplicated; attachments content-hashed |
| **Observation / Evaluation** | per obligation: assessment snapshot (inputs hash), recommendation, reasons | Derived and re-derivable; stale conclusions are flagged |
| **Conclusion** | audit, obligation, status, rationale, auditor, time | Only statuses the assessment supports (checkConclusion) |
| **PotentialFinding** | audit, obligation, open questions | Held, not a finding |
| **NCR** | id, obligation, citation, Should Be, attestation, As Found, statement of nonconformity, evidence ids, classification + rationale, status, approval {approver, authorization id, time}, content verification snapshot | See §5; issued NCRs immutable |
| **DiscardedDraft** | NCR snapshot, reason, actor | Retained |
| **AuditorReview / Approval** | actor, role, authorization validity | Approver authorized for the scheme on the audit date; independence rule per policy |
| **ReportOutput** | audit, content hash, generated-at | Re-derivable from the record |
| **AuditLog** | seq, type, detail, actor, time, prev-hash | Append-only; hash-chained for tamper detection |
| **SourceVersion / IntelligenceVersion** | pack/index/provider/rules versions | Pinned by Audit.stamps |

## 5. NCR lifecycle
```
(no NCR) ──start──▶ Draft ──submit (gates 1–9,11,12 pass)──▶ In auditor review ──approve (gate 10)──▶ Issued
   Draft ──discard(reason)──▶ Discarded (retained)          In auditor review ──return──▶ Draft
   Issued ──withdraw(authority + reason)──▶ Withdrawn (record kept; designed, NOT yet implemented)
```
Rules: any gate failure after an edit returns the NCR to Draft; evidence or conclusion changes that invalidate a gate re-flag the NCR; Issued is immutable; the report lists issued, discarded and withdrawn items. Production mode forbids issuance unless gate 11 passes.

## 6. Authentication, authorization, tenancy
- **Identity:** OIDC-based sign-in (provider TBD); device-bound refresh; offline grace period with re-validation on reconnect. Auditor authorizations (scheme, id, valid-to) are claims checked on every approval.
- **Roles:** Auditor, Lead Auditor/Approver, Reviewer, Content Authority (verification), Admin. Least privilege; approval separation configurable (author ≠ approver).
- **Tenancy:** tenant id on every row and every API call; row-level isolation in the service; per-tenant keys; no customer evidence is used for any learning without explicit authorization (hard rule, tested).
- **Logging:** security-relevant actions into the hash-chained audit log.
Status: design only; proof in isolated tests T-5, T-6.

## 7. Device storage and persistence abstraction
`StorageAdapter`: `get/put` by entity and id, `transaction(fn)`, `appendLog(entry)`, `export(auditId)`, `import(bundle)`, `wipe(auditId)`. Pure-logic code never touches storage. Candidates (untested): SQLite via a Capacitor plugin with SQLCipher, or IndexedDB with WebCrypto-wrapped records. Selection is an isolated spike (T-3); **no Node-native database dependency inside the shared logic or the WebView**. The prototype's `localStorage` store is for demonstration only. Required: encryption at rest, corrupt-store recovery, quota handling, export/import with identical record hash.

## 8. Capacitor compatibility proof (plan)
Throw-away shell hosting the runtime and the prototype UI: (1) run T-SCN/T-DEP vectors in the WebView; (2) run the 12-step thread; (3) compare record hashes with desktop; (4) offline start/resume after force-stop; (5) record device, OS, WebView version. Chromium results are **not** accepted as evidence of Capacitor compatibility.

## 9. Offline synchronization design
Local-first: all writes land in the local store and an **outbox** of idempotent operations (operation id, audit id, base version). Server applies idempotently and returns a new version; evidence is append-only so conflicts are resolved by union, never by overwrite. Conflicts on mutable fields (conclusion, NCR draft) use last-writer-wins **plus** a visible conflict record; an Issued NCR is never altered by sync. Content packs are versioned and pinned per audit; updates are offered, never applied to an open audit.

## 10. Regression and security test planning
| Area | Plan |
|---|---|
| Logic | Golden vectors from T-SCN/T-DEP and the 12-step thread, run on every platform; record-hash equality is the primary oracle |
| Depth | T-DEP is release-blocking; extend as real obligations replace the demonstration set |
| Content | `validate-content` dev on every change, release on release builds; verification-record rules; evidence JSON retained |
| UI | Browser sweep → device UI automation on phone and tablet; wording scan |
| Persistence | Kill/restart, corrupt store, quota, export/import hash |
| Security | Threat model per entity; authZ matrix tests; tenant isolation tests; dependency audit and lockfile checks; secret scanning; log tamper detection |
| Determinism | Locale, line-ending, path, encoding and timezone matrix for every hashed artifact |
| Sync | Offline fuzzing, replay, conflict scenarios |
| Intelligence | Contract tests against stub and fake provider; negative tests that suggestions cannot create evidence or change requirements |
