# AS9100D and AS9110C: licensed clause register and seed check

Built from the licensed PDFs in `licensed-private\` (private, not for shipping). The register holds clause references and standard headings only (R-2). It is in `content\AS-licensed-clause-register.json`.

**Status:** the seed (`content\library-seed.json`, PROPOSED) does not match the licensed standards. It is not changed here. Removals and title corrections need your approval (N-01).

## AS9100D

- Licensed file sha256: `e4f399daaa6d2f90...`
- Headings in the table of contents: 78
- Clauses 4 to 11 found in the standard body: 121
- Seed rows: 84. Seed rows whose clause is not in the standard: **25**

### Seed clauses not found in the licensed standard (remove or re-map)

4.3.1, 6.3.2, 7.2.2, 7.5.1.1, 8.2.1.1, 8.2.2.1, 8.3.2.1, 8.3.3.1, 8.3.5.1, 8.3.6.1, 8.4.1.2, 8.4.2.1, 8.4.2.2, 8.4.3.1, 8.5.2.1, 8.5.6.1, 8.6.1, 8.6.2, 8.6.3, 8.6.4, 8.6.5, 8.6.6, 9.1.3.1, 9.3.2.1, 10.2.1.1

### Seed title differs from the licensed heading (11)

| Clause | Seed title | Heading in standard |
|---|---|---|
| 4.2 | Needs and Expectations of Interested Parties | Understanding the Needs and Expectations of Interested Parties |
| 4.3 | Determining Scope of the QMS | Determining the Scope of the Quality Management System |
| 4.4 | QMS and Its Processes | Quality Management System and Its Processes |
| 5.2 | Quality Policy | Policy |
| 7.1.1 | General Resources | General |
| 8.1.1 | Operational Planning (Aerospace Addition) | Operational Risk Management |
| 8.1.3 | Product Safety (Aerospace Addition) | Product Safety |
| 8.2.2 | Determining Requirements for Products and Services | Determining the Requirements for Products and Services |
| 8.2.3 | Review of Requirements for Products and Services | Review of the Requirements for Products and Services |
| 9.1.1 | Monitoring (Aerospace Addition) | General |
| 9.3.1 | Management Review (Aerospace Addition) | General |

### Clauses in the standard with no seed row (62): intent and evidence still to author

0.2, 0.3, 0.3.1, 0.3.2, 0.3.3, 0.4, 4, 4.4.1, 4.4.2, 5, 5.1.1, 5.1.2, 5.2.1, 5.2.2, 6, 6.1.1, 6.2.1, 6.2.2, 7, 7.1, 7.5.1, 7.5.2, 7.5.3, 7.5.3.1, 8, 8.2, 8.2.3.2, 8.2.4, 8.3.1, 8.3.2, 8.3.3, 8.3.4, 8.3.5, 8.3.6, 8.4.1, 8.4.2, 8.5, 8.7.2, 9, 9.1.2, 9.1.3, 9.2.1, 9.3.2, 9.3.3, 10, 10.1, 10.2.2, 11.1, 9001, 9101, 9102, 9103, 9107, 9114, 9115, 9116, 9131, 9132, 9133, 9134, 9162, 10006

## AS9110C

- Licensed file sha256: `0af526813f663663...`
- Headings in the table of contents: 84
- Clauses 4 to 11 found in the standard body: 120
- Seed rows: 25. Seed rows whose clause is not in the standard: **6**

### Seed clauses not found in the licensed standard (remove or re-map)

4.3.1, 7.1.3.1, 7.1.4.1, 7.2.2, 8.2.2.1, 8.6.1

### Seed title differs from the licensed heading (10)

| Clause | Seed title | Heading in standard |
|---|---|---|
| 8.1.1 | Maintenance Planning and Control | Operational Risk Management |
| 8.1.2 | Component Tracking and Traceability | Configuration Management |
| 8.1.3 | Life-Limited Parts Control | Product Safety |
| 8.1.5 | Product Safety in Maintenance | Prevention of Suspected Unapproved Parts |
| 8.4.1 | Subcontract Maintenance Control | General |
| 8.5.1 | Control of Maintenance Execution | Control of Production and Service Provision |
| 8.5.3 | Customer Property in Maintenance | Property Belonging to Customers or External Providers |
| 8.5.4 | Preservation of Components During Maintenance | Preservation |
| 8.6 | Return to Service and Authorized Release | Release of Products and Services |
| 9.1.1 | Maintenance Performance Monitoring | General |

### Clauses in the standard with no seed row (101): intent and evidence still to author

0.2, 0.3, 0.3.1, 0.3.2, 0.3.3, 0.4, 4, 4.1, 4.2, 4.3, 4.4, 4.4.1, 4.4.2, 5, 5.1, 5.1.1, 5.1.2, 5.2, 5.2.1, 5.2.2, 5.2.3, 5.3, 5.3.1, 5.3.2, 5.3.3, 6, 6.1, 6.1.1, 6.1.2, 6.2, 6.2.1, 6.2.2, 6.3, 7, 7.1, 7.1.1, 7.1.2, 7.1.3, 7.1.4, 7.1.5, 7.1.5.2, 7.1.6, 7.2, 7.3, 7.4, 7.5, 7.5.1, 7.5.2, 7.5.3, 7.5.3.1, 8, 8.1, 8.1.6, 8.2, 8.2.1, 8.2.2, 8.2.3, 8.2.3.1, 8.2.3.2, 8.2.4, 8.3, 8.3.1, 8.3.2, 8.3.3, 8.3.4, 8.3.5, 8.3.6, 8.4, 8.4.1.1, 8.4.2, 8.4.3, 8.5, 8.5.1.3, 8.5.1.4, 8.5.5, 8.5.6, 8.7, 8.7.2, 9, 9.1, 9.1.2, 9.1.3, 9.2, 9.2.1, 9.3, 9.3.1, 9.3.2, 9.3.3, 10, 10.1, 10.2, 10.2.2, 10.3, 11.1, 9001, 9101, 9114, 9132, 9134, 9162, 10006
