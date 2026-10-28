# FSA Design Notes — Quality Event Classification & Escalation Decision Tool

**Gate decision: FSA BUILD PASS**

## FSA §12 Check (Manual Data Entry Calculator test)
Not applicable. This is a multi-standard decision routing tool — it classifies an event and produces a required-actions matrix. The output is a structured decision, not a numeric calculation. Classification logic is deterministic rule-based (not user math entry).

## Architecture
- Single HTML file, zero external dependencies
- Phase 1: Context setup (org type: Aerospace MFG / MRO / Medical Device / Automotive / General ISO; applicable standards: multi-select)
- Phase 2: Event characterization (20–22 questions: event type, affected product, quantity, escape status, injury/accident, customer receipt, in-service, regulatory territory)
- Severity engine: weighted rule matrix → Critical / Major / Minor / OFI
- Action matrix engine: for each selected standard, map severity → required actions (hold, CAPA, 8D, customer notification, regulatory notification)
- Critical override: customer receipt of nonconforming product = automatic Critical regardless of other inputs
- Output: Severity verdict badge, standard-by-standard action table, timeline commitments, evidence capture checklist, escalation narrative
- JSON export for QMS record
- M-AI interface reserved (domain: quality-event-escalation)

## VERA Design Compliance
- Navy header, URGENT visual cue for Critical events (amber border)
- Standard selection pills (colored tags for each selected standard)
- Severity verdict badge: CRITICAL (red) / MAJOR (amber) / MINOR (blue) / OFI (green)
- Action table: standard | action | timeline | evidence required
- No external fonts or scripts
