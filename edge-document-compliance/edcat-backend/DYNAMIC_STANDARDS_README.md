# Dynamic Standards Ingestion Engine - User Guide

## Overview

The Dynamic Standards Ingestion Engine enables EDCAT to learn from unlimited standards documents without code changes. It automatically extracts clauses, generates GAP profiles, and makes them available for GAP analysis.

## Features

✅ **Unlimited Standards** - Add any standard without code changes  
✅ **60+ Regulators** - Auto-crawl from official websites  
✅ **Dynamic GAP Profiles** - Generated automatically from requirements  
✅ **Customer Requirements** - Support for OEM/Customer requirements  
✅ **Multi-tenant Ready** - Tenant isolation built-in  
✅ **Audit Trails** - Every action logged  

## Quick Start

### 1. Upload a Standard Document

1. Navigate to **Compliance Intelligence** → **Dynamic Standards** tab
2. Fill in the form:
   - **Standard Code**: e.g., `FAA_Part_21`, `AS9100D`
   - **Standard Name**: e.g., `FAA Part 21 - Certification Procedures`
   - **Source Type**: Select from Standard, Regulation, Guidance, Policy, or Customer Requirement
   - **Regulator** (Optional): Select from available regulatory sources
   - **Document File**: Upload PDF, DOCX, TXT, or HTML file (max 50MB)
3. Click **Upload & Ingest Standard**
4. Wait for processing (typically 10-30 seconds)
5. View results in the standards list

### 2. View Ingested Standards

- All ingested standards appear in the **Ingested Standards** table
- Use **Search** to find specific standards
- Use **Filter** to show only certain source types
- Click **View Clauses** to see extracted clauses and GAP profiles

### 3. Crawl Regulatory Sources

1. Scroll to **Regulatory Source Crawler** section
2. Find the regulator you want to crawl (e.g., FAA, EASA, FDA)
3. Click **Start Crawl**
4. The crawl runs in the background - check server logs for progress
5. Ingested documents will appear in the standards list

## Supported Document Formats

- **PDF** (.pdf) - Full support with text extraction
- **Word Documents** (.docx) - Full support
- **Text Files** (.txt) - Full support
- **HTML** (.html) - Basic support (tags stripped)

## Clause Detection Formats

The engine automatically detects clauses in multiple formats:

### ISO/AS Standards
- Pattern: `4.1`, `8.5.1.2.c`
- Example: `4.1 The organization shall establish...`

### CFR Regulations (FAA, etc.)
- Pattern: `21.137`, `21.137(a)`, `21.137(a)(2)`
- Normalized: `21.137.a.2`
- Example: `21.137(a) Each applicant shall...`

### NIST Controls
- Pattern: `AC-3`, `CM-2`
- Example: `AC-3 Access Enforcement`

### Customer Requirements
- Pattern: `REQ-001`, `ASR-2023-001`, `Section 3.2.1`
- Example: `REQ-001 All parts shall be traceable...`

## GAP Profile Generation

Each extracted clause automatically generates a GAP profile with:

- **Interpretation**: Plain-language meaning of the requirement
- **Expected Evidence**: What proof looks like
- **Expected Documents**: Document types that should exist
- **Audit Questions**: Objective evidence questions
- **Common Pitfalls**: Typical failure patterns
- **Risk Level**: High, Medium, or Low

## API Usage

### Upload Standard

```bash
curl -X POST http://localhost:5000/api/dynamic-standards/ingest \
  -F "file=@/path/to/standard.pdf" \
  -F "standardCode=FAA_Part_21" \
  -F "standardName=FAA Part 21" \
  -F "sourceType=regulation" \
  -F "regulatorId=<regulator-uuid>"
```

### List Standards

```bash
curl http://localhost:5000/api/dynamic-standards/list
```

### Get Clauses

```bash
curl http://localhost:5000/api/dynamic-standards/<standard-id>/clauses
```

### Get GAP Profiles

```bash
curl http://localhost:5000/api/dynamic-standards/<standard-id>/profiles
```

### Start Regulatory Crawl

```bash
curl -X POST http://localhost:5000/api/dynamic-standards/crawl/faa
```

## Customer Requirements

### Upload Customer Requirement

1. Navigate to **Compliance Intelligence** → **OEM/Customer** tab
2. Or use the **Dynamic Standards** tab with **Source Type** = "Customer Requirement"
3. Fill in customer information and upload document
4. The system will extract requirements using customer-specific patterns

### API for Customer Requirements

```bash
curl -X POST http://localhost:5000/api/customer-requirements/ingest \
  -F "file=@/path/to/requirement.pdf" \
  -F "customerId=<customer-uuid>" \
  -F "customerName=Boeing" \
  -F "requirementCode=ASR-2023-001" \
  -F "requirementName=Supplier Quality Requirements" \
  -F "oemName=Boeing"
```

## Troubleshooting

### Upload Fails

- Check file size (max 50MB)
- Verify file format is supported
- Check server logs for detailed error messages

### No Clauses Detected

- Ensure document has clear clause numbering
- Check if document format matches supported patterns
- Try manual review flag in database

### Crawl Not Working

- Verify regulator is marked as "Supported"
- Check network connectivity to regulatory website
- Review server logs for crawl errors
- Some regulators may require authentication

## Database Schema

All ingested standards are stored in:
- `standards` - Main standard records
- `clauses` - Extracted clauses
- `gap_profiles` - Auto-generated GAP profiles
- `regulatory_sources` - Regulatory source configurations
- `standards_ingestion_log` - Audit trail

## Best Practices

1. **Naming Conventions**: Use consistent standard codes (e.g., `FAA_Part_21`, not `FAA Part 21`)
2. **File Preparation**: Ensure documents are clean and well-formatted
3. **Review Generated Profiles**: Auto-generated profiles should be reviewed for accuracy
4. **Regular Crawls**: Set up scheduled crawls for regulatory sources
5. **Version Control**: Use version labels when uploading updated standards

## Support

For issues or questions:
1. Check server logs for detailed error messages
2. Review the ingestion log table in database
3. Verify database schema is up to date
4. Contact Conform-Edge support

---

© 2025 Conform-Edge Quality Consulting. All rights reserved.

