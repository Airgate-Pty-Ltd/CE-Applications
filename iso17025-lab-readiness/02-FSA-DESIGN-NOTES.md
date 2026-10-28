# FSA Design Notes — ISO 17025:2017 Lab Readiness Tool

**Gate decision: FSA BUILD PASS**

## FSA §12 Check (Manual Data Entry Calculator test)
Not applicable. This is a self-assessment tool (yes/no/partial responses with evidence status) that produces a scored readiness report — not a manual data-entry calculator. It classifies current state against standard requirements, which is the portfolio's core competency.

## Architecture
- Single HTML file, zero external dependencies
- 5 sections × 6–7 questions = ~32 questions total
- Each question: status (Met / Partial / Not Met / N/A) + evidence-status dropdown
- Critical items: 2 per section minimum (scope definition, method validation, uncertainty, proficiency testing, impartiality)
- Scoring: section % + overall % + critical-zero override
- Output: verdict badge, section breakdown panel, gap table with ISO 17025 clause reference, prioritized action plan, MR narrative, JSON export
- M-AI interface reserved (domain: iso17025-readiness)

## VERA Design Compliance
- Navy header, steel sidebar, VERA panel card layout
- Verdict badge: ACCREDITATION READY / CONDITIONAL / NOT READY
- Section cards with progress bars
- Gap table: clause | requirement summary | status | priority action
- No external fonts or scripts
