# Consolidated EDCAT Console Architecture

Date: 2025-11-09

## Goals

- Retire the standalone deployer UI and merge all provisioning/admin features into the primary Edge-Document Compliance Assessment Tool console.
- Maintain existing customer-focused assessment workflows while exposing administrative panels for Conform-Edge operators.
- Support creation of customers that share a single database while generating per-customer tables on demand.
- Preserve Conform-Edge branding and theming consistency.

## High-Level Layout

```
Header
 ├─ Conform-Edge logo + product title
 ├─ Tenant / customer context switcher (for internal operators)
 └─ Quick actions (Run Verification, Sync Regulatory Feeds, Toggle Theme)

Main Layout (two-column)
 ├─ Left Sidebar
 │   ├─ Customer roster (was active tenants)
 │   ├─ Compliance profile summary
 │   └─ Operations shortcuts (Provision, Verify, Reports)
 └─ Right Content (tabbed sections)
     ├─ Assessments & Gap Analysis (existing runtime)
     ├─ Provisioning Console (migrated deployer forms)
     ├─ Regulatory Intelligence (feed status & sync)
     ├─ Configuration Catalogs (profiles, requirement packs)
     └─ System Health & Logs
```

### Navigation

- Introduce top-level tabs or segmented control within existing main content column.
- Default tab remains “Assessments”.
- Additional “Administration” tab hosts migrated deployer panels (customer detail, jurisdiction seeding, profile editor, regulatory feed status).
- Sidebar updates to display both assessment quick filters and customer roster with health status.

## Frontend Modules

| Module | Responsibility | Action Items |
|--------|----------------|--------------|
| `edcat.html` | Unified UI shell | Embed provisioning panels, add Conform-Edge logo, reorganize layout |
| `edcat-init.js` | Bootstrap & routing | Load internal operators’ customer list; expose toggle between assessment & admin views |
| `tenant-service.js` | API gateway | Replace localStorage with REST calls (`/api/edcat/...`); cache results in-memory if needed |
| `tenant-context.js` | Runtime state | Allow operator override to view specific customer context while staying multi-tenant safe |
| `requirements-sync.js` | Pack status | Extend to call verification/reporting endpoints |
| `document-store.js` / `requirement-map-store.js` | Persistence | Prepare for per-customer tables (stubbed with TODO until backend implemented) |

## Backend Interfaces

- `GET /api/edcat/tenants-list` – list customers for sidebar
- `GET /api/edcat/tenants/:id` – fetch unified customer configuration
- `POST /api/edcat/tenants` – create/update customer; triggers table creation helper
- `POST /api/edcat/tenants/:id/provision` – ensure tables exist and mark provisioned
- `GET /api/edcat/tenants/:id/verify` – run verification checks (DB tables present, packs assigned)
- `POST /api/edcat/regulatory/sync` – future administrative sync trigger (reuse existing endpoint)

## Data Flow Overview

1. Operator opens console → `tenant-service` fetches customer roster.
2. Selecting customer loads detail form + runtime assessment context.
3. Saving customer:
   - Client collects identity, legal, configuration, auto-assigned packs, profiles.
   - `POST /api/edcat/tenants` persists metadata via control-plane store.
   - Server invokes table creation helper if new or flagged for regeneration.
4. Provision action calls `/provision`, ensuring per-customer tables exist (documented below).
5. Verification action calls `/verify`; results displayed inline with color-coded badges.

## Per-Customer Table Strategy

- Shared database connection.
- Table names namespace by tenant/customer slug, e.g.:
  - `documents__<tenant_id>`
  - `document_mappings__<tenant_id>`
  - `requirements_snapshots__<tenant_id>`
  - `users__<tenant_id>`
  - `activity_log__<tenant_id>`
- Helper functions:
  - `generateTenantTableName(tenantId, baseName)`
  - `ensureCustomerTables(tenant)`
  - `verifyCustomerTables(tenant)`
- Control-plane metadata stores list of created tables per tenant for quick verification.

## Auto-Assignment Logic

- Helper `applyAutoPacks(config)` executed client-side before submit and server-side post-validation.
- Mapping matrix keyed by `tenant_type` + `country` → default standards & regulatory packs.
- Base standards:
  - OEM: `STANDARD_AS9100`
  - MRO: `STANDARD_AS9110`
  - Combined types merge both.
- Regulatory packs:
  - USA → `REGPACK_FAA_PART21`, `REGPACK_FAA_PART145`
  - Australia → `REGPACK_CASA_PART21`, `REGPACK_CASA_PART145`
  - EU → `REGPACK_EASA_PART21`, `REGPACK_EASA_PART145`
  - UK → `REGPACK_UKCAA_PART21`, `REGPACK_UKCAA_PART145`
  - Additional mappings for TCCA, ANAC, CAAC, DGCA, GCAA, CAAS, CAA NZ.

## Verification & Health Checks

- `/api/edcat/tenants/:id/verify` returns:
  - `ok` boolean
  - `issues` array (missing tables, missing packs/standards, not provisioned)
  - `checked_at`
  - Future: add table row counts, last sync timestamps.
- UI displays verification summary in customer panel with “Run now” button.
- Automatic verification after successful save or provision.

## Branding & UX

- Header includes Conform-Edge logo (`public/assets/logos/conform-edge-logo.png`).
- Ensure color palette consistent with teal/navy scheme already in styles.
- Maintain legal footer from deployer at bottom of unified console.

## TODO & Deferred Items

- [ ] Replace in-memory document/requirement stores with API-backed services.
- [ ] Implement authentication/RBAC for consolidated console.
- [ ] Wire automated regression tests (UI + API).
- [ ] Integrate real regulatory sync service and status tracking.
- [ ] Add export/report functionality for operator audit logs.


