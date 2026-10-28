# Parser Test Plan

**Date:** 2025-01-22  
**Purpose:** Comprehensive testing plan for parser fixes  
**Status:** Ready for execution

---

## TEST ENVIRONMENT SETUP

### Prerequisites
- [ ] Railway deployment active
- [ ] PostgreSQL database accessible
- [ ] Test PDF available (AS9100D recommended)
- [ ] Access to Railway logs
- [ ] Database query tool (Railway Postgres UI or psql)

### Test Data
- **Primary Test Document:** AS9100D PDF (should yield 150+ requirements)
- **Secondary Test Document:** ISO 9001:2015 PDF (should yield 80+ requirements)
- **Expected Clauses:** 4, 4.1, 4.1.1, 4.2, 4.3, 4.4.1, 4.4.2, 5, 5.1, 5.1.1, etc.

---

## TEST SUITE 1: BASIC FUNCTIONALITY

### Test 1.1: Upload and Parse
**Objective:** Verify basic parsing workflow

**Steps:**
1. Navigate to Compliance Library
2. Upload AS9100D PDF
3. Click "Parse Now"
4. Wait for parsing to complete

**Expected Results:**
- ✅ Upload successful
- ✅ Parse button appears
- ✅ Parsing completes without errors
- ✅ Success message displayed
- ✅ Requirement count shown (150+)

**Validation:**
```sql
SELECT COUNT(*) as total 
FROM public.parsed_requirements 
WHERE standard_id = '<standard_id>';
```

**Pass Criteria:** Count ≥ 150

---

### Test 1.2: Requirement Count Verification
**Objective:** Verify correct number of requirements extracted

**Steps:**
1. After parsing, check console logs for requirement count
2. Query database for actual count
3. Compare with expected range (150-200 for AS9100D)

**Expected Results:**
- ✅ Console shows: "Extracted X requirements"
- ✅ Database count matches console count
- ✅ Count is in expected range (150-200)

**Validation:**
```sql
SELECT 
  COUNT(*) as total_requirements,
  COUNT(DISTINCT subclause) as unique_subclauses,
  COUNT(DISTINCT clause) as unique_clauses
FROM public.parsed_requirements 
WHERE standard_id = '<standard_id>';
```

**Pass Criteria:** 
- `total_requirements` ≥ 150
- `unique_subclauses` ≥ 40
- `unique_clauses` = 7 (clauses 4-10)

---

## TEST SUITE 2: CLAUSE DETECTION

### Test 2.1: Clause Ordering
**Objective:** Verify clauses are detected in correct order

**Steps:**
1. Parse AS9100D PDF
2. Query requirements ordered by subclause

**Expected Results:**
- ✅ Clauses in sequential order: 4, 4.1, 4.1.1, 4.2, 4.3, 4.4.1, 4.4.2, 5, 5.1, etc.
- ✅ No random ordering (e.g., 4.4.2 before 4.4.1)

**Validation:**
```sql
SELECT DISTINCT subclause 
FROM public.parsed_requirements 
WHERE standard_id = '<standard_id>'
ORDER BY 
  CAST(SPLIT_PART(subclause, '.', 1) AS INTEGER),
  CASE WHEN SPLIT_PART(subclause, '.', 2) = '' THEN 0 
       ELSE CAST(SPLIT_PART(subclause, '.', 2) AS INTEGER) END,
  CASE WHEN SPLIT_PART(subclause, '.', 3) = '' THEN 0 
       ELSE CAST(SPLIT_PART(subclause, '.', 3) AS INTEGER) END
LIMIT 20;
```

**Pass Criteria:** Clauses appear in sequential order

---

### Test 2.2: All Top-Level Clauses Present
**Objective:** Verify all clauses 4-10 are detected

**Steps:**
1. Parse AS9100D PDF
2. Query distinct top-level clauses

**Expected Results:**
- ✅ Clauses 4, 5, 6, 7, 8, 9, 10 all present
- ✅ No clauses 1-3 (out of scope)
- ✅ No clauses > 10

**Validation:**
```sql
SELECT DISTINCT clause 
FROM public.parsed_requirements 
WHERE standard_id = '<standard_id>'
ORDER BY CAST(clause AS INTEGER);
```

**Pass Criteria:** Exactly 7 clauses: 4, 5, 6, 7, 8, 9, 10

---

### Test 2.3: Subclause Detection
**Objective:** Verify subclauses are correctly detected

**Steps:**
1. Parse AS9100D PDF
2. Check for common subclauses

**Expected Results:**
- ✅ Common subclauses present: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 6.1, 7.1, 8.1, etc.
- ✅ Deep subclauses detected: 4.4.1, 4.4.2, 8.5.1, 8.5.1.1, etc.

**Validation:**
```sql
SELECT subclause, COUNT(*) as paragraph_count
FROM public.parsed_requirements 
WHERE standard_id = '<standard_id>'
  AND subclause LIKE '4.%'
GROUP BY subclause
ORDER BY subclause
LIMIT 10;
```

**Pass Criteria:** Multiple subclauses detected with paragraph counts

---

## TEST SUITE 3: PARAGRAPH SPLITTING

### Test 3.1: Multiple Paragraphs Per Clause
**Objective:** Verify paragraphs are split correctly

**Steps:**
1. Parse AS9100D PDF
2. Check clause 4.1 for multiple paragraphs

**Expected Results:**
- ✅ Clause 4.1 has multiple requirements (P1, P2, P3...)
- ✅ Each paragraph is a separate row
- ✅ Paragraph numbering resets per clause

**Validation:**
```sql
SELECT subclause, paragraph, 
       LEFT(requirement_text, 100) as requirement_preview
FROM public.parsed_requirements 
WHERE standard_id = '<standard_id>'
  AND subclause = '4.1'
ORDER BY paragraph;
```

**Pass Criteria:** Multiple rows for clause 4.1 with different paragraph numbers

---

### Test 3.2: Paragraph Numbering Reset
**Objective:** Verify paragraph numbering resets per clause

**Steps:**
1. Parse AS9100D PDF
2. Check paragraph numbering across multiple clauses

**Expected Results:**
- ✅ Clause 4.1: P1, P2, P3...
- ✅ Clause 4.2: P1, P2, P3... (resets)
- ✅ Clause 5.1: P1, P2, P3... (resets)

**Validation:**
```sql
SELECT subclause, paragraph
FROM public.parsed_requirements 
WHERE standard_id = '<standard_id>'
  AND subclause IN ('4.1', '4.2', '5.1')
ORDER BY subclause, paragraph;
```

**Pass Criteria:** Each clause starts with P1

---

### Test 3.3: Blank Line Detection
**Objective:** Verify blank lines correctly split paragraphs

**Steps:**
1. Parse AS9100D PDF
2. Check requirement text for proper splitting

**Expected Results:**
- ✅ Requirements are not merged
- ✅ Each requirement is a complete sentence/statement
- ✅ No requirement text contains multiple unrelated statements

**Validation:**
```sql
SELECT subclause, paragraph, 
       LENGTH(requirement_text) as text_length,
       requirement_text
FROM public.parsed_requirements 
WHERE standard_id = '<standard_id>'
ORDER BY subclause, paragraph
LIMIT 20;
```

**Pass Criteria:** Requirements are reasonably sized (20-500 chars), not merged blocks

---

## TEST SUITE 4: STRUCTURED FORMAT

### Test 4.1: Structured Fields Present
**Objective:** Verify all structured fields are populated

**Steps:**
1. Parse AS9100D PDF
2. Query structured fields

**Expected Results:**
- ✅ `clause` field populated (4, 5, 6, etc.)
- ✅ `clause_name` field populated
- ✅ `subclause` field populated (4.1, 4.2, etc.)
- ✅ `subclause_name` field populated
- ✅ `paragraph` field populated (P1, P2, etc.)
- ✅ `sub_paragraph` field populated only for 3+ level clauses

**Validation:**
```sql
SELECT 
  clause, clause_name, 
  subclause, subclause_name,
  paragraph, sub_paragraph,
  keyword, confidence
FROM public.parsed_requirements 
WHERE standard_id = '<standard_id>'
LIMIT 10;
```

**Pass Criteria:** All structured fields populated correctly

---

### Test 4.2: Sub-Paragraph Logic
**Objective:** Verify sub_paragraph only for 3+ level clauses

**Steps:**
1. Parse AS9100D PDF
2. Check sub_paragraph field

**Expected Results:**
- ✅ 2-level clauses (4.1): `sub_paragraph` is NULL
- ✅ 3+ level clauses (4.1.2): `sub_paragraph` is populated
- ✅ Format: "4.1.2 Name" (number + title)

**Validation:**
```sql
SELECT 
  subclause,
  CASE 
    WHEN array_length(string_to_array(subclause, '.'), 1) > 2 
    THEN 'Should have sub_paragraph'
    ELSE 'Should be NULL'
  END as expected,
  sub_paragraph
FROM public.parsed_requirements 
WHERE standard_id = '<standard_id>'
  AND (array_length(string_to_array(subclause, '.'), 1) <= 2 
       OR array_length(string_to_array(subclause, '.'), 1) > 2)
LIMIT 20;
```

**Pass Criteria:** Sub-paragraph logic matches specification

---

## TEST SUITE 5: CONFIDENCE SCORING

### Test 5.1: Confidence Score Range
**Objective:** Verify confidence scores are in expected range

**Steps:**
1. Parse AS9100D PDF
2. Query confidence statistics

**Expected Results:**
- ✅ Average confidence: 0.75-0.85
- ✅ Minimum confidence: 0.30-0.50
- ✅ Maximum confidence: 0.90-0.98
- ✅ Most requirements: 0.70-0.90

**Validation:**
```sql
SELECT 
  COUNT(*) as total,
  AVG(confidence) as avg_confidence,
  MIN(confidence) as min_confidence,
  MAX(confidence) as max_confidence,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY confidence) as median_confidence
FROM public.parsed_requirements 
WHERE standard_id = '<standard_id>';
```

**Pass Criteria:**
- `avg_confidence` between 0.75-0.85
- `min_confidence` ≥ 0.30
- `max_confidence` ≤ 0.98

---

### Test 5.2: Confidence by Keyword
**Objective:** Verify confidence scores correlate with keywords

**Steps:**
1. Parse AS9100D PDF
2. Group confidence by keyword

**Expected Results:**
- ✅ "shall" requirements: Higher confidence (0.80-0.95)
- ✅ "must" requirements: Higher confidence (0.75-0.90)
- ✅ "should" requirements: Lower confidence (0.65-0.80)
- ✅ No keyword: Lower confidence (0.30-0.70)

**Validation:**
```sql
SELECT 
  keyword,
  COUNT(*) as count,
  AVG(confidence) as avg_confidence,
  MIN(confidence) as min_confidence,
  MAX(confidence) as max_confidence
FROM public.parsed_requirements 
WHERE standard_id = '<standard_id>'
  AND keyword IS NOT NULL
GROUP BY keyword
ORDER BY avg_confidence DESC;
```

**Pass Criteria:** Confidence scores correlate with keyword strength

---

## TEST SUITE 6: NOTE FILTERING

### Test 6.1: NOTE Sections Excluded
**Objective:** Verify NOTE sections are not extracted as requirements

**Steps:**
1. Parse AS9100D PDF
2. Search for NOTE text in requirements

**Expected Results:**
- ✅ No requirements start with "NOTE"
- ✅ No requirements start with "EXAMPLE"
- ✅ No requirements start with "GUIDANCE"
- ✅ No requirements start with "INFORMATIVE"

**Validation:**
```sql
SELECT subclause, paragraph, requirement_text
FROM public.parsed_requirements 
WHERE standard_id = '<standard_id>'
  AND (
    UPPER(LEFT(requirement_text, 4)) = 'NOTE' OR
    UPPER(LEFT(requirement_text, 7)) = 'EXAMPLE' OR
    UPPER(LEFT(requirement_text, 8)) = 'GUIDANCE' OR
    UPPER(LEFT(requirement_text, 11)) = 'INFORMATIVE'
  );
```

**Pass Criteria:** Zero rows returned

---

### Test 6.2: Requirement Text Quality
**Objective:** Verify requirement text is clean and complete

**Steps:**
1. Parse AS9100D PDF
2. Sample requirement text

**Expected Results:**
- ✅ Requirements are complete sentences
- ✅ No truncated text
- ✅ No page numbers in text
- ✅ No headers/footers in text

**Validation:**
```sql
SELECT subclause, paragraph, requirement_text
FROM public.parsed_requirements 
WHERE standard_id = '<standard_id>'
  AND (
    requirement_text LIKE '%Page %' OR
    requirement_text LIKE '%---%' OR
    requirement_text LIKE '%––%' OR
    LENGTH(requirement_text) < 20
  )
LIMIT 10;
```

**Pass Criteria:** Minimal or zero rows with formatting issues

---

## TEST SUITE 7: DATABASE STORAGE

### Test 7.1: Correct Table Usage
**Objective:** Verify requirements stored in correct table

**Steps:**
1. Parse AS9100D PDF
2. Check table usage

**Expected Results:**
- ✅ Requirements in `public.parsed_requirements`
- ✅ NOT in `parsed_clauses` (if table exists)
- ✅ Standard metadata updated in `public.standards`

**Validation:**
```sql
-- Check parsed_requirements
SELECT COUNT(*) FROM public.parsed_requirements WHERE standard_id = '<standard_id>';

-- Check standards table
SELECT total_requirements, total_clauses, parsed_at
FROM public.standards 
WHERE id = '<standard_id>';
```

**Pass Criteria:** 
- Count in `parsed_requirements` matches expected
- `total_requirements` in `standards` matches count

---

### Test 7.2: Duplicate Handling
**Objective:** Verify duplicate requirements are handled correctly

**Steps:**
1. Parse AS9100D PDF
2. Re-parse same document (force re-parse)
3. Check for duplicates

**Expected Results:**
- ✅ Re-parse updates existing requirements
- ✅ No duplicate rows created
- ✅ Requirement count remains consistent

**Validation:**
```sql
-- Check for duplicates
SELECT subclause, paragraph, COUNT(*) as count
FROM public.parsed_requirements 
WHERE standard_id = '<standard_id>'
GROUP BY subclause, paragraph
HAVING COUNT(*) > 1;
```

**Pass Criteria:** Zero duplicate rows

---

## TEST SUITE 8: KEYWORD EXTRACTION

### Test 8.1: Keyword Detection
**Objective:** Verify keywords are correctly extracted

**Steps:**
1. Parse AS9100D PDF
2. Check keyword distribution

**Expected Results:**
- ✅ Most requirements have keywords ("shall", "must", "should")
- ✅ Keywords match requirement text
- ✅ No false positives

**Validation:**
```sql
SELECT 
  keyword,
  COUNT(*) as count,
  COUNT(*) * 100.0 / (SELECT COUNT(*) FROM public.parsed_requirements WHERE standard_id = '<standard_id>') as percentage
FROM public.parsed_requirements 
WHERE standard_id = '<standard_id>'
  AND keyword IS NOT NULL
GROUP BY keyword
ORDER BY count DESC;
```

**Pass Criteria:** 
- At least 70% of requirements have keywords
- "shall" is most common keyword

---

### Test 8.2: Keyword Accuracy
**Objective:** Verify extracted keywords match requirement text

**Steps:**
1. Parse AS9100D PDF
2. Sample requirements and verify keywords

**Expected Results:**
- ✅ Keyword "shall" appears in requirement text
- ✅ Keyword "must" appears in requirement text
- ✅ Keyword "should" appears in requirement text

**Validation:**
```sql
SELECT 
  keyword,
  requirement_text
FROM public.parsed_requirements 
WHERE standard_id = '<standard_id>'
  AND keyword IS NOT NULL
  AND requirement_text NOT ILIKE '%' || keyword || '%'
LIMIT 10;
```

**Pass Criteria:** Zero or minimal mismatches

---

## TEST SUITE 9: PERFORMANCE

### Test 9.1: Parsing Speed
**Objective:** Verify parsing completes in reasonable time

**Steps:**
1. Parse AS9100D PDF
2. Measure parsing time

**Expected Results:**
- ✅ Parsing completes in < 60 seconds
- ✅ No timeout errors
- ✅ Progress logged to console

**Pass Criteria:** Parsing completes successfully

---

### Test 9.2: Database Performance
**Objective:** Verify database operations are efficient

**Steps:**
1. Parse AS9100D PDF
2. Check database query performance

**Expected Results:**
- ✅ INSERT operations complete quickly
- ✅ No database locks
- ✅ Indexes used effectively

**Pass Criteria:** No performance issues observed

---

## TEST SUITE 10: ERROR HANDLING

### Test 10.1: Invalid Document Handling
**Objective:** Verify graceful handling of invalid documents

**Steps:**
1. Upload invalid/corrupted PDF
2. Attempt to parse

**Expected Results:**
- ✅ Error message displayed
- ✅ No crash
- ✅ User can retry

**Pass Criteria:** Graceful error handling

---

### Test 10.2: Missing File Handling
**Objective:** Verify handling of missing files

**Steps:**
1. Delete file from filesystem
2. Attempt to parse

**Expected Results:**
- ✅ Error message displayed
- ✅ Suggestion to re-upload
- ✅ No crash

**Pass Criteria:** Graceful error handling

---

## TEST RESULTS TEMPLATE

### Test Execution Log

```
Date: _______________
Tester: _______________
Environment: _______________
Standard ID: _______________

Test Suite 1: Basic Functionality
  [ ] Test 1.1: Upload and Parse - PASS/FAIL
  [ ] Test 1.2: Requirement Count - PASS/FAIL

Test Suite 2: Clause Detection
  [ ] Test 2.1: Clause Ordering - PASS/FAIL
  [ ] Test 2.2: All Top-Level Clauses - PASS/FAIL
  [ ] Test 2.3: Subclause Detection - PASS/FAIL

Test Suite 3: Paragraph Splitting
  [ ] Test 3.1: Multiple Paragraphs - PASS/FAIL
  [ ] Test 3.2: Paragraph Reset - PASS/FAIL
  [ ] Test 3.3: Blank Line Detection - PASS/FAIL

Test Suite 4: Structured Format
  [ ] Test 4.1: Structured Fields - PASS/FAIL
  [ ] Test 4.2: Sub-Paragraph Logic - PASS/FAIL

Test Suite 5: Confidence Scoring
  [ ] Test 5.1: Confidence Range - PASS/FAIL
  [ ] Test 5.2: Confidence by Keyword - PASS/FAIL

Test Suite 6: NOTE Filtering
  [ ] Test 6.1: NOTE Sections Excluded - PASS/FAIL
  [ ] Test 6.2: Requirement Text Quality - PASS/FAIL

Test Suite 7: Database Storage
  [ ] Test 7.1: Correct Table Usage - PASS/FAIL
  [ ] Test 7.2: Duplicate Handling - PASS/FAIL

Test Suite 8: Keyword Extraction
  [ ] Test 8.1: Keyword Detection - PASS/FAIL
  [ ] Test 8.2: Keyword Accuracy - PASS/FAIL

Test Suite 9: Performance
  [ ] Test 9.1: Parsing Speed - PASS/FAIL
  [ ] Test 9.2: Database Performance - PASS/FAIL

Test Suite 10: Error Handling
  [ ] Test 10.1: Invalid Document - PASS/FAIL
  [ ] Test 10.2: Missing File - PASS/FAIL

Overall Result: PASS/FAIL
Issues Found: _______________
```

---

## AUTOMATED TEST SCRIPTS

### SQL Validation Script

```sql
-- Comprehensive parser validation
DO $$
DECLARE
  standard_id_val UUID := '<standard_id>';
  total_reqs INTEGER;
  unique_clauses INTEGER;
  avg_conf NUMERIC;
  min_conf NUMERIC;
  max_conf NUMERIC;
BEGIN
  -- Count requirements
  SELECT COUNT(*) INTO total_reqs
  FROM public.parsed_requirements 
  WHERE standard_id = standard_id_val;
  
  -- Count unique clauses
  SELECT COUNT(DISTINCT clause) INTO unique_clauses
  FROM public.parsed_requirements 
  WHERE standard_id = standard_id_val;
  
  -- Confidence statistics
  SELECT AVG(confidence), MIN(confidence), MAX(confidence)
  INTO avg_conf, min_conf, max_conf
  FROM public.parsed_requirements 
  WHERE standard_id = standard_id_val;
  
  -- Output results
  RAISE NOTICE 'Total Requirements: %', total_reqs;
  RAISE NOTICE 'Unique Clauses: %', unique_clauses;
  RAISE NOTICE 'Avg Confidence: %', avg_conf;
  RAISE NOTICE 'Min Confidence: %', min_conf;
  RAISE NOTICE 'Max Confidence: %', max_conf;
  
  -- Validation checks
  IF total_reqs < 150 THEN
    RAISE WARNING 'Requirement count too low: % (expected >= 150)', total_reqs;
  END IF;
  
  IF unique_clauses != 7 THEN
    RAISE WARNING 'Incorrect clause count: % (expected 7)', unique_clauses;
  END IF;
  
  IF avg_conf < 0.75 OR avg_conf > 0.85 THEN
    RAISE WARNING 'Confidence out of range: % (expected 0.75-0.85)', avg_conf;
  END IF;
END $$;
```

---

## SUCCESS CRITERIA

### Must Pass (Critical)
- ✅ Test 1.2: Requirement count ≥ 150
- ✅ Test 2.1: Clauses in correct order
- ✅ Test 2.2: All clauses 4-10 present
- ✅ Test 3.1: Multiple paragraphs per clause
- ✅ Test 4.1: Structured fields populated
- ✅ Test 6.1: NOTE sections excluded
- ✅ Test 7.1: Correct table usage

### Should Pass (Important)
- ✅ Test 3.2: Paragraph numbering resets
- ✅ Test 5.1: Confidence in expected range
- ✅ Test 7.2: No duplicates
- ✅ Test 8.1: Keywords detected

### Nice to Have (Optional)
- ✅ Test 9.1: Fast parsing
- ✅ Test 10.1: Error handling

---

**Status:** Ready for execution  
**Next Steps:** Execute tests with AS9100D PDF and document results

