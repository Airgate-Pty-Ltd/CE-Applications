# M-AI Product Integration Profile — ISO 17025:2017 Lab Readiness Tool

**Gate decision: ARCHITECTURE DEFINED**
**Domain:** iso17025-readiness

## Integration Classification
Standalone HTML tool — M-AI Kernel not embedded in this build. Reserved interface present for future platform promotion.

## Reserved Interface
```json
{
  "mai_interface": "reserved",
  "domain": "iso17025-readiness",
  "version": "1.0",
  "export_schema": {
    "tool": "iso17025-lab-readiness",
    "overall_score": "number 0-100",
    "verdict": "ACCREDITATION_READY | CONDITIONAL | NOT_READY",
    "critical_zero": "boolean",
    "sections": [
      {
        "id": "string",
        "title": "string",
        "score": "number 0-100",
        "gaps": ["string"]
      }
    ],
    "gap_count": "number",
    "generated": "ISO8601"
  }
}
```

## DIMs for future platform build
- DIM-1: Scope and impartiality (Clause 4): defines lab scope, conflict of interest controls
- DIM-2: Resource requirements (Clause 6): personnel competence, equipment, metrological traceability
- DIM-3: Process requirements (Clause 7): method validation, measurement uncertainty, sampling, handling
- DIM-4: Management system (Clause 8): document control, CAPA, internal audit, management review

## Authority Charter stub
Evidence source: self-declared; no LLM inference; deterministic clause-to-question mapping only.
