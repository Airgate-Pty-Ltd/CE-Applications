# Product Inspection — Architecture

## Stack

| Layer | Technology |
|---|---|
| App shell | Capacitor 8.5.3 · Android min API 24 / target 36 |
| UI / logic | Vanilla JS (ES2020, no framework) |
| Storage | IndexedDB (Dexie wrapper pattern from FieldAudit) |
| Build | `build-single.js` → `dist/base.html` (single file, inline CSS + JS) |
| Dev server | Node.js HTTP · port 7421 · `serve.js` |
| Permissions | No INTERNET. `android.permission.CAMERA`, `android.permission.BLUETOOTH_SCAN`, `android.permission.BLUETOOTH_CONNECT`, `READ/WRITE_EXTERNAL_STORAGE` (for PDF export via MediaStore) |

## Module boundaries (inside `src/base.html`)

The current single-file app will be refactored into modules matching FieldAudit's pattern once Phase 1 feature set is complete. Intended boundaries:

```
src/
  base.html            ← shell + router
  modules/
    db.js              ← IndexedDB schema, migrations, CRUD
    inspection.js      ← inspection workflow state machine
    forms.js           ← Form 1/2/3 field definitions, validators
    sampling.js        ← ANSI Z1.4 / C=0 lookup (currently inline in calcSample())
    spc.js             ← Cpk / Pp calculation, X̄/R chart data
    bluetooth.js       ← Mitutoyo U-Wave / Digimatic capture protocol
    photo.js           ← Camera capture, tag-to-characteristic storage
    export.js          ← JSON package + PDF builder
    auth.js            ← FAA/EASA approval metadata, syncAuthNote()
    template.js        ← FAI template inheritance (Load Template)
```

## Data model

### Inspection Record (top level)

```
InspectionRecord {
  id: UUID
  schema_version: "1"
  created_at: ISO8601
  locked_at: ISO8601 | null
  locked_by: string | null
  hash: SHA-256 of canonical JSON | null   ← set on lock
  
  job: JobHeader
  forms: { form1: Form1, form2: Form2, form3: Form3 }
  sampling_plan: SamplingPlan | null        ← incoming inspection only
  release: ReleaseAuth | null              ← final inspection only
  ncrs: NCR[]
}
```

### JobHeader

```
JobHeader {
  inspection_type: "fai" | "incoming" | "production" | "conformity"
  part_number: string
  part_revision: string
  serial_number: string | null
  lot_number: string | null
  quantity: number
  customer: string | null
  supplier: string | null
  drawing_number: string
  drawing_revision: string
  work_order: string | null
}
```

### Characteristic (Form 3 row)

```
Characteristic {
  id: number                   ← balloon number
  description: string
  nominal: number
  upper_tolerance: number
  lower_tolerance: number
  unit: "mm" | "in" | "µm" | "°" | "%"
  type: "dimensional" | "visual" | "functional" | "material" | "other"
  measurements: Measurement[]
  result: "C" | "NC" | "OFI" | "N/A" | null
  cpk: number | null           ← null if n < 2
  pp: number | null
  notes: string
}
```

### Measurement

```
Measurement {
  id: UUID
  taken_at: ISO8601
  inspector: string
  instrument_id: string
  instrument_cal_due: ISO8601
  value: number
  unit: string
  source: "manual" | "bluetooth" | "imported"
  photo_ids: UUID[]
}
```

### SamplingPlan

```
SamplingPlan {
  lot_size: number
  aql: "c0" | "0.65" | "1.0" | "1.5" | "2.5" | "4.0"
  inspection_level: "I" | "II" | "III" | "S1" | "S2"
  code_letter: string          ← A–R per ANSI Z1.4
  n: number                    ← sample size
  ac: number | null            ← accept number (null for C=0)
  re: number | null            ← reject number (null for C=0)
  plan_type: "z1.4" | "c0"
}
```

### ReleaseAuth

```
ReleaseAuth {
  faa: { type: "pc" | "pma" | "tsoa" | "145" | "oda" | null, number: string }
  easa: { type: "21g" | "145" | null, number: string }
  dual_release: boolean
  release_type: "coc" | "8130-3" | "easa-form1" | "dual"
}
```

## Storage layout (IndexedDB)

```
DB: ce-product-inspection  version: 1
  inspections   [id]           ← InspectionRecord (full)
  photos        [id]           ← { id, char_id, inspection_id, blob: Blob, taken_at }
  instruments   [id]           ← calibration register cache
  templates     [id]           ← locked FAI snapshots usable as templates
  settings      [key]          ← user preferences, last inspector, etc.
```

## Export package

One locked inspection produces a package directory (zipped via JSZip, saved to Downloads via MediaStore):

```
CE-FAI-{PN}-{SN}-{date}/
  inspection-record.json       ← full structured record, schema v1
  inspection-record.sha256     ← SHA-256 of the JSON file
  form1.pdf                    ← Part Number Accountability
  form2.pdf                    ← Product Accountability
  form3.pdf                    ← Characteristic Accountability (with ballooned drawing ref)
  photos/
    char-{id}-{uuid}.jpg       ← characteristic photos
```

Schema v1 field names are locked. Changes require a new `schema_version` value and a migration note in `content/schemas/`.

## Design tokens (CSS)

```css
--navy: #003366
--blue: #0070C0
--lblue: #EBF3FB
--radius: 10px
--tap: 52px               /* minimum touch target */
--c: green result colour
--nc: nonconformance colour
--ofi: opportunity colour
--na: not-applicable colour
--c-bg, --nc-bg, --ofi-bg, --na-bg: light tints
```

## Bluetooth instrument capture

Mitutoyo U-Wave / Digimatic: reading is pushed from the instrument to the active measurement input field via the `receiveBT()` function. Current implementation is a simulated receive (1.1 s delay, random value in expected range) for browser dev. Production path: Capacitor BLE plugin, subscribe to characteristic UUID for the paired device, write received value to the active input.

## Dev workflow

```bash
node serve.js        # starts http://127.0.0.1:7421 serving src/base.html
```

Hard-refresh (Ctrl+Shift+R) or full navigation reload clears stale JS. Build to single file before Capacitor sync:

```bash
node build-single.js
npx cap sync android
npx cap run android
```
