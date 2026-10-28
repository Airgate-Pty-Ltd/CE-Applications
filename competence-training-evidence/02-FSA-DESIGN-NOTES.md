# FSA Design Notes — Competence & Training Evidence Engine
**Date:** 2026-08-20 | **Gate:** FSA BUILD MODE PASS

## Architecture
- **Phase 1 — Role & Competency Setup:** User defines up to 8 roles; for each role, selects required competency areas from a standard list (calibrated to ISO 9001 §7.2 + AS9100 supplements)
- **Phase 2 — Personnel Records:** For each person, select role + mark each competency as: Current / Due for Renewal / Not Trained / N/A; input training date
- **Phase 3 — Effectiveness Evidence:** For each training completed, rate: Knowledge Check Passed (Y/N), Performance Observation (Y/N/NA), and Supervisor Confirmation (Y/N)
- **Outputs:** Role-based competence matrix heatmap, per-person gap report, effectiveness evidence summary, §7.2 MR narrative, JSON export
- **M-AI reserved interface:** domain `competence-training`, 3 DIMs: CompetenceGapSeverity, EffectivenessAdequacy, TrainingPriorityQueue

## FSA Checks: All PASS
- Real paying problem: yes (§7.2 top-5 NC clause)
- Next-gen architecture: yes (role-matrix + effectiveness evidence, not just a training log)
- Data model: roles × competencies × persons × effectiveness = complete evidence chain
- Misuse: low; disclaimer on effectiveness proxy
- Zero-dependency HTML: yes
- M-AI reserved: yes
- VERA design: yes

**Decision: PROCEED**
