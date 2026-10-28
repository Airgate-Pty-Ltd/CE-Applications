# Requirements Folder - Quick Start Guide

## 📁 Folder Location

Your Requirements folder is located at:
```
C:\Users\oleab\OneDrive\Conform-Edge\EDCAT-Administrator\backend\EDCAT AIP\Requirements\
```

## 🗂️ Folder Structure

```
Requirements/
├── Standards/        # Standard documents (ISO 9001, AS9100, ISO 13485, etc.)
├── Regulatory/       # Regulatory documents (FAA, FDA, EASA, etc.)
├── Customer/         # Customer-specific documents
└── Examples/         # ⭐ GOOD EXAMPLE documents for Vera to learn from
```

## 🚀 How to Use

### Step 1: Add Your Documents

Simply copy your documents into the appropriate folders:

- **Standards/** → Standard documents (PDFs, Word docs, etc.)
- **Regulatory/** → Regulatory documents
- **Customer/** → Customer documents
- **Examples/** → **Your good example documents** (this is the key folder!)

### Step 2: Process the Documents

Run the processing script:
```bash
cd backend
node src/scripts/process-requirements-folder.js
```

This will:
- ✅ Scan all folders
- ✅ Extract text from documents
- ✅ Upload to EDCAT database
- ✅ Mark Examples folder documents as "good examples"
- ✅ Store content for Vera to learn from

### Step 3: Use with Vera

Once processed, ask Vera:
- "Generate a procedure for clause 8.7 based on your examples"
- "What structure should I use for an AS9100 procedure?"
- "Show me examples of good ISO 9001 procedures"

## ⭐ Examples Folder - The Key to Learning

The **Examples/** folder is special. Documents here are used by Vera to learn what "good documents" look like.

### Recommended Structure

For best results, organize your examples like this:

```
Examples/
├── ISO9001/
│   ├── Procedures/
│   │   ├── Document_Control_Procedure.pdf
│   │   ├── Internal_Audit_Procedure.pdf
│   │   ├── Management_Review_Procedure.pdf
│   │   └── ...
│   ├── Work_Instructions/
│   │   └── ...
│   └── Forms/
│       └── ...
├── AS9100/
│   ├── Procedures/
│   │   ├── Configuration_Management_Procedure.pdf
│   │   ├── First_Article_Inspection_Procedure.pdf
│   │   ├── Counterfeit_Parts_Prevention_Procedure.pdf
│   │   └── ...
│   └── ...
└── ISO13485/
    └── ...
```

### Why Examples Matter

When you ask Vera to generate a document, she will:
1. Look at your example documents
2. Analyze their structure
3. Extract common patterns
4. Generate a similar document that follows best practices

**The more good examples you provide, the better Vera can generate documents!**

## 📋 Supported File Formats

- ✅ PDF (`.pdf`)
- ✅ Word Documents (`.docx`, `.doc`)
- ✅ Excel Spreadsheets (`.xlsx`, `.xls`)
- ✅ Text Files (`.txt`)

## 🔄 Processing Workflow

1. **Add documents** to folders
2. **Run processing script** (can run multiple times safely)
3. **Documents are available** in EDCAT
4. **Example documents** are marked for learning
5. **Vera can reference** them when generating documents

## 💡 Tips

1. **Use descriptive filenames**: Help Vera understand the content
   - Good: `Document_Control_Procedure_ISO9001.pdf`
   - Bad: `doc1.pdf`

2. **Organize by standard**: Create subfolders in Examples/ by standard
   - `Examples/ISO9001/Procedures/`
   - `Examples/AS9100/Procedures/`

3. **Include variety**: Add different types of documents
   - Procedures
   - Work Instructions
   - Forms
   - Checklists

4. **Update regularly**: Re-run the processing script when you add new documents

## 🎯 Example Use Cases

### Use Case 1: Generate Procedure from Examples
**You**: "Generate a procedure for AS9100 clause 8.5.3 (Configuration Management)"

**Vera**: 
- Looks at your Examples/AS9100/Procedures/ folder
- Finds similar procedures
- Analyzes structure
- Generates a new procedure following the same patterns

### Use Case 2: Learn Document Structure
**You**: "What structure should I use for an ISO 9001 procedure?"

**Vera**:
- Analyzes your Examples/ISO9001/Procedures/ documents
- Identifies common sections
- Provides structure recommendations

### Use Case 3: Find Best Examples
**You**: "Show me a good example of a document control procedure"

**Vera**:
- Searches your example documents
- Finds relevant examples
- Shows you the structure and key elements

## 🔍 What Happens Behind the Scenes

1. **Text Extraction**: Documents are parsed and text is extracted
2. **Database Storage**: Documents are stored in EDCAT database
3. **Example Marking**: Documents in Examples/ are marked as learning examples
4. **Pattern Analysis**: Vera analyzes structure patterns from examples
5. **Content Indexing**: Document content is indexed for fast searching
6. **Learning Integration**: Examples are used when generating new documents

## 📊 Processing Results

After running the processing script, you'll see:
- Number of documents processed per folder
- Any errors encountered
- Summary of total files processed

## 🛠️ Troubleshooting

**Problem**: Documents not processing
- **Solution**: Check file format (must be PDF, DOCX, XLSX, or TXT)
- **Solution**: Check file size (max 100MB)

**Problem**: Examples not being used
- **Solution**: Make sure documents are in Examples/ folder
- **Solution**: Re-run processing script

**Problem**: Vera not finding examples
- **Solution**: Check that standard code matches (ISO9001, AS9100, etc.)
- **Solution**: Verify documents were processed successfully

## 📝 Next Steps

1. **Add your documents** to the Requirements folders
2. **Run the processing script**
3. **Test with Vera**: Ask her to generate documents based on examples
4. **Refine**: Add more examples to improve Vera's learning

---

**Ready to get started?** Just add your documents and run the processing script!

