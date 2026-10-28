# Synthetic combined-source sample

SYNTHETIC audit data. The criteria are real rows: FAA QSA 1.0 (Burrana-private), AS9100D and AS9110C (licensed, Burrana Inc.).
The customer checklist is a synthetic example (5 criteria selected across 4 sources; publication version 1).

- `owner/`: recipient Burrana Inc. Includes the sources and the QSA section.
- `external/`: any other recipient. The QSA section, licensed standard rows and customer-private rows are withheld.
  `sources_withheld_for_licence` lists what was withheld.
- `audit-record/`: the ledger, publication and snapshot the packages were built from.
- `input/`: the synthetic customer checklist CSV used for ingestion.

Verify a package: `pe.verify_export(folder)` must return `(True, None)`.
