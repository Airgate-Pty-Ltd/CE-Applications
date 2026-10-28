# Claude Correction — Use the Intent Skill, Correct the SharePoint Model, Add CAR Review

## Root cause of the drift

The build followed the governance/source-registration milestone but did not load the Pocket Auditor audit skill as an implementation dependency. The older Laravel/PostgreSQL build specification also remained visible beside the newer SharePoint scope, so the product direction was not resolved for Claude.

For this build, the controlling product direction is the standalone SharePoint-native scope in `08-SHAREPOINT-SCOPE.md`:

- Pocket Auditor has its own SharePoint lists and libraries.
- Existing QMS tools are read-only references and are never modified.
- SharePoint is the record system.
- Integration is additive and optional through export/read-only adapters.
- No Railway, Laravel server, PostgreSQL database, or Node sidecar is part of the SharePoint build unless a new owner decision explicitly restores it.

## Required skill usage

Load and use these skills before building the audit workflow:

1. `E:\Conform-Edge\ClaudeCowork\_Skills\conform-edge-pocket-auditor\SKILL.md`
2. `E:\Conform-Edge\ClaudeCowork\_Skills\Auditor-Profile-and-Audit-Engine\Skills-Library\enterprise-audit-intelligence-engine\SKILL.md`
3. `E:\Conform-Edge\ClaudeCowork\_Skills\Auditor-Profile-and-Audit-Engine\Skills-Library\cross-framework-compliance-auditor\SKILL.md`
4. `E:\Conform-Edge\ClaudeCowork\_Skills\Auditor-Profile-and-Audit-Engine\Skills-Library\master-investigation-os\SKILL.md`
5. `E:\Conform-Edge\ClaudeCowork\_Skills\Auditor-Profile-and-Audit-Engine\Skills-Library\audit-reporting-analytics-engine\SKILL.md`

Use the Pocket Auditor skill for modes, routing, field workflow, offline operation, evidence capture, interview mode, checklist mode, and finding capture. Use the enterprise audit intelligence skill for intent, evidence sufficiency, sampling, and decision boundaries. Use cross-framework rules for parallel regulatory obligations and approved crosswalks. Use the investigation/CAR and reporting skills for corrective action review, recurrence, effectiveness, and reporting.

### Conflict resolution for the skills

The skills provide behavior and method. They do not authorize shipping unlicensed standard text or using guessed requirements. The newer SharePoint source-governance rule wins:

- skill method + approved source data = usable checklist;
- skill method + unavailable/unapproved source = visible pending/upload-required state;
- no copied licensed standard text in the shared product library;
- customer-uploaded licensed text remains customer-private in its SharePoint library;
- Conform-Edge-authored intent is allowed only when its provenance and approval status are recorded.

## Missing required capability: CAR review

CAR review is a first-class audit activity, not a later integration note. Add a **Corrective Action Review** mode and workflow.

### CAR review entry points

The auditor must be able to:

- review prior CARs before or during a new audit;
- select CARs by site, process, supplier, clause, requirement, product, source, owner, status, age, severity, and recurrence;
- review a CAR linked from a prior finding;
- open a CAR from a current finding without modifying the existing QMS tool;
- import a CAR through an approved export/read-only adapter;
- record that no CAR data was available and why.

### CAR review record

Capture:

- CAR/NCR identifier and source system;
- linked requirement, clause/subclause, process, site, product, and prior finding;
- original problem statement and objective evidence;
- containment/correction;
- root-cause method and result;
- corrective action;
- implementation evidence;
- effectiveness criteria and verification evidence;
- due date, status, overdue state, owner, approver, and closure date;
- recurrence or similar-process impact;
- auditor review result: effective, partially effective, ineffective, recurring, not available, or not applicable;
- new evidence captured during the review;
- new finding or escalation created if effectiveness is not demonstrated.

### CAR review behavior

- A closed CAR is not assumed effective merely because it is closed in another system.
- Effectiveness must be evaluated against evidence and the original problem/requirement.
- A recurring or ineffective CAR must appear in the current audit risk context and may increase sampling.
- If a prior CAR is overdue or lacks evidence, the item must show a visible condition.
- CAR review results must be included in the audit snapshot and final report.
- A new finding may reference a prior CAR, but the Pocket Auditor does not write into the existing CAR system unless an approved additive adapter is enabled.

## Required audit workflow order

1. Select audit type and authorities/standards.
2. Review quality manual and establish applicability.
3. Review prior audits, findings, CARs/NCRs, recurring issues, and open actions.
4. Select organization documents and records to review.
5. Select clauses/parts/processes and lock scope.
6. Generate the intent-based checklist from approved data.
7. Prepare offline package.
8. Conduct document review, interviews, process walks, sampling, observation, and evidence capture.
9. Assess documented/implemented/effective and record N/A basis where applicable.
10. Draft findings and link exact requirements/evidence.
11. Review prior CAR effectiveness and create follow-up findings where needed.
12. Lead auditor classifies findings, completes close-out, and issues the report.

## Acceptance tests to add

- skill method is loaded and referenced by the build/report;
- quality-manual review precedes applicability lock;
- prior CAR review is required or explicitly waived with a reason;
- CAR with insufficient effectiveness evidence is flagged;
- recurring/ineffective CAR changes item risk or follow-up state;
- CAR review appears in the immutable audit snapshot and report;
- cross-framework requirements remain independently traceable;
- unavailable or unapproved source never creates an approved item;
- SharePoint-only standalone operation works without the existing QMS tool;
- existing QMS repository remains unchanged.
