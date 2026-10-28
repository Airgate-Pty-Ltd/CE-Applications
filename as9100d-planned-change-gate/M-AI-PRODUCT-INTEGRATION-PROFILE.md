# M-AI Product Integration Profile — AS9100D Planned Change Gate Tool

**Version:** 1.0 | **Date:** 2026-09-05 | **Status:** ARCHITECTURE DEFINED

## Domain Registration

| Field | Value |
|-------|-------|
| Domain ID | `as9100d-planned-change` |
| Assessment type | change-management-gate |
| Standard | AS9100D Clause 8.1.2 |
| Decision paths | PROCEED / HOLD / ESCALATE |

## DIM Slots (Reserved)

| Slot | Purpose |
|------|---------|
| `change-type` | Change classification and applicable requirements |
| `impact-factors` | Safety/KC/FAI/customer/regulatory trigger detection |
| `review-status` | Completeness of required review functions |
| `notification-determination` | Customer and regulatory notification obligation |
| `evidence-checklist` | Dynamic required evidence per change type and risk |

## Kernel Interface

`window.__MAI_KERNEL_RESERVED` with `connect(kernel)`. When connected: customer-specific flow-down rules can be injected per recognized customer (Boeing/Airbus/Honeywell/Raytheon), KC trigger lists from product configuration data, and historical change approval time benchmarks for scheduling guidance.
