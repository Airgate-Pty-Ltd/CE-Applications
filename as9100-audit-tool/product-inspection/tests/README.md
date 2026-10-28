# Tests

Validation scripts and fixtures for the Product Inspection app.

## Structure

```
tests/
  README.md               ← this file
  run_checks.py           ← check runner (pending)
  fixtures/
    README.md
    sample-fai.json       ← test FAI record (copy of ../exports/SAMPLE-FAI-PACKAGE/inspection-record-sample.json)
    sample-incoming.json  ← test incoming inspection record (pending)
  validate_schema.py      ← JSON schema validation against content/schemas/ (pending)
  validate_sampling.py    ← sampling plan lookup verification (pending)
  validate_cpk.py         ← Cpk calculation verification (pending)
```

## Checks to implement

| Check | Script | Verified |
|---|---|---|
| JSON export validates against schema v1 | `validate_schema.py` | ⏳ |
| Sampling: lot 200 / AQL 1.5% / Level II → n=32 / Ac=1 / Re=2 | `validate_sampling.py` | ✅ (manual, 2026-10-21) |
| Sampling: C=0 lot 200 → n=32 / Ac=0 / Re=1 | `validate_sampling.py` | ✅ (manual, 2026-10-21) |
| Cpk: (USL−X̄)/3σ and (X̄−LSL)/3σ min | `validate_cpk.py` | ⏳ |
| Cpk ≥1.33 → "C" colour badge | `validate_cpk.py` | ⏳ |
| Cpk <1.00 → "NC" colour badge | `validate_cpk.py` | ⏳ |
| n<2 → Cpk = null (—) | `validate_cpk.py` | ⏳ |
| Hash: SHA-256 of JSON matches .sha256 file | `validate_schema.py` | ⏳ |

## Running

```bash
python -I tests/run_checks.py
```

Requires Python 3.10+. No external dependencies (uses stdlib `json`, `hashlib`, `unittest`).

## Fixtures note

Fixture files under `fixtures/` are fictional data only. They must not contain real customer, supplier, or part data.
