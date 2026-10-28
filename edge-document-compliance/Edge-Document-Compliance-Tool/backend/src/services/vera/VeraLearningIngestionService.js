/**
 * Vera Learning Ingestion Service
 * Handles learning from documents and websites, extracting knowledge into Q&A bank
 */

import { queryPostgres, queryEdcatAI } from '../../config/databases.js';
import { runVera } from '../../vera/veraEngine.js';
import VeraQueryResponseService from './VeraQueryResponseService.js';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

class VeraLearningIngestionService {
  /**
   * Learn from a customer document
   * @param {Object} options
   * @param {string} options.tenantId - Tenant ID
   * @param {string} options.documentId - Document ID from customer_documents
   * @param {string} options.userId - User ID who requested learning
   * @returns {Promise<Object>} Learning result
   */
  static async learnFromDocument({ tenantId = DEFAULT_TENANT_ID, documentId, userId = null }) {
    try {
      console.log(`[VeraLearningIngestionService] Learning from document: ${documentId}`);

      // 1. Load document from Customer Data DB
      const docResult = await queryPostgres(
        `SELECT 
          id,
          tenant_id,
          name,
          file_path,
          extracted_text,
          uploaded_at
         FROM customer_documents
         WHERE id = $1`,
        [documentId]
      );

      if (docResult.rows.length === 0) {
        throw new Error(`Document not found: ${documentId}`);
      }

      const document = docResult.rows[0];
      const extractedText = document.extracted_text || '';

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error(`Document has no extracted text. Please parse the document first.`);
      }

      // 2. Ensure document_content_for_learning entry exists
      const existingLearning = await queryEdcatAI(
        `SELECT id FROM edcat.document_content_for_learning 
         WHERE document_id = $1 
         LIMIT 1`,
        [documentId]
      );

      let learningId;
      if (existingLearning.rows.length > 0) {
        learningId = existingLearning.rows[0].id;
        // Update if needed
        await queryEdcatAI(
          `UPDATE edcat.document_content_for_learning
           SET content = $1,
               metadata = $2,
               updated_at = NOW()
           WHERE id = $3`,
          [
            extractedText,
            JSON.stringify({
              tenant_id: tenantId,
              document_name: document.name,
              source_type: 'customer_document',
              original_path: document.file_path,
              upload_timestamp: document.uploaded_at,
              document_id: documentId
            }),
            learningId
          ]
        );
      } else {
        // Insert new
        const insertResult = await queryEdcatAI(
          `INSERT INTO edcat.document_content_for_learning
           (document_id, content, metadata, created_at)
           VALUES ($1, $2, $3, NOW())
           RETURNING id`,
          [
            documentId,
            extractedText,
            JSON.stringify({
              tenant_id: tenantId,
              document_name: document.name,
              source_type: 'customer_document',
              original_path: document.file_path,
              upload_timestamp: document.uploaded_at,
              document_id: documentId
            })
          ]
        );
        learningId = insertResult.rows[0].id;
      }

      // Auto-index the customer document
      try {
        const VeraAutoIndexingService = (await import('./VeraAutoIndexingService.js')).default;
        await VeraAutoIndexingService.indexCustomerDocument({
          documentId,
          tenantId
        });
      } catch (indexError) {
        console.warn('[VeraLearningIngestionService] Could not auto-index document:', indexError.message);
      }

      // 3. Extract knowledge from text
      const knowledgeResult = await this.extractKnowledgeFromText({
        tenantId,
        sourceType: 'customer_document',
        sourceId: documentId,
        sourceName: document.name,
        text: extractedText,
        metadata: {
          document_id: documentId,
          document_name: document.name,
          file_path: document.file_path
        },
        userId
      });

      return {
        success: true,
        learning_id: learningId,
        document_id: documentId,
        qna_pairs_created: knowledgeResult.qnaPairsCreated || 0,
        message: `Learned from document "${document.name}". Created ${knowledgeResult.qnaPairsCreated || 0} Q&A entries.`
      };
    } catch (error) {
      console.error('[VeraLearningIngestionService] Error learning from document:', error);
      throw error;
    }
  }

  /**
   * Learn from a website URL
   * @param {Object} options
   * @param {string} options.tenantId - Tenant ID
   * @param {string} options.url - URL to learn from
   * @param {string} options.userId - User ID who requested learning
   * @returns {Promise<Object>} Learning result
   */
  /**
   * Normalize URL - handles partial addresses (faa.gov) and complete URLs
   * @param {string} url - URL to normalize
   * @returns {string} Normalized URL with protocol
   */
  static normalizeUrl(url) {
    if (!url || typeof url !== 'string') {
      throw new Error('URL must be a non-empty string');
    }

    // Trim whitespace
    url = url.trim();

    // If already has protocol, validate and return
    if (url.match(/^https?:\/\//i)) {
      return url;
    }

    // If starts with //, add https:
    if (url.startsWith('//')) {
      return `https:${url}`;
    }

    // If it looks like a domain (contains . but no protocol), add https://
    if (url.includes('.') && !url.includes('://') && !url.includes(' ')) {
      // Remove leading slashes if present
      url = url.replace(/^\/+/, '');
      return `https://${url}`;
    }

    // If it's a valid-looking domain pattern, add https://
    const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*(\.[a-zA-Z]{2,})(\/.*)?$/;
    if (domainPattern.test(url)) {
      return `https://${url}`;
    }

    // If we can't normalize it, throw error
    throw new Error(`Cannot normalize URL: ${url}. Please provide a complete URL (e.g., https://faa.gov) or a valid domain (e.g., faa.gov)`);
  }

  static async learnFromWebsite({ tenantId = DEFAULT_TENANT_ID, url, userId = null }) {
    try {
      console.log(`[VeraLearningIngestionService] Learning from URL: ${url}`);

      // 1. Normalize URL (handles partial addresses like "faa.gov")
      let normalizedUrl;
      try {
        normalizedUrl = this.normalizeUrl(url);
        console.log(`[VeraLearningIngestionService] Normalized URL: ${url} -> ${normalizedUrl}`);
      } catch (normalizeError) {
        throw new Error(`Invalid URL format: ${normalizeError.message}`);
      }

      // 2. Validate normalized URL
      let parsedUrl;
      try {
        parsedUrl = new URL(normalizedUrl);
      } catch (e) {
        throw new Error(`Invalid URL after normalization: ${normalizedUrl}`);
      }

      // Only allow http/https
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error(`Only HTTP and HTTPS URLs are allowed`);
      }

      // 3. Check if already learned (use normalized URL)
      const existing = await queryEdcatAI(
        `SELECT id, cleaned_text FROM edcat.website_content_for_learning
         WHERE url = $1 AND is_active = TRUE
         LIMIT 1`,
        [normalizedUrl]
      );

      let websiteId;
      let cleanedText;

      if (existing.rows.length > 0) {
        // Already learned - use existing
        websiteId = existing.rows[0].id;
        cleanedText = existing.rows[0].cleaned_text;
        console.log(`[VeraLearningIngestionService] URL already learned, using existing content`);
      } else {
        // 3. Fetch content (use normalized URL)
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(normalizedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Vera-AI/1.0; +https://conform-edge.com)'
          },
          timeout: 30000 // 30 second timeout
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || '';
        let rawHtml = null;
        let text = '';

        if (contentType.includes('text/html')) {
          rawHtml = await response.text();
          // Simple HTML cleaning - extract text content
          text = this.cleanHtmlText(rawHtml);
        } else if (contentType.includes('text/plain')) {
          text = await response.text();
        } else if (contentType.includes('application/pdf')) {
          // PDF handling - for now, return error suggesting to upload as document
          throw new Error(`PDF URLs are not supported. Please download the PDF and upload it as a document instead.`);
        } else {
          throw new Error(`Unsupported content type: ${contentType}`);
        }

        cleanedText = text.trim();

        if (cleanedText.length === 0) {
          throw new Error(`No text content could be extracted from URL`);
        }

        // 4. Detect authority from URL (use normalized URL)
        const authority = this.detectAuthorityFromUrl(normalizedUrl);

        // 5. Extract title from HTML or URL
        const title = this.extractTitle(rawHtml) || parsedUrl.hostname;

        // 6. Insert into website_content_for_learning (use normalized URL)
        const insertResult = await queryEdcatAI(
          `INSERT INTO edcat.website_content_for_learning
           (tenant_id, url, authority, raw_html, cleaned_text, metadata, created_by, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           RETURNING id`,
          [
            tenantId,
            normalizedUrl,
            authority,
            rawHtml,
            cleanedText,
            JSON.stringify({
              title,
              fetch_timestamp: new Date().toISOString(),
              content_type: contentType,
              source_type: 'website',
              hostname: parsedUrl.hostname,
              original_url: url, // Store original for reference
              normalized_url: normalizedUrl
            }),
            userId
          ]
        );
        websiteId = insertResult.rows[0].id;
        
        // Auto-index the new website content
        try {
          const VeraAutoIndexingService = (await import('./VeraAutoIndexingService.js')).default;
          await VeraAutoIndexingService.indexWebsiteContent({
            websiteId,
            tenantId
          });
        } catch (indexError) {
          console.warn('[VeraLearningIngestionService] Could not auto-index website content:', indexError.message);
        }
      }

      // 7. Extract knowledge from text
      const knowledgeResult = await this.extractKnowledgeFromText({
        tenantId,
        sourceType: 'website',
        sourceId: websiteId,
        sourceName: normalizedUrl,
        text: cleanedText,
        metadata: {
          url: normalizedUrl,
          original_url: url,
          authority: this.detectAuthorityFromUrl(normalizedUrl)
        },
        userId
      });

      return {
        success: true,
        learning_id: websiteId,
        url: normalizedUrl,
        original_url: url !== normalizedUrl ? url : undefined,
        qna_pairs_created: knowledgeResult.qnaPairsCreated || 0,
        message: `Learned from URL "${normalizedUrl}". Created ${knowledgeResult.qnaPairsCreated || 0} Q&A entries.`
      };
    } catch (error) {
      console.error('[VeraLearningIngestionService] Error learning from website:', error);
      throw error;
    }
  }

  /**
   * Extract knowledge from text and create Q&A entries
   * @param {Object} options
   * @param {string} options.tenantId - Tenant ID
   * @param {string} options.sourceType - 'customer_document' | 'website' | 'training'
   * @param {string} options.sourceId - Source ID (document_id or website_id)
   * @param {string} options.sourceName - Source name for context
   * @param {string} options.text - Text to extract knowledge from
   * @param {Object} options.metadata - Additional metadata
   * @param {string} options.userId - User ID
   * @returns {Promise<Object>} Extraction result
   */
  static async extractKnowledgeFromText({ tenantId, sourceType, sourceId, sourceName, text, metadata = {}, userId = null }) {
    try {
      console.log(`[VeraLearningIngestionService] Extracting knowledge from ${sourceType}: ${sourceName}`);

      // 1. Chunk text if very large (max ~50k characters per chunk)
      const maxChunkSize = 50000;
      const chunks = this.chunkText(text, maxChunkSize);

      let totalQnaPairs = 0;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkNumber = i + 1;
        const totalChunks = chunks.length;

        console.log(`[VeraLearningIngestionService] Processing chunk ${chunkNumber}/${totalChunks} (${chunk.length} chars)`);

        // 2. Call VERA_MODEL_ENDPOINT for knowledge extraction
        const systemPrompt = `You are Vera's offline learning process. You receive text from either an uploaded document or a website.

Your job is to extract:
- Key topics
- Definitions and explanations
- Important relationships
- Typical user questions that might be asked about this content
- High-quality, direct answers in Vera's voice (narrative, not bullet lists)

Return ONLY a valid JSON object with this exact structure:
{
  "qna_pairs": [
    {
      "category": "string (e.g., 'regulation_faa', 'training', 'procedure', 'compliance')",
      "user_query_pattern": "regex pattern for matching user queries",
      "representative_examples": ["example question 1", "example question 2"],
      "response_text": "Full narrative answer in Vera's voice (complete sentences, no bullet lists unless explicitly needed)",
      "learning_notes": {
        "source_type": "${sourceType}",
        "source_id": "${sourceId}",
        "source_name": "${sourceName}",
        "confidence": 0.0-1.0
      }
    }
  ]
}

Extract 5-15 high-quality Q&A pairs from this text. Focus on actionable, useful knowledge that users would actually ask about.`;

        const userMessage = `Extract knowledge from this ${sourceType} content:\n\n${chunk}`;

        try {
          const modelResponse = await runVera(
            [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage }
            ],
            {
              tenantId,
              userId,
              context: {
                sourceType,
                sourceId,
                sourceName
              }
            }
          );

          // 3. Parse JSON response
          let qnaData;
          try {
            // Extract JSON from response (might have markdown code blocks)
            const jsonMatch = modelResponse.answer.match(/```json\s*([\s\S]*?)\s*```/) || 
                             modelResponse.answer.match(/\{[\s\S]*\}/);
            const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : modelResponse.answer;
            qnaData = JSON.parse(jsonText);
          } catch (parseError) {
            console.warn(`[VeraLearningIngestionService] Failed to parse JSON from model response:`, parseError.message);
            console.warn(`[VeraLearningIngestionService] Response was:`, modelResponse.answer.substring(0, 500));
            continue; // Skip this chunk
          }

          // 4. Create Q&A entries
          if (qnaData.qna_pairs && Array.isArray(qnaData.qna_pairs)) {
            for (const qna of qnaData.qna_pairs) {
              try {
                await VeraQueryResponseService.createQueryResponseEntry({
                  tenantId,
                  personaCode: 'vera',
                  category: qna.category || 'general',
                  userQueryPattern: qna.user_query_pattern || '',
                  examples: qna.representative_examples || [],
                  responseText: qna.response_text || '',
                  learningNotes: {
                    ...qna.learning_notes,
                    ...metadata,
                    chunk_number: chunkNumber,
                    total_chunks: totalChunks
                  },
                  confidenceScore: qna.learning_notes?.confidence || 0.8,
                  userId
                });
                totalQnaPairs++;
              } catch (entryError) {
                console.error(`[VeraLearningIngestionService] Error creating Q&A entry:`, entryError.message);
              }
            }
          }
        } catch (modelError) {
          console.error(`[VeraLearningIngestionService] Error calling model for chunk ${chunkNumber}:`, modelError.message);
          // Continue with next chunk
        }
      }

      // 5. Log learning event
      try {
        await queryEdcatAI(
          `INSERT INTO edcat.edcat_learning_events
           (event_type, confidence_before, confidence_after, improvement, created_at)
           VALUES ($1, 0.0, 0.0, 0.0, NOW())`,
          [`knowledge_extraction_${sourceType}`]
        );
      } catch (logError) {
        console.warn(`[VeraLearningIngestionService] Could not log learning event:`, logError.message);
      }

      console.log(`[VeraLearningIngestionService] Extraction complete: ${totalQnaPairs} Q&A pairs created`);

      return {
        success: true,
        qnaPairsCreated: totalQnaPairs,
        chunksProcessed: chunks.length
      };
    } catch (error) {
      console.error('[VeraLearningIngestionService] Error extracting knowledge:', error);
      throw error;
    }
  }

  /**
   * Chunk text into manageable pieces
   */
  static chunkText(text, maxSize) {
    if (text.length <= maxSize) {
      return [text];
    }

    const chunks = [];
    let currentChunk = '';
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Clean HTML and extract text content
   */
  static cleanHtmlText(html) {
    // Remove script and style tags
    let cleaned = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // Remove HTML tags
    cleaned = cleaned.replace(/<[^>]+>/g, ' ');
    
    // Decode HTML entities
    cleaned = cleaned.replace(/&nbsp;/g, ' ');
    cleaned = cleaned.replace(/&amp;/g, '&');
    cleaned = cleaned.replace(/&lt;/g, '<');
    cleaned = cleaned.replace(/&gt;/g, '>');
    cleaned = cleaned.replace(/&quot;/g, '"');
    cleaned = cleaned.replace(/&#39;/g, "'");
    
    // Clean up whitespace
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.trim();
    
    return cleaned;
  }

  /**
   * Extract title from HTML
   */
  static extractTitle(html) {
    if (!html) return null;
    
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      return titleMatch[1].trim();
    }
    
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match) {
      return h1Match[1].trim();
    }
    
    return null;
  }

  /**
   * Detect regulatory authority from URL
   */
  static detectAuthorityFromUrl(url) {
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('faa.gov') || urlLower.includes('faa')) return 'FAA';
    if (urlLower.includes('easa.europa.eu') || urlLower.includes('easa')) return 'EASA';
    if (urlLower.includes('caac.gov.cn') || urlLower.includes('caac')) return 'CAAC';
    if (urlLower.includes('casa.gov.au') || urlLower.includes('casa')) return 'CASA';
    if (urlLower.includes('fda.gov') || urlLower.includes('fda')) return 'FDA';
    if (urlLower.includes('iso.org')) return 'ISO';
    if (urlLower.includes('saemobilus.sae.org') || urlLower.includes('sae')) return 'SAE';
    if (urlLower.includes('ukcaa.gov.uk') || urlLower.includes('ukcaa')) return 'UK CAA';
    if (urlLower.includes('ecfr.gov')) return 'ECFR';
    
    return null; // Unknown authority
  }

  /**
   * Detect URLs in text (for proactive learning suggestions)
   * @param {string} text - Text to search for URLs
   * @returns {Array<string>} Array of detected URLs
   */
  static detectUrlsInText(text) {
    if (!text || typeof text !== 'string') return [];

    const urls = [];
    
    // Pattern 1: Full URLs (http://, https://)
    const fullUrlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
    const fullMatches = text.match(fullUrlPattern);
    if (fullMatches) {
      urls.push(...fullMatches);
    }

    // Pattern 2: Domain-like patterns (faa.gov, easa.europa.eu, etc.)
    // Match domains that look like regulatory sites
    const domainPattern = /\b([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.(gov|edu|org|eu|au|cn|uk)(\.[a-z]{2,})?(\/[^\s<>"{}|\\^`\[\]]*)?)\b/gi;
    const domainMatches = text.match(domainPattern);
    if (domainMatches) {
      // Filter to known regulatory domains
      const regulatoryDomains = [
        'faa.gov', 'easa.europa.eu', 'caac.gov.cn', 'casa.gov.au',
        'fda.gov', 'iso.org', 'saemobilus.sae.org', 'ukcaa.gov.uk',
        'ecfr.gov', 'nasa.gov', 'faa.com'
      ];
      
      domainMatches.forEach(match => {
        const normalized = this.normalizeUrl(match).toLowerCase();
        if (regulatoryDomains.some(domain => normalized.includes(domain))) {
          // Only add if not already in urls array
          if (!urls.some(url => url.toLowerCase().includes(match.toLowerCase()))) {
            try {
              urls.push(this.normalizeUrl(match));
            } catch (e) {
              // Skip if normalization fails
            }
          }
        }
      });
    }

    // Remove duplicates
    return [...new Set(urls)];
  }
}

export default VeraLearningIngestionService;

