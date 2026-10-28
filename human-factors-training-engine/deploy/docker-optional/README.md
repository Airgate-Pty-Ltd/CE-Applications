# Docker — optional alternative packaging, not required

**This is not part of the standalone product's install path.** The Human Factors Engine's
real runtime dependency footprint is documented in
[`docs/03-architecture/DEPENDENCY-FOOTPRINT.md`](../../docs/03-architecture/DEPENDENCY-FOOTPRINT.md):
Node.js (bundled by the packaged installer) + an embedded SQLite file. No Docker, no
PostgreSQL, no separate database server, no cloud service.

## What this directory is

The Docker Compose setup built in Phase 3 WP-5 and extended in Phase 4 WP-2, preserved here
as an **optional** self-hosted deployment path for operators who specifically want a
container-based deployment (e.g. onto existing container infrastructure) instead of the
standalone Windows installer. It is not the primary supported distribution mechanism, is not
featured in the install guide, and is not exercised by the packaging directive's exit gates.

Reclassified out of the repository root on 2026-08-06 under the Standalone Packaging
Directive §1 (`docs/01-directives/PHASE-PACKAGING-DIRECTIVE.md`) — moved, not deleted, per
CLAUDE.md §2 (superseding material is relocated, never destroyed). See DECISIONS.md D-048
for the full rationale.

## Contents

- `Dockerfile` — multi-stage build producing a Next.js standalone runtime image.
- `Dockerfile.dockerignore` — build-context excludes (picked up automatically by BuildKit
  because it sits next to `Dockerfile`; this is the standard `<dockerfile>.dockerignore`
  convention, needed here since the build context is the repo root, not this directory).
- `docker-compose.yml` — `onprem` (SQLite, single container) and `online` (app + Postgres
  container) profiles. The `online` profile's container wiring has not itself been executed
  against a real Postgres container — the dual-provider *schema* work it depends on was
  verified separately, against a real non-Docker local Postgres instance, in Phase 4
  WP-1/WP-2 (see `DECISIONS.md` D-040 through D-047).
- `docker/entrypoint.sh` — container startup validation (edition/mode checks, migrate deploy).
- `docker/.env.docker.example` — template; copy to `docker/.env.docker` and fill in real
  values (gitignored, never commit the real file).

## Running it

All commands run **from this directory** (`deploy/docker-optional/`) — the compose file's
build context points back at the repo root (`context: ../..`) so the Dockerfile's `COPY . .`
still sees the real application source:

```bash
cp docker/.env.docker.example docker/.env.docker
# edit docker/.env.docker with real values
docker compose --env-file docker/.env.docker --profile onprem up --build
```

Per `CLAUDE.md` §5a, the agent does not run Docker itself. This is an owner-executed step.
