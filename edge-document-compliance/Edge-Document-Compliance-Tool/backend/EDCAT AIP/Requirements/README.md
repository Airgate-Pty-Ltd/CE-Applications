# Requirements Folder

This folder contains documents that Vera can automatically process, learn from, and use for document generation.

## Folder Structure

```
Requirements/
├── Standards/        # Standard documents (ISO 9001, AS9100, etc.)
├── Regulatory/       # Regulatory documents (FAA, FDA, etc.)
├── Customer/         # Customer-specific documents
└── Examples/         # Good example documents for learning
```

## How It Works

1. **Place your documents** in the appropriate folder
2. **Run the processing script**: `node backend/src/scripts/process-requirements-folder.js`
3. **Documents are automatically**:
   - Uploaded to EDCAT
   - Text extracted
   - Stored in database
   - Available for parsing and learning

## Examples Folder

The `Examples/` folder is special - documents here are marked as "good examples" that Vera can learn from when generating new documents.

### Recommended Structure for Examples

```
Examples/
├── ISO9001/
│   ├── Procedures/
│   │   ├── Document_Control_Procedure.pdf
│   │   ├── Internal_Audit_Procedure.pdf
│   │   └── ...
│   ├── Work_Instructions/
│   │   └── ...
│   └── Forms/
│       └── ...
├── AS9100/
│   ├── Procedures/
│   │   ├── Configuration_Management_Procedure.pdf
│   │   ├── First_Article_Inspection_Procedure.pdf
│   │   └── ...
│   └── ...
└── ISO13485/
    └── ...
```

## Supported File Formats

- PDF (`.pdf`)
- Word Documents (`.docx`, `.doc`)
- Excel Spreadsheets (`.xlsx`, `.xls`)
- Text Files (`.txt`)

## Processing

### Automatic Processing
Run the processing script to scan all folders:
```bash
cd backend
node src/scripts/process-requirements-folder.js
```

### What Happens
1. Documents are scanned from all folders
2. Text is extracted from each document
3. Documents are uploaded to EDCAT database
4. Example documents are marked for learning
5. Document content is stored for Vera to reference

### Example Documents
Documents in the `Examples/` folder are:
- Marked as "good examples" in the database
- Used by Vera when generating new documents
- Analyzed for structure patterns
- Referenced when drafting procedures

## Using with Vera

Once documents are processed, you can ask Vera:
- "Generate a procedure for clause 8.7 based on your examples"
- "What structure should I use for an AS9100 procedure?"
- "Show me examples of good ISO 9001 procedures"

Vera will reference the example documents to provide guidance and generate similar documents.

## Tips

1. **Organize by standard**: Create subfolders by standard (ISO9001, AS9100, etc.)
2. **Use descriptive names**: File names help Vera understand the content
3. **Include good examples**: The more good examples, the better Vera can learn
4. **Update regularly**: Re-run the processing script when you add new documents

## Notes

- Documents are stored in the database (not the filesystem) for Railway compatibility
- Processing is idempotent - safe to run multiple times
- Example documents are prioritized when Vera generates new documents
- Document content is indexed for fast searching

