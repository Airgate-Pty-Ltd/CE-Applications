# Audit Toolkit — Approved Integration Architecture and Contracts

**Date:** 2026-10-10 · **Status:** DRAFT v0.1 · **Authority:** Brian's Phase A/C review and conditional authorization (2026-10-10), §3
**Rule:** nothing here is "integrated". Where a contract has no live implementation, it is labelled a STUB.

## 1. Components

| Component | Where it runs | Status in this repo |
|---|---|---|
| **Audit Toolkit Application** (customer-facing, Android/Capacitor) | Device | Interactive prototype only (`prototype/`). Not a Capacitor build. |
| **Governed Audit Runtime** (applicability, evidence integrity, conclusion governance, NCR gates, sampling, audit record) | Device, offline | **Real, deterministic, tested** (`src/audit-core.js`, `src/session.js`; 58 passing tests). Prototype-grade code. |
| **Audit Intelligence Provider Contract** | Device ⇄ optional service | Contract defined (§2). Implementation = **ENGINEERING STUB** (`followUps` in `audit-core.js`). No MAK-derived service exists. |
| **Decision Governance Contract** | Device (library) or service | Contract defined (§3). Implementation = **none yet** — the Governed Audit Runtime enforces the rules itself. Real Kernel only after compatibility is established (see KERNEL-UPSTREAM-REVIEW.md). |
| **Intelligence Development & Governance Environment** (MAK, skills, knowledge development, release validation, policy authoring) | Private, separate | Out of the customer product. Never shipped, never named in the UI. |

## 2. Audit Intelligence Provider Contract — `audit-intelligence/0.1`

Purpose: given the audit state for one requirement, return **suggestions**. Never conclusions, never evidence.

```
request  { contractVersion, auditId, requirementId, packVersion, scope,
           attributes[{id,text}], evidence[{id,type,verified,links[]}], sample{ids,method,seed},
           performedActions[], connectivity }
response { contractVersion, providerId, providerVersion, deterministic: bool,
           suggestions[{kind: verify|investigate|lead|rebuttal|sample|note,
                        title, rationale, targetAttributeIds[], proposedActionIds[]}],
           provenance{ rulesetVersion, inputHash } }
```
Binding rules (from the owner directives):
1. A suggestion may point at an evidence-gathering action. It may **not** create evidence, change a requirement, change applicability, or convert inference into fact.
2. Provider unavailable or offline → customer sees "Additional analysis available when connected"; core auditing is unaffected.
3. `providerId`, `providerVersion`, `inputHash` are stored in the audit record (admin/diagnostic only).
4. The stub identifies itself: `providerId: "engineering-stub"`, `deterministic: true`. **The stub does not demonstrate intelligent audit reasoning.**
5. Customer wording only: *Suggested Follow-Up, Evidence Review, Requirement Verification, Finding Review, Additional Investigation Recommended.*

## 3. Decision Governance Contract — `decision-governance/0.1`

Purpose: authoritative policy check on an **audit action** before the runtime performs it.

```
request  { contractVersion, auditId, action: record_conclusion|submit_ncr|issue_ncr|withdraw_ncr|apply_update,
           subject, assessmentSnapshot, actor{role,authorizationId}, policyVersion }
decision { outcome: PROCEED|HOLD|BLOCK|ADVISE, reasons[], policyVersion, determinationHash }
```
Binding rules: deterministic; same inputs + policy version → same hash; decision never manufactures evidence or silently changes a requirement; the auditor retains formal authority over every outcome that is supported.

Mapping today: `Core.checkConclusion` and `Core.ncrGates` are the in-runtime policy implementation (BLOCK/HOLD with reasons). When a Kernel build is pinned and shown to run in the WebView, an adapter (`DecisionGovernanceAdapter`) will delegate to it; the in-runtime rules become the fallback and the regression oracle.

## 4. Non-negotiables carried into code
- Deterministic applicability stays authoritative (framework resolver, vendored unmodified; sha256 `7a438949…9709d` recorded in each audit record).
- Audit reproducibility: pack, resolver, logic, follow-up provider and reference-index status are pinned in the audit record; its sha256 is exportable.
- No Kernel fork, no MAK/M-AI source copied into the app.
- Offline-first; encrypted local store is a Phase F item, **not** implemented in the prototype.

## 5. Integration blockers (carry forward)
| # | Blocker | Source |
|---|---|---|
| IB-1 | MAK Gate 001 provenance quarantine runs once and is guarded by a string comparison; a Gate-001 concept inserted after initialization stays ACTIVE (`gate_001` test). Provenance/integrity ⇒ **blocker** for any MAK-derived recommendation. | MAK-TEST-FAILURE-ANALYSIS.md |
| IB-2 | Kernel not proven in Capacitor/WebView (`node:crypto`, `Buffer`, `import.meta.url`; ms1 persistence is `better-sqlite3`). | KERNEL-UPSTREAM-REVIEW.md |
| IB-3 | No audit-session service exists in MAK; no tenant segregation / RBAC found in MAK or Kernel. | PHASE-C baseline |
| IB-4 | Kernel upstream manifest not reproducible on Windows (CRLF suspected, unconfirmed). | KERNEL-UPSTREAM-REVIEW.md |

## 6. Update 2026-10-11
- IB-1 now has a precise record: `MAK-ISSUE-RECORD-GATE-001.md` (blocker, MAK not modified).
- IB-2: `KERNEL-WEBVIEW-SPIKE.md` shows the pure `evaluate` path bundles for the browser with a config-only `node:crypto` alias and is byte-equal in Node, a no-builtins VM and Chromium. Capacitor/Android run still unproven; locale-dependent ordering and the persistence boundary (native `better-sqlite3`) remain. Direction: platform-independent policy core + persistence adapter; no fork.
- IB-4: CRLF confirmed as one cause of manifest drift (path separators another).
