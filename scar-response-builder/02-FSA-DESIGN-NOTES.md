# FSA Design Notes — Supplier SCAR Response Builder

**Gate decision: FSA BUILD PASS**

## FSA §12 Check (Manual Data Entry Calculator test)
Not applicable. This is a structured workflow tool (guided input → formatted output) not a numeric calculator. It generates a customer-facing 8D response document from structured prompts — output is qualitative, not computational.

## Architecture
- Single HTML file, zero external dependencies
- 8 disciplines (D1–D8) as sequential tab panels
- D1: team entry (name, role, contact)
- D2: problem description with IS/IS-NOT matrix (4-row table)
- D3: containment actions (immediate + verification)
- D4: root cause (5-Why table + Fishbone category prompts: Man/Machine/Method/Material/Environment/Measurement)
- D5: corrective actions (action, owner, target date)
- D6: implementation verification (evidence type + date)
- D7: systemic prevention (similar processes/products review)
- D8: team recognition + customer-facing closure summary
- Escape point analysis: prompted between D3 and D4
- Output: formatted 8D response document (printable), JSON export
- Progress tracker: D1–D8 completion status
- M-AI interface reserved (domain: scar-response)

## VERA Design Compliance
- Navy header with SCAR reference field
- Discipline panels with completion badges
- Urgency cues: header shows response deadline countdown (user-entered due date)
- Print-optimized output section
- No external fonts or scripts
