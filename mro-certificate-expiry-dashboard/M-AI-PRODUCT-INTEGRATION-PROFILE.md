# M-AI Product Integration Profile — MRO Certificate Expiry Intelligence Dashboard
**Version:** 1.0 — 2026-08-27
**Gate:** STEP 2.6 M-AI Symbiotic Product Integration Gate
**Gate Decision:** ARCHITECTURE DEFINED — governed logic runs locally; Kernel wiring pending platform host

---

## Product

| Field | Value |
|-------|-------|
| Product | MRO Certificate Expiry Intelligence Dashboard |
| Slug | mro-certificate-expiry-dashboard |
| Domain ID | mro-certificate-expiry |
| Build type | Static single-file HTML |
| Kernel dependency | RESERVED INTERFACE — governed logic runs locally |

---

## M-AI Purpose Statement

Observe repair station certificate and approval data (authority, cert type, expiry date, renewal lead time) and issue governed urgency-tier decisions (CURRENT / MONITOR / WARNING / CRITICAL / EXPIRED) per certificate, preventing loss of operating authority due to missed renewal deadlines.

---

## Domain Pack (Kernel-Shaped — runs locally)

### Entity Registry

| Entity | Description |
|--------|-------------|
| RepairStation | The assessed organisation; name, primary authority |
| Certificate | Approval instance: authority + cert type + number + expiry date |
| RenewalEvent | Triggered when days-to-expiry crosses a tier threshold |
| PostureAssessment | Aggregate across all certs; overall station posture |

### Event Registry

| Event | Trigger |
|-------|---------|
| CertExpiryWarning | Days-to-expiry ≤ 90 |
| CertExpiryCritical | Days-to-expiry ≤ 30 |
| CertExpired | Days-to-expiry ≤ 0 |
| CAACDeadlineApproach | Authority = CAAC AND days to Dec 31 ≤ 90 |
| PostureIssued | Aggregate tier computed |

### Governed Decisions (per Certificate)

| Decision | Kernel Signal | Condition |
|----------|--------------|-----------|
| CURRENT | PROCEED | > 180 days to expiry |
| MONITOR | ADVISE | 91–180 days to expiry |
| WARNING | ADVISE | 31–90 days to expiry |
| CRITICAL | HOLD | 1–30 days to expiry |
| EXPIRED | BLOCK | ≤ 0 days (or CAAC Dec 31 passed) |

### Authority Profile

| Authority | Scope |
|-----------|-------|
| CertExpiryDomain | Issues urgency-tier decisions per certificate |
| QualityDirector (host) | Reviews dashboard; initiates renewal actions |
| Regulatory Authority | Grants/renews actual certificates; tool tracks only — never asserts validity |

---

## Implementation Surfaces

| Surface | Status |
|---------|--------|
| Observation (cert register form) | ✅ AVAILABLE NOW |
| Evidence (date-diff engine) | ✅ AVAILABLE NOW |
| Governed decisions (local tiers) | ✅ AVAILABLE NOW |
| CAAC Dec-31 hard rule | ✅ AVAILABLE NOW |
| Kernel adapter | RESERVED INTERFACE |
| Calendar / email reminders | FUTURE (premium) |
| Cross-app emits (CertExpiryCritical → QMS) | FUTURE |

---

## Integration Gate Decision

**ARCHITECTURE DEFINED** — local governed logic runs now. Kernel dependency RESERVED INTERFACE pending platform host. Prototype may proceed; production authorization requires INTEGRATION AUTHORIZED.
