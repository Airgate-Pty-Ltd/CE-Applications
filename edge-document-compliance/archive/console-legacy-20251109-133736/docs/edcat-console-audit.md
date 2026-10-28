# EDCAT Console Consolidation Audit

Date: 2025-11-09

## Objectives

- Catalogue all provisioning and administration capabilities previously implemented in the standalone `edcat-deployer.html` (now merged into the unified `edcat.html` console).
- Identify supporting runtime modules that must be merged into the unified Edge-Document Compliance Assessment Tool console.
- Capture backend dependencies impacted by the consolidation effort.

## Deployer Feature Inventory

- **Global Theme Toggle**
  - Persists light/dark theme preference via `localStorage`.
  - Applies brand palette variables to headers, panels, and typography.

- **Active Tenants Sidebar**
  - Lists tenants from `TenantService.listTenants()`.
  - Displays health indicator dot (good/warning/error) with hover metadata.
  - Provides click-to-open detail view without auto-selecting the first tenant.

- **Tenant Detail Panel**
  - Comprehensive provisioning form:
    - Identity: name, slug, type, jurisdiction/country, branding display name/logo.
    - Legal & billing: company legal name, contacts, addresses, tax ID.
    - Operational contacts: primary admin, technical contact.
    - Subscription: plan, status, start/renewal dates, user limit.
    - Configuration: modules, SSO, API key, base path, DB instance name.
    - Health & notes: health status selector, last health check datetime, internal notes textarea.
  - Actions:
    - Save (create/update tenant).
    - Delete tenant.
    - Close panel.
    - Trigger verification & provisioning (currently placeholder).

- **Compliance Profile Selection**
  - Checklist cards of available profiles (fetched from `ProfilesConfig`).
  - Multi-select with primary profile radio button enforcement.
  - Displays tenant types allowed and whether selected profile is primary.
  - Aggregates enabled standards & regulatory packs into hidden fields.

- **Requirement Pack Overrides**
  - Multi-select grids for standards and regulatory packs using `RequirementsConfig`.
  - Updates hidden textarea inputs used when submitting tenant changes.

- **Jurisdiction Auto-Seeding**
  - Jurisdiction dropdown (country) with helper text.
  - `applyAutoAssignmentsForJurisdiction` function seeds regulatory packs based on tenant type + jurisdiction.
  - Handles OEM + MRO composite scenario.

- **Profile Catalog Management**
  - Collapsible list of existing profiles with metadata (IDs, tenant types, enabled packs, regulator links).
  - Create/update profile form with:
    - ID, label, description, regulator links.
    - Allowed tenant types (checkbox pills).
    - Standards & regulatory pack selectors.
    - Allow customer requirement toggle.
    - Delete profile button.

- **Regulatory Feed Status Panel**
  - Collapsible country → authority grouping.
  - Shows last sync timestamp, clause count, and error states.
  - “Refresh feeds” button calling `/api/regulatory/sync`.

- **Utilities**
  - Toast notifications with severity styles.
  - Loading overlay/spinner used during long-running actions.
  - Debug logging fields (`EDCAT] ...`) for major actions.

## Supporting Runtime Modules

- `public/Modules/edcat/runtime/tenant-service.js`
  - LocalStorage-backed CRUD for tenants (list, get, upsert, remove).
  - TODO comment to replace with backend API integration.

- `public/Modules/edcat/runtime/tenant-context.js`
  - Resolves tenant from URL.
  - Loads tenant configuration and associated profiles/packs.
  - Injects `tenant_id` header into `fetch`.
  - Exposes combined context for runtime UI.

- `public/Modules/edcat/runtime/requirements-sync.js`
  - Placeholder sync routine returning status per pack.
  - Intended to call backend API in future.

- `public/Modules/edcat/runtime/edcat-init.js`
  - Bootstraps runtime UI with tenant labels, profile list, pack list, and sync results.
  - Hides main content until tenant context resolves.

- `public/Modules/edcat/runtime/document-store.js`
  - In-memory placeholder for tenant-scoped document metadata.

- `public/Modules/edcat/runtime/requirement-map-store.js`
  - In-memory placeholder for requirement-to-document mappings.

- `public/Modules/edcat/runtime/edcat-selftest.js`
  - Basic smoke test for TenantService persistence and sidebar rendering.

## Backend Touchpoints

- `services/tenantConfig.js` & `routes/tenants.js`
  - Control-plane storage for tenants & profiles (JSON file).
  - Provides CRUD API currently consumed by deployer.

- `services/regulationFetcher.js` & `/api/regulatory` routes
  - Regulatory sync endpoints used by deployer feed status panel.

- `database/schema.sql`
  - Tenant-aware tables (tenant_id columns).
  - Needs alignment with per-customer table creation approach.

## Migration Considerations

- Merge deployer panels into main `edcat.html` while preserving styling.
- Replace `TenantService` localStorage persistence with backend API calls.
- Update runtime navigation to expose administrative panels in single console.
- Ensure new customer creation triggers table creation (within shared DB).
- Retain regulatory feed status, profile editor, and auto-assignment logic.
- Integrate Conform-Edge branding (logo) into consolidated layout.


