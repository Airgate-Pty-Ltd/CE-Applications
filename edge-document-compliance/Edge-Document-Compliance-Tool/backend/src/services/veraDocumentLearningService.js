/**
 * Vera Document Learning Service
 * Allows Vera to learn from example documents and generate similar documents
 */

import { queryEdcatAI } from '../database/connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class VeraDocumentLearningService {
  constructor() {
    this.exampleCache = null;
  }

  /**
   * Get example documents for a standard
   * @param {string} standardCode - Standard code (e.g., 'ISO9001', 'AS9100')
   * @param {string} category - Document category (e.g., 'procedure', 'work_instruction')
   * @returns {Promise<Array>} Example documents
   */
  async getExampleDocuments(standardCode, category = null) {
    try {
      let query = `
        SELECT 
          ed.id,
          ed.file_id,
          ed.file_name,
          ed.category,
          ed.standard_code,
          ed.quality_score,
          ed.usage_count,
          dcl.content_text,
          dcl.word_count
        FROM edcat.example_documents ed
        JOIN edcat.document_content_for_learning dcl ON ed.file_id = dcl.file_id
        WHERE ed.standard_code = $1
          AND dcl.is_example = true
      `;
      
      const params = [standardCode];
      
      if (category) {
        query += ` AND ed.category = $2`;
        params.push(category);
      }
      
      query += ` ORDER BY ed.quality_score DESC, ed.usage_count DESC LIMIT 10`;
      
      const result = await queryEdcatAI(query, params);
      return result.rows;
    } catch (error) {
      console.error('[VeraDocumentLearning] Error getting example documents:', error.message);
      return [];
    }
  }

  /**
   * Get document structure patterns from examples
   * @param {string} standardCode - Standard code
   * @param {string} documentType - Type of document (procedure, work_instruction, etc.)
   * @returns {Promise<Object>} Document structure patterns
   */
  async getDocumentStructurePatterns(standardCode, documentType) {
    const examples = await this.getExampleDocuments(standardCode, documentType);
    
    if (examples.length === 0) {
      return null;
    }
    
    // Analyze common structure patterns
    const patterns = {
      sections: [],
      commonPhrases: [],
      formatting: {},
      averageLength: 0
    };
    
    let totalLength = 0;
    const sectionPatterns = new Map();
    const phraseFrequency = new Map();
    
    for (const example of examples) {
      const text = example.content_text || '';
      totalLength += text.length;
      
      // Extract section headers (lines that are all caps or start with numbers)
      const lines = text.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.match(/^[0-9]+\.[\s]|^[A-Z][A-Z\s]{10,}$/)) {
          sectionPatterns.set(trimmed, (sectionPatterns.get(trimmed) || 0) + 1);
        }
      }
      
      // Extract common phrases (3-5 word phrases)
      const words = text.toLowerCase().split(/\s+/);
      for (let i = 0; i < words.length - 3; i++) {
        const phrase = words.slice(i, i + 3).join(' ');
        phraseFrequency.set(phrase, (phraseFrequency.get(phrase) || 0) + 1);
      }
    }
    
    // Get top sections
    patterns.sections = Array.from(sectionPatterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([section]) => section);
    
    // Get common phrases
    patterns.commonPhrases = Array.from(phraseFrequency.entries())
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([phrase]) => phrase);
    
    patterns.averageLength = totalLength / examples.length;
    
    return patterns;
  }

  /**
   * Get best example document for a specific clause
   * @param {string} standardCode - Standard code
   * @param {string} clauseNumber - Clause number (e.g., '8.7')
   * @returns {Promise<Object|null>} Best example document
   */
  async getBestExampleForClause(standardCode, clauseNumber) {
    try {
      // Search for documents that mention the clause
      const result = await queryEdcatAI(`
        SELECT 
          ed.id,
          ed.file_id,
          ed.file_name,
          ed.category,
          dcl.content_text,
          dcl.word_count,
          ts_rank(
            to_tsvector('english', dcl.content_text),
            plainto_tsquery('english', $2)
          ) as relevance
        FROM edcat.example_documents ed
        JOIN edcat.document_content_for_learning dcl ON ed.file_id = dcl.file_id
        WHERE ed.standard_code = $1
          AND dcl.is_example = true
          AND to_tsvector('english', dcl.content_text) @@ plainto_tsquery('english', $2)
        ORDER BY relevance DESC, ed.quality_score DESC
        LIMIT 1
      `, [standardCode, `clause ${clauseNumber} ${clauseNumber}`]);
      
      if (result.rows.length > 0) {
        return result.rows[0];
      }
      
      // Fallback: get any example for the standard
      const examples = await this.getExampleDocuments(standardCode);
      return examples.length > 0 ? examples[0] : null;
    } catch (error) {
      console.error('[VeraDocumentLearning] Error getting best example:', error.message);
      return null;
    }
  }

  /**
   * Increment usage count for an example document
   * @param {string} fileId - File ID
   */
  async incrementUsageCount(fileId) {
    try {
      await queryEdcatAI(
        `UPDATE example_documents 
         SET usage_count = usage_count + 1, updated_at = NOW()
         WHERE file_id = $1`,
        [fileId]
      );
    } catch (error) {
      console.error('[VeraDocumentLearning] Error incrementing usage:', error.message);
    }
  }

  /**
   * Get document generation guidance based on examples
   * @param {string} standardCode - Standard code
   * @param {string} clauseNumber - Clause number
   * @param {string} documentType - Type of document to generate
   * @returns {Promise<Object>} Generation guidance
   */
  async getGenerationGuidance(standardCode, clauseNumber, documentType) {
    const bestExample = await this.getBestExampleForClause(standardCode, clauseNumber);
    const structurePatterns = await this.getDocumentStructurePatterns(standardCode, documentType);
    
    return {
      bestExample,
      structurePatterns,
      recommendations: this.generateRecommendations(bestExample, structurePatterns, documentType)
    };
  }

  /**
   * Generate recommendations based on examples
   */
  generateRecommendations(bestExample, structurePatterns, documentType) {
    const recommendations = [];
    
    if (bestExample) {
      recommendations.push({
        type: 'structure',
        message: `Use similar structure to: ${bestExample.file_name}`,
        details: `This example document has ${bestExample.word_count} words and follows best practices.`
      });
    }
    
    if (structurePatterns && structurePatterns.sections.length > 0) {
      recommendations.push({
        type: 'sections',
        message: `Include these common sections:`,
        details: structurePatterns.sections.slice(0, 5).join(', ')
      });
    }
    
    if (documentType === 'procedure') {
      recommendations.push({
        type: 'content',
        message: 'Procedures should define WHAT and WHY, not HOW',
        details: 'Work instructions define HOW. Procedures reference work instructions.'
      });
    }
    
    return recommendations;
  }
}

// Singleton instance
let serviceInstance = null;

export function getVeraDocumentLearningService() {
  if (!serviceInstance) {
    serviceInstance = new VeraDocumentLearningService();
  }
  return serviceInstance;
}

export default VeraDocumentLearningService;

