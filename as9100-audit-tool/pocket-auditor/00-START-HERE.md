# Pocket Auditor — Build Package (baseline PA-BASELINE-001)

**Status:** build locked. Prototype authorized. Production not authorized.

## What this is
The complete handoff for Claude Code to build Conform-Edge · Pocket Auditor: an offline-first audit app for Android, iOS and web. It turns regulations, standards, customer requirements and internal documents into one intent-based checklist, runs the audit offline on site, and syncs to a Laravel + PostgreSQL server for review and reporting, with the M-AI kernel checking audit integrity.

## How to start the build
1. Open Claude Code in this folder.
2. Open `07-BUILD-SPEC.md`, copy everything below the line, and paste it in.
3. Claude Code will send a plan first. Approve it, then it builds milestone by milestone (M0–M9) and reports evidence at each step.

## Reading order
| File | What it holds |
|---|---|
| `BUILD-GOVERNANCE-STATUS.md` | Locked decisions and stage approvals |
| `01-DISCOVERY-RECORD.md` | Product definition, scope, claim boundary, decision log |
| `02-FSA-DESIGN-NOTES.md` | Future Systems Architect gate (PASS) |
| `03-M-AI-PRODUCT-INTEGRATION-PROFILE.md` | How M-AI is used; draft DIM |
| `04-PRODUCT-REQUIREMENTS.md` | Workflows, requirements, screen layouts |
| `05-PRODUCT-ARCHITECTURE.md` | Framework, data model, sync, ingestion, skill reuse |
| `06-DECISION-LOGIC.md` | Checklist generation, precedence, sampling, findings |
| `07-BUILD-SPEC.md` | The Claude Code prompt |
| `13-NEEDS-FROM-BRIAN.md` | Decisions and content only you can supply |
| `content/` | Library converter + 329-requirement seed + report |
| `mai/dims-draft/` | Draft M-AI rules (inactive until you approve) |

## Framework at a glance
- **App:** Ionic React + Capacitor (TypeScript), encrypted SQLite on device
- **Server:** PHP / Laravel + PostgreSQL 16 (dev on E:, prod on Railway)
- **Intelligence:** canonical `@mai/kernel` as a Node sidecar (deterministic checks); JudgmentProvider/VERA for semantic intent review (online, advisory)
- **Requirements:** CE-QMS Next Requirement Graph (closure table), same contracts as CE-QMS Next so it plugs in later
