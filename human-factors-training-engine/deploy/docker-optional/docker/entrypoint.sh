#!/bin/sh
# Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
# This source code is proprietary and confidential. Unauthorized copying,
# distribution, or use of this file, via any medium, is strictly prohibited
# without prior written permission from Conform-Edge Quality Consulting LLC.
# See LICENSE and NOTICE at the repository root.
#
# WP-5 container startup validation, mirroring src/lib/deploymentConfig.ts's rules
# (DESIGN-NOTES.md §8). Shell-level duplication is deliberate: this must run before the
# Node process starts, against a minimal runtime image with no dev tooling.
set -e

EDITION="${DEPLOYMENT_EDITION:-onprem}"
DB_MODE="${DATABASE_MODE:-sqlite}"
AI_MODE="${AI_PROVIDER_MODE:-none}"
AUTH_MODE_VAL="${AUTH_MODE:-local}"

echo "[entrypoint] edition=$EDITION db=$DB_MODE ai=$AI_MODE auth=$AUTH_MODE_VAL"

if [ "$EDITION" != "online" ] && [ "$EDITION" != "onprem" ]; then
  echo "[entrypoint] FATAL: DEPLOYMENT_EDITION must be online|onprem, got '$EDITION'" >&2
  exit 1
fi

if [ "$EDITION" = "onprem" ]; then
  if [ "$DB_MODE" != "sqlite" ]; then
    echo "[entrypoint] FATAL: DEPLOYMENT_EDITION=onprem requires DATABASE_MODE=sqlite, got '$DB_MODE'" >&2
    exit 1
  fi
  if [ "$AI_MODE" = "configured" ]; then
    echo "[entrypoint] FATAL: DEPLOYMENT_EDITION=onprem cannot use AI_PROVIDER_MODE=configured (no internet assumed)" >&2
    exit 1
  fi
  if [ "$AUTH_MODE_VAL" = "ldap" ]; then
    echo "[entrypoint] FATAL: DEPLOYMENT_EDITION=onprem cannot use AUTH_MODE=ldap (no directory service assumed)" >&2
    exit 1
  fi
fi

echo "[entrypoint] running prisma migrate deploy..."
if [ "$DB_MODE" = "postgresql" ]; then
  npx prisma migrate deploy --schema prisma/postgresql/schema.prisma
else
  npx prisma migrate deploy --schema prisma/schema.prisma
fi

echo "[entrypoint] starting server..."
exec node server.js
