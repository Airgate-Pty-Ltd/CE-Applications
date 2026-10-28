# Known Issues

## PDF Parsing Temporarily Disabled

**Issue**: The `pdf-parse` library has compatibility issues with Railway's Node.js environment, causing the application to crash on startup.

**Error**: `TypeError: process.getBuiltinModule is not a function` and polyfill warnings for DOMMatrix, ImageData, and Path2D.

**Current Solution**: PDF parsing has been temporarily disabled. PDF files can still be uploaded and stored, but text extraction is not performed.

**Impact**:
- PDF uploads work, but content is not analyzed
- Gap analysis will not work for PDF standards or documents
- DOCX files continue to work normally via the `mammoth` library

**Future Fix**: We plan to implement one of these solutions:
1. Use `pdf2json` or `pdf-lib` which have better Node.js compatibility
2. Use a microservice architecture for PDF processing
3. Use Railway's native Canvas support with pdfjs-dist
4. Process PDFs client-side and upload extracted text

**Workaround**: For now, please use DOCX format for standards and documents that need to be analyzed.

---

Last updated: 2025-11-07
