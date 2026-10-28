# Decision Logic — Regulatory Change Impact Analyzer

**M-AI Role:** Domain `regulatory-change-impact` — governed decisions ADVISE (scope, urgency, actions) and HOLD (safety override). Logic runs locally in JavaScript; Kernel wiring RESERVED INTERFACE.

---

## Core Engine

### Input Variables
- `authority` — issuing regulatory body (FAA, EASA, ISO, IAQG, IATF, FDA, CAAC, UK-CAA, OTHER)
- `changeType` — final-rule | amendment | standard-revision | ac-guidance | nprm | ad | safo | bilateral
- `safetyFlag` — no | yes (safety-of-flight) | production (production approval)
- `scope` — array of user's certification/approval codes

### Urgency Determination (governed decision: `action_urgency` / `safety_override`)

```
baseUrgency = TAXONOMY[authority][changeType].urgencyBase
IF changeType = 'ad' → IMMEDIATE (override)
IF changeType = 'nprm' → MONITOR (override — not final)
IF safetyFlag IN ['yes', 'production'] → IMMEDIATE (safety_override HOLD)
finalUrgency = max(baseUrgency, overrides)
```

Urgency tier definitions:
- `IMMEDIATE` — Action required now; safety/airworthiness or AD in effect
- `SHORT-TERM` — Action required within ~6 months; regulation/standard effective
- `MONITOR` — Prepare early; proposed or guidance-level; no immediate obligation

### Scope Intersection
```
affectedScope = userScope ∩ TAXONOMY[authority][changeType].affects
IF affectedScope = empty → advisory "verify applicability"
```

### Impact Mapping
```
FOR each authority-changeType combination:
  clauses = TAXONOMY[authority][changeType].clauses    // affected clause families
  docTypes = TAXONOMY[authority][changeType].docTypes  // document types to review
  actions = TAXONOMY[authority][changeType].actions    // ordered action list
```

### NPRM Advisory
```
IF changeType = 'nprm' → display "proposed rule, not yet final" callout; actions include comment period and impact scoping
```

---

## Taxonomy Coverage

| Authority | Change Types Covered |
|-----------|---------------------|
| FAA | final-rule, amendment, ac-guidance, nprm, ad, safo, bilateral |
| EASA | final-rule, nprm, bilateral, ac-guidance |
| ISO | standard-revision |
| IAQG | standard-revision |
| IATF | standard-revision |
| FDA | final-rule, ac-guidance |
| CAAC | final-rule |
| UK-CAA | final-rule |
| OTHER | final-rule (fallback) |

---

## Scope Codes

`AS9100D`, `AS9110C`, `AS9120B`, `ISO9001`, `IATF`, `ISO13485`, `FAA145`, `FAA21`, `EASA145`, `EASA21`, `UKCAA`, `CAAC`, `ISO14001`, `MDSAP`, `ISO45001`
