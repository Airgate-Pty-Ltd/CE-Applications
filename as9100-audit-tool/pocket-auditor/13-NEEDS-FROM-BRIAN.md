# 13 — Needs From Brian

None of these block the prototype build. All of them block production release unless marked otherwise.

| # | Need | Why | Blocks |
|---|---|---|---|
| N-01 | Approve the requirement library per source (329 records, `content/CONVERSION-REPORT.md`), fixing ISO 13485 7.5 (no intent) and 7.5.9.1 (no evidence); confirm the 16 proposed applicability triggers and the default enforcement sensitivity (HIGH for regulation, MEDIUM otherwise). Also restore the ISO 9001, QMSR and MDSAP catalogs to the root `_Skills\` folder (they exist only in `Auditor-Profile-and-Audit-Engine\Skills-Library`) | Only approved content can reach a checklist | Production; real audits |
| N-02 | Confirm authority levels: QMSR = 1, EU MDR = 1, MDSAP = 3a | Drives risk level and finding rules | Production |
| N-03 | Author (or commission) atomic catalogs for FAA Part 145, FAA Part 21, EASA Part-145, EASA Part 21 in the same catalog format; convert EASA Form 8 and MAG CHG 10 references | Aerospace MRO buyers expect these; the skill claims them but they do not exist | Aerospace launch |
| N-04 | Correct CE-QMS Next Phase 0 Truth Capture §12.2/§14 | It records "13 standards verified from source" for the Pocket Auditor skill; the skill folder holds 2 reference files (verified 2026-09-27) | Record accuracy |
| N-05 | Decide PAD-008: add `decomposeRequirements()` to the JudgmentProvider contract (ADR-006/IC-003 revision) | Semantic ingestion proposals need a contract operation that does not exist | Semantic ingestion |
| N-06 | Exercise content authority over DIM `pocket-audit-integrity` rules PA-001..PA-010 and PA-101..PA-106 (wording, severities, risk class, `clauseRefs` if any), approve with a real effective date, and approve Authority Profile AP-PA-REPORT-HOLD (including the deliberate A3 override choice) | Rules must be approved to activate | M-AI conditions in production |
| N-07 | Approve the CE-QMS Next Architecture Constitution (Phase 1 exit gate). The prototype already proceeds under it as DRAFT (PAD-010, approved 2026-09-27) | Constitution says no implementation without approval; production must not rely on a DRAFT | Production |
| N-08 | Pricing and licensing model; target buyer confirmation (A-01) | Commercial definition | Release |
| N-09 | Apple Developer and Google Play developer accounts under the Conform-Edge / Airgate legal entity; a Mac or cloud build service for iOS | App store builds and testing tracks | M9 iOS build; release |
| N-10 | Research App Store / Play rules for B2B subscriptions sold on the web | Store approval risk | Release |
| N-11 | Access to `Airgate-Pty-Ltd/QMS-MAK-world` (for the canonical `audit-intent-judgement` skill) | Align JudgmentProvider policies with MAK's intent judgment | Policy alignment |
| N-12 | Security clean-up: move `ClaudeCowork\id_ed25519` (private SSH key) and `09 Archive\API keys\API key.docx` out of synced folders; rotate if they were ever synced | Credential exposure | Now (not product-specific) |
| N-13 | Remove the temporary folder `E:\Conform-Edge\_Claude-Staging-PocketAuditor\` (copies made for this session) | Housekeeping | — |
