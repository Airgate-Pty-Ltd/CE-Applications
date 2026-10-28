# AS9100 Audit Tool

This repository contains independent applications for aerospace audit work. Each application lives in its own folder with its own source, build commands, tests, documentation, and runtime boundaries.

## Applications

| Folder | Application | Status | Handoff |
|---|---|---|---|
| [`pocket-auditor/`](pocket-auditor/) | Pocket Auditor reference tool and audit-workflow prototype | Working reference; not production approved | [`README.md`](pocket-auditor/README.md) |
| [`ai-qms/`](ai-qms/) | AI-QMS build: documentation review backend and frontend | Isolated legacy build; production work not yet started | [`README-HANDOFF.md`](ai-qms/README-HANDOFF.md) |

## Folder rule

One folder equals one application. Run an application's commands from inside that application's folder. Do not import source files, tests, build outputs, databases, or hidden configuration from another application. Compatibility must be implemented through explicit contracts or adapters.

The root README is an index only. Application-specific instructions belong in that application's handoff README.

## Current boundaries

- `pocket-auditor/` remains self-contained and is not modified when working on `ai-qms/`.
- `ai-qms/` contains the previously loose `backend/`, `frontend/`, and Node package files from the unfinished AI-QMS build.
- Existing QMS products and SharePoint tools are separate products and must not be modified by work in this repository.
- Licensed standards and customer-owned checklist content must remain governed by the source and export rules documented in the relevant application.

## Repository workflow

1. Read the target application's `README-HANDOFF.md` before making changes.
2. Work from inside that application folder.
3. Run that application's tests and verification commands.
4. Update its handoff documentation with real results.
5. Keep commits scoped to the application being changed, plus this root index when the application inventory changes.
