/**
 * Vera Multimodal Extractor
 * 
 * Extracts tables, images, and structured data from PDFs
 * Stores in edcat.document_multimodal_content for semantic search
 * 
 * 100% internal - no external LLM calls.
 */

import { queryPostgres, queryEdcatAI } from '../../config/databases.js';

export interface MultimodalContent {
  id?: string;
  documentId: string;
  contentType: 'text' | 'table' | 'image' | 'flowchart' | 'diagram';
  pageNumber?: number;
  sectionHeader?: string;
  contentJson: {
    text?: string;
    headers?: string[];
    rows?: any[][];
    base64?: string;
    description?: string;
    metadata?: any;
  };
  extractedAt?: Date;
}

export class VeraMultimodalExtractor {
  /**
   * Extract and store multimodal content from a document
   */
  static async extractAndStore(
    documentId: string,
    content: MultimodalContent[]
  ): Promise<number> {
    try {
      let stored = 0;
      
      for (const item of content) {
        await queryEdcatAI(
          `INSERT INTO edcat.document_multimodal_content 
           (document_id, content_type, page_number, section_header, content_json, extracted_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT DO NOTHING`,
          [
            documentId,
            item.contentType,
            item.pageNumber || null,
            item.sectionHeader || null,
            JSON.stringify(item.contentJson),
            item.extractedAt || new Date()
          ]
        );
        stored++;
      }
      
      console.log(`[VeraMultimodalExtractor] ✓ Stored ${stored} multimodal content items for document ${documentId}`);
      return stored;
    } catch (error: any) {
      console.error('[VeraMultimodalExtractor] Error storing multimodal content:', error.message);
      return 0;
    }
  }

  /**
   * Get multimodal content for a document
   */
  static async getContentByDocument(
    documentId: string,
    contentType?: MultimodalContent['contentType']
  ): Promise<MultimodalContent[]> {
    try {
      let query = `SELECT * FROM edcat.document_multimodal_content WHERE document_id = $1`;
      const params: any[] = [documentId];
      
      if (contentType) {
        query += ` AND content_type = $2`;
        params.push(contentType);
      }
      
      query += ` ORDER BY page_number ASC, section_header ASC`;
      
      const result = await queryEdcatAI(query, params);
      
      return result.rows.map(row => ({
        id: row.id,
        documentId: row.document_id,
        contentType: row.content_type,
        pageNumber: row.page_number,
        sectionHeader: row.section_header,
        contentJson: row.content_json,
        extractedAt: row.extracted_at
      }));
    } catch (error: any) {
      console.error('[VeraMultimodalExtractor] Error getting multimodal content:', error.message);
      return [];
    }
  }

  /**
   * Search multimodal content by text
   */
  static async searchByText(
    searchText: string,
    contentType?: MultimodalContent['contentType'],
    limit: number = 10
  ): Promise<MultimodalContent[]> {
    try {
      let query = `
        SELECT * FROM edcat.document_multimodal_content
        WHERE to_tsvector('english', content_json::text) @@ plainto_tsquery('english', $1)
      `;
      const params: any[] = [searchText];
      
      if (contentType) {
        query += ` AND content_type = $2`;
        params.push(contentType);
        query += ` ORDER BY ts_rank(to_tsvector('english', content_json::text), plainto_tsquery('english', $1)) DESC LIMIT $3`;
        params.push(limit);
      } else {
        query += ` ORDER BY ts_rank(to_tsvector('english', content_json::text), plainto_tsquery('english', $1)) DESC LIMIT $2`;
        params.push(limit);
      }
      
      const result = await queryEdcatAI(query, params);
      
      return result.rows.map(row => ({
        id: row.id,
        documentId: row.document_id,
        contentType: row.content_type,
        pageNumber: row.page_number,
        sectionHeader: row.section_header,
        contentJson: row.content_json,
        extractedAt: row.extracted_at
      }));
    } catch (error: any) {
      console.error('[VeraMultimodalExtractor] Error searching multimodal content:', error.message);
      return [];
    }
  }

  /**
   * Get tables from a document
   */
  static async getTables(documentId: string): Promise<MultimodalContent[]> {
    return this.getContentByDocument(documentId, 'table');
  }

  /**
   * Get images from a document
   */
  static async getImages(documentId: string): Promise<MultimodalContent[]> {
    return this.getContentByDocument(documentId, 'image');
  }

  /**
   * Get flowcharts/diagrams from a document
   */
  static async getDiagrams(documentId: string): Promise<MultimodalContent[]> {
    return this.getContentByDocument(documentId, 'flowchart');
  }
}

