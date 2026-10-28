# M-AI Product Integration Profile — Supplier SCAR Response Builder

**Gate decision: ARCHITECTURE DEFINED**
**Domain:** scar-response

## Integration Classification
Standalone HTML tool — M-AI Kernel not embedded in this build. Reserved interface present for future platform promotion (e.g., M-AI could validate root cause plausibility or flag weak 5-Why chains).

## Reserved Interface
```json
{
  "mai_interface": "reserved",
  "domain": "scar-response",
  "version": "1.0",
  "export_schema": {
    "tool": "scar-response-builder",
    "scar_ref": "string",
    "customer": "string",
    "disciplines_complete": "number 0-8",
    "root_cause_type": "string",
    "escape_point_identified": "boolean",
    "systemic_prevention": "boolean",
    "generated": "ISO8601"
  }
}
```

## DIMs for future platform build
- DIM-1: Problem definition completeness (D1–D2): IS/IS-NOT populated, team assigned
- DIM-2: Root cause depth (D4): minimum 3 why-levels, escape point identified
- DIM-3: Corrective action traceability (D5–D6): actions link to root cause, verification evidence defined
- DIM-4: Systemic prevention (D7): similar products/processes reviewed

## Authority Charter stub
Evidence source: user-declared; tool scaffolds structure, does not validate content claims. Root cause plausibility is user's responsibility.
