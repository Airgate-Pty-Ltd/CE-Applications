# Document Parser - Architecture & Capabilities Documentation

## Overview

The Document Parser is a sophisticated multi-parser system that extracts compliance requirements from standards, regulations, and customer requirement documents. It supports multiple file formats, uses intelligent parsing strategies, and stores extracted requirements in a structured database format for use by Vera and gap analysis tools.

---

## 🗄️ Database Architecture

### Primary Database: Customer Data DB

**Environment Variable**: `DATABASE_URL`  
**Purpose**: Standards, Parsed Requirements, Customer Documents  
**Connection**: `backend/src/config/databases.js` → `postgresPool`  
**Query Function**: `queryPostgres()` or `query()` (default)

### Core Tables

#### Standards Storage
- **`public.standards`** - Standards, regulations, customer requirements metadata
  - `id` (UUID) - Primary key
  - `code` (TEXT) - Standard code (e.g., 'AS9100D', 'ISO-9001', 'FAA-21.137')
  - `name` (TEXT) - Display name
  - `sector` (TEXT) - Industry sector
  - `file_category` (TEXT) - 'standard', 'regulatory', 'customer_requirements'
  - `file_path` (TEXT) - Filesystem path to document (legacy)
  - `file_content` (BYTEA/TEXT) - Base64-encoded document content (preferred)
  - `file_name` (TEXT) - Original filename
  - `file_type` (TEXT) - 'pdf', 'docx', 'txt'
  - `file_size` (INT) - File size in bytes
  - `uploaded_at` (TIMESTAMPTZ)
  - `total_requirements` (INT) - Count of parsed requirements
  - `total_clauses` (INT) - Count of parsed clauses
  - `parsed_at` (TIMESTAMPTZ) - Last parse timestamp
  - `model_version_used` (TEXT) - Parser version used

#### Parsed Requirements Storage
- **`public.parsed_requirements`** - Extracted clauses and requirements
  - `id` (UUID) - Primary key
  - `standard_id` (UUID) - References `standards.id`
  - `clause_number` (TEXT) - Full clause reference (e.g., '8.5.1')
  - `clause_ref` (TEXT) - Top-level clause (e.g., '8')
  - `sub_ref` (TEXT) - Sub-clause reference
  - `full_ref` (TEXT) - Full hierarchical reference
  - `clause_title` (TEXT) - Clause title/name
  - `requirement_text` (TEXT) - Extracted requirement text
  - `subject_text` (TEXT) - Paragraph designation (P1, P2, etc.)
  - `requirement_type` (TEXT) - 'Requirement', 'Recommendation', 'Note'
  - `requirement_subtype` (TEXT) - Additional classification
  - `requirement_uid` (TEXT) - Unique requirement identifier
  - `keyword` (TEXT) - Modal verb ('shall', 'must', 'should', 'will')
  - `modal_verb` (TEXT) - Extracted modal verb
  - `intent` (TEXT) - Requirement intent classification
  - `keywords` (TEXT) - Comma-separated keywords
  - `confidence` (DECIMAL) - Extraction confidence score (0.0-1.0)
  - `clause_path_depth` (INT) - Depth in clause hierarchy
  - `is_informative_note` (BOOLEAN) - Is this an informative note?
  - `is_recommendation` (BOOLEAN) - Is this a recommendation?
  - `is_in_scope` (BOOLEAN) - Is this requirement in scope?
  - `extraction_flags` (JSONB) - Additional extraction metadata
  - `aerospace_addition` (BOOLEAN) - AS9100 aerospace-specific addition
  - `requires_maintained_di` (BOOLEAN) - Requires maintained documented information
  - `requires_retained_di` (BOOLEAN) - Requires retained documented information
  - `extracted_at` (TIMESTAMPTZ) - Extraction timestamp
  - `extracted_by_model_version` (TEXT) - Parser version

---

## 🏗️ Architecture Components

### Core Parsing Services

#### 1. Universal Compliance Parser (`backend/src/services/universalComplianceParser.js`)
- **Purpose**: Multi-format parser that handles Standards, Regulations, and Customer Requirements
- **Key Features**:
  - Automatic document type detection (STANDARD, REGULATION, CUSTOMER)
  - Clause-based parsing for standards (4.1, 4.2, etc.)
  - Section-based parsing for regulations (21.137, 21.139, etc.)
  - Requirement-based parsing for customer requirements (SQ01, A1505, etc.)
  - Pattern recognition for different document structures
  - Confidence scoring per requirement

**Document Type Detection**:
- **STANDARD**: ISO, AS9100, IATF patterns (clause-based numbering)
- **REGULATION**: FAA, EASA patterns (section-based numbering)
- **CUSTOMER**: Customer-specific requirement formats

**Key Methods**:
```javascript
async parse(text, metadata) // Main parsing entry point
detectDocumentType(text, metadata) // Auto-detect document type
parseStandard(text, metadata) // Parse ISO/AS9100 standards
parseRegulation(text, metadata) // Parse FAA/EASA regulations
parseCustomerRequirements(text, metadata) // Parse customer requirements
```

#### 2. Simple Shall Parser (`backend/src/services/simpleShallParser.js`)
- **Purpose**: Sequential "shall" statement extractor for standards
- **Key Features**:
  - Finds each "shall" statement sequentially
  - Extracts: Clause + Paragraph + Full Statement + Complete List
  - Keeps list items together (doesn't split them)
  - Tracks incomplete lists as GAPs
  - Maintains clause context throughout document

**Key Methods**:
```javascript
parse(text) // Extract requirements sequentially
findShallStatements(text) // Find all "shall" statements
extractClauseContext(text, position) // Get clause context
extractListItems(text, startPosition) // Extract complete lists
```

#### 3. Clause-Aware Parser (`backend/src/services/clauseAwareParser.js`)
- **Purpose**: Advanced parser with clause structure awareness
- **Key Features**:
  - Builds clause hierarchy from document structure
  - Validates clause numbers against document structure
  - Assigns requirements to correct clauses
  - Handles nested clause structures
  - Tracks clause depth and relationships

**Key Methods**:
```javascript
parse(text) // Parse with clause awareness
buildClauseStructure(text) // Build clause hierarchy
getValidClauses() // Get validated clause list
extractClauseNumber(text) // Extract clause number from text
hasClause(clauseNumber) // Check if clause exists in structure
```

#### 4. Requirement Extractor (`backend/src/services/requirementParser.js`)
- **Purpose**: Pattern-based requirement extraction with learning
- **Key Features**:
  - Pattern recognition for requirement statements
  - Validation & completeness checking
  - User feedback & correction tracking
  - Learning engine that improves over time
  - Accuracy metrics & confidence scoring

**Key Methods**:
```javascript
extractRequirements(text) // Extract requirements using patterns
recordParsingEvent(documentLength) // Track parsing events
validateRequirement(requirement) // Validate extracted requirement
```

### File Reading Services

#### 5. Document File Reader (`backend/src/routes/parse.js`)
- **Purpose**: Reads documents from filesystem or database
- **Key Features**:
  - Supports PDF, DOCX, TXT file formats
  - Reads from filesystem paths
  - Reads from database blob storage (preferred)
  - Handles base64-encoded content
  - Automatic file type detection

**Key Methods**:
```javascript
readDocumentFile(filePath, standardId, fileMetadataId) // Read from filesystem
readDocumentFromDatabase(standardId, fileMetadataId) // Read from database
findFileForStandard(standard) // Multi-strategy file finding
```

### Storage & Validation Services

#### 6. Requirements Formatter (`backend/src/services/requirementsFormatter.js`)
- **Purpose**: Formats requirements for display and export
- **Key Features**:
  - Formats as list, text, or markdown
  - Handles clause hierarchy
  - Includes metadata and confidence scores

#### 7. Metrics Service (`backend/src/services/metricsService.js`)
- **Purpose**: Calculates parsing metrics and QA checks
- **Key Features**:
  - Requirement counts by clause
  - Type and subtype distribution
  - In-scope vs out-of-scope counts
  - QA validation checks

#### 8. Requirement Classifier (`backend/src/services/requirementClassifier.js`)
- **Purpose**: Classifies requirements as in-scope or out-of-scope
- **Key Features**:
  - Filters clauses 1-3 (out of scope)
  - Validates requirement types
  - Checks for informative notes

---

## 🔄 Parsing Flow

### 1. Standard Upload & Parse Flow

```
User uploads standard PDF/DOCX
    ↓
POST /api/upload
    ↓
Save to Customer Data DB
    ├─ INSERT INTO public.standards
    ├─ Store file_content (base64) OR file_path
    └─ Set file_category, sector, metadata
    ↓
User clicks "Parse"
    ↓
POST /api/parse/standard/:standardId
    ↓
Find File (Multi-Strategy)
    ├─ Strategy 0: Check file_content in database (PREFERRED)
    ├─ Strategy 1: Check file_path in standards table
    ├─ Strategy 2: Check Requirements folder
    └─ Strategy 3: Filesystem search
    ↓
Read Document
    ├─ PDF → pdf-parse
    ├─ DOCX → mammoth
    └─ TXT → fs.readFile
    ↓
Extract Requirements (Multi-Parser Fallback)
    ├─ Try UniversalComplianceParser (handles all types)
    ├─ Fallback to SimpleShallParser (standards only)
    ├─ Fallback to ClauseAwareParser (with structure)
    └─ Fallback to RequirementExtractor (pattern-based)
    ↓
Map to Standardized Format
    ├─ clause (top-level, e.g., "8")
    ├─ subclause (full path, e.g., "8.5.1")
    ├─ paragraph (P1, P2, etc.)
    ├─ requirement_text
    ├─ confidence, keyword, intent
    └─ metadata (type, subtype, flags)
    ↓
Store in Database
    ├─ DELETE existing requirements (if force re-parse)
    ├─ INSERT INTO public.parsed_requirements
    ├─ Handle duplicates (ON CONFLICT)
    └─ Update standards.total_requirements
    ↓
QA Validation
    ├─ Check requirement counts (300-420 expected)
    ├─ Validate in-scope requirements
    ├─ Check clause distribution
    └─ Generate QA report
    ↓
Return Results
    ├─ requirementsCount
    ├─ qa report (PASS/WARN/FAIL)
    └─ metrics breakdown
```

### 2. Parser Selection Strategy

The system uses a **fallback chain** to ensure maximum compatibility:

1. **UniversalComplianceParser** (First Choice)
   - Handles Standards, Regulations, Customer Requirements
   - Auto-detects document type
   - Best for mixed document types

2. **SimpleShallParser** (Standards Fallback)
   - Sequential "shall" extraction
   - Maintains list integrity
   - Good for ISO/AS9100 standards

3. **ClauseAwareParser** (Structure-Aware Fallback)
   - Validates clause structure
   - Handles nested clauses
   - Good for complex standards

4. **RequirementExtractor** (Pattern-Based Fallback)
   - Pattern matching
   - Learning capabilities
   - Good for non-standard formats

5. **Basic Extraction** (Last Resort)
   - Simple keyword matching
   - Minimal structure
   - Ensures something is extracted

### 3. File Storage Strategy

The parser supports **multiple file storage strategies**:

1. **Database Blob Storage** (Preferred)
   - `standards.file_content` (base64-encoded)
   - Survives Railway redeploys
   - No filesystem dependencies
   - Preferred for production

2. **Filesystem Path** (Legacy)
   - `standards.file_path` (filesystem path)
   - Ephemeral on Railway
   - Used as fallback

3. **Requirements Folder** (Development)
   - `EDCAT AIP/Requirements/` directory
   - For local development
   - Recursive search

---

## 📊 Parser Capabilities

### Supported File Formats

1. **PDF Documents**
   - Uses `pdf-parse` library
   - Extracts text and page count
   - Handles multi-page documents
   - Preserves text structure

2. **Word Documents (DOCX/DOC)**
   - Uses `mammoth` library
   - Extracts raw text
   - Preserves paragraph structure
   - Handles formatted documents

3. **Plain Text (TXT)**
   - Direct UTF-8 reading
   - Preserves line breaks
   - Fastest parsing

### Document Type Support

1. **Standards** (ISO, AS9100, IATF, etc.)
   - Clause-based structure (4.1, 4.2, 8.5.1)
   - Hierarchical numbering
   - Section titles
   - List items within clauses

2. **Regulations** (FAA, EASA, etc.)
   - Section-based structure (21.137, 21.139)
   - Subsection notation (a), (b), (c)
   - Part and subpart organization
   - Regulatory-specific patterns

3. **Customer Requirements**
   - Custom numbering (SQ01, A1505, etc.)
   - Company-specific formats
   - Requirement titles
   - Flexible structure

### Extraction Features

1. **Requirement Identification**
   - Modal verb detection (shall, must, should, will)
   - Pattern recognition
   - Context-aware extraction
   - Confidence scoring

2. **Clause Assignment**
   - Automatic clause number detection
   - Context-based assignment
   - Hierarchy validation
   - Parent-child relationships

3. **List Handling**
   - Complete list extraction
   - Item preservation
   - Incomplete list detection
   - Nested list support

4. **Metadata Extraction**
   - Requirement type classification
   - Intent detection
   - Keyword extraction
   - Scope determination

### QA & Validation

1. **Requirement Count Validation**
   - Expected range: 300-420 for AS9100
   - Clause distribution checks
   - Type distribution analysis

2. **Scope Validation**
   - Clauses 1-3 should have zero requirements
   - In-scope vs out-of-scope tracking
   - Informative note detection

3. **Quality Metrics**
   - Confidence score distribution
   - Extraction success rate
   - Duplicate detection
   - Error rate tracking

---

## 🔌 API Endpoints

### Parse Endpoints

#### POST /api/parse/standard/:standardId
Parse a standard document to extract requirements.

**Request**:
- Path parameter: `standardId` (UUID)
- Query parameter: `force=true` (optional, force re-parse)

**Response**:
```json
{
  "success": true,
  "message": "Standard parsed successfully. 350 requirements extracted.",
  "standard": {
    "id": "uuid",
    "code": "AS9100D",
    "name": "AS9100 Rev D"
  },
  "requirementsCount": 350,
  "clausesExtracted": 350,
  "totalRequirements": 350,
  "qa": {
    "status": "PASS",
    "total_in_scope": 350,
    "total_out_scope": 0,
    "issues": [],
    "warnings": []
  },
  "metrics": {
    "byClause": [...],
    "byType": [...],
    "bySubtype": [...]
  },
  "parsedAt": "2024-12-02T16:00:00Z"
}
```

**Error Responses**:
- `404`: Standard not found
- `404`: File not found
- `422`: QA validation failed
- `500`: Parse error

#### GET /api/parse/status/:standardId
Get parsing status for a standard.

**Response**:
```json
{
  "success": true,
  "standardId": "uuid",
  "isParsed": true,
  "requirementsCount": 350,
  "message": "Standard has been parsed."
}
```

---

## 📁 Key File Locations

### Core Parsers
- `backend/src/services/universalComplianceParser.js` - Multi-format parser
- `backend/src/services/simpleShallParser.js` - Sequential "shall" extractor
- `backend/src/services/clauseAwareParser.js` - Clause-aware parser
- `backend/src/services/requirementParser.js` - Pattern-based extractor

### Routes
- `backend/src/routes/parse.js` - Parse API endpoints

### Services
- `backend/src/services/requirementsFormatter.js` - Formatting utilities
- `backend/src/services/metricsService.js` - Metrics calculation
- `backend/src/services/requirementClassifier.js` - Scope classification
- `backend/src/services/standardizedFormatExtractor.js` - Format standardization

### Database
- `migrations/001_postgres_customer_data.sql` - Customer Data DB schema
- `migrations/012_create_parsed_requirements_table.sql` - Parsed requirements table

---

## 🎯 Key Design Principles

1. **Multi-Parser Fallback**: Ensures extraction even if one parser fails
2. **Standardized Format**: All parsers output consistent structure
3. **Database-First Storage**: Prefers database blob storage over filesystem
4. **QA Validation**: Automatic quality checks after parsing
5. **Confidence Scoring**: Every requirement has a confidence score
6. **Metadata Preservation**: Rich metadata for downstream analysis
7. **Force Re-Parse**: Ability to re-parse and update requirements
8. **Duplicate Prevention**: Unique constraints prevent duplicate requirements

---

## 🔧 Environment Variables

```bash
# Customer Data DB (PostgreSQL)
DATABASE_URL=postgresql://user:pass@host:port/customer_data_db

# Optional: Process requirements on startup
PROCESS_REQUIREMENTS_ON_STARTUP=false
```

---

## 📊 Summary

The Document Parser is a robust, multi-format extraction system that:

- **Supports** PDF, DOCX, and TXT file formats
- **Handles** Standards, Regulations, and Customer Requirements
- **Uses** intelligent fallback parsing strategies
- **Stores** requirements in structured database format
- **Validates** extraction quality with QA checks
- **Provides** rich metadata for downstream analysis

The system is designed to be resilient, with multiple parsing strategies and storage options to ensure requirements are extracted successfully regardless of document format or deployment environment.

---

## 🔄 Recent Enhancements (2024-2025)

### Multi-Strategy File Finding
- **Added**: Database blob storage support (preferred)
- **Added**: Multi-database file lookup (Customer Data DB + EDCAT AI DB)
- **Added**: Requirements folder recursive search
- **Added**: Filesystem search fallback
- **Benefit**: Files survive Railway redeploys and are found reliably

### Universal Compliance Parser
- **Added**: Automatic document type detection
- **Added**: Support for Standards, Regulations, Customer Requirements
- **Added**: Type-specific parsing strategies
- **Benefit**: Single parser handles all document types

### Standardized Format
- **Added**: Consistent output format across all parsers
- **Added**: Clause/subclause/paragraph structure
- **Added**: Rich metadata fields
- **Benefit**: Downstream tools can rely on consistent structure

### QA Validation
- **Added**: Automatic quality checks after parsing
- **Added**: Requirement count validation (300-420 range)
- **Added**: Scope validation (clauses 1-3 should be empty)
- **Added**: Comprehensive metrics reporting
- **Benefit**: Catches parsing issues early

### Database Schema Enhancements
- **Added**: `clause_path_depth` for hierarchy tracking
- **Added**: `is_informative_note`, `is_recommendation`, `is_in_scope` flags
- **Added**: `aerospace_addition`, `requires_maintained_di`, `requires_retained_di` flags
- **Added**: `extraction_flags` JSONB for flexible metadata
- **Benefit**: Richer requirement classification and analysis

---

