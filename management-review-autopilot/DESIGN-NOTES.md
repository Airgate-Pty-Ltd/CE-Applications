# Design Notes — FSA BUILD-mode answers (future-systems-architect)

**1. Problem clarity:** Eliminates the recurring assembly labor of clause-9.3/5.6
management review and the audit exposure of incomplete inputs. The job-to-be-done is
"walk into my review input-complete and leave with a defensible record" — not "give me
a template."

**2. Intelligence layer:** Deterministic rules engine (input-status × data-presence ×
justification rules → coverage score + typed gap findings). No LLM anywhere in the
execution path; every verdict is reproducible and explainable. This is the M-AI-aligned
skeleton — v2.0 replaces it with kernel DIMs (see BUILD-NOTES deferral).

**3. Human role:** Decision-only. The human supplies facts and makes the review
decisions; the software enforces structure, detects gaps, and assembles every artifact.
All engine outputs are labeled advisory; the chair signs the record.

**4. Connectivity:** Outputs are structured Markdown designed to be nodes: the action
register is import-ready for the next cycle (v1.1 carryover), and the package slots into
the Conform-Edge graph (self-assessment tools → MRA inputs; MRA outputs → 8D tool).

**5. Comparison test:** No direct enterprise equivalent — eQMS suites (ETQ, Qualio)
bury MR in workflow modules priced 50–100× higher and still ship blank agendas; template
vendors sell static docs with no engine. MRA's evidence-calibrated card guidance has no
software equivalent.

## FSA Gate Check (post-draft)
| Gate | Result |
|---|---|
| Eliminates work vs digitizes it | PASS — generates the record; user supplies only facts/decisions |
| AI/intelligence as operating system | PASS (deterministic engine drives the whole flow) |
| Knowledge-graph node output | PASS (structured, carryover-ready exports) |
| No enterprise-pattern clone | PASS — not a form-workflow clone; board mirrors the clause itself |
| Human decision-only | PASS |
| Deterministic assessment | PASS |
| Static-form input penalty | FLAG — manual entry is primary input in MVP (−3 applied in scoring; CSV upload v1.2, cross-product feed v2.0) |

0 gates failed, 1 flagged with roadmap remediation → no redesign required.
