# Complete Parsing Code Map - Exact Locations

This document provides **exact file paths, line numbers, and function names** for every piece of parsing code in the system. Use this to navigate directly to each code location.

---

## 📍 Navigation Guide

**Format:** `File:Path → Function Name (Lines: Start-End)`

---

## 1. CORE PARSING SERVICES

### 1.1 ParseService (Main Parser Orchestrator)
**File:** `backend/src/services/parseService.js`

| Function/Class | Lines | Purpose |
|----------------|-------|---------|
| `class ParseService` | 9-583 | Main parsing service class |
| `constructor()` | 10-12 | Initializes TextExtractor |
| `parseStandard(filePath, standard)` | 20-117 | Main entry point - parses standard document |
| `parseISO(content, standard)` | 119-278 | **RECENTLY FIXED** - Parses ISO/AS standards using split() |
| `splitIntoParagraphs(text)` | 285-393 | Splits text into paragraphs by blank lines |
| `isLikelyRequirement(text)` | 398-419 | Checks if text is likely a requirement |
| `parseAS(content, standard)` | 421-423 | Delegates to parseISO() |
| `parseFAA(content, standard)` | 425-462 | Parses FAA regulations |
| `parseEASA(content, standard)` | 464-466 | Delegates to parseFAA() |
| `parseGeneric(content, standard)` | 468-487 | Fallback generic parser |
| `inferType(text)` | 489-497 | Infers requirement type |
| `calculateConfidence(text)` | 499-521 | Calculates confidence score (0.55-0.98) |
| `cleanText(text)` | 526-538 | Normalizes whitespace and removes formatting |
| `generateIntent(text, standardCode)` | 540-560 | Generates intent classification |
| `identifyCommonGaps(text)` | 562-580 | Identifies common compliance gaps |

**Key Code Sections:**
- **Line 137:** `content.split(/(?=^\d+(?:\.\d+)*\t)/m)` - Split by clause headers (FIXED)
- **Line 145:** `part.match(/^(\d+(?:\.\d+)*)\t(.+?)$/m)` - Match TAB-separated headers
- **Line 171:** `clauseText.split(/\n\n+/)` - Split into paragraphs
- **Line 237:** `clauseText.split(/\n\n+/)` - Split into paragraphs (TAB path)

---

### 1.2 ClauseAwareParser (Advanced Clause-Aware Parser)
**File:** `backend/src/services/clauseAwareParser.js`

| Function/Class | Lines | Purpose |
|----------------|-------|---------|
| `export class ClauseAwareParser` | 31-976 | Advanced parser with clause awareness |
| `constructor(standardCode, standardId, version)` | 32-41 | Initializes parser with standard info |
| `generateRequirementUid(fullRef, normalizedText)` | 47-54 | Generates deterministic SHA256 IDs |
| `generateClauseId(clauseNumber, normalizedText)` | 59-61 | Legacy method for backward compatibility |
| `splitByClauses(text)` | 67-266 | Detects and splits by clause headers |
| `tryAggressiveParsing(text)` | 266-315 | Fallback aggressive parsing if normal fails |
| `parseClauseSection(section)` | 318-384 | Parses a single clause section |
| `extractRequirementsFromClause(content, parentClause, clauseTitle)` | 385-521 | Extracts requirements from clause content |
| `isRequirementLine(text)` | 522-556 | Checks if line is a requirement |
| `createStandardizedRequirement(...)` | 557-611 | Creates standardized format requirement |
| `createRequirement(...)` | 612-700 | Creates requirement object (legacy format) |
| `groupRequirementsWithLists(requirements)` | 701-800 | Groups parent requirements with bullet points |
| `parse(text)` | 801-976 | Main parsing method - orchestrates entire process |

**Key Code Sections:**
- **Line 69:** `sanitizeRaw(text)` - Sanitizes raw text
- **Line 83:** `line.match(/^\d+(?:\.\d+){0,3}\s+\S/)` - Detects clause headers
- **Line 112:** `clausePatternWithTitle` - Pattern for clauses with titles
- **Line 113:** `clausePatternStandalone` - Pattern for standalone clauses
- **Line 119:** `while ((match = clausePatternWithTitle.exec(normalized))` - Find clauses with titles
- **Line 150:** `while ((match = clausePatternStandalone.exec(normalized))` - Find standalone clauses
- **Line 259:** `const { ClauseAwareParser } = await import(...)` - Dynamic import
- **Line 260:** `new ClauseAwareParser(standardCode, standardId, '1.0.0')` - Create parser instance
- **Line 261:** `parser.parse(text)` - Execute parsing

---

### 1.3 RequirementParser (Legacy Requirement Extractor)
**File:** `backend/src/services/requirementParser.js`

| Function/Class | Lines | Purpose |
|----------------|-------|---------|
| `export class RequirementExtractor` | 96-745 | Legacy requirement extraction engine |
| `constructor(standardCode, version)` | 97-110 | Initializes extractor |
| `extractRequirements(text)` | 112-258 | Extracts requirements from text |
| `finalizeRequirement(...)` | 259-285 | Finalizes a requirement object |
| `isIncompleteRequirement(line)` | 287-342 | Checks if requirement is incomplete |
| `isListItem(line)` | 343-370 | Checks if line is a list item |
| `isContinuationLine(line)` | 371-413 | Checks if line continues previous |
| `isNonRequirementLine(line)` | 415-472 | Filters out non-requirement lines |
| `filterRequirements(requirements)` | 474-520 | Filters and deduplicates requirements |
| `isSectionHeader(line)` | 521-533 | Checks if line is a section header |
| `extractClauseNumber(line)` | 535-549 | Extracts clause number from line |
| `isRequirementLine(line)` | 551-591 | Checks if line contains a requirement |
| `createRequirement(...)` | 592-635 | Creates requirement object |
| `matchesLearnedPattern(text, pattern)` | 637-646 | Checks if text matches learned pattern |
| `extractPrimaryKeyword(text)` | 648-670 | Extracts primary keyword from text |
| `validateCompleteness()` | 672-687 | Validates extraction completeness |
| `identifyIssues()` | 689-718 | Identifies parsing issues |
| `calculateMetadata()` | 720-731 | Calculates extraction metadata |
| `recordParsingEvent(documentLength)` | 733-744 | Records parsing event for learning |
| `parseDocumentWithAdvancedParser(filePath, fileExt, standardCode)` | 751-881 | Parses document file with advanced parser |

**Key Code Sections:**
- **Line 112:** `extractRequirements(text)` - Main extraction method
- **Line 199:** `this.isRequirementLine(line)` - Requirement detection
- **Line 305:** `new RequirementExtractor(standardCode, '1.0.0')` - Create extractor
- **Line 306:** `extractor.extractRequirements(text)` - Execute extraction

---

## 2. API ROUTES

### 2.1 Parse Route (Main API Endpoint)
**File:** `backend/src/routes/parse.js`

| Function/Route | Lines | Purpose |
|----------------|-------|---------|
| `async function findFileForStandard(standard)` | 30-110 | Finds file for standard using multiple strategies |
| `async function readDocumentFile(filePath, standardId, fileMetadataId)` | 112-158 | Reads document from filesystem or database |
| `async function readDocumentFromDatabase(standardId, fileMetadataId)` | 160-228 | Reads file content from PostgreSQL blob storage |
| `async function getAvailableUploads()` | 233-251 | Gets available uploads for debugging |
| `async function extractRequirementsBounded(text, documentName, standardCode, standardId)` | 256-410 | **PRIMARY EXTRACTION FUNCTION** - Orchestrates extraction |
| `function extractBasicRequirements(text, standardCode)` | 415-435 | Basic fallback parser |
| `router.post('/standard/:standardId', ...)` | 445-1037 | **MAIN PARSE ENDPOINT** - POST /api/parse/standard/:standardId |
| `router.get('/status/:standardId', ...)` | 1039-1071 | Get parsing status endpoint |

**Key Code Sections:**
- **Line 259:** `const { ClauseAwareParser } = await import(...)` - Import ClauseAwareParser
- **Line 260:** `new ClauseAwareParser(standardCode, standardId, '1.0.0')` - Create parser
- **Line 261:** `parser.parse(text)` - Execute parsing
- **Line 266:** `parseResult.requirements.map(...)` - Map to standardized format
- **Line 296:** `const { RequirementExtractor } = await import(...)` - Fallback extractor
- **Line 305:** `extractor.extractRequirements(text)` - Execute extraction
- **Line 687:** `extractRequirementsBounded(...)` - Call extraction function
- **Line 714:** `DELETE FROM public.parsed_requirements` - Delete existing on re-parse
- **Line 725:** `for (const req of extractedRequirements)` - Store each requirement
- **Line 831:** `UPDATE public.parsed_requirements` - Update existing requirement
- **Line 855:** `INSERT INTO public.parsed_requirements` - Insert new requirement
- **Line 907:** `UPDATE public.standards` - Update standard counts

---

## 3. SUPPORTING SERVICES

### 3.1 TextExtractor
**File:** `backend/src/services/textExtractor.js`

| Function/Class | Lines | Purpose |
|----------------|-------|---------|
| `class TextExtractor` | 12-75 | Extracts text from various file formats |
| `extractFromFile(filePath)` | 18-35 | Main extraction method - routes by file type |
| `extractFromPDF(filePath)` | 37-45 | Extracts from PDF using pdf-parse |
| `extractFromWord(filePath)` | 47-55 | Extracts from Word using mammoth |
| `extractFromExcel(filePath)` | 57-73 | Extracts from Excel using xlsx |

---

### 3.2 RequirementClassifier
**File:** `backend/src/services/requirementClassifier.js`

| Function | Lines | Purpose |
|----------|-------|---------|
| `export function inRequirementScope(clauseNumber)` | 20-32 | Checks if clause is in scope (4-10) |
| `export function inferSubtype(text, clauseNumber)` | 37-74 | Infers requirement subtype |
| `export function classifySentence(rawSentence, clauseNumber, parentHasShall, paragraphIndex)` | 86-220 | **MAIN CLASSIFICATION FUNCTION** - Classifies sentences |

**Key Code Sections:**
- **Line 86:** `classifySentence(...)` - Main classification entry point
- **Line 99:** `inRequirementScope(clauseNumber)` - Scope check
- **Line 108:** `NOTE_PATTERN.test(text)` - NOTE detection
- **Line 135:** `PROHIBITION_PATTERN.test(text)` - Prohibition detection
- **Line 181:** `paragraphPatterns` - Extract paragraph numbers (P1, P2, etc.)

---

### 3.3 RequirementPatterns
**File:** `backend/src/services/requirementPatterns.js`

| Export | Lines | Purpose |
|--------|-------|---------|
| `export const SUBJECT_PATTERN` | 6 | Matches requirement subjects |
| `export const OBLIGATION_PATTERN` | 8 | Matches "shall", "must" |
| `export const ASSURANCE_VERB_PATTERN` | 10 | Matches assurance verbs |
| `export const RECOMMENDATION_PATTERN` | 12 | Matches "should", "could", "may" |
| `export const NOTE_PATTERN` | 14 | Matches NOTE sections |
| `export const WILL_PATTERN` | 16 | Matches "will" |
| `export const PROHIBITION_PATTERN` | 18 | Matches prohibitions |

---

### 3.4 ListAtomizer
**File:** `backend/src/services/listAtomizer.js`

| Function | Lines | Purpose |
|----------|-------|---------|
| `export function atomizeList(clauseNumber, clauseText)` | 18-352 | **MAIN FUNCTION** - Detects and atomizes list items |

**Key Code Sections:**
- **Line 18:** `atomizeList(clauseNumber, clauseText)` - Main entry point
- **Line 30:** `lines = clauseText.split(/\n/)` - Split by lines
- **Line 48:** `/\bshall\b|\bmust\b/i.test(clauseText)` - Check for parent "shall"
- **Line 56:** `for (let line of lines)` - Process each line
- **Line 93:** `LETTER_ITEM.test(line)` - Detect lettered items (a., b., c.)
- **Line 115:** `NUM_ITEM.test(line)` - Detect numbered items (1., 2., 3.)
- **Line 150:** `DASH_ITEM.test(line)` - Detect dash items (-)
- **Line 200:** `/\bshall\b|\bmust\b/i.test(line)` - Detect requirement keywords
- **Line 225:** `isIncomplete(line)` - Check if incomplete sentence
- **Line 246:** `incompleteBuffer` - Handle incomplete sentences

---

### 3.5 StandardizedFormatExtractor
**File:** `backend/src/services/standardizedFormatExtractor.js`

| Function | Lines | Purpose |
|----------|-------|---------|
| `export function extractTopLevelClause(fullClause)` | 23-27 | Extracts top-level clause number |
| `export function shouldIncludeSubParagraph(subclause)` | 35-40 | Determines if sub_paragraph should be included |
| `export function getClauseName(clauseHierarchy, topLevelClause)` | 48-58 | Gets clause name from hierarchy |
| `export function getSubclauseName(clauseHierarchy, subclause)` | 60-70 | Gets subclause name |
| `export function formatSubParagraph(subclause, subclauseName)` | 72-87 | Formats sub_paragraph field |
| `export function calculateStandardizedConfidence(...)` | 90-132 | Calculates standardized confidence score |
| `export function cleanRequirementText(text)` | 134-152 | Cleans requirement text |
| `export function buildClauseHierarchy(sections)` | 154-198 | Builds clause hierarchy map |
| `export function createStandardizedRequirement(params)` | 200-230 | Creates standardized requirement object |

---

### 3.6 TextSanitizer
**File:** `backend/src/services/textSanitizer.js`

| Function | Lines | Purpose |
|----------|-------|---------|
| `export function sanitizeRaw(text)` | 11-70 | Removes headers/footers, heals hyphenation |
| `export function normalizeForId(text)` | 72-80 | Normalizes text for ID generation |

---

### 3.7 NoteFilter
**File:** `backend/src/services/noteFilter.js`

| Function | Lines | Purpose |
|----------|-------|---------|
| `export function stripNotes(block)` | 11-65 | Removes NOTE sections from text |
| `export function hasNotes(text)` | 67-70 | Checks if text contains notes |

---

### 3.8 ClauseExtractor
**File:** `backend/src/services/clauseExtractor.js`

| Function/Class | Lines | Purpose |
|----------------|-------|---------|
| `export class AccurateClauseExtractor` | 10-254 | Extracts clause structure from documents |
| `constructor()` | 11-18 | Initializes extractor |
| `buildClauseStructure(text)` | 20-85 | Builds clause structure |
| `isValidClauseNumber(clauseNum)` | 87-105 | Validates clause number format |
| `getClauseLevel(clauseNum)` | 107-112 | Gets clause level (1, 2, 3, 4) |
| `isClauseHeader(line, allLines, lineNumber)` | 114-160 | Checks if line is a clause header |
| `validateHierarchy()` | 162-180 | Validates clause hierarchy |
| `extractClauseNumber(line, context)` | 182-236 | Extracts clause number from line |
| `getValidClauses()` | 238-252 | Gets valid clauses sorted |
| `hasClause(clauseNum)` | 254-256 | Checks if clause exists |

**Key Code Sections:**
- **Line 297:** `const { AccurateClauseExtractor } = await import(...)` - Import extractor
- **Line 300:** `new AccurateClauseExtractor()` - Create extractor
- **Line 301:** `clauseExtractor.buildClauseStructure(text)` - Build structure
- **Line 302:** `clauseExtractor.getValidClauses()` - Get valid clauses

---

### 3.9 RequirementsFormatter
**File:** `backend/src/services/requirementsFormatter.js`

| Function | Lines | Purpose |
|----------|-------|---------|
| `export function formatRequirementsList(requirements, options)` | 13-114 | Formats requirements as structured list |
| `export function formatRequirementsAsText(structuredRequirements)` | 116-156 | Formats requirements as plain text |
| `export function formatRequirementsAsMarkdown(structuredRequirements)` | 158-202 | Formats requirements as markdown |
| `export function formatRequirementsAsJSON(structuredRequirements)` | 204-207 | Formats requirements as JSON |

---

## 4. FRONTEND INTEGRATION

### 4.1 Main Index Page
**File:** `public/index.html`

| Function | Lines | Purpose |
|----------|-------|---------|
| `async function parseStandard(standardId, forceReparse)` | 1959-2040 | Calls parse API endpoint |
| `async function loadRequirements()` | 1847-1957 | Loads and displays requirements |

**Key Code Sections:**
- **Line 1969:** `const url = \`/api/parse/standard/${standardId}${forceReparse ? '?force=true' : ''}\`` - Build API URL
- **Line 1970:** `const response = await fetch(url, { method: 'POST' })` - Call API

---

### 4.2 Detail Page
**File:** `public/detail.html`

| Function | Lines | Purpose |
|----------|-------|---------|
| `async function parseStandard()` | 1468-1520 | Calls parse API for current standard |
| `async function reParseStandard()` | 1521-1573 | Calls parse API with force=true |
| `async function loadParseInterface()` | 1385-1467 | Loads parse interface UI |
| `async function loadRequirements(searchTermParam)` | 1012-1384 | Loads and displays parsed requirements |
| `async function refreshStandardData()` | 608-680 | Refreshes standard data after parsing |

**Key Code Sections:**
- **Line 1479:** `const response = await fetch(\`/api/parse/standard/${id}\`, { method: 'POST' })` - Parse API call
- **Line 1532:** `const response = await fetch(\`/api/parse/standard/${id}?force=true\`, { method: 'POST' })` - Re-parse API call
- **Line 608:** `const statusResponse = await fetch(\`/api/parse/status/${id}\`)` - Status API call

---

## 5. DATABASE OPERATIONS

### 5.1 Table Creation Scripts
**Files:**
- `backend/src/scripts/ensure-parsed-requirements-table-robust.js` - Robust table creation
- `backend/src/scripts/create-parsed-requirements-table-now.js` - Direct table creation
- `backend/src/scripts/ensure-parsed-requirements-table.js` - Basic table creation
- `migrations/012_create_parsed_requirements_table.sql` - Migration file

**Key Functions:**
- `ensureParsedRequirementsTable()` - Ensures table exists with all columns

---

## 6. PARSING FLOW - EXACT CODE PATH

### Flow 1: User Clicks "Parse Now"
1. **Frontend:** `public/index.html:1959` → `parseStandard(standardId, false)`
2. **API Call:** `public/index.html:1970` → `POST /api/parse/standard/:standardId`
3. **Route Handler:** `backend/src/routes/parse.js:445` → `router.post('/standard/:standardId')`
4. **File Reading:** `backend/src/routes/parse.js:112` → `readDocumentFile()` or `readDocumentFromDatabase()`
5. **Extraction:** `backend/src/routes/parse.js:256` → `extractRequirementsBounded()`
6. **Primary Parser:** `backend/src/routes/parse.js:259` → `ClauseAwareParser.parse()`
   - **Clause Detection:** `backend/src/services/clauseAwareParser.js:67` → `splitByClauses()`
   - **Requirement Extraction:** `backend/src/services/clauseAwareParser.js:385` → `extractRequirementsFromClause()`
   - **List Atomization:** `backend/src/services/listAtomizer.js:18` → `atomizeList()`
   - **Classification:** `backend/src/services/requirementClassifier.js:86` → `classifySentence()`
7. **Fallback 1:** `backend/src/routes/parse.js:296` → `RequirementExtractor.extractRequirements()`
8. **Fallback 2:** `backend/src/routes/parse.js:415` → `extractBasicRequirements()`
9. **Database Storage:** `backend/src/routes/parse.js:725` → Loop through requirements
   - **Insert:** `backend/src/routes/parse.js:855` → `INSERT INTO public.parsed_requirements`
   - **Update:** `backend/src/routes/parse.js:831` → `UPDATE public.parsed_requirements`
10. **Update Standard:** `backend/src/routes/parse.js:907` → `UPDATE public.standards`

### Flow 2: parseISO() Method (Recently Fixed)
1. **Entry:** `backend/src/services/parseService.js:119` → `parseISO(content, standard)`
2. **Split Clauses:** `backend/src/services/parseService.js:137` → `content.split(/(?=^\d+(?:\.\d+)*\t)/m)`
3. **Process Each Clause:** `backend/src/services/parseService.js:141` → `for (const part of clauseParts)`
4. **Match Header:** `backend/src/services/parseService.js:145` → `part.match(/^(\d+(?:\.\d+)*)\t(.+?)$/m)`
5. **Split Paragraphs:** `backend/src/services/parseService.js:171` → `clauseText.split(/\n\n+/)`
6. **Create Requirements:** `backend/src/services/parseService.js:174` → `for (const block of paragraphBlocks)`
7. **Clean Text:** `backend/src/services/parseService.js:182` → `this.cleanText(blockTrimmed)`
8. **Calculate Confidence:** `backend/src/services/parseService.js:200` → `this.calculateConfidence(cleanedText)`
9. **Return:** `backend/src/services/parseService.js:277` → `return requirements`

---

## 7. KEY CODE PATTERNS

### Pattern 1: Clause Detection
```javascript
// File: backend/src/services/clauseAwareParser.js:112-113
const clausePatternWithTitle = /^(\d+(?:\.\d+){0,3})\s+([^\n]{3,200})$/gm;
const clausePatternStandalone = /^(\d+(?:\.\d+){0,3})(?:\s+|$)/gm;
```

### Pattern 2: Paragraph Splitting
```javascript
// File: backend/src/services/parseService.js:171
const paragraphBlocks = clauseText.split(/\n\n+/);
```

### Pattern 3: Requirement Classification
```javascript
// File: backend/src/services/requirementClassifier.js:86
export function classifySentence(rawSentence, clauseNumber, parentHasShall, paragraphIndex)
```

### Pattern 4: List Atomization
```javascript
// File: backend/src/services/listAtomizer.js:18
export function atomizeList(clauseNumber, clauseText)
```

### Pattern 5: Database Storage
```javascript
// File: backend/src/routes/parse.js:855
INSERT INTO public.parsed_requirements (standard_id, clause_number, ...) VALUES (...)
```

---

## 8. QUICK REFERENCE - MOST IMPORTANT FUNCTIONS

| Priority | File | Function | Lines | Purpose |
|----------|------|----------|-------|---------|
| **1** | `backend/src/routes/parse.js` | `router.post('/standard/:standardId')` | 445-1037 | Main parse API endpoint |
| **2** | `backend/src/routes/parse.js` | `extractRequirementsBounded()` | 256-410 | Primary extraction orchestrator |
| **3** | `backend/src/services/clauseAwareParser.js` | `parse(text)` | 801-976 | Advanced parser main method |
| **4** | `backend/src/services/clauseAwareParser.js` | `splitByClauses(text)` | 67-266 | Clause detection |
| **5** | `backend/src/services/clauseAwareParser.js` | `extractRequirementsFromClause()` | 385-521 | Requirement extraction |
| **6** | `backend/src/services/parseService.js` | `parseISO(content, standard)` | 119-278 | ISO/AS parser (RECENTLY FIXED) |
| **7** | `backend/src/services/listAtomizer.js` | `atomizeList()` | 18-352 | List item handling |
| **8** | `backend/src/services/requirementClassifier.js` | `classifySentence()` | 86-220 | Requirement classification |
| **9** | `backend/src/services/parseService.js` | `splitIntoParagraphs(text)` | 285-393 | Paragraph splitting |
| **10** | `backend/src/services/parseService.js` | `cleanText(text)` | 526-538 | Text normalization |

---

## 9. IMPORT DEPENDENCIES

### parseService.js imports:
- Line 7: `TextExtractor` from `./textExtractor.js`

### clauseAwareParser.js imports:
- Line 14: `classifySentence` from `./requirementClassifier.js`
- Line 15: `inRequirementScope` from `./requirementClassifier.js`
- Line 16: `sanitizeRaw, normalizeForId` from `./textSanitizer.js`
- Line 17: `stripNotes` from `./noteFilter.js`
- Line 18: `atomizeList` from `./listAtomizer.js`
- Lines 19-29: Functions from `./standardizedFormatExtractor.js`

### parse.js imports:
- Line 10: `shouldIncludeSubParagraph` from `./standardizedFormatExtractor.js`
- Line 13: `ParseService` from `./parseService.js`
- Line 16: `inRequirementScope` from `./requirementClassifier.js`

---

## 10. DATABASE TABLES

### public.parsed_requirements
- **Created by:** `migrations/012_create_parsed_requirements_table.sql`
- **Inserted at:** `backend/src/routes/parse.js:855`
- **Updated at:** `backend/src/routes/parse.js:831`
- **Queried at:** `backend/src/routes/parse.js:496, 922`

### public.standards
- **Updated at:** `backend/src/routes/parse.js:907`
- **Queried at:** `backend/src/routes/parse.js:453, 529, 555`

---

## Summary

**Total Files:** 15+ files
**Total Functions:** 80+ functions
**Total Lines of Code:** ~10,000+ lines

**Primary Entry Points:**
1. `backend/src/routes/parse.js:445` - API endpoint
2. `backend/src/services/clauseAwareParser.js:801` - Advanced parser
3. `backend/src/services/parseService.js:119` - ISO parser

**Most Critical Code:**
- `backend/src/services/parseService.js:119-278` - parseISO() (RECENTLY FIXED)
- `backend/src/services/clauseAwareParser.js:67-266` - splitByClauses()
- `backend/src/routes/parse.js:256-410` - extractRequirementsBounded()

Use this map to navigate directly to any parsing code location!

