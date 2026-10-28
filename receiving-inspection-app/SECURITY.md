# Security Policy

## Reporting a vulnerability

**Do not open a public issue.**

Report privately through GitHub's private vulnerability reporting on this
repository: **Security → Advisories → Report a vulnerability**. That keeps the
report visible only to maintainers until a fix exists.

Please include what you were doing, what happened, what you expected, and the
smallest reproduction you have. If you are unsure whether something is a
vulnerability, report it anyway.

**Never include real customer data, credentials, tokens, or inspection records
in a report.** Redact identifiers and use fictional values.

### What to expect

| Stage | Target |
|---|---|
| Acknowledgement | 5 working days |
| Initial assessment | 10 working days |
| Fix or mitigation plan for a confirmed high or critical issue | 30 days |

This is a single-maintainer project. Response times are best-effort, not a
contractual commitment.

## Scope

In scope: anything in this repository — the decision engine, storage adapters,
the sync queue, record signing and immutability, role mapping, and the build
pipeline.

Particularly interested in:

- **Record integrity.** Any way to alter a signed record, produce a record
  without a valid signature, or break the revision chain.
- **Gate bypass.** Any way to sign with unresolved mandatory fields, pass the
  calibration gate with an out-of-calibration tool, or start an inspection
  against failed documentation.
- **Lost records.** Any sequence in which a queued record is dropped, or
  committed more than once.
- **Lock bypass.** Two devices holding the same receipt.
- **Clean-room leakage.** Any customer or employer identifier reaching a build
  or the git history.

Out of scope: the customer's own tenant, identity provider, or SharePoint
configuration; and vulnerabilities in dependencies with no exploitable path
through this application.

## Security posture

- **No credentials in the repository.** Not in code, fixtures, `.env`, comments,
  or tests. `.env.example` names every variable with no values.
- **The app holds no password store** and is never the source of truth for
  identity. Authentication is delegated to the customer's provider; roles derive
  from group membership.
- **Delegated permissions only.** The app acts as the signed-in user. It has no
  app-only access, so it cannot write a record with no human identity attached.
- **Customer data never reaches the vendor.** Records go to the customer's own
  repository.
- A **pre-commit clean-room gate** runs before a commit object exists, and CI
  re-runs it across full history.
- CI blocks on high-severity advisories in **production** dependencies. Dev-chain
  advisories are reported but non-blocking — see the rationale in
  `.github/workflows/ci.yml`.

### Known gaps

Stated rather than implied:

- **GitHub secret scanning and push protection are not enabled** on this
  repository — blocked by an organisation metered-usage setting. The pre-commit
  gate is the compensating control until that is resolved.
- The **clean-room denylist is machine-local** by necessity. A clone without one
  runs a structural scan only, and says so.
- The **SharePoint adapter has not been exercised against a real tenant.**
