# Parsing Code Map - Complete List of Files

This document lists ALL code files involved in parsing standards and extracting requirements.

## 🎯 Primary Parsing Pipeline

### 1. Entry Point
- **`backend/src/routes/parse.js`** (1,168 lines)
  - Main API route handler for parsing
  - Calls `extractRequirementsBounded()` which uses `ClauseAwareParser`
  - Handles file reading (PDF, DOCX, TXT)
  - Stores requirements in database

### 2. Primary Parser (Currently Active)
- **`backend/src/services/clauseAwareParser.js`** (1,008 lines)
  - **Main parser class: `ClauseAwareParser`**
  - Methods:
    - `splitByClauses(text)` - Splits document into clause sections
    - `parseClauseSection(section)` - Processes each clause
    - `extractRequirementsFromClause(content, parentClause, clauseTitle)` - **CURRENT EXTRACTION LOGIC**
    - `parse(text)` - Main entry point
  - **Current Issue**: Only finding 22 requirements (should be 182+)

### 3. Supporting Services (Used by ClauseAwareParser)

#### Text Processing
- **`backend/src/services/textExtractor.js`**
  - Extracts text from PDF, DOCX, TXT files
  - Used by `parseService.js`

- **`backend/src/services/textSanitizer.js`**
  - `sanitizeRaw(text)` - Removes headers/footers, heals hyphenation
  - `normalizeForId(text)` - Normalizes text for ID generation
  - Used by `clauseAwareParser.js`

- **`backend/src/services/noteFilter.js`**
  - `stripNotes(block)` - Removes NOTE sections from content
  - Used by `clauseAwareParser.js` in `extractRequirementsFromClause()`

- **`backend/src/services/listAtomizer.js`**
  - `atomizeList(clauseNumber, clauseText)` - Breaks down lists into items
  - Used for handling list items (a, b, c, etc.)

- **`backend/src/services/paragraphSplitter.js`**
  - Splits text into paragraphs
  - Alternative paragraph splitting logic

#### Classification & Formatting
- **`backend/src/services/requirementClassifier.js`**
  - `classifySentence(rawSentence, clauseNumber, parentHasShall, paragraphIndex)`
  - `inRequirementScope(clauseNumber)` - Checks if clause 4-10 (scope guard)
  - Determines requirement type (mandatory, recommended, etc.)
  - Used by `clauseAwareParser.js`

- **`backend/src/services/standardizedFormatExtractor.js`**
  - `extractTopLevelClause(subclause)` - Gets top-level clause (e.g., "8" from "8.5.1")
  - `getClauseName(hierarchy, clause)` - Gets clause name from hierarchy
  - `getSubclauseName(hierarchy, subclause)` - Gets subclause name
  - `shouldIncludeSubParagraph(subclause)` - Determines if sub_paragraph needed
  - `formatSubParagraph(subclause, name)` - Formats sub_paragraph
  - `calculateStandardizedConfidence(...)` - Calculates confidence score
  - `cleanRequirementText(text)` - Cleans requirement text
  - `createStandardizedRequirement({...})` - Creates standardized format object
  - Used by `clauseAwareParser.js` in `createStandardizedRequirement()`

### 4. Fallback Parsers (Not Currently Used)

- **`backend/src/services/parseService.js`** (332 lines)
  - Alternative parser service
  - Has `parseISO()`, `parseAS()`, `parseFAA()`, `parseEASA()`, `parseGeneric()` methods
  - Uses `TextExtractor`
  - **Not currently called** - `clauseAwareParser.js` is primary

- **`backend/src/services/requirementParser.js`** (881 lines)
  - `RequirementExtractor` class
  - Fallback parser used when `ClauseAwareParser` fails
  - Called in `parse.js` line 312 as fallback

- **`backend/src/services/clauseExtractor.js`**
  - `AccurateClauseExtractor` class
  - Used by fallback parser in `parse.js`
  - Builds clause structure from document

### 5. Database Storage

- **`backend/src/routes/parse.js`** (lines 500-800)
  - Stores requirements in `public.parsed_requirements` table
  - Uses `queryPostgres()` for Customer Data DB
  - Handles duplicate detection and updates

### 6. Helper/Utility Files

- **`backend/src/services/requirementPatterns.js`**
  - Pattern definitions for requirement matching
  - Used by various parsers

- **`backend/src/services/requirementsFormatter.js`**
  - `formatRequirementsList()`, `formatRequirementsAsText()`, `formatRequirementsAsMarkdown()`
  - Formats requirements for display/export

## 📊 Current Parsing Flow

```
1. User clicks "Parse"
   ↓
2. routes/parse.js → POST /api/parse/standard/:standardId
   ↓
3. findFileForStandard() → Locates file
   ↓
4. readDocumentFile() → Extracts text (PDF/DOCX/TXT)
   ↓
5. extractRequirementsBounded() → Main extraction function
   ↓
6. ClauseAwareParser.parse(text) → Primary parser
   ↓
7. ClauseAwareParser.splitByClauses(text) → Splits into clause sections
   ↓
8. For each clause section:
   - parseClauseSection() → Processes clause
   - extractRequirementsFromClause() → **EXTRACTS REQUIREMENTS** ⚠️ CURRENT ISSUE HERE
   ↓
9. Uses supporting services:
   - stripNotes() → Removes NOTE sections
   - classifySentence() → Classifies requirement
   - createStandardizedRequirement() → Creates requirement object
   ↓
10. Stores in database via routes/parse.js
```

## 🔍 Key Files to Review for 22 Requirements Issue

1. **`backend/src/services/clauseAwareParser.js`**
   - Line 401: `extractRequirementsFromClause()` - **MAIN EXTRACTION LOGIC**
   - Line 424: Paragraph splitting (`split(/\n\n+/)`)
   - Line 435: "shall" requirement check
   - Line 507: Paragraph counter increment

2. **`backend/src/services/clauseAwareParser.js`**
   - Line 67: `splitByClauses()` - Clause detection
   - Line 242: Content extraction between clauses
   - Line 243: **May be cutting off content too early**

3. **`backend/src/services/requirementClassifier.js`**
   - Line 86: `classifySentence()` - May be rejecting valid requirements
   - Line 94: `inRequirementScope()` - Scope guard (clauses 4-10)

4. **`backend/src/services/standardizedFormatExtractor.js`**
   - `cleanRequirementText()` - May be removing too much text
   - `createStandardizedRequirement()` - May be returning null for valid requirements

## 📝 Summary

**Total Parsing-Related Files: 15+**

**Primary Active Files:**
1. `backend/src/routes/parse.js` - Entry point
2. `backend/src/services/clauseAwareParser.js` - **PRIMARY PARSER** ⚠️
3. `backend/src/services/requirementClassifier.js` - Classification
4. `backend/src/services/standardizedFormatExtractor.js` - Formatting
5. `backend/src/services/textSanitizer.js` - Text cleaning
6. `backend/src/services/noteFilter.js` - Note removal

**Fallback Files (Not Currently Used):**
- `backend/src/services/parseService.js`
- `backend/src/services/requirementParser.js`
- `backend/src/services/clauseExtractor.js`

**Current Issue Location:**
- `backend/src/services/clauseAwareParser.js::extractRequirementsFromClause()` (line 401)
  - Only finding 22 requirements instead of 182+
  - Likely issue: Paragraph splitting or "shall" detection too restrictive

