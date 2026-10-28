
# Documented Information Control Procedure

**Document No.:** [AIMS-P-12]
**Version:** [1.0]
**Effective Date:** [YYYY-MM-DD]
**Owner:** [Document Controller / AIMS Manager]
**Approved By:** [Top Management Role/Name]
**Review Cycle:** [Annually]
**Applies to clause intent:** ISO/IEC 42001:2023 Clause 7.5 (Documented Information)

---

## 1. Purpose

This procedure sets out how [The Organization] creates, reviews, approves, issues, changes,
distributes, protects, retains, and eventually disposes of the documented information that makes up
its AI Management System — policies, procedures, templates, registers, and records. The intent is
that anyone relying on an AIMS document can trust it is the current, approved version, and that
history of prior versions and decisions is not lost.

## 2. Scope

Applies to all documented information required by the AIMS: the AI Policy, this procedure and its
sibling procedures (Documents 1–24 in this kit and any [The Organization] adds), registers
(risk register, interested-parties register, requirements flow-down matrix), records (training
records, audit reports, management review minutes, model cards, incident logs), and externally
sourced documents the AIMS depends on (e.g., a customer's AI requirements, a regulator's guidance,
this standard itself).

## 3. Defined Terms

| Term | Meaning |
|---|---|
| Documented information | Any information [The Organization] is required to control and maintain, in any medium (Word, PDF, wiki, spreadsheet, ticketing system record). |
| Controlled document | A document maintained under this procedure's version, approval, and distribution rules. |
| Record | Documented information that provides evidence of an activity performed or a result achieved (does not get "revised" — superseded records are retained, not edited). |
| Master List | The single authoritative index of every controlled AIMS document, its current version, and its owner. |
| External document | Documented information [The Organization] did not author but relies on (standards, customer specs, regulator publications, supplier certificates). |

## 4. Roles & Responsibilities

| Role | Responsibility |
|---|---|
| Document Controller (may be the AIMS Manager) | Maintains the Master List; assigns document numbers; archives superseded versions; controls the external-document register. |
| Document/Process Owner | Drafts and updates their assigned document; routes it for review/approval; ensures content is accurate and reflects actual practice. |
| Reviewer(s) | Check technical/operational accuracy and consistency with related AIMS documents before approval. |
| Approver (per document type — see 5.4) | Formally approves the document for release; accountable for its adequacy. |
| All Personnel | Use only current, controlled versions; do not locally edit or redistribute controlled documents without going through this procedure. |

## 5. Procedure

### 5.1 Documentation hierarchy
[The Organization] organizes AIMS documented information in four levels:

| Level | Type | Examples | Typical Approver |
|---|---|---|---|
| 1 | Policy | AI Policy | Top Management |
| 2 | Procedures | This document; Documents 6, 7, 9, 11, 13–21 | AIMS Manager (Top Management for cross-cutting procedures) |
| 3 | Templates, forms, work instructions | Model card template, training record form, checklists | Document/Process Owner |
| 4 | Records | Completed forms, registers, minutes, logs | N/A (evidence, not approved as a "document") |

### 5.2 Creating or updating a document
1. Owner drafts or revises content.
2. Owner identifies which other AIMS documents are affected by the change (e.g., a change to the
   Risk Assessment procedure may require updating the Statement of Applicability).
3. Draft is reviewed by at least one person other than the author for Level 1–2 documents.
4. Draft is approved by the designated approver (5.4) before issue.
5. Document Controller assigns/increments the version number, updates the Master List, and archives
   the prior version.

### 5.3 Identification of documents
Every controlled document carries, at minimum: document title, document number, version number,
effective date, owner, and approval authority — visible on its face (as in the header of this
document).

**Version numbering convention:** [Major.Minor], e.g., 1.0 for first release; increment the minor
digit (1.1) for clarifications/corrections that don't change intent or requirements; increment the
major digit (2.0) for substantive changes to scope, responsibilities, or required actions.

### 5.4 Review and approval authority

| Document Type | Reviewer | Approver |
|---|---|---|
| AI Policy | AIMS Manager | Top Management |
| Procedures (Level 2) | AIMS Manager + affected process owner | AIMS Manager, ratified by Top Management annually |
| Templates/forms (Level 3) | Process owner | Process owner |
| Registers (risk, interested parties, etc.) | AIMS Manager | Process owner |

### 5.5 Distribution and access
Controlled documents are held in [designated repository/system — e.g., SharePoint, Confluence,
document control folder]. Access is granted according to role need; sensitive documents (e.g.,
risk register entries with commercially sensitive detail) may be access-restricted. Personnel are
notified when a document they rely on changes materially (e.g., via email, change log
subscription, or team briefing).

### 5.6 Protection
Controlled documents are protected against: unauthorized edit (write-access limited to owner/
Document Controller), loss (regular backup per [The Organization]'s IT backup policy), and
unintended use of an obsolete version (superseded versions are marked "SUPERSEDED" or moved out of
the active repository, not deleted, and are retained per 5.8).

### 5.7 Control of external documents
External documents the AIMS depends on (regulatory texts, customer AI requirements, this standard,
supplier certifications) are logged in the External Document Register (Section 7.3) with source,
version/date obtained, and where it is stored. The register is reviewed at least annually, or when
[The Organization] becomes aware of a new version, to check whether AIMS documents need updating.

### 5.8 Retention and disposition
Records are retained per the schedule below unless a legal, contractual, or certification-body
requirement specifies otherwise (the longer period governs).

| Record Type | Minimum Retention | Disposition |
|---|---|---|
| Superseded controlled document versions | [3 years] after superseding | Archive, then delete |
| Training records | [Duration of employment + 3 years] | Archive, then delete |
| Risk assessments / registers (historical entries) | [5 years] | Archive |
| Internal audit reports | [5 years] | Archive |
| Management review minutes | [5 years] | Archive |
| Incident/nonconformity records | [5 years] or per contractual requirement | Archive |
| Model cards (retired systems) | [Life of system + 3 years] | Archive |

### 5.9 Nonconforming document control
If an uncontrolled, outdated, or unapproved document is found in use, the finder reports it to the
Document Controller, who removes/replaces it, checks how it entered circulation, and where
relevant, logs a nonconformity per Document 20.

## 6. Templates

### 6.1 Master Document List

| Doc No. | Title | Version | Effective Date | Owner | Next Review Due |
|---|---|---|---|---|---|
| [AIMS-P-01] | [AI Policy] | [ ] | [ ] | [ ] | [ ] |
| [AIMS-P-12] | [Documented Information Control Procedure] | [1.0] | [ ] | [ ] | [ ] |
| ... | | | | | |

### 6.2 Document Change Log (per document)

| Version | Date | Change Description | Changed By | Approved By |
|---|---|---|---|---|
| [1.0] | [ ] | [Initial release] | [ ] | [ ] |

### 6.3 External Document Register

| External Document | Source/Publisher | Version/Date Obtained | Stored At | Last Reviewed | Reviewer |
|---|---|---|---|---|---|
| [ISO/IEC 42001:2023] | [ISO] | [ ] | [ ] | [ ] | [ ] |
| [Customer AI Requirements Spec — Customer X] | [Customer X] | [ ] | [ ] | [ ] | [ ] |

---
© 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
Documented Information Control Procedure is proprietary software of Conform-Edge Quality Consulting LLC
(Idaho LLC No. 6463380), Pocatello, Idaho, USA. Unauthorized reproduction,
distribution, modification, or resale is prohibited. "Conform-Edge" and the
Conform-Edge mark are trademarks of Conform-Edge Quality Consulting LLC.
Advisory documentation aid — does not certify compliance and does not replace the
judgment of the user's organization or top management.

**Regulatory currency notice:** This document is authored intent-based from general
knowledge of ISO/IEC 42001:2023's structure and has NOT been verified against a
licensed copy of the published standard. Confirm clause references and control
language against the current official standard text before commercial sale or use
in a certification audit.
