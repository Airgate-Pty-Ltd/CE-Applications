# Complete List of Parsing Code Locations

This document provides a comprehensive list of all code locations where parsing functionality is implemented in the EDCAT Administrator system.

---

## 📋 Table of Contents

1. [Core Parsing Services](#core-parsing-services)
2. [API Routes](#api-routes)
3. [Supporting Services](#supporting-services)
4. [Frontend Integration](#frontend-integration)
5. [Database Operations](#database-operations)
6. [Utility Scripts](#utility-scripts)
7. [Legacy/Alternative Parsers](#legacyalternative-parsers)

---

## 1. Core Parsing Services

### 1.1 Main Parse Service
**File:** `backend/src/services/parseService.js`
- **Purpose:** Primary parsing orchestrator for different standard types
- **Key Methods:**
  - `parseISO(content, standard)` - **RECENTLY FIXED** - Parses ISO/AS standards using split() instead of exec() loop
  - `parseAS(content, standard)` - Delegates to parseISO()
  - `parseFAA(content, standard)` - Parses FAA regulations
  - `parseEASA(content, standard)` - Delegates to parseFAA()
  - `parseGeneric(content, standard)` - Fallback generic parser
  - `splitIntoParagraphs(text)` - Splits text into paragraphs by blank lines
  - `isLikelyRequirement(text)` - Checks if text is likely a requirement
  - `cleanText(text)` - Normalizes whitespace and removes formatting
  - `calculateConfidence(text)` - Calculates confidence score (0.55-0.98)
  - `generateIntent(text, standardCode)` - Generates intent classification
  - `identifyCommonGaps(text)` - Identifies common compliance gaps
  - `inferType(text)` - Infers requirement type

### 1.2 Clause-Aware Parser
**File:** `backend/src/services/clauseAwareParser.js`
- **Purpose:** Advanced parser that understands clause structure and hierarchy
- **Key Methods:**
  - `ClauseAwareParser` class constructor
  - `parse(text)` - Main parsing method
  - `splitByClauses(text)` - Detects and splits by clause headers
  - `extractRequirementsFromClause(clauseNumber, clauseText, clauseTitle)` - Extracts requirements from a clause
  - `parseClauseSection(clauseNumber, clauseText, clauseTitle)` - Parses a clause section
  - `createRequirement(text, fullRef, clauseTitle, ...)` - Creates requirement object
  - `createStandardizedRequirement(...)` - Creates standardized format requirement
  - `generateRequirementUid(fullRef, normalizedText)` - Generates deterministic IDs
  - `groupRequirementsWithLists(requirements)` - Groups parent requirements with bullet points

### 1.3 Requirement Parser (Legacy)
**File:** `backend/src/services/requirementParser.js`
- **Purpose:** Alternative requirement extraction engine
- **Key Classes:**
  - `RequirementExtractor` class
  - `extractRequirements(text)` - Extracts requirements from text
  - `parseDocumentWithAdvancedParser(filePath, fileExt, standardCode)` - Parses document file

---

## 2. API Routes

### 2.1 Main Parse Route
**File:** `backend/src/routes/parse.js`
- **Endpoints:**
  - `POST /api/parse/standard/:standardId` - Parse a standard document
  - `GET /api/parse/status/:standardId` - Get parsing status and count
- **Key Functions:**
  - `readDocumentFile(filePath, standardId, fileMetadataId)` - Reads document from filesystem or database
  - `readDocumentFromDatabase(standardId, fileMetadataId)` - Reads file content from PostgreSQL blob storage
  - `extractRequirementsBounded(text, documentName, standardCode, standardId)` - **PRIMARY EXTRACTION FUNCTION**
    - First attempts: `ClauseAwareParser`
    - Fallback 1: `RequirementExtractor` + `AccurateClauseExtractor`
    - Fallback 2: `extractBasicRequirements()` - Basic keyword-based extraction
  - `extractBasicRequirements(text, standardCode)` - Basic fallback parser
  - `findFileForStandard(standard)` - Finds file for standard using multiple strategies
  - `getAvailableUploads()` - Gets available uploads for debugging
- **Database Operations:**
  - Inserts/updates `public.parsed_requirements` table
  - Updates `public.standards` table with `total_clauses` and `total_requirements`
  - Ensures `parsed_requirements` table exists before parsing

### 2.2 Parser Training Route
**File:** `backend/src/routes/parser-training.js`
- **Purpose:** Training and improvement endpoints for parser
- **Endpoints:**
  - Various training-related endpoints

---

## 3. Supporting Services

### 3.1 Text Extractor
**File:** `backend/src/services/textExtractor.js`
- **Purpose:** Extracts text from various file formats
- **Key Methods:**
  - `extractFromFile(filePath)` - Main extraction method
  - `extractFromPDF(filePath)` - Extracts from PDF using pdf-parse
  - `extractFromWord(filePath)` - Extracts from Word using mammoth
  - `extractFromExcel(filePath)` - Extracts from Excel using xlsx

### 3.2 Requirement Classifier
**File:** `backend/src/services/requirementClassifier.js`
- **Purpose:** Classifies sentences as requirements, recommendations, or informative notes
- **Key Functions:**
  - `classifySentence(text, clauseNumber, hasShall, paragraphIndex)` - Main classification function
  - `inRequirementScope(clauseNumber)` - Checks if clause is in scope (4-10)
  - `inferSubtype(text, clauseNumber)` - Infers requirement subtype
  - `isRequirementLine(line)` - Checks if line is a requirement

### 3.3 Requirement Patterns
**File:** `backend/src/services/requirementPatterns.js`
- **Purpose:** Defines regex patterns for requirement detection
- **Exports:**
  - `SUBJECT_PATTERN` - Matches requirement subjects
  - `OBLIGATION_PATTERN` - Matches "shall", "must"
  - `ASSURANCE_VERB_PATTERN` - Matches assurance verbs
  - `RECOMMENDATION_PATTERN` - Matches "should", "could", "may"
  - `NOTE_PATTERN` - Matches NOTE sections
  - `WILL_PATTERN` - Matches "will"
  - `PROHIBITION_PATTERN` - Matches prohibitions

### 3.4 List Atomizer
**File:** `backend/src/services/listAtomizer.js`
- **Purpose:** Detects and atomizes list items (a., b., c., 1., 2., etc.)
- **Key Function:**
  - `atomizeList(clauseNumber, clauseText)` - Splits clause text into list items
  - Handles incomplete sentences (ending with "including:", "such as:")
  - Groups parent requirements with bullet points

### 3.5 Standardized Format Extractor
**File:** `backend/src/services/standardizedFormatExtractor.js`
- **Purpose:** Extracts requirements in standardized format
- **Key Functions:**
  - `extractTopLevelClause(fullClause)` - Extracts top-level clause number
  - `shouldIncludeSubParagraph(subclause)` - Determines if sub_paragraph should be included
  - `getClauseName(clauseHierarchy, topLevelClause)` - Gets clause name from hierarchy
  - `getSubclauseName(clauseHierarchy, subclause)` - Gets subclause name
  - `formatSubParagraph(subclause, subclauseName)` - Formats sub_paragraph field
  - `calculateStandardizedConfidence(text)` - Calculates standardized confidence score
  - `cleanRequirementText(text)` - Cleans requirement text
  - `buildClauseHierarchy(text)` - Builds clause hierarchy map
  - `createStandardizedRequirement(...)` - Creates standardized requirement object

### 3.6 Text Sanitizer
**File:** `backend/src/services/textSanitizer.js`
- **Purpose:** Sanitizes and normalizes raw text
- **Key Functions:**
  - `sanitizeRaw(text)` - Removes headers/footers, heals hyphenation
  - `normalizeForId(text)` - Normalizes text for ID generation

### 3.7 Note Filter
**File:** `backend/src/services/noteFilter.js`
- **Purpose:** Filters out NOTE sections from requirements
- **Key Function:**
  - `stripNotes(text)` - Removes NOTE sections from text

### 3.8 Clause Extractor
**File:** `backend/src/services/clauseExtractor.js`
- **Purpose:** Extracts clause structure from documents
- **Key Classes:**
  - `AccurateClauseExtractor` class
  - `buildClauseStructure(text)` - Builds clause structure
  - `getValidClauses()` - Gets valid clauses
  - `hasClause(clauseNumber)` - Checks if clause exists
  - `extractClauseNumber(line)` - Extracts clause number from line

### 3.9 Requirements Formatter
**File:** `backend/src/services/requirementsFormatter.js`
- **Purpose:** Formats requirements for display
- **Key Functions:**
  - `formatRequirementsList(requirements)` - Formats as list
  - `formatRequirementsAsText(requirements)` - Formats as text
  - `formatRequirementsAsMarkdown(requirements)` - Formats as markdown

---

## 4. Frontend Integration

### 4.1 Main Index Page
**File:** `public/index.html`
- **Functions:**
  - `parseStandard(standardId, forceReparse)` - Calls `/api/parse/standard/:standardId`
  - Displays "Parse Now" and "Re-parse" buttons for each standard
  - Shows parsing status and requirement counts

### 4.2 Detail Page
**File:** `public/detail.html`
- **Functions:**
  - `parseStandard()` - Calls `/api/parse/standard/:id`
  - `reParseStandard()` - Calls `/api/parse/standard/:id?force=true`
  - `loadParseInterface()` - Loads parse interface UI
  - `loadRequirements()` - Loads and displays parsed requirements
  - `refreshStandardData()` - Refreshes standard data after parsing
  - Displays parsing status and requirement counts in Overview tab

---

## 5. Database Operations

### 5.1 Parsed Requirements Table
**Table:** `public.parsed_requirements`
- **Created by:** `migrations/012_create_parsed_requirements_table.sql`
- **Columns:**
  - `id`, `standard_id`, `clause_number`, `clause_title`, `requirement_text`
  - `clause`, `clause_name`, `subclause`, `subclause_name`, `paragraph`, `sub_paragraph`
  - `confidence`, `requirement_type`, `intent`, `keywords`
  - `extracted_at`, `extracted_by_model_version`
  - And many more...

### 5.2 Standards Table
**Table:** `public.standards`
- **Updated by:** Parse route after parsing completes
- **Columns Updated:**
  - `total_clauses` - Number of clauses found
  - `total_requirements` - Number of requirements extracted
  - `parsed_at` - Timestamp of last parse

### 5.3 Table Creation Scripts
**Files:**
- `backend/src/scripts/ensure-parsed-requirements-table-robust.js` - Robust table creation
- `backend/src/scripts/create-parsed-requirements-table-now.js` - Direct table creation
- `backend/src/scripts/ensure-parsed-requirements-table.js` - Basic table creation

---

## 6. Utility Scripts

### 6.1 Text Extraction Test
**File:** `backend/src/scripts/test-text-extraction.js`
- **Purpose:** Test script for text extraction
- **Usage:** Extracts text from a file and displays first N characters

### 6.2 Bulk Parser Training
**File:** `backend/src/scripts/bulk-train-parser.js`
- **Purpose:** Bulk training for parser improvement

---

## 7. Legacy/Alternative Parsers

### 7.1 EDCAT Parser
**File:** `backend/src/edcat/parser/clauseParser.js`
- **Purpose:** Alternative clause parser implementation
- **Imports:** `ClauseAwareParser` from main services

### 7.2 EDCAT Orchestrator
**File:** `backend/src/edcat/orchestrator.js`
- **Purpose:** Orchestrates EDCAT parsing workflow

### 7.3 Online Parsers
**File:** `backend/src/online/Parsers.js`
- **Purpose:** Online parsing functionality

### 7.4 Public Parser JS
**File:** `public/js/edcat-parser.js`
- **Purpose:** Client-side parsing utilities

### 7.5 Services Parser
**File:** `services/parser.js`
- **Purpose:** Legacy parser service

### 7.6 Parse Pending Script
**File:** `scripts/parsePending.js`
- **Purpose:** Script to parse pending documents

---

## 8. Parsing Flow Summary

### 8.1 Primary Flow (Current Implementation)
1. **User Action:** Click "Parse Now" or "Re-parse" in UI
2. **Frontend:** `parseStandard()` in `public/index.html` or `public/detail.html`
3. **API Call:** `POST /api/parse/standard/:standardId` in `backend/src/routes/parse.js`
4. **File Reading:** 
   - `readDocumentFile()` → `readDocumentFromDatabase()` or filesystem
   - Uses `TextExtractor` service if needed
5. **Requirement Extraction:**
   - Primary: `extractRequirementsBounded()` → `ClauseAwareParser.parse()`
   - Fallback 1: `RequirementExtractor` + `AccurateClauseExtractor`
   - Fallback 2: `extractBasicRequirements()`
6. **Clause Processing:**
   - `ClauseAwareParser.splitByClauses()` - Detects clauses
   - `ClauseAwareParser.extractRequirementsFromClause()` - Extracts requirements
   - `atomizeList()` - Handles list items
   - `classifySentence()` - Classifies requirements
7. **Format Standardization:**
   - `createStandardizedRequirement()` - Creates standardized format
   - `cleanRequirementText()` - Cleans text
   - `calculateStandardizedConfidence()` - Calculates confidence
8. **Database Storage:**
   - Inserts/updates `public.parsed_requirements` table
   - Updates `public.standards` table with counts
9. **Response:** Returns success with requirement count

### 8.2 ISO/AS Standard Parsing (parseISO)
1. **Entry Point:** `parseService.parseISO(content, standard)`
2. **Clause Detection:** Uses `.split()` with lookahead pattern (recently fixed)
3. **Paragraph Splitting:** `splitIntoParagraphs()` - Splits by blank lines
4. **Requirement Creation:** Creates one requirement object per paragraph
5. **Format:** Outputs standardized format with clause/subclause/paragraph fields

---

## 9. Key Dependencies

### 9.1 NPM Packages
- `pdf-parse` - PDF text extraction
- `mammoth` - Word document extraction
- `xlsx` - Excel file extraction

### 9.2 Internal Dependencies
- `queryPostgres` from `backend/src/config/databases.js` - Database queries
- `queryEdcatAI` from `backend/src/config/databases.js` - EDCAT AI database queries
- `retrieveFile` from `backend/src/config/storage.js` - File storage retrieval

---

## 10. Configuration & Environment

### 10.1 Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `EDCAT_AI_DATABASE_URL` - EDCAT AI database connection string
- `PROCESS_REQUIREMENTS_ON_STARTUP` - Auto-process requirements on startup
- `DEBUG_PARAGRAPHS` - Enable paragraph debugging logs

### 10.2 Startup Checks
**File:** `backend/index.js`
- Ensures `public.standards` table exists
- Ensures `public.parsed_requirements` table exists
- Calls `ensureParsedRequirementsTable()` on startup

---

## 11. Recent Changes

### 11.1 parseISO() Fix (Most Recent)
**File:** `backend/src/services/parseService.js`
- **Change:** Replaced `RegExp.exec()` loop with `.split()` method
- **Reason:** Fixes clause ordering and prevents skipping clauses
- **Impact:** Now correctly finds 150+ requirements instead of 26

### 11.2 Standardized Format
- Added new fields: `clause`, `clause_name`, `subclause`, `subclause_name`, `paragraph`, `sub_paragraph`
- Maintains backward compatibility with legacy fields

### 11.3 Paragraph Splitting
- Improved paragraph detection using blank lines
- Keeps lettered/numbered lists with parent paragraph
- Excludes NOTE sections

---

## 12. Testing & Debugging

### 12.1 Test Scripts
- `backend/src/scripts/test-text-extraction.js` - Test text extraction
- `extract-text.ps1` - PowerShell wrapper for text extraction test
- `find-pdf-files.ps1` - Find PDF files for testing

### 12.2 Debug Logging
- Extensive console logging in `backend/src/routes/parse.js`
- Debug flags: `DEBUG_PARAGRAPHS` environment variable
- Logs clause detection, requirement extraction, and storage operations

---

## Summary

The parsing system is a multi-layered architecture with:
- **Primary Parser:** `ClauseAwareParser` in `clauseAwareParser.js`
- **Standard-Specific Parsers:** `parseService.js` (parseISO, parseFAA, etc.)
- **Supporting Services:** Text extraction, classification, formatting, sanitization
- **API Layer:** `backend/src/routes/parse.js`
- **Frontend:** `public/index.html` and `public/detail.html`
- **Database:** `public.parsed_requirements` and `public.standards` tables

The system is designed to be resilient with multiple fallback mechanisms and extensive error handling.

