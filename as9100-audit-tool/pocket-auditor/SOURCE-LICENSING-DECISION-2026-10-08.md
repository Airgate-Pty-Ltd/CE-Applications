# Pocket Auditor — Organization-Private Licensed Source Decision

## Governing decision

When [the Organization] lawfully owns or holds a license to use a standard, regulation, checklist, manual, or other source, Pocket Auditor may store, process, display, search, and use that source verbatim within [the Organization]'s private Pocket Auditor environment for [the Organization]'s internal auditing and QMS activities, subject to the source licence and the organization's access controls.

This is organization-private use. It is not permission to redistribute the source through the Pocket Auditor product, shared library, public demo, template package, or another customer's tenant.

## Product behavior

### Conform-Edge-owned or licensed internal environment

If Conform-Edge has the applicable rights for its own organization, the private tenant may:

- upload and retain the licensed source artifact;
- use the source text verbatim in internal audit screens;
- extract and display clause, subclause, paragraph, and requirement text;
- generate checklists from the approved source;
- link evidence and findings to the exact source text;
- include permitted excerpts in internal reports;
- retain source revision, licence basis, owner, hash, and access controls.

The private source must be marked `ORG_PRIVATE` and must not enter the shared product library or any customer seed package.

### External customer use

For a customer outside [the Organization]:

- the customer must provide or upload its own licensed copy or authorized checklist/source;
- the source remains private to that customer's tenant;
- Pocket Auditor may process and display it according to that customer's rights;
- the customer source must not be copied into another customer's tenant;
- Conform-Edge-provided shared content must contain only content Conform-Edge has the right to distribute, or authored metadata/intent that does not reproduce restricted standard text.

### Shared library

The shared library may contain:

- source identifiers and metadata;
- clause and subclause references where permitted;
- Conform-Edge-authored intent, evidence guidance, failure modes, and question structure;
- approved crosswalks and applicability logic;
- source hashes and provenance;
- content explicitly licensed for redistribution.

It must not contain verbatim restricted standard text unless the distribution licence expressly permits it.

## Required source states

Add explicit source licence/use states:

- `ORG_PRIVATE_LICENSED` — verbatim use allowed only in the owning organization's tenant;
- `CUSTOMER_PRIVATE_LICENSED` — verbatim use allowed only in the supplying customer's tenant;
- `SHARED_DISTRIBUTABLE` — approved for shared/customer distribution;
- `REFERENCE_METADATA_ONLY` — identifiers and permitted metadata only;
- `UNVERIFIED_OR_UNAVAILABLE` — cannot generate an approved checklist.

Approval must validate both content approval and licence/use scope. A source can be technically approved for audit use while still being prohibited from shared distribution.

## Acceptance tests

- An organization-private licensed source can generate a checklist and display permitted verbatim content in that organization's tenant.
- The same source cannot be exported into a shared product pack or another organization's tenant.
- A customer-private source is inaccessible across organizations.
- A source marked metadata-only cannot display verbatim text.
- A source with missing licence/use scope is blocked from approved checklist generation.
- Reports preserve source licence scope and do not expose restricted text outside the owning organization.
