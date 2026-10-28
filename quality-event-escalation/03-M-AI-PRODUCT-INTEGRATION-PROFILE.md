# M-AI Product Integration Profile — Quality Event Classification & Escalation Decision Tool

**Gate decision: ARCHITECTURE DEFINED**
**Domain:** quality-event-escalation

## Integration Classification
Standalone HTML tool — M-AI Kernel not embedded in this build. Reserved interface present for future platform promotion (e.g., M-AI could detect event patterns and flag systemic issues).

## Reserved Interface
```json
{
  "mai_interface": "reserved",
  "domain": "quality-event-escalation",
  "version": "1.0",
  "export_schema": {
    "tool": "quality-event-escalation",
    "event_type": "string",
    "severity": "CRITICAL | MAJOR | MINOR | OFI",
    "standards_applied": ["string"],
    "critical_override": "boolean",
    "customer_notif_required": "boolean",
    "regulatory_notif_required": "boolean",
    "capa_required": "boolean",
    "generated": "ISO8601"
  }
}
```

## DIMs for future platform build
- DIM-1: Event severity classification: escape status, customer receipt, in-service risk
- DIM-2: Notification triggers: standard-specific customer/regulator notification thresholds
- DIM-3: Process pathway: CAPA / 8D / SCAR / document-only routing
- DIM-4: Evidence capture: what records must be initiated within 24hr/72hr/30-day

## Authority Charter stub
Evidence source: user-declared event facts; tool applies deterministic rules. Regulatory notification determination is the user's responsibility — tool provides decision guidance, not legal advice.
