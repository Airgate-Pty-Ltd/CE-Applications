# Test Fixtures

Fictional inspection records for schema validation and unit testing. No real customer, supplier, or part data.

| File | Type | Purpose |
|---|------|---------|
| `sample-fai.json` | FAI | Validates schema v1; contains 3 characteristics (2 pass, 1 NC) |
| `sample-incoming.json` | Incoming | Validates sampling plan fields (pending) |
| `sample-production.json` | Production run | Validates SPC / Cpk fields with n ≥ 2 measurements (pending) |

Copy `../../exports/SAMPLE-FAI-PACKAGE/inspection-record-sample.json` to `sample-fai.json` as the baseline FAI fixture.
