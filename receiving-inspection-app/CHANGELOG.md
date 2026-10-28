# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/). The
project stays on `0.x` until the interface is built and the first pilot is
complete.

## [Unreleased]

Everything below is unreleased. No version has been tagged, because the app has
no user interface for executing an inspection yet — see HANDOVER.md.

### Added

- **Repository guardrails.** Clean-room scrub gate (`scripts/scrub-check.sh`)
  running from a pre-commit hook before a commit object exists, and in CI across
  full history. Structural patterns are written so the gate never contains the
  literals it rejects; names live in a permanently git-ignored, owner-supplied
  denylist. Verified by deliberate breach before the first commit.
- **Architectural gate answers** in `DESIGN-NOTES.md`, including the four
  enforced invariants that prevent the product degrading into a digital form.
- **Deterministic engine** (`src/engine/`), pure with no I/O, clock or
  randomness, held at 100% branch coverage by CI:
  - Inspection path router — documentation gate as a hard stop, release-document
    branch, six independently traced escalation triggers, sampling resolution.
  - Check applicability evaluation over declarative predicates.
  - Nonconformance disposition routing with role requirements.
  - Tool calibration gate that blocks rather than warns.
  - Retention floor enforcement.
- **Storage seam** with a contract suite that defines what a valid provider is.
  Memory and SharePoint providers both pass all 12 operations; local IndexedDB
  provider built; WebDAV and S3 are explicit throwing stubs.
- **Offline sync queue** — durable, ordered, retry-safe, never drops a record.
  Conflicts surfaced rather than auto-merged. Record locking with expiry.
- **Identity role mapping** from directory group membership, with a capability
  matrix. Unmapped users receive no role.
- **Check content packs as versioned data** — 19 checks across physical and
  documentation verification, each carrying its regulatory hook.
- **Inspection record** — immutable once signed, corrections by referenced
  revision, refusal to sign listing every unresolved reason at once, and the
  reproducibility invariant that rejects any check the engine did not emit.
- **Test dashboard** with 14 panels, all asserted green in CI.
- **Documentation set**: README, DESIGN-NOTES, TEST-PLAN, STORAGE-ADAPTERS,
  DEPLOYMENT, REGULATORY-SOURCES, HANDOVER, SECURITY.

### Changed

- **Retention model corrected against the build specification.** The spec cited
  14 CFR 145.213 as driving a 10-year regulatory floor. 145.213 concerns
  inspection of maintenance performed; the recordkeeping rule is 145.219, whose
  minimum is 2 years. Enforcing 10 as a *regulatory* floor would refuse lawful
  configurations. The regulatory floor and the product default are now separate
  values: floors ship marked unverified and injectable, and 10 years is retained
  as the product default. See REGULATORY-SOURCES.md.
- **Toolchain**: eslint 10, vite 7, vitest 3.2.7. Vitest was deliberately not
  taken to 4 — on 4 the v8 coverage provider omits `src/engine/` entirely, which
  makes the 100% branch threshold pass while checking nothing. The `audit` job
  is split accordingly: blocking on production dependencies, advisory on the dev
  toolchain.
- **Dependabot version-update and security PRs disabled.** This is a trunk-only
  repository; Dependabot's branch-per-update model conflicts with it. Alerts
  remain enabled and CI still blocks on production advisories; updates are
  applied directly on `main` with the reasoning in the commit message.

### Fixed

- **Production build gate was reporting a false green.** The bundle emitted a
  `TestDashboard-<hash>.js` chunk containing check-pack fixtures and internal
  rule logic while CI reported it clean. Two faults: a top-level
  `lazy(() => import(...))` is emitted even when its only branch is dead code,
  and the assertion grepped bundle *content* for `test-dashboard` — a string the
  chunk's *filename* never contains. The import expression now sits behind the
  build-time constant, and the assertion checks content case-insensitively,
  chunk filenames, and a fixture marker. Verified in both directions.
- **Clean-room gate fired on ordinary English.** Denied terms were matched as
  substrings, so a four-letter surname matched inside the word `boolean` and
  failed every commit touching typed code. Terms now match whole words only,
  re-verified by deliberate breach.
- **SharePoint revision history returned ids without bodies**, so the revision
  chain could not be shown. Caught by the storage contract suite; the adapter now
  fetches each revision's content.
- **SharePoint metadata and write time were lost on read-back.** Both now ride as
  promoted library columns.

### Security

- Delegated permissions only; the app cannot write a record with no human
  identity attached.
- No credentials in the repository, CI, or any build.

### Known gaps

- No check-execution or NCR user interface.
- No PDF rendering; FAA Form 8100-1 layout not built.
- No sampling table values ship, by design — sample inspections block until
  configured.
- All regulatory citations unverified.
- GitHub secret scanning and push protection not enabled (organisation
  metered-usage lock).
- SharePoint adapter never exercised against a real tenant.
