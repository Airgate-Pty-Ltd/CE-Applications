# EDCAT Administrator Database Architecture

## Overview

The EDCAT Administrator tool uses a **multi-schema architecture** to separate:
1. **Compliance Library** (shared across all customers) - Standards, Regulations, Customer Requirements
2. **Customer Data** (isolated per customer + revision) - Customer documents, procedures, analyses

## Database Structure

### Public Schema (Compliance Library - Shared)

All compliance library files are stored in the `public` schema:

- **`compliance_standards`** - Standards, Regulations, Customer Requirements
  - `file_category`: 'standard', 'regulatory', 'customer_requirement'
  - `file_path`: Path to uploaded document
  - Shared across all customers

- **`compliance_requirements`** - Individual clauses from standards
  - References `compliance_standards`
  - Extracted requirements from uploaded compliance documents

- **`extraction_history`** - Track AI model confidence improvements
- **`model_versions`** - Track AI model versions and improvements
- **`regulatory_websites`** - Regulatory source websites

### Customer Schemas (Per Customer + Revision)

Each customer gets a dedicated schema: `customer_{customerId}_{revision}`

Example: `customer_ACME_v1`, `customer_ACME_v2`, `customer_BOEING_rev2024`

**Tables in each customer schema:**

- **`documents`** - Customer's uploaded documents (Quality Manuals, SOPs, etc.)
- **`procedures`** - Procedures extracted from customer documents
- **`gap_analyses`** - Gap analysis results comparing customer docs vs compliance library
- **`requirement_mappings`** - Which customer procedures cover which compliance requirements
- **`analysis_clarifications`** - AI questions and user responses during analysis
- **`ai_learning_traces`** - AI learning traces (where the AI "lives")
- **`ai_learning_feedback`** - User feedback on AI analysis
- **`ai_learning_tuning`** - AI tuning parameters per standard/clause

### Customer Registry

**`public.customers`** - Registry of all customers and their schemas
- Composite primary key: `(customer_id, revision)`
- Stores: customer metadata, schema name, status

## File Upload Flow

### Compliance Library Files (Standards/Regulations/Customer Requirements)

**Endpoint:** `POST /api/upload`
**Body:**
```json
{
  "type": "standards" | "regulatory" | "customer_requirement",
  "standardCode": "ISO9001",
  "standardName": "ISO 9001:2015",
  "sector": "Aerospace"
}
```

**Storage:**
- File saved to: `uploads/{type}/{filename}`
- Metadata saved to: `public.compliance_standards`
- `file_category` set based on `type`

### Customer Documents

**Endpoint:** `POST /api/upload`
**Body:**
```json
{
  "type": "documents",
  "customerId": "ACME",
  "revision": "v1" | "rev2024" | "version2",
  "customerName": "ACME Corp"
}
```

**Storage:**
- File saved to: `uploads/documents/{filename}`
- Metadata saved to: `customer_{customerId}_{revision}.documents`
- Requires customer to exist first (created via `/api/customers`)

## Customer Creation Flow

**Endpoint:** `POST /api/customers`
**Body:**
```json
{
  "customerId": "ACME",
  "customerName": "ACME Corporation",
  "revision": "v1",
  "companyName": "ACME Corp",
  "contactEmail": "contact@acme.com"
}
```

**What Happens:**
1. Creates schema: `customer_ACME_v1`
2. Creates all customer tables in that schema
3. Registers customer in `public.customers` table

**Multiple Revisions:**
- Same customer can have multiple revisions
- Each revision gets its own schema
- Example: `customer_ACME_v1`, `customer_ACME_v2`, `customer_ACME_rev2024`

## Gap Analysis Flow

1. **Select Customer** → Loads customer schema: `customer_{customerId}_{revision}`
2. **Select Standard** → Loads from `public.compliance_standards`
3. **Run Analysis** → Compares:
   - Customer documents (`customer_{id}_{rev}.documents`)
   - Compliance requirements (`public.compliance_requirements`)
4. **Store Results** → Saves to:
   - `customer_{id}_{rev}.gap_analyses` (analysis summary)
   - `customer_{id}_{rev}.requirement_mappings` (coverage details)
   - `customer_{id}_{rev}.analysis_clarifications` (AI questions/responses)

## AI Learning

The AI learning system stores data in each customer schema:

- **`ai_learning_traces`** - Full trace of AI analysis process
- **`ai_learning_feedback`** - User feedback on AI performance
- **`ai_learning_tuning`** - Tuned parameters per standard/clause

This allows the AI to learn from each customer's specific context while maintaining isolation between customers.

## Key Benefits

1. **Data Isolation** - Each customer's data is completely isolated
2. **Version Control** - Multiple revisions of same customer supported
3. **Shared Knowledge** - Compliance library shared efficiently
4. **Scalability** - Easy to add new customers without affecting others
5. **AI Learning** - Per-customer AI learning without cross-contamination

## Migration Notes

- The old `customer_documents`, `customer_procedures`, etc. tables in `public` schema are legacy
- New customers should use the schema-per-customer approach
- Old customers can be migrated by creating a schema and moving data
