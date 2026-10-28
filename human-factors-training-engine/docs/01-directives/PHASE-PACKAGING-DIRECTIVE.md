# STANDALONE PACKAGING RUN DIRECTIVE — HF ENGINE
**Issued:** 2026-08-06 by owner (Brian R. Olea)
**Supersedes the deployment approach in `PHASE-4-RUN-DIRECTIVE.md` WP-3/WP-5.** Docker is removed from the product story (see §1). This directive turns the working application into a **single self-contained installable product** a non-developer can run on their own machine/server.
**Standing law:** `CLAUDE.md` in full — especially §5a (no Docker, no system services, no elevated/host actions without owner authorization) and the evidence standard.

---

## 1. Correct the record first (no code)
The product's real runtime dependency footprint is: Node.js (language runtime) + libraries that bundle into the app (next, react, prisma-client, bcryptjs, jspdf, zod) + an **embedded SQLite** database file. It makes **zero outbound network calls** and requires **no cloud service, no Docker, no separate database server**. Docker and PostgreSQL were packaging/scale options that were over-weighted in prior directives — they are NOT dependencies of the standalone product.
Actions:
- Add `docs/03-architecture/DEPENDENCY-FOOTPRINT.md`: the definitive list of what the product needs to run, what bundles in, and the single external requirement (Node, to be bundled per §2). State plainly: no telemetry, no phone-home, offline-capable.
- Reclassify Docker: move `Dockerfile`, `docker-compose.yml`, `docker/`, `.dockerignore` into `deploy/docker-optional/` with a README saying "optional alternative packaging, not required." Do not delete (reversible), do not feature it. Update `.gitignore`/paths as needed. Log as a decision.
- PostgreSQL stays a **switchable option for a future hosted edition only** (the dual-provider work already done is preserved and still tested) — it is not part of the standalone install path.

## 2. The deliverable: one self-contained installer
Goal: a customer's IT person installs and runs the tool with **no Node knowledge, no npm, no Docker, no database setup**. Target Windows first (the owner's environment), with the approach documented so Linux can follow.
Produce, in priority order:
1. **A production build that runs without dev tooling:** `next build` (standalone output already configured) + a documented `npm start`-equivalent that serves the built app against the embedded SQLite file. First prove the app runs from the *production* build, not `next dev`.
2. **Bundled runtime:** package the Node runtime + the standalone build + embedded SQLite into a single distributable so the target machine does not need Node pre-installed. Acceptable approaches (choose one, justify in DECISIONS.md, no heavyweight new frameworks): a bundled portable Node + start script wrapped by a Windows installer (e.g. an installer that registers a Windows Service and a Start-menu/browser launch), or a single-executable Node build (e.g. Node SEA / `pkg`-class tool) if it can carry the Next.js standalone server and Prisma's native query engine correctly. Prisma's native engine binary and the SQLite file must be included and path-correct in the packaged artifact — this is the main technical risk; prove it.
3. **First-run experience:** on first launch the tool creates/migrates its SQLite database, seeds the controlled baseline, creates an initial admin per a setup step (no hard-coded credentials — CLAUDE.md), and opens/points to the intranet URL. Subsequent launches reuse existing data.
4. **Service/lifecycle:** install → start → stop → uninstall documented and working; data and backups persist across restarts (reuse the existing backup/restore scripts, SQLite path).

## 3. Exit gates (executed evidence, per CLAUDE.md §4)
- **G1:** app runs from the production build (not `next dev`) against embedded SQLite — pasted terminal + a real HTTP 200 from the running production server.
- **G2:** the packaged artifact launches on a path with **no global Node/npm/Docker** relied upon — demonstrate the runtime is self-carried (e.g., run from the bundled runtime, show it is not the system Node). If the environment can't fully sandbox this, mark Partial with an exact owner runbook — never claim it if not shown.
- **G3:** first-run creates+migrates+seeds a fresh SQLite DB and the full learner lifecycle works end-to-end against the packaged app (reuse the verified click-through path).
- **G4:** stop/restart preserves data; backup + restore verified against the packaged app's database.
- **G5:** `INSTALL-GUIDE.md` in `docs/03-architecture/` — a non-developer can follow it: prerequisites (ideally none beyond the OS), install, first-run, backup, upgrade, uninstall. No Docker, no npm commands for the end customer.

## 4. Hard constraints
- Presentation/logic untouched unless packaging genuinely requires it; if a code change is needed to make the production build or packaging work, keep it minimal and log it. The 208-test suite must still pass (both providers) — paste it.
- No new outbound network calls. No CDN-fetched fonts/assets (onprem is offline — bundle them). No telemetry.
- Owner-executed steps (anything needing elevation to install a service) are written as a runbook and marked owner-executed — the agent does not run elevated installers itself (CLAUDE.md §5a).
- Keep the UI design work (`PHASE-UI-DESIGN-DIRECTIVE.md`) as a separate run; sequence is owner's call, but a sellable product needs both the installer and the UI pass before it ships.

## 5. Run mechanics
Journal `RUN-JOURNAL-PACKAGING.md` in `docs/05-run-records/`. Decisions D-036+ (continue the sequence). Commit at logical boundaries. `RUN-PACKAGING.done` last, per-gate Verified/Partial with named reproducible gaps. Independent validation on return: confirm test count unchanged, Docker no longer in the product path, and the install guide is genuinely developer-free.
```
Never run elevated installers, Docker, or system-service registration yourself — write the runbook, mark owner-executed (CLAUDE.md §5a).
```
