# EDCAT Bug Report Log

## Cycle 1
- **Test**: `node scripts/edcat-smoke.js Cycle1`
- **Result**: ✅ Pass
- **Notes**: TenantStore successfully upserted and persisted tenant metadata (slug `cycle1-tenant`). No corrective action required.

## Cycle 2
- **Test**: `node scripts/edcat-verify.js`
- **Result**: ⚠️ Initial failure – verification threw when the database connection was unavailable.
- **Root Cause**: `verifyTenantDatabase` did not guard against connection errors during table existence checks, causing the script to terminate.
- **Fix**: Wrapped each `to_regclass` lookup in a try/catch and reported the database error via the issues array instead of throwing (`src/server/tenant-provisioner.js`).
- **Retest**: ✅ Pass – script now returns a structured issue report while the pool logs the connection problem.

## Cycle 3
- **Test**: `node scripts/edcat-provision.js`
- **Result**: ⚠️ Initial failure – provisioning aborted because database operations threw when the connection was unavailable.
- **Root Cause**: `provisionTenantDatabase` assumed `ensureBaseTables` always succeeded and propagated the query error, aborting without updating tenant metadata.
- **Fix**: Guarded the base-table creation with try/catch, returning a partial result (`provisioned: false` plus `provision_error`) while leaving existing data untouched.
- **Retest**: ✅ Pass – script now reports `provisioned: false` and captures the backend error for operators to review.

