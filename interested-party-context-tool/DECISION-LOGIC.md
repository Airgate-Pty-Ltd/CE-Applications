# Decision Logic — Interested Party & Context Analysis Tool

## M-AI Role
RESERVED INTERFACE. Governed decisions run locally. On platform promotion: completeness gate becomes HOLD-class governed decision requiring management sign-off.

## Completeness Engine (Governed Decisions)
1. Required party type check: customer + regulatory + employee + supplier all present? Missing any → INCOMPLETE signal
2. HIGH-relevance monitoring gap: party with HIGH relevance + no monitoring method → ADVISE gap
3. Context completeness: 0 external issues → HOLD; 0 internal issues → HOLD
4. Overall verdict:
   - 0 gaps of any type → COMPLETE
   - Has basic context (ext+int both > 0) and ≥4 parties but minor gaps → GAPS IDENTIFIED
   - Missing required categories or context entirely → INCOMPLETE
