# M-AI Product Integration Profile — COPQ Intelligence System
**Stage:** 3 — M-AI Symbiotic Integration Gate  
**Date:** 2026-08-18  
**Reference:** MAI-ARCH-001 Rev C

---

## Gate Decision

```
M-AI INTEGRATION GATE: ARCHITECTURE DEFINED (RESERVED INTERFACE)
Rationale: COPQ Intelligence System operates on imported data and produces deterministic outputs.
The import/classify/compute pipeline is rules-based and does not require M-AI for core function.
M-AI adds value as an observation and alerting layer over time-series COPQ data — this
requires persistent kernel state that is not available in a single-session HTML tool.
Reserved interface documented; no Kernel fork; no private rules engine.
```

---

## M-AI Domain Pack: `copq-intelligence`

### Governed Decisions (Reserved Interface)

| Decision ID | Type | Trigger | Action |
|-------------|------|---------|--------|
| `COPQTrendAlert` | OBSERVE | External failure % > Internal failure % in current period | Flag as escape-rate signal; recommend investigation |
| `PreventionRatioAlert` | OBSERVE | Prevention < 10% of total COPQ | Flag as prevention underinvestment; recommend MR agenda item |
| `MRAlertTrigger` | ADVISE | Period-over-period total COPQ increase > 20% | Recommend management review agenda addition |
| `CostDriverConcentration` | OBSERVE | Top 3 drivers > 60% of total COPQ | Flag concentration risk; recommend targeted CAPA |

### What M-AI Does NOT Do Here
- Does not classify records (deterministic rule engine does this, user can correct)
- Does not generate narrative text (templated insight engine does this)
- Does not make release or conformity decisions
- Does not replace the user's judgment on category assignments

### Kernel Dependency
RESERVED INTERFACE. The HTML tool exposes `window.COPQ_MAI_INTERFACE` containing the computed period summary when M-AI Kernel is injected. Without Kernel injection, the tool operates fully and independently — the interface is a no-op.

---

## Authority Charter Excerpt

```
AUTHORITY: COPQ Intelligence System — OBSERVE + ADVISE only
Kernel may observe COPQ trend data and advise on MR triggers.
Kernel may NOT: modify computed totals, alter category assignments, 
suppress outputs, or make conformity determinations.
All outputs are advisory. User retains full decision authority.
```
