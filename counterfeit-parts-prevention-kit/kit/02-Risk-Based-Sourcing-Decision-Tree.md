# Risk-Based Sourcing Decision Tree
**Deterministic sourcing control — record the path taken on the PO or sourcing record.**

1. Is the part available from the OCM/OEM or an authorized distributor?
   - YES → Procure from authorized source. Verification Level 1. END.
   - NO → continue.
2. Document unavailability (obsolescence, AOG, lead time) → sourcing risk record.
3. Does the candidate source provide full, unbroken traceability to the OCM?
   - YES → Verification Level 2. Approval: [PLACEHOLDER: role]. END.
   - NO → continue.
4. Is the application flight-safety-critical or contractually restricted from
   independent sourcing?
   - YES → STOP. Do not procure. Escalate to customer/engineering for
     alternate or authorization.
   - NO → continue.
5. Independent distributor/broker buy permitted only with: documented risk
   assessment, Verification Level 3 (enhanced inspection + [PLACEHOLDER: test
   scope]), QM approval, and customer notification where required by contract.

| Sourcing record fields | |
|---|---|
| Part no. / description / application | |
| Authorized availability evidence | |
| Source + traceability provided | |
| Verification level applied | |
| Risk assessment ref / approvals | |
