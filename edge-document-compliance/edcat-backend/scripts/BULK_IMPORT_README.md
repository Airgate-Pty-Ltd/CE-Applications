# Bulk Import Guide

This script allows you to import large quantities of standards and documents into EDCAT efficiently, rather than uploading them one at a time through the UI.

## Quick Start

### Option 1: Import from Directory (Simplest)

**For Standards:**
```bash
npm run bulk-import -- --type=standards --source=/path/to/your/standards/folder
```

**For Documents:**
```bash
npm run bulk-import -- --type=documents --source=/path/to/your/documents/folder --customer-id=<customer-uuid>
```

### Option 2: Import from Manifest File (Recommended for Large Imports)

Create a JSON manifest file with all your standards and documents:

```json
{
  "standards": [
    {
      "name": "AS9100D",
      "code": "AS9100D",
      "version": "Rev D",
      "source_type": "standard",
      "description": "Quality Management Systems - Requirements for Aviation, Space and Defense Organizations",
      "file_path": "/full/path/to/as9100d.pdf"
    },
    {
      "name": "ISO 9001:2015",
      "code": "ISO-9001-2015",
      "version": "2015",
      "source_type": "standard",
      "description": "Quality management systems - Requirements",
      "file_path": "/full/path/to/iso9001-2015.pdf"
    }
  ],
  "documents": [
    {
      "customer_id": "your-customer-uuid-here",
      "document_name": "Quality Manual",
      "file_path": "/full/path/to/quality-manual.pdf",
      "doc_type": "qm",
      "assessment_id": "optional-assessment-uuid"
    },
    {
      "customer_id": "your-customer-uuid-here",
      "document_name": "Design Control Procedure",
      "file_path": "/full/path/to/design-control.pdf",
      "doc_type": "procedure"
    }
  ]
}
```

Then import:
```bash
npm run bulk-import -- --manifest=/path/to/manifest.json
```

## Features

- ✅ **Bulk Processing**: Import hundreds of files at once
- ✅ **Automatic Parsing**: Documents are automatically parsed and chunked
- ✅ **GAP Analysis Ready**: Documents are prepared for GAP analysis with embeddings
- ✅ **Duplicate Detection**: Standards are checked for duplicates before import
- ✅ **Dry Run Mode**: Test your import without making changes (`--dry-run`)
- ✅ **Progress Reporting**: See detailed progress and error reporting
- ✅ **Error Handling**: Continues processing even if individual files fail

## Command Options

| Option | Required | Description |
|--------|----------|-------------|
| `--manifest=<path>` | Yes* | Path to JSON manifest file |
| `--type=<type>` | Yes* | Type: `standards` or `documents` |
| `--source=<path>` | Yes* | Directory containing files to import |
| `--customer-id=<uuid>` | Yes** | Customer UUID (required for documents) |
| `--dry-run` | No | Test mode - no actual imports |

*Either `--manifest` OR (`--type` + `--source`) must be provided  
**Required when `--type=documents`

## Document Types

When importing documents, you can specify `doc_type`:
- `qm` - Quality Manual
- `procedure` - Procedure
- `form` - Form
- `wi` - Work Instruction
- `spec` - Specification
- `standard_copy` - Copy of a standard

## Examples

### Example 1: Import Standards from Folder
```bash
# All PDF files in the folder will be imported as standards
npm run bulk-import -- --type=standards --source=/Users/brian/Documents/Standards
```

### Example 2: Import Documents for a Customer
```bash
npm run bulk-import -- \
  --type=documents \
  --source=/Users/brian/Documents/QMS \
  --customer-id=123e4567-e89b-12d3-a456-426614174000
```

### Example 3: Dry Run to Test
```bash
npm run bulk-import -- \
  --manifest=/path/to/manifest.json \
  --dry-run
```

### Example 4: Full Import with Manifest
```bash
npm run bulk-import -- --manifest=/Users/brian/Documents/import-manifest.json
```

## Output

The script provides detailed output:
- ✓ Success indicators for each imported item
- ✗ Error messages for failed imports
- Summary statistics at the end
- Error list if any failures occurred

Example output:
```
🚀 EDCAT Bulk Import Tool
==========================

📋 Processing manifest: /path/to/manifest.json

📚 Importing 25 standard(s)...

  ✓ Created standard: AS9100D (abc123...)
    ✓ Uploaded document: as9100d.pdf (2.3 MB)
  ✓ Created standard: ISO 9001:2015 (def456...)
    ✓ Uploaded document: iso9001-2015.pdf (1.8 MB)
  ...

📄 Importing 50 document(s)...

  ✓ Imported document: Quality Manual (450.2 KB)
  ✓ Imported document: Design Control Procedure (320.5 KB)
  ...

==================================================
📊 Import Summary
==================================================
✓ Standards: 25/25
✓ Documents: 50/50
```

## Tips

1. **Use Manifest Files for Large Imports**: Manifest files give you more control and better error tracking
2. **Test First**: Always run with `--dry-run` first to verify your setup
3. **Check File Paths**: Ensure all file paths in manifests are absolute paths
4. **Customer ID**: You can find customer IDs in the database or through the API
5. **File Formats**: Supported formats: PDF, DOC, DOCX, TXT, XLS, XLSX
6. **File Size**: Individual files should be under 25MB (configurable)

## Troubleshooting

**Error: "customer_id is required"**
- Make sure you provide `--customer-id` when importing documents
- Or include `customer_id` in each document entry in the manifest

**Error: "Source directory does not exist"**
- Check that the path is correct
- Use absolute paths (full path from root)

**Error: "File not found"**
- In manifest files, use absolute paths
- Check file permissions

**Standards not showing up**
- Check that the standards table exists (run migrations)
- Verify the import completed successfully (check summary)

## Next Steps

After importing:
1. Standards will appear in the Compliance Intelligence module
2. Documents will be available in the Document Library
3. Documents are automatically parsed and ready for GAP analysis
4. You can view parsing results in the Compliance Intelligence module

