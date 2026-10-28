# Receiving Inspection

An execution app for aerospace incoming receiving inspection.

The inspector works **inside** the app. It opens a receipt, determines the
required inspection path from the article's documentation type and risk, steps
the inspector through the checks that path requires, captures evidence and
deviations, and emits a completed, signed inspection record plus an automatic
nonconformance route when something fails.

**This is not a checklist printer. The deliverable is the executed record.**

---

## What makes it different from an ERP receiving module

Three things, and only the first is a feature — the other two are architecture.

1. **It routes on release-document type.** An article released on an FAA Form
   8130-3 and an article released on a Certificate of Conformance alone are
   different regulatory situations and get different treatment. Escalation
   triggers (first article, open corrective action, key characteristics,
   supplier standing, configuration change) cut across the part/supplier
   configuration an ERP indexes on.

2. **It refuses.** It will not start an inspection against incomplete
   documentation, will not accept a measurement from an out-of-calibration tool,
   and will not produce a signed record with an unresolved mandatory field.
   These refusals live in the engine, not the UI — they cannot be clicked past.

3. **It is a client, not a system of record.** Records are written to *your*
   repository, in *your* tenant, under *your* retention policy. No migration,
   and your records are never held hostage.

See [DESIGN-NOTES.md](DESIGN-NOTES.md) for the honest limitations, including the
segment where the incremental value over a well-configured ERP is thin.

---

## Status

| Area | State |
|---|---|
| Engine — routing, checks, NCR, calibration, retention | Built, 100% branch coverage |
| Storage adapters — memory, local, SharePoint | Built, contract-verified |
| Storage adapters — WebDAV, S3 | Explicit stubs that throw |
| Sync queue, record locking, conflict surfacing | Built |
| Identity and role mapping | Built |
| Check content packs | Built (19 checks) |
| Inspection record — signing, immutability, revisions | Built |
| Test dashboard (14 panels) | Built, all green |
| **Check-execution UI** | **Not built** |
| **NCR / disposition UI** | **Not built** |
| PDF rendering, PWA, Tauri, billing scaffold | Not built |

See [HANDOVER.md](HANDOVER.md) for exactly where the seams are.

---

## Requirements

- Node 22 or later
- npm 10 or later

## Run

```bash
npm install
npm run dev
```

The app serves at `http://localhost:5173`. The test dashboard is at
`/dev/test-dashboard` — **development and staging only**, and the production
build asserts its absence from the bundle.

## Test

```bash
npm run verify
```

Runs the clean-room scan, typecheck, lint, unit tests with coverage, and the
production build. Individually:

```bash
npm run scrub          # clean-room scan of tracked files
npm run scrub:history  # clean-room scan of every commit
npm run typecheck
npm run lint
npm run test           # vitest
npm run test:coverage  # enforces 100% branch coverage on src/engine/
npm run test:e2e       # playwright, Chromium + WebKit
```

`src/engine/` must hold 100% branch coverage. The engine decides inspection
paths and dispositions; an unexercised branch there is an unexercised rule.

## Build

```bash
npm run build     # production bundle into dist/
npm run preview   # serve the production bundle locally
```

The app is a static bundle. See [DEPLOYMENT.md](DEPLOYMENT.md) for hosting and
tenant configuration.

---

## Configure storage

All persistence goes through one interface. Feature code never calls a provider
directly. Set the provider and its configuration at runtime — it is customer
configuration, not build-time state.

| Provider | Use | State |
|---|---|---|
| `sharepoint` | The customer's document library via Microsoft Graph | Primary |
| `local` | IndexedDB. Development and single-user mode | Built |
| `webdav` | Network share / generic WebDAV | Stub |
| `s3` | S3-compatible object storage | Stub |

Records are written as structured JSON so the data stays machine-readable, with
inspection metadata promoted to library columns so views and reports work
without opening files. Folder convention defaults to
`/{year}/{supplier}/{receipt-id}/` and is configurable.

To add your own provider, implement the interface and pass the contract suite —
passing it is the definition of a valid provider. See
[STORAGE-ADAPTERS.md](STORAGE-ADAPTERS.md).

## Configure identity

Authenticate against your own identity provider: Entra ID via MSAL for
SharePoint tenants, generic OIDC otherwise. **This app holds no password store
and is never the source of truth for identity.** Roles derive from group
membership, mapped in configuration:

| Role | Can |
|---|---|
| Inspector | Execute checks, sign records |
| Supervisor | The above, plus approve dispositions |
| Quality Manager | The above, plus configure sampling tables and check packs |
| Read-only | Read. Signs nothing, approves nothing |

A user in no mapped group gets **no** role rather than defaulting to read-only —
an unmapped user is a configuration error, and quietly granting a weak role
hides it.

## Configure sampling

**This product ships no sample sizes.** The sampling table is data, with the
structure, loader, validation and routing built in full, and the shipped table
explicitly unconfigured. A receipt routed to sample inspection against an
unconfigured table returns a blocking `SAMPLING_TABLE_NOT_CONFIGURED` outcome
naming what is missing.

This is deliberate. An invented AQL scheme looks authoritative, gets used, and
produces defective sample sizes on real receipts. Supply your own.

## Integration

Beyond the storage adapter: one documented outbound webhook, and CSV import for
article master data. There is no connector to any named ERP, and there should
not be — the product is system-agnostic by design.

---

## Documentation

| File | What it covers |
|---|---|
| [DESIGN-NOTES.md](DESIGN-NOTES.md) | The architectural gate, and what the product refuses to become |
| [TEST-PLAN.md](TEST-PLAN.md) | What each dashboard panel proves and how to read it |
| [STORAGE-ADAPTERS.md](STORAGE-ADAPTERS.md) | The provider contract and how to add one |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Hosting, tenant configuration, library setup |
| [REGULATORY-SOURCES.md](REGULATORY-SOURCES.md) | Every citation, with verification status |
| [HANDOVER.md](HANDOVER.md) | What is done, what is unstyled, where the UI seams are |
| [SECURITY.md](SECURITY.md) | Reporting a vulnerability |
| [CHANGELOG.md](CHANGELOG.md) | Release history |

## Licence

Proprietary. See [LICENSE](LICENSE). No licence is granted by receipt of this
repository.
