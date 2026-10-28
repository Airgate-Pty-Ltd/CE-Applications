# Deployment

Hosting, tenant configuration, and SharePoint library setup.

## Shape of the thing

The app is a **static bundle**. There is no application server, no database, and
no vendor-hosted record store. It runs in the browser, authenticates against the
customer's identity provider, and writes records to the customer's own
repository.

That has a consequence worth stating to any customer during procurement: **the
vendor never holds their inspection records.**

---

## Current deployment status

**Nothing is deployed.** No public demo exists, and none should be created
without a deliberate decision — the app talks to a customer tenant, and a public
instance needs a fictional-data mode built specifically for it.

Recommended path:

1. **Private staging** so the app can be exercised without local setup. GitHub
   Pages on a private repository, or Netlify/Vercel with access protection.
2. **Customer pilot** against their tenant and library.
3. **Public marketing demo** — later, deliberate, and only with a fictional-data
   mode.

CI does not publish artefacts today. Add an upload step on tagged releases when
staging is wanted.

## Build

```bash
npm ci
npm run build     # → dist/
```

Serve `dist/` as static files. Any host will do. The app is a single-page
application: **configure the host to rewrite unknown paths to `index.html`**, or
routing will 404 on refresh.

### Verify before shipping a build

The `build` CI job asserts the test dashboard, its chunk, and its fixture
content are absent from `dist/`. Do not disable this. It caught the dashboard
shipping to production once already, and it is the only thing standing between
a customer and the internal rule logic plus fixture data.

Never set `VITE_FEATURE_TEST_DASHBOARD=true` in a production build.

---

## Entra ID application registration

Required for the SharePoint path.

**Whose registration is it?** Undecided, and it matters. Two models:

- **Customer-registered** (recommended for pilots): the customer registers the
  app in their own tenant and supplies the client id. Their tenant, their
  consent, their audit trail. Slower to start; cleaner to sell into a regulated
  organisation.
- **Multi-tenant vendor registration**: one registration, customers consent.
  Faster onboarding, but the vendor's registration appears in the customer's
  tenant, which some quality organisations will question.

Ask before the first pilot. Changing it later means re-consenting.

### Registration settings

| Setting | Value |
|---|---|
| Platform | Single-page application |
| Redirect URI | The deployed origin, e.g. `https://host/` |
| Supported accounts | Single tenant (customer-registered) or multi-tenant |
| Implicit grant | **Off.** Authorization code flow with PKCE |

### Delegated permissions

Least privilege. The app acts **as the signed-in user**, so a user cannot reach
anything their own account cannot.

| Permission | Why |
|---|---|
| `Files.ReadWrite.All` | Write records to the library |
| `Sites.ReadWrite.All` | Library metadata and columns |
| `User.Read` | Signed-in user identity for the record signature |
| `GroupMember.Read.All` | Group membership → role mapping |

Prefer scoping to a specific site if the tenant's administrators support it.

**Do not use application permissions.** App-only access would let the product
write records with no human identity attached, which is exactly what a signed
inspection record must never be.

---

## SharePoint library setup

### The library

A document library on a customer-nominated site. Records are written as
structured JSON, with the folder convention defaulting to:

```
/{year}/{supplier}/{receipt-id}/
```

Configurable. Unknown tokens are left visible rather than silently dropped — a
wrong path is easier to spot than a missing one.

### Columns to create

Inspection metadata is promoted to library columns so views, filters and reports
work without opening files. Create these as **single line of text** unless
noted:

| Column | Example |
|---|---|
| `receiptId` | `RCPT-0001` |
| `partNumber` | `PN-1000-A` |
| `serialNumbers` | space-separated |
| `supplierId` | `SUP-ALPHA` |
| `inspectionPath` | `FULL_INSPECTION` |
| `result` | `pass` / `fail` / `not-started` |
| `inspector` | display name |
| `signedAt` | ISO timestamp (Date and Time) |
| `ncrReference` | NCR id, or empty |
| `revision` | integer (Number) |
| `_writtenAt` | ISO timestamp, written by the adapter |
| `_contentType` | written by the adapter |

**Confirm the mapping before rollout using dashboard panel 14**, which renders
exactly what the app would write for a sample record.

If a column is missing, the record content write **succeeds** and the column
write fails. The adapter reports this explicitly — the record is upstream, the
view is incomplete. Fix the schema, do not ignore it.

### Retention

Apply the customer's retention label to the library. The app reads the label
back and validates it against the regulatory floor for the configured operating
basis, warning when it is short.

**The floors are unverified.** See REGULATORY-SOURCES.md — the specification's
original citation was wrong and has been corrected. Confirm the floor for the
customer's operating basis before relying on the warning.

### Versioning

Enable version history. The app treats signed records as immutable and corrects
by revision, so library versioning is a backstop rather than the mechanism — but
`history()` reads it, and dashboard panel 4 depends on the revision chain.

---

## First-tenant verification

The SharePoint adapter has never touched a real tenant. It is verified against a
fake Graph client, which proves it honours the storage contract — **not** that
Graph behaves as the fake does. Budget time for this.

On first connection, in order:

1. Sign in; confirm the user resolves to the expected role (panel 13).
2. Write one record; confirm the file lands in the expected folder.
3. Confirm every column populated (panel 14 as the reference).
4. Read the retention label back (panel 9).
5. Open the same receipt on a second device; confirm the lock blocks and names
   the holder (panel 12).
6. **Drop the network mid-inspection**, sign offline, restore, confirm the
   record commits exactly once (panel 11).

Step 6 is the one to do properly. A record lost to a dropped connection is the
failure mode that kills this product.

---

## Configuration summary

Storage and identity configuration is **customer-supplied at runtime**, not
build-time state. `.env.example` documents every variable with no values.

A production bundle must be usable by a customer who sets none of them and
configures the app after install.

**No credentials belong in the repository, in CI, or in a build.** CI needs no
secrets to build and test.

---

## Single-site or multi-site

Undecided. It changes the folder convention, the role mapping (site-scoped
groups), and whether the supplier rollup aggregates across sites. Ask before the
first deployment; retrofitting site scoping into records already written is
painful.
