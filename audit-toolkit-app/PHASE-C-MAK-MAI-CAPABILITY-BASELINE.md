# Phase C — MAK / M-AI Capability Baseline

**Date:** 2026-10-10 · **Author:** Claude Code (Sonnet 5.5) · **Status:** DRAFT — for review before Phase D
**Rule applied:** architecture docs are not capability. Only code inspected and tests run this session are counted as evidence.

## 1. Sources inspected

| System | Location | Verification |
|---|---|---|
| M-AI Kernel (TypeScript) | `04 Product Portfolio\Conform-Edge Software\M-AI\M-AI-Kernel` (path from `CANONICAL-KERNEL.md`) | Git worktree ✔; origin = Airgate-Pty-Ltd/m-ai ✔; branch main ✔; local HEAD `5c976d1` matches pointer. **Stale: origin/main is 4 commits ahead (`5a9cdeb`, 2026-09-09)**. Not pulled (working tree untouched). Governor protocol says pull before build — Brian to approve. |
| MAK (Python) | `E:\Conform-Edge\ClaudeCowork\MAK` | origin = Airgate-Pty-Ltd/MAK; HEAD `6cac29e` (2026-10-10); **11 uncommitted changes** in working tree |
| MAK skill world | `E:\Conform-Edge\QMS-MAK-world-git` | origin Airgate-Pty-Ltd/QMS-MAK-world, HEAD `b34ca00` |

## 2. Test results (run this session)

| System | Result | Claimed in docs | Discrepancy |
|---|---|---|---|
| Kernel `vitest run` | **178/178 pass**, 15 files | World README: "282/282" | Local checkout is behind origin; claim unverified |
| MAK `pytest` | **269 pass, 3 FAIL** | World README: "166/166 CI green"; build report: 59/69 | Doc claims stale. Failing: `test_acceptance::test_D_conversation_followup_why_resolves_without_repeat`, `test_cognition::test_acceptance_conversation_end_to_end`, `test_provenance_quarantine::test_gate_001_concepts_are_preserved_but_ineligible` |

## 3. Integration matrix (directive §16)

| Capability | Location | Implemented | Tested | API / adapter | Dependencies | Proposed use in Audit Toolkit | Work required |
|---|---|---|---|---|---|---|---|
| Deterministic rule evaluation (`evaluateRules`, conditions, determination hash) | Kernel `src/evaluate.ts` | Yes | Yes (`evaluate-production-gate`, 14 tests) | `@mai/kernel/evaluate` TS export; zero runtime deps | Node/TS | **On-device** governed actions (PROCEED/HOLD/BLOCK/ADVISE) e.g. NCR gatekeeping | Author audit rule sets; confirm decision vocabulary matches; bundle for Capacitor (unverified) |
| Governed decisions, authority guardrails, escalation, outcome persistence | Kernel `decision`, `authority-*`, `escalation-handler`, `outcome-persistence` | Yes | Yes | TS exports | — | Auditor-authority boundary; reproducible decision records | Map to Auditor Review/Approval entities |
| DIM packaging (manifest + rules + Authority Charter) | Kernel `dims/*` | 9 dirs. `ncr-completeness` has 9 rules; `dk-audit` has 1 rule (invocation governance only — "not quality findings") | Rule tests present for some | Manifest `subscribesTo` events + `readsFields` | — | New DIM for audit conclusions & Should Be/As Found | **No existing DIM covers audit conclusions or Should Be/As Found.** `ncr-completeness` is a QMS NCR record check (AS9100D/ISO9001), not auditor-NCR gatekeeping. Must author new DIM per `mai-kernel-integration` skill |
| Clause-aware audit-intent judgement | MAK `src/mak/audit/intent.py` (79 lines synonym normalizer) + `evidence.py` | Basic | `test_evidence_audit` exists | Python module | Python 3.11+, SQLite | Server-side follow-up suggestions only | Small; "audit-intent-judgement" skill referenced by Pocket Auditor docs is **not** in MAK src (it was noted inaccessible 2026-09-27) |
| MAK cognition/missions/chat | MAK `src/mak/cognition`, `mission`, `web` | Yes | Mostly (3 failures above) | FastAPI/uvicorn server; approvals API per world README | Python, uv, local DB, filesystem observer | Not suited to the customer app: it observes a directory/workspace, not audit evidence | Would need a purpose-built audit-intelligence service wrapper; no audit-session API exists |
| Approval workflow | MAK `src/mak/approval/store.py` | Yes | `test_approval` | `POST /api/approvals` | server | Not needed on device | — |
| Multi-tenant auth/RBAC, tenant segregation | — | **Not found** in either system | — | — | — | Required by handoff rule 8 | Entire capability must be built or specified |
| Versioned service contract for Audit Toolkit | — | **Does not exist** | — | — | — | Needed for Phase D | Define contract + local stub, label as stub |
| Offline / mobile runtime | — | Kernel: JS lib (plausible, unproven in Capacitor). MAK: Python server, cannot run on Android | — | — | — | Device: Kernel only | Prove Kernel bundles in Capacitor WebView |

## 4. Conclusions

1. **No production audit-intelligence service exists.** MAK is a local workspace-observer with no audit-session API; the Kernel is a general governed rules library.
2. **Recommended Phase D posture (per Governor assumption):** integrate the **Kernel as an on-device library** for governed actions (real, tested code), and define a **versioned `AuditIntelligence` contract with a local stub** for server-side guidance, explicitly labelled STUB. Do not call MAK from the app.
3. No Kernel fork; no source copied. Consume via package export only; audit-specific logic lives in a new DIM (rules + Authority Charter).
4. Guidance shown in the vertical slice that is not backed by a DIM or the stub must stay labelled simulated in all build docs.

## 5. Decisions needed from Brian before Phase D
1. Approve pulling Kernel to current origin/main (4 commits) before pinning a version?
2. Two of MAK's three failing tests concern conversation/provenance — acceptable to leave (we don't use them) or fix first?
3. Confirm posture in §4.2 (Kernel on-device + stubbed service contract).
4. Which acceptance scenarios (A/B/E) to wire to full fidelity (carried blocker).

## 6. Not verified
Capacitor bundling of the Kernel; Kernel performance on Android; the 4 newer origin commits; MAK uncommitted changes' content.

## Addendum 2026-10-10 (after owner review)
Superseded decisions: no pull was made (§5.1); MAK was not modified (§5.2). Follow-on evidence: `KERNEL-UPSTREAM-REVIEW.md`, `MAK-TEST-FAILURE-ANALYSIS.md`, `ARCHITECTURE-AND-CONTRACTS.md` (posture in §4.2 adopted with contracts). Protected checkouts verified unchanged at close: Kernel `5c976d121371bbf634db1c5d083c20b645023db1` (clean); MAK `6cac29ee698d6d469c17b01c30dd41959dc8853d` (11 modified + 2 untracked files preserved). Note: an earlier Phase C pytest run was made directly in the MAK working tree before the no-modification direction; the working-tree file list above is unchanged.
