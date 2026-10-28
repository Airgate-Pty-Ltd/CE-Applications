# M-AI Product Integration Profile
**Product:** AS9120B Aerospace Distributor Self-Assessment Tool
**Date:** 2026-09-03
**M-AI Status:** ARCHITECTURE DEFINED

## Domain
`as9120b-distributor-readiness`

## DIMs (Domain Intelligence Modules)
1. `dim-qms-foundations` — assesses scope, objectives, risk, roles
2. `dim-counterfeit-prevention` — evaluates counterfeit procedure, sourcing controls, UCTS quarantine
3. `dim-traceability-coc` — evaluates batch/lot traceability and CoC management
4. `dim-supplier-control` — evaluates ASL, supplier monitoring, flow-down
5. `dim-storage-handling` — evaluates ESD, environmental controls, segregation
6. `dim-documentation-records` — evaluates records retention, CSR, audit, MR

## Authority Charter
AS9120B Rev B (IAQG). Reference standard: ISO 9001:2015 HLS as base; AS9120B aerospace distributor-specific additions including Cl. 8.1.4 counterfeit, Cl. 8.5.2 traceability.

## Reserved Interface
HTML element `id="mai-kernel-interface"` contains `data-*` attributes for kernel handshake, domain, DIMs, and authority charter. Interface is present and reserved.

## Integration Decision
ARCHITECTURE DEFINED — standalone HTML tool; MAI full integration deferred to platform version. Reserved interface in place per portfolio standard.
