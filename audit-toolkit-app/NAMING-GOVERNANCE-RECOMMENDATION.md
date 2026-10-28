# Naming and Product-Governance Issue — "Audit Toolkit"

**Status:** issue recorded; **recommendation only**. Nothing renamed, merged or retired. The working name "Conform-Edge Audit Toolkit" stays until you decide.
**Evidence:** `OVERLAPPING-BUILDS-RELATIONSHIP-MATRIX.md` (§2, §4 item 6). AuditFindingIQ's discovery record plans a commercial bundle called "Conform-Edge Audit Toolkit" ("Complete Audit Toolkit") combining the two single-file HTML tools (AuditProgramIQ, AuditFindingIQ). The new Android/Capacitor product uses the same name for a different thing.

## The collision
| | Planned bundle (existing records) | This product |
|---|---|---|
| What it is | Two small single-file HTML tools sold together | An offline-first, evidence-driven audit application with a governed runtime |
| State | Publish-ready by inspection/string checks; not shown as released | Prototype; release not authorized |
| Risk if both ship under one name | Customers and Play listing confuse a template tool bundle with a full audit app; support and IP claims bleed across; one product's claims (e.g. "intelligent") attach to the other | |

## Recommendation (distinguishing the six questions you asked)

| Question | Recommendation |
|---|---|
| **Commercial product identity** | Give the Android app its own commercial name, separate from the HTML bundle, before any store listing, domain or trademark filing. Candidate approach: a distinct product name with a descriptor ("Conform-Edge ___ — audit execution app"), and let the HTML bundle keep "Audit Toolkit" if it ships, or rename the bundle to a name that says what it is (builders/planners). Pick one owner of the phrase. Counsel should clear the chosen name; none has been searched here. |
| **Internal capability / project name** | Keep an internal project name (this folder: `audit-toolkit-app`) that never reaches customers. Do not use MAK or M-AI names externally. Internal names can change without customer impact. |
| **Existing historical records** | Do not rewrite. Leave AuditFindingIQ/AuditProgramIQ discovery records as written; add a dated "naming note" in the Decision Log pointing to the decision. The two AuditProgramIQ builds (08-20, 09-07) and three diverged AS9100 tool repo copies remain a separate owner decision (vault Deletion Rule: archive, never delete). |
| **Potential reusable functionality** | Concept-level only (matrix §3): intent-based checklist method, human-classifies principle, risk-based programme method. No code, schema or content copied; any future adapter is a declared dependency approved in writing. |
| **Repository ownership** | One product = one repo and one owner of record. Today: framework and Toolkit folders are vault folders (no repo); Kernel and MAK are Airgate-Pty-Ltd repos; the three AS9100 tool copies are diverged. Decide the Toolkit's repo home and entity (Conform-Edge Quality Consulting LLC vs Airgate-Pty-Ltd for code ownership) before the first production commit. |
| **IP boundaries** | Toolkit: Conform-Edge only; no Annex Quality or Burrana branding/data; no standard text unless public domain/licensed; Pocket Auditor `licensed-private` content is not to be mounted, indexed or tested against. Customer evidence is not training data without authorization. |

## Decision requested (owner)
1. Which product keeps "Audit Toolkit" (the HTML bundle, the app, or neither)?
2. Name clearance by counsel for the chosen commercial name(s) (open legal gate).
3. Repository home and owning entity for the Toolkit code.
Until decided: no new branding, no domain, no Play listing text uses the name.
