# Claude Directive — Review This Folder Every Three Minutes

This directive is for the Claude build session working on Pocket Auditor.

## Review cadence

Every three minutes, re-scan the entire Pocket Auditor product folder for changes since the previous review. Do not wait for a user message to notice or correct work. If your environment cannot schedule a three-minute loop, state that limitation immediately and use the closest supported recurring mechanism; continue the build in the active session.

Folder:

`E:\Conform-Edge\ClaudeCowork\04 Product Portfolio\_Opportunity-Scans\Builds\2026-09-27-pocket-auditor`

## Each review must check

- new or changed files and handoff reports;
- current implementation versus `08-SHAREPOINT-SCOPE.md`;
- required skills loaded and applied;
- source/licence states and private-verbatim boundaries;
- quality-manual-first applicability;
- prior audit, CAR/NCR, and recurrence review;
- exact clause/subclause/lettered hierarchy;
- automatic checklist rendering from approved sources;
- evidence, camera/photo capture, interviews, sampling, findings, and immutable snapshots;
- SharePoint-native lists/libraries and standalone operation;
- tests, build output, and unresolved blockers.

## Action rule

If anything is missing, stalled, roadmap-only, or inconsistent:

1. identify the concrete gap;
2. implement the next safe in-scope change immediately;
3. run the smallest relevant test, then the broader test suite;
4. update the handover report with actual output;
5. continue to the next gap.

Do not send a status-only response when a safe implementation step is available. Do not ask for approval for ordinary implementation decisions. Ask only for a genuinely required owner decision, legal/licence input, unavailable source, or external tenant/device access.

## Required status format

After each meaningful review, report:

- files changed;
- implementation completed;
- tests run and real results;
- current blockers;
- next action already started.

Never claim production readiness, tenant deployment, or source approval without direct evidence.
