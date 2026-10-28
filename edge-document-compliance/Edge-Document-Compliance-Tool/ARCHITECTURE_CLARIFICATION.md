# Architecture Clarification

## Correct Architecture

### PostgreSQL (Customer Data DB)
**Purpose**: Compliance Library, Client Data, Standards Management
- `standards` - Master list of all compliance standards
- `standard_files` - Uploaded PDF/DOCX files
- `parsed_requirements` - Extracted requirements from standards
- `customer_documents` - Client documents
- `gap_analyses` - Analysis results
- `users`, `tenants` - User management

**Who Uses It:**
- EDCAT Administrator (Compliance Library)
- File uploads
- Requirement parsing
- Client data management

### EDCAT AI DB
**Purpose**: Vera AI Operations, Learning, AI Models
- `ai_*` tables - Vera conversational AI system
- `document_content_for_learning` - Text for Vera to learn from
- `example_documents` - Example documents for learning
- `learned_patterns` - Patterns Vera has learned
- `edcat_learning_events` - Learning feedback
- `model_versions` - AI model versions

**Who Uses It:**
- Vera AI (read/write)
- Learning system (read/write)
- AI model training (read/write)

## Data Flow

### Standards Data Flow
1. **Upload** → PostgreSQL (`standards`, `standard_files`)
2. **Parse** → PostgreSQL (`parsed_requirements`)
3. **Vera Access** → Needs to READ from PostgreSQL (or sync to EDCAT AI DB)

### Options for Vera to Access Standards

#### Option 1: Direct Read from PostgreSQL (Recommended)
- Vera queries PostgreSQL directly for standards/requirements
- No sync needed
- Single source of truth maintained
- Vera can still write learning data to EDCAT AI DB

#### Option 2: Sync PostgreSQL → EDCAT AI DB
- Create sync mechanism to copy standards/requirements to EDCAT AI DB
- Vera reads from EDCAT AI DB
- More complex, but keeps databases isolated

#### Option 3: Foreign Data Wrapper / Views
- Create views in EDCAT AI DB that query PostgreSQL
- Vera reads from views (appears local)
- PostgreSQL remains source of truth

## Current State

After recent changes:
- ✅ Duplicate tables removed from EDCAT AI DB
- ✅ All code uses PostgreSQL for standards operations
- ⚠️  Need to ensure Vera can access standards data

## Next Steps

1. Verify Vera's data access needs
2. Implement appropriate solution (direct read, sync, or views)
3. Update Vera code to use correct database connections

