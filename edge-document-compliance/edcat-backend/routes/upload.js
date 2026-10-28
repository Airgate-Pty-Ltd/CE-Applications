import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Document, ParsedContent, AuditAnalytics } from '../models/index.js';
import DocumentParser from '../services/parser.js';
import RequirementExtractor from '../services/nlp.js';
import ingestionService from '../services/ingestionService.js';
import embeddingService from '../services/embeddingService.js';

const router = express.Router();

const uploadDir = path.join(process.cwd(), 'edcat-backend', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({ storage });

router.post('/', upload.single('file'), async (req, res) => {
  let documentRecord = null;

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'File required' });
    }

    const { customer_id, assessment_id } = req.body;
    if (!customer_id) {
      return res.status(400).json({ success: false, error: 'customer_id is required' });
    }

    const documentName = req.body.document_name || req.file.originalname;
    
    documentRecord = await Document.create({
      customer_id,
      assessment_id: assessment_id || null,
      document_name: documentName,
      document_type: path.extname(req.file.originalname).slice(1) || null,
      file_path: req.file.path,
      file_size: req.file.size,
      uploaded_by: req.body.uploaded_by || 'system'
    });

    const parsed = await DocumentParser.parse(req.file.path, documentRecord.document_type);
    const text = parsed.text || '';

    await ParsedContent.insert(documentRecord.id, DocumentParser.chunkText(text));
    documentRecord = await Document.updateParseStatus(documentRecord.id, 'complete', text, null);

    // Also ingest for GAP analysis (chunking and embedding preparation)
    try {
      const mimeType = req.file.mimetype || `application/${documentRecord.document_type || 'octet-stream'}`;
      const ingestionResult = await ingestionService.ingestDocument({
        documentId: documentRecord.id,
        tenantId: customer_id, // customer_id acts as tenant_id
        filePath: req.file.path,
        mimeType,
        docType: req.body.doc_type || 'procedure',
        metadata: {
          assessment_id: assessment_id || null,
          uploaded_by: req.body.uploaded_by || 'system'
        }
      });

      // Queue embedding generation for chunks
      if (ingestionResult.chunkIds && ingestionResult.chunkIds.length > 0) {
        // Generate embeddings asynchronously (don't block response)
        embeddingService.generateForChunks(ingestionResult.chunkIds).catch(err => {
          console.error('[Upload] Error generating embeddings:', err);
        });
      }
    } catch (ingestionError) {
      // Log but don't fail the upload if GAP ingestion fails
      console.warn('[Upload] GAP ingestion warning:', ingestionError.message);
    }

    const extractor = new RequirementExtractor();
    const extractedRequirements = extractor.extract(text);

    await AuditAnalytics.log({
      assessment_id: assessment_id || null,
      customer_id,
      actor: req.body.uploaded_by || 'system',
      action: 'document_uploaded',
      details: {
        document_name: documentRecord.document_name,
        document_type: documentRecord.document_type,
        file_size: documentRecord.file_size,
        extracted_requirements: extractedRequirements.length
      }
    });

    res.status(201).json({
      success: true,
      document: documentRecord,
      extractedRequirements
    });
  } catch (error) {
    console.error('Upload error:', error);
    if (documentRecord) {
      await Document.updateParseStatus(documentRecord.id, 'error', null, error.message);
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
