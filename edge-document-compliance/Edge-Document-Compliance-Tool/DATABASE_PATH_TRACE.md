# Database Path Trace: Compliance Library → Database

## Complete Path from Frontend to Database

### 1. FRONTEND (Compliance Library)
**File:** `public/index.html`

**Function Calls:**
- `loadStandards()` → calls `/api/requirements/standards?category=standard`
- `loadCustomers()` → calls `/api/requirements/standards?category=customer`
- `loadRegulatory()` → calls `/api/requirements/standards?category=regulatory`

**Code Location:**
```javascript
// Line ~3895-3907
async loadStandards() {
    const response = await fetch('/api/requirements/standards?category=standard');
    const data = await response.json();
    // ...
}
```

---

### 2. API ENDPOINT
**File:** `backend/src/routes/requirements.js`

**Route:** `GET /api/requirements/standards`

**Code Location:** Line 29-452

**Handler:**
```javascript
router.get('/standards', async (req, res) => {
  // Category filter: 'standard', 'regulatory', or 'customer'
  const { category } = req.query;
  
  // Queries public.standards table
  const result = await queryPostgres(query, queryParams);
  // ...
});
```

---

### 3. DATABASE CONNECTION
**File:** `backend/src/config/databases.js`

**Function:** `queryPostgres(text, params)`

**Database:** PostgreSQL (DATABASE_URL environment variable)

**Connection:**
```javascript
const postgresPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ...
});
```

---

### 4. DATABASE & TABLE
**Database:** PostgreSQL (from `DATABASE_URL`)

**Schema:** `public`

**Table Name:** `public.standards`

**Query:**
```sql
SELECT 
  s.id as standard_id,
  s.code,
  s.name,
  s.sector,
  s.uploaded_at,
  COALESCE(s.total_clauses, s.total_requirements, 0) as total_requirements,
  COALESCE(s.current_model_version, '1.0.0') as model_version_used,
  false as has_learning_data
FROM public.standards s
WHERE s.code IS NOT NULL 
  AND TRIM(s.code) != ''
  AND s.uploaded_at IS NOT NULL
ORDER BY LOWER(TRIM(s.code)), s.uploaded_at DESC NULLS LAST
```

---

## Where Standards Are Created

### Upload Route
**File:** `backend/src/routes/upload.js`

**Function:** `createOrGetStandard()`

**Database:** PostgreSQL (`DATABASE_URL`)

**Table:** `public.standards`

**Query:**
```sql
INSERT INTO public.standards (id, code, name, sector, uploaded_at)
VALUES ($1, $2, $3, $4, NOW())
ON CONFLICT (code) DO UPDATE SET
  uploaded_at = COALESCE(public.standards.uploaded_at, EXCLUDED.uploaded_at)
```

---

### Process Requirements Folder Script
**File:** `backend/src/scripts/process-requirements-folder.js`

**Function:** `createOrGetStandard()`

**Database:** PostgreSQL (`DATABASE_URL`)

**Table:** `public.standards`

**Query:**
```sql
INSERT INTO public.standards (id, code, name, authority_source, sector, uploaded_at, is_active)
VALUES ($1, $2, $3, $4, $5, NOW(), TRUE)
ON CONFLICT (code) DO UPDATE SET
  uploaded_at = COALESCE(public.standards.uploaded_at, NOW()),
  name = EXCLUDED.name
```

---

## Summary

### Expected Database & Table
- **Database:** PostgreSQL (connection string from `DATABASE_URL`)
- **Schema:** `public`
- **Table:** `public.standards`
- **Required Columns:**
  - `id` (UUID, PRIMARY KEY)
  - `code` (VARCHAR(100), UNIQUE, NOT NULL)
  - `name` (VARCHAR(255), NOT NULL)
  - `sector` (VARCHAR(100))
  - `uploaded_at` (TIMESTAMP) - **CRITICAL: Must be NOT NULL for standards to appear**
  - `total_clauses` (INT) or `total_requirements` (INT)
  - `current_model_version` (VARCHAR(20))

### Filtering Logic
1. Standards must have `uploaded_at IS NOT NULL`
2. Standards must have `code IS NOT NULL` and `TRIM(code) != ''`
3. Category filtering happens in JavaScript based on `file_category` from `public.standard_files` table

### If Standards Are Missing
Check:
1. Does `public.standards` table exist?
2. Do standards have `uploaded_at` set?
3. Are standards in the correct database (PostgreSQL, not EDCAT AI)?
4. Are standards in the correct schema (`public`, not another schema)?

---

## Verification Query

Run this in PostgreSQL to check:

```sql
-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'standards'
);

-- Count all standards
SELECT COUNT(*) as total_standards FROM public.standards;

-- Count standards with uploaded_at set
SELECT COUNT(*) as uploaded_standards 
FROM public.standards 
WHERE uploaded_at IS NOT NULL;

-- List all standards
SELECT 
  id,
  code,
  name,
  sector,
  uploaded_at,
  total_clauses,
  total_requirements
FROM public.standards
ORDER BY uploaded_at DESC NULLS LAST;
```

