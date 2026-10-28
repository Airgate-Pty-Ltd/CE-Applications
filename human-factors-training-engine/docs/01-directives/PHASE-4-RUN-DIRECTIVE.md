# PHASE 4 RUN DIRECTIVE — ONLINE EDITION, POSTGRES, DEPLOYMENT PROOF
**Issued:** 2026-08-06 by owner (Brian R. Olea)
**Authorization basis:** Phase 3 closed — RUN-PHASE3.done (4 Verified / 1 Partial), commit `5ba7d09`.
**Standing law:** `CLAUDE.md` governs this run in full — evidence standard, structure, controlled-doc authority, confidentiality, the heredoc ban, and commit-at-every-WP. Nothing here overrides it.
**Goal:** make the two-edition promise real. Today the product runs only on SQLite (onprem/dev). Phase 4 delivers a working PostgreSQL online edition with migration parity, closes the two Phase-3 receiving-inspection carryovers, and proves deployment on real infrastructure.

---

## WP-0: Receiving inspection & git remote (do first, fast)
1. Confirm clean-clone health on this machine: `npm install && npm test` (all suites), `npx tsc --noEmit` (0), `node scripts/check-license-headers.js`. Paste output. If anything fails on a clean checkout that passed in-session, that is a Phase-4 finding — log it.
2. Commit the stray `next-env.d.ts` or add it to `.gitignore` (it is auto-generated) — working tree must be clean.
3. Create the **private** GitHub remote, push all branches and history. Confirm `.env*` and `*.db` are absent from the remote (`git ls-files | grep -E '\.env|\.db'` returns nothing but `.env.example`). Record the remote URL in DECISIONS.md.
**Exit gate:** clean-clone `npm test` output pasted; private remote live with full history; no secrets/DBs tracked.

## WP-1: Dual-provider schema (SQLite + PostgreSQL) — closes Q-008
The schema is SQLite-only (D-001). Make it work on both without divergence.
1. Parameterize the Prisma datasource provider by env (`DATABASE_PROVIDER`), keeping SQLite for dev/onprem-small and PostgreSQL for online/production.
2. Reconcile every SQLite-specific concession from earlier phases against Postgres: the `Json`-as-`String` serialization boundary (`src/lib/json.ts`), native array fields, the immutability trigger (`ManifestGuard` — SQLite trigger must have a Postgres equivalent), `@db.*` native types, and any `date_*` grammar assumptions. Targeted schema edits only, `npx prisma validate` after each — **no bulk regex edits** (CLAUDE.md §5).
3. Generate a Postgres migration set with parity to the SQLite migrations; document any intentional per-provider difference.
**Exit gate:** the SAME test suite passes against BOTH providers — run `npm test` on SQLite, then against a real Postgres instance (WP-2 provides it), paste both. Kernel determinism, manifest immutability, and classification enforcement must hold identically on Postgres. Any behavior that can't be made identical is logged, not hidden.

## WP-2: Online-edition runtime on Postgres
1. Stand up PostgreSQL (Docker container or local service — probe as before; if no daemon, WP-2's live bring-up is Partial with repro steps, but WP-1's provider-parity tests still run against any reachable Postgres, including a temporary one).
2. Migrate + seed the demo tenant into Postgres; verify the full Phase-1 lifecycle runs end-to-end against it (reuse the WP-3 click-through path from Phase 3, now on Postgres) with DB-query confirmation.
3. Wire the least-privilege `mai_kernel` DB role for the client-server case (MAI-ARCH-001 §6: SELECT host tables, INSERT `mai_*`, no UPDATE on host tables) — the kernel-purity guarantee that only matters on a real client-server DB. Prove the grant model with a test that the kernel principal cannot UPDATE a host table.
**Exit gate:** lifecycle executed against Postgres with pasted evidence; `mai_kernel` role restrictions proven by a failing-write test; health screen shows correct state against Postgres.

## WP-3: Deployment proof (closes the Phase-3 Partial)
1. Bring up `docker compose --profile onprem` and `--profile online` on a machine with the daemon; confirm a seeded, reachable app in each. If the environment still lacks a daemon, this WP stays Partial — but WP-0's remote now lets the owner run it; provide an exact runbook and mark it owner-executable.
2. Backup/restore verified against Postgres (not just SQLite): real backup → induced change → restore → verified recovery.
3. Deployment guide for both editions in `docs/03-architecture/` — env matrix, provider selection, first-run, backup schedule, upgrade/migrate path.
**Exit gate:** both compose profiles reach a working seeded app (or Partial with owner runbook + the WP-0 remote making it runnable); Postgres restore tested; guide written.

## WP-4: Pre-commercial hardening pass (scoped)
1. Security review of the online edition's new surface: session handling under multi-tenant, the health endpoint's public exposure (already unauthenticated for Docker — confirm it leaks nothing sensitive), rate-limiting on auth, secrets only via env.
2. Confirm structural tenant isolation on `mai_*` and content tables under Postgres with a cross-tenant denial test (list/fetch/respond/export) — the guarantee that only becomes real in a shared online DB.
3. Honest gaps register for anything not production-hardened, in OPEN-QUESTIONS.md — no "production-ready" claim (CLAUDE.md §4).
**Exit gate:** cross-tenant denial proven by test on Postgres; security review notes in `docs/04-verification/`; gaps logged honestly.

---

## Out of scope for this run
Federated sync (Mode 3), SSO/HRIS/QMS integrations, external AI provider expansion, native PDF engine, additional Policy Packs (owner-supplied, drafted separately), the AQ-160 SME checklist (owner task). Do not author regulatory content.

## Owner-pending (not code — parallel track)
AQ-160 SME checklist verification; remaining regulator Policy Packs (FAA Part 145 next, drafted for approval as CAAC was); attorney review before any commercial deployment.

## Run mechanics
New journal `RUN-JOURNAL-PHASE4.md` in `docs/05-run-records/`. Decisions D-036+. Commit at every WP boundary (CLAUDE.md §7). `RUN-PHASE4.done` written last, per-WP Verified/Partial with named reproducible gaps. Checkpoint cleanly at a WP boundary if context runs low. Independent validation on return: clone the pushed remote, `npm test` against both providers, diff commits, spot-check every exit gate against pasted evidence.
