#!/usr/bin/env bash
# Provisions a local Postgres for the M-AI acceptance suite with the TWO real
# principals (design law 12): host owner `pma_app` and least-privilege `mai_kernel`.
# Safe to re-run. Requires superuser psql (run as the postgres OS user).
set -euo pipefail

DB=${PMA_TEST_DB:-pma_mai_test}
APP_PW=${PMA_APP_PW:-pma_app_pw}
KERNEL_PW=${MAI_KERNEL_PW:-mai_kernel_pw}
SQL_DIR="$(cd "$(dirname "$0")/../src/mai/sql" && pwd)"
DB_SQL_DIR="$(cd "$(dirname "$0")/../src/db" && pwd)"

psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='pma_app') THEN
    CREATE ROLE pma_app LOGIN PASSWORD '${APP_PW}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='mai_kernel') THEN
    CREATE ROLE mai_kernel LOGIN PASSWORD '${KERNEL_PW}';
  END IF;
END \$\$;
SQL

# Drop & recreate the test DB for a clean baseline.
psql -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${DB};"
psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${DB} OWNER pma_app;"

# Host schema + mai_* schema, applied as the owner (pma_app).
PGPASSWORD="${APP_PW}" psql -v ON_ERROR_STOP=1 -h 127.0.0.1 -U pma_app -d "${DB}" -f "${DB_SQL_DIR}/schema.sql"
PGPASSWORD="${APP_PW}" psql -v ON_ERROR_STOP=1 -h 127.0.0.1 -U pma_app -d "${DB}" -f "${SQL_DIR}/mai_schema.sql"

# Grants to mai_kernel, applied as superuser (can grant on pma_app's tables).
psql -v ON_ERROR_STOP=1 -d "${DB}" -f "${SQL_DIR}/mai_kernel_role.sql"

echo "Test DB '${DB}' ready with roles pma_app + mai_kernel."
