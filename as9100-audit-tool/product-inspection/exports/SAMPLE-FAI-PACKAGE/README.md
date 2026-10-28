# Sample FAI Export Package

This is a sample export package showing the structure and field names for a locked FAI inspection. The `inspection-record-sample.json` file is fictional data for testing and schema verification only.

## Package structure

A real export package is saved to the device Downloads folder as a ZIP archive:

```
CE-FAI-{PN}-{SN}-{YYYYMMDD}/
  inspection-record.json        ← full structured record, schema v1
  inspection-record.sha256      ← SHA-256 of inspection-record.json
  form1.pdf                     ← Part Number Accountability
  form2.pdf                     ← Product Accountability
  form3.pdf                     ← Characteristic Accountability
  photos/
    char-{id}-{uuid}.jpg        ← photos tagged to characteristics
```

## Verification

The SHA-256 in `inspection-record.sha256` must match the SHA-256 of `inspection-record.json`. Verify with:

```bash
sha256sum inspection-record.json
# or on Windows:
certutil -hashfile inspection-record.json SHA256
```

## Schema

Schema is defined in `../../content/schemas/inspection-record.v1.schema.json`. Version 1 field names are locked.
