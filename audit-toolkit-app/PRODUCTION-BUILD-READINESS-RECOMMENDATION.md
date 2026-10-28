# Production-Build Readiness Recommendation

**Date:** 2026-10-11 · **Status:** `RELEASE_NOT_AUTHORIZED` · **Basis:** Owner directive of 2026-10-11 and the evidence in this folder.

## Recommendation
**Proceed with controlled, development-only build work (A below). Do not begin unrestricted production implementation or any release activity (C) until the blockers (B) are cleared.** The prototype shows the product's decision logic is viable; it does not show the product exists.

## A. Approved development work (can start now)
| # | Work | Why it is safe |
|---|---|---|
| A1 | Capacitor/Android shell around the **Governed Audit Runtime** (`src/audit-core.js`, `session.js`), device storage design (encrypted local store spike), audit-record export/import | Runtime is deterministic and tested (87 headless + 75 browser checks). No dependency on MAK or Kernel. |
| A2 | Adopt `tools/validate-content.js` as the **mandatory development** validation entry point; wire it into every content build and packaging step | Original framework validator preserved and run inside it; failures exit non-zero; release mode rejects unverified content; packaging has no bypass (tests) |
| A3 | **Platform-independent policy-evaluation core + persistence adapter** design (Kernel `evaluate` bundles for the browser with a config-only `node:crypto` shim; output byte-equal in Node, a no-builtins VM and Chromium) | Evaluate path is pure; no Kernel change needed; decision stays behind the `decision-governance/0.1` contract with the in-runtime rules as fallback/oracle |
| A4 | Source-verification workflow: reviewer fills `data/source-verification-record.json` (clause hierarchy and interpretation separately) against the licensed edition | Process needed for any release; no engineering dependency |
| A5 | Content authoring toward obligation grain for **public-law** FAA/EASA packs (unblocked) | Not gated by the standards-IP review |
| A6 | Stub provider hardening against the `audit-intelligence/0.1` contract (still labelled engineering stub) | No claim of intelligence |

## B. Unresolved blockers (must clear before production implementation or release)
| # | Blocker | Owner | Evidence |
|---|---|---|---|
| B1 | **Source verification.** No clause designator, paragraph structure or authored interpretation is verified against the controlled source (only the titles of 8.5.1.1–.3, by owner directive). Release-mode validator and production NCR gate both fail on this. | Reviewer with licensed AS9100D | `CLAUSE-DESIGNATOR-REVIEW.md`, release-mode evidence `evidence/validation/*FAIL.json` |
| B2 | **MAK Gate 001 quarantine defect** — blocks any trusted MAK-derived conclusion; MAK not modified here | MAK governed repo | `MAK-ISSUE-RECORD-GATE-001.md` |
| B3 | **Kernel in WebView unproven.** Spike supports a conditional GO for the pure evaluate path but no Capacitor/Android run, `localeCompare` ordering is locale-sensitive (simulated), the full Kernel entry still pulls Node-only modules, `better-sqlite3` is undeclared and native, Windows manifest hashes differ (CRLF confirmed as one cause, path separators another) | Engineering + owner | `KERNEL-WEBVIEW-SPIKE.md`, `KERNEL-UPSTREAM-REVIEW.md` |
| B4 | **Standards IP**: counsel review of authoring rules (no standards pack ships without it) | Counsel | handoff gates |
| B5 | **Technical review** of the one demonstration pack; none of the pack is validated comprehensive content | Reviewer | pack is a 5-obligation demonstration |
| B6 | **Naming / product governance** unresolved | Owner | `NAMING-GOVERNANCE-RECOMMENDATION.md` |
| B7 | conform-edge.com DNS TXT verification; Google Play phone verification | Owner / Mike | governance record |
| B8 | **Security design absent:** encryption at rest, authentication, RBAC, tenant segregation, tamper-evident audit log; independent-reviewer separation for NCR approval | Engineering | not implemented (prototype: single synthetic user, unencrypted localStorage) |
| B9 | **Device validation absent:** touch/real-device behaviour, offline airplane-mode, WebView, accessibility, performance | Engineering | prototype tested in a desktop Chromium only |

## C. Not authorized
Merging MAK or Kernel code into the app; pulling into protected trees; production services; commercial standards-derived content; Play publication; declaring the product production-ready.

## D. Exact next-stage acceptance criteria (vertical slice on a device)
A stage is accepted only when **all** of these are shown with evidence:
1. **Device:** Android API 36 build runs the six scenarios A–F on a physical phone and tablet (touch), offline, with results recorded; no horizontal overflow; tap targets ≥ 44 px (pointer-fine toolbar excepted).
2. **Persistence:** audits survive force-stop and restart; an encrypted store; corrupt-store recovery; export/import of an audit record with identical sha256.
3. **Reproducibility:** pack, resolver, logic and reference-index versions pinned per audit; a pack update never changes an open audit (test).
4. **Validator gate:** every content build runs `validate-content` (dev); a release build runs release mode with a complete verification record; evidence JSON stored per build; packaging without validation impossible (existing tests stay green).
5. **Content:** at least one obligation set whose clause hierarchy **and** interpretation are VERIFIED by a named reviewer against the licensed edition, and **the NCR produced from it passes the production-mode gate** (gate 11).
6. **Kernel path (if used):** the pure evaluate bundle runs inside the Capacitor WebView with determination hashes byte-equal to Node on a fixed vector set; locale-independence tested with a non-English locale; no native dependency in the app bundle.
7. **MAK path (if used):** B2 closed in MAK's governed environment with its acceptance tests passing in CI on a clean checkout; a pinned MAK commit integration test; until then only the labelled stub.
8. **Security:** authentication, role-based approval separation, and an append-only audit log with tamper detection demonstrated.
9. **Customer wording:** an automated scan of every screen and string table finds no internal system names.
10. **Owner walkthrough:** the guided audit thread and scenarios A–F demonstrated to the owner on a device, with every non-functional workflow listed.
