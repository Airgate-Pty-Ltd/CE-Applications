# DISCOVERY RECORD — AuditFindingIQ — Nonconformity Statement Builder

**Date:** 2026-09-17  
**Brand:** Conform-Edge (software)  
**Gate:** BUILD AUTHORIZED  
**Run:** Overnight automated, Desktop

## Product Definition

**What it is:** HTML tool that generates structured, defensible nonconformity statements using the Requirement → Evidence → Effect framework, supporting 8 standards and 4 finding classifications.

**Problem it solves:** Poorly written NCs are the #1 complaint from auditees and the leading cause of CB dispute escalations. New auditors struggle to write clause-specific, evidence-anchored statements. This tool scaffolds the output without requiring the user to memorize clause language — they describe what they saw, the tool structures it correctly.

**Who uses it:** Internal auditors, 2nd-party supplier auditors, CB trainees, QMS managers writing CAR responses (to understand how a proper NC is structured), consultants conducting gap assessments.

**Why now:** AuditProgramIQ (built 09-07) plans the program. AuditFindingIQ closes the gap — from planning to documented finding. Together they form the "Conform-Edge Audit Toolkit" bundle. No NC statement builder exists in any competitor's portfolio.

## Commercial Case

- $99–$149 one-time standalone
- AuditProgramIQ + AuditFindingIQ bundle: $249 ("Complete Audit Toolkit")
- Path to $250k/yr: ~2,000 sales/yr at $99 — high volume, universal audience across all standards
- Zero first-mover competitors identified

## M-AI Interface

`window.__MAI_INTERFACE__ = { domain: "audit-finding-statement", version: "1.0", reserved: true }`

**Status:** ARCHITECTURE DEFINED — reserved interface only. No M-AI Kernel embedded.

## Needs from Brian

1. Validate finding classification logic — particularly the Major vs. Minor threshold wording; confirm this aligns with your CB auditor training language
2. Confirm the 8 standards are the right set; consider adding AS9115, ISO 14001, EASA Part-M
3. Review the OFI and Observation helper text — does it match IAQG/IAF CB guidance you use?
4. Price point — $99 vs $149 standalone?
