/**
 * Ingestion Service
 * 
 * Handles document ingestion, text extraction, chunking, and embedding generation.
 * All operations are bounded to tenant-scoped documents and sources.
 */

import { query } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import DocumentParser from './parser.js';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Extract text from document using existing parser
 */
async function extractText(filePath, mimeType) {
  console.log(`[Ingestion] Extracting text from ${filePath} (${mimeType})`);
  
  try {
    const ext = path.extname(filePath).toLowerCase().slice(1);
    const parsed = await DocumentParser.parse(filePath, ext);
    return parsed.text || '';
  } catch (error) {
    console.error('[Ingestion] Error extracting text:', error);
    // Fallback to reading as text
    try {
      if (mimeType === 'text/plain' || filePath.endsWith('.txt')) {
        return fs.readFileSync(filePath, 'utf8');
      }
    } catch (fallbackError) {
      console.error('[Ingestion] Fallback extraction failed:', fallbackError);
    }
    return '';
  }
}

/**
 * Calculate file hash for deduplication
 */
function calculateFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

/**
 * Split text into chunks with overlap
 * @param {string} text - The text to chunk
 * @param {number} chunkSize - Target chunk size in characters
 * @param {number} overlap - Overlap size in characters
 * @returns {Array<{text: string, position: number, sectionLabel?: string}>}
 */
function chunkText(text, chunkSize = 2000, overlap = 200) {
  const chunks = [];
  let position = 0;
  let chunkIndex = 0;

  // Try to split on paragraphs first
  const paragraphs = text.split(/\n\s*\n/);
  
  let currentChunk = '';
  let currentSectionLabel = null;

  for (const para of paragraphs) {
    // Detect section headers (lines that are short and end with colon or are all caps)
    const isSectionHeader = para.length < 100 && (para.endsWith(':') || para === para.toUpperCase());
    
    if (isSectionHeader) {
      currentSectionLabel = para.trim();
    }

    // If adding this paragraph would exceed chunk size, finalize current chunk
    if (currentChunk.length + para.length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        position: chunkIndex++,
        sectionLabel: currentSectionLabel || null
      });
      
      // Start new chunk with overlap
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = overlapText + '\n\n' + para;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }

  // Add final chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      position: chunkIndex++,
      sectionLabel: currentSectionLabel || null
    });
  }

  return chunks;
}

/**
 * Ingest a document: extract text, chunk, and prepare for embedding
 * @param {Object} params
 * @param {string} params.documentId - UUID of the document record
 * @param {string} params.tenantId - UUID of the tenant (customer_id)
 * @param {string} params.filePath - Path to the document file
 * @param {string} params.mimeType - MIME type of the document
 * @param {string} params.docType - Document type: "qm", "procedure", "form", "wi", "spec", "standard_copy"
 * @param {Object} params.metadata - Additional metadata
 */
export async function ingestDocument({ documentId, tenantId, filePath, mimeType, docType = 'procedure', metadata = {} }) {
  try {
    console.log(`[Ingestion] Starting ingestion for document ${documentId}`);

    // 0. Calculate file hash for deduplication
    const fileHash = calculateFileHash(filePath);
    
    // Check for duplicate
    const duplicateCheck = await query(
      `SELECT id FROM documents WHERE file_hash = $1 AND customer_id = $2 AND is_deleted = FALSE`,
      [fileHash, tenantId]
    );
    
    if (duplicateCheck.rows.length > 0 && duplicateCheck.rows[0].id !== documentId) {
      console.warn(`[Ingestion] Duplicate file detected: ${fileHash}`);
      // Update document to reference existing
      await query(
        `UPDATE documents SET parse_status = 'duplicate', updated_at = NOW() WHERE id = $1`,
        [documentId]
      );
      return {
        success: true,
        documentId,
        duplicate: true,
        existingDocumentId: duplicateCheck.rows[0].id
      };
    }

    // 1. Extract text
    const extractedText = await extractText(filePath, mimeType);
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text extracted from document');
    }

    // 2. Update document record with extracted text and hash
    await query(
      `UPDATE documents 
       SET extracted_text = $1, 
           file_hash = $2,
           parse_status = 'extracted',
           updated_at = NOW()
       WHERE id = $3`,
      [extractedText, fileHash, documentId]
    );

    // 3. Chunk the text
    const chunks = chunkText(extractedText, 2000, 200);
    console.log(`[Ingestion] Created ${chunks.length} chunks for document ${documentId}`);

    // 4. Insert chunks into document_chunks
    const chunkIds = [];
    for (const chunk of chunks) {
      const chunkId = uuidv4();
      await query(
        `INSERT INTO document_chunks 
         (id, document_id, tenant_id, position, section_label, text, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          chunkId,
          documentId,
          tenantId,
          chunk.position,
          chunk.sectionLabel || null,
          chunk.text,
          JSON.stringify(metadata)
        ]
      );
      chunkIds.push({ id: chunkId, ...chunk });
    }

    // 5. Update document status
    await query(
      `UPDATE documents 
       SET parse_status = 'chunked',
           updated_at = NOW()
       WHERE id = $1`,
      [documentId]
    );

    // 6. Queue embedding generation (will be handled by embeddingService)
    // For now, return chunk IDs for immediate processing
    return {
      success: true,
      documentId,
      chunkCount: chunks.length,
      chunkIds: chunkIds.map(c => c.id)
    };

  } catch (error) {
    console.error('[Ingestion] Error ingesting document:', error);
    
    // Update document status to error
    await query(
      `UPDATE documents 
       SET parse_status = 'error',
           parse_error = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [error.message, documentId]
    );

    throw error;
  }
}

/**
 * Get ingestion status for a document
 */
export async function getIngestionStatus(documentId) {
  const result = await query(
    `SELECT 
       d.id,
       d.document_name,
       d.parse_status,
       d.parse_error,
       COUNT(dc.id) as chunk_count,
       COUNT(e.id) as embedding_count
     FROM documents d
     LEFT JOIN document_chunks dc ON dc.document_id = d.id
     LEFT JOIN embeddings e ON e.document_chunk_id = dc.id
     WHERE d.id = $1
     GROUP BY d.id, d.document_name, d.parse_status, d.parse_error`,
    [documentId]
  );

  return result.rows[0] || null;
}

export default {
  ingestDocument,
  getIngestionStatus
};

