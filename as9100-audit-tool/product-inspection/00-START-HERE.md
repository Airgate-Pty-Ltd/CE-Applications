# Product Inspection — Start Here

This is the reading order for the governance documents in this folder. Read them in sequence when onboarding or resuming after a break.

| # | File | What it covers | Read when |
|---|------|----------------|-----------|
| 0 | `README.md` | Product overview, stack, source location, completion gate | Always first |
| 1 | `01-DISCOVERY-RECORD.md` | Phase 0 discovery — what existed, open questions, references | Understanding context |
| 2 | `02-ARCHITECTURE.md` | Stack, module boundaries, data model, form schemas, storage | Developing the app |
| 3 | `03-REGULATORY-MATRIX.md` | Standard-to-form mapping (AS9102C, FAA 8130-3, EASA Form 1, AS9100D) | Adding regulated fields |
| 4 | `04-PRODUCT-REQUIREMENTS.md` | Screens, workflows, user stories, acceptance criteria | Feature planning |
| 5 | `05-BUILD-GOVERNANCE.md` | Locked decisions, deferred features, what is not in scope | Any scope question |
| — | `BUILD-GOVERNANCE-STATUS.md` | Quick-scan status board — current state in one page | First look each session |
| — | `content/schemas/` | Canonical JSON schemas for export and storage | Implementing export |
| — | `content/sampling/` | ANSI Z1.4 and C=0 lookup tables in JSON | Sampling plan logic |
| — | `exports/` | Sample inspection export packages | Testing export |
| — | `tests/` | Validation scripts and fixtures | Running checks |

## Current source location

Active dev is at `../ProductInspection/` (outside this repo). Start the dev server:

```
node ../ProductInspection/serve.js
```

Then open `http://127.0.0.1:7421`. The launch config at `../.claude/launch.json` (`ProductInspection-dev`) starts it from the IDE.

## What is locked

See `05-BUILD-GOVERNANCE.md`. Key locked items:
- JSON export schema v1 field names — do not rename without versioning
- Sampling plan algorithm — verified against ANSI Z1.4 Table II-A
- SPC Cpk thresholds — 1.33 capable / 1.00 marginal / <1.00 incapable
- No INTERNET permission in Capacitor manifest
- CE-authored forms only — no word-for-word copies of FAA or SAE official form text

## What is deferred

- Military add-on (DD Form 250, MIL-STD-1916, ITAR flag)
- Full 8130-3 / CoC / EASA Form 1 output screens (auth setup exists; output screens pending)
- NCR full disposition loop
- Material cert traceability
- FOD checklist
- PDF/A archival
- Multi-sheet drawing viewer
- Mike's merged Capacitor repo review (reference material not yet supplied by Mike)
