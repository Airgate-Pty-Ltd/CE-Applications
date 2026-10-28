# M-AI Product Integration Profile
## AuditProgramIQ — Internal Audit Program Builder

**Date:** 2026-09-07
**M-AI Gate Decision:** ARCHITECTURE DEFINED

## Reserved Interface

JSON export includes:
```json
{ "maiInterface": { "domain": "internal-audit-program", "reserved": true } }
```

## Phase 2 M-AI DIMs

| DIM | Purpose |
|-----|---------|
| `process-risk-classifier` | Classify risk level from process name + standard context |
| `clause-process-mapper` | Map process names to standard clauses automatically |
| `coverage-gap-detector` | Identify processes in scope that are missing from the program |
| `auditor-conflict-checker` | Flag auditor independence conflicts from org structure |
