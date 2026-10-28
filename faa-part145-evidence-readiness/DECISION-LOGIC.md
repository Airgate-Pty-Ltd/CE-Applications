# Decision Logic — FAA Part 145 Evidence-Readiness Audit Tool

## M-AI Role
Kernel wiring: RESERVED INTERFACE. Governed logic runs locally in static HTML.

## Domain Verdict Logic
```
For each domain:
  IF any critical item (★) response = MISSING → verdict = NOT-READY
  ELSE IF any item response = MISSING → verdict = NOT-READY
  ELSE IF any item response = PARTIAL → verdict = CONDITIONAL
  ELSE → verdict = READY
  (N/A items excluded from scoring)
```

## Overall Status Logic
```
IF any domain = NOT-READY → Overall = NOT READY
ELSE IF any domain = CONDITIONAL → Overall = CONDITIONAL
ELSE → Overall = READY
```

## Remediation Priority
```
NOT-READY domains → CONDITIONAL domains (sorted by domain order)
Within domain: MISSING items first (critical ★ labeled), then PARTIAL
```

## EASA Bilateral Advisory
```
IF bilateral checkbox = checked → inject MAG CHG 10 §20 advisory block in results
```

## Critical Items (★)
OpSpecs currency; work authorization match; Equipment calibration records; Accountable Manager designation; Authorized RTS personnel; Training program; Training records (current); HF training records; QC Manual; Inspection procedures; RTS authorization process; Work order records; Inspector qualifications; Inspector qualification records; Drug/Alcohol program (if required); Supervisor D/A training records.
