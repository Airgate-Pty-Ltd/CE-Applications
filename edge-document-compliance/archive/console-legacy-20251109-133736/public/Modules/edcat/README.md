# Edge-Document Compliance Assessment Tool (EDCAT)

EDCAT is the deployable, multi-tenant environment used by regulators, certification bodies, OEMs,
MROs, consultants, and enterprises to assess documentation against standards, regulatory packs, and
customer requirements. The module consists of:

- **`ui/edcat.html`** – Unified runtime and provisioning console (toggle between assessments and admin view).
- **`ui/edcat-deployer.html`** – Legacy deployer wrapper (retained for backward compatibility; redirects to `edcat.html`).
- **`config/*.js`** – In-memory configuration registries for tenants and compliance profiles (replaceable with API-backed storage).
- **`requirements/requirements-config.js`** – Metadata describing supported requirement packs (no proprietary text).
- **`runtime/*.js`** – Tenant context loader, storage abstractions, and bootstrap logic.

Integrate these modules with real persistence and authentication layers to move from the simulated
in-memory stores to production-ready services.

