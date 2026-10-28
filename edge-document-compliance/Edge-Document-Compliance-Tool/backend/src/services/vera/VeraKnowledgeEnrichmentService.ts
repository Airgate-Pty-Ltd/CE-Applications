/**
 * Vera Knowledge Enrichment Service
 * 
 * Automatically extracts terminology, examples, and relationships from ingested documents.
 * This is how Vera's capability grows when new content is added.
 */

import { queryEdcatAI, queryPostgres } from '../../config/databases.js';
import { v4 as uuidv4 } from 'uuid';

export interface EnrichInput {
  documentId: string;
  standardCode?: string;
  contentText: string;
  quality?: "approved" | "bad" | "neutral";
  documentType?: string;
  fileName?: string;
}

/**
 * Enrich a learning document by extracting:
 * - Terminology and definitions
 * - Example classifications
 * - Requirement relationships
 */
export async function enrichLearningDocument(input: EnrichInput): Promise<void> {
  try {
    const {
      documentId,
      standardCode,
      contentText,
      quality = "neutral",
      documentType,
      fileName
    } = input;

    console.log(`[VeraEnrichment] Enriching document: ${documentId} (${fileName || 'unnamed'})`);

    // Step 1: Extract terminology
    await extractTerminology({
      documentId,
      standardCode,
      contentText,
      fileName
    });

    // Step 2: Classify and store examples
    await classifyExample({
      documentId,
      standardCode,
      contentText,
      quality,
      documentType,
      fileName
    });

    // Step 3: Extract requirement relationships
    await extractRequirementRelationships({
      documentId,
      standardCode,
      contentText
    });

    // Step 4: Update enrichment tracking
    await markAsEnriched(documentId);

    console.log(`[VeraEnrichment] ✅ Enrichment complete for document: ${documentId}`);

  } catch (error: any) {
    console.error('[VeraEnrichment] Error enriching document:', error.message);
    // Don't throw - enrichment is non-critical
  }
}

/**
 * Extract terminology from document content
 */
async function extractTerminology(params: {
  documentId: string;
  standardCode?: string;
  contentText: string;
  fileName?: string;
}): Promise<void> {
  try {
    const { documentId, standardCode, contentText, fileName } = params;

    // Pattern 1: Extract capitalized phrases that look like terms
    // Examples: "Quality Management System", "Corrective Action", "Nonconformity"
    const termPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g;
    const potentialTerms = new Set<string>();
    
    let match;
    while ((match = termPattern.exec(contentText)) !== null) {
      const term = match[1].trim();
      // Filter out common false positives
      if (term.length > 5 && 
          !term.match(/^(The|This|That|These|Those|When|Where|What|How|Why|Which)/) &&
          !term.match(/^(Section|Chapter|Clause|Paragraph|Figure|Table|Appendix)/)) {
        potentialTerms.add(term);
      }
    }

    // Pattern 2: Extract acronym definitions (e.g., "QMS (Quality Management System)")
    const acronymPattern = /([A-Z]{2,10})\s*\(([^)]+)\)/g;
    const acronyms = new Map<string, string>();
    
    while ((match = acronymPattern.exec(contentText)) !== null) {
      const acronym = match[1];
      const definition = match[2].trim();
      if (acronym.length >= 2 && acronym.length <= 10 && definition.length > 5) {
        acronyms.set(acronym, definition);
      }
    }

    // Pattern 3: Extract definition patterns (e.g., "X is defined as Y", "X means Y")
    const definitionPatterns = [
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:is|are)\s+(?:defined\s+as|means?|refers\s+to)\s+([^\.]+)/gi,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*:\s*([^\.]+)/g
    ];

    const definitions = new Map<string, string>();
    for (const pattern of definitionPatterns) {
      while ((match = pattern.exec(contentText)) !== null) {
        const term = match[1].trim();
        const definition = match[2].trim();
        if (term.length > 3 && definition.length > 10) {
          definitions.set(term, definition);
        }
      }
    }

    // Store extracted terms
    for (const term of potentialTerms) {
      await storeTerm({
        term,
        definition: definitions.get(term) || null,
        acronym: null,
        standardCode,
        source: fileName || documentId
      });
    }

    // Store acronyms
    for (const [acronym, definition] of acronyms.entries()) {
      await storeTerm({
        term: definition,
        definition,
        acronym,
        standardCode,
        source: fileName || documentId
      });
    }

    // Store explicit definitions
    for (const [term, definition] of definitions.entries()) {
      if (!potentialTerms.has(term)) {
        await storeTerm({
          term,
          definition,
          acronym: null,
          standardCode,
          source: fileName || documentId
        });
      }
    }

    console.log(`[VeraEnrichment] Extracted ${potentialTerms.size + acronyms.size + definitions.size} terms`);

  } catch (error: any) {
    console.error('[VeraEnrichment] Error extracting terminology:', error.message);
  }
}

/**
 * Store a term in the terminology database
 */
async function storeTerm(params: {
  term: string;
  definition: string | null;
  acronym: string | null;
  standardCode?: string;
  source: string;
}): Promise<void> {
  try {
    const { term, definition, acronym, standardCode, source } = params;

    // Check if term already exists
    const existing = await queryEdcatAI(`
      SELECT id FROM edcat.terms_and_definitions
      WHERE LOWER(term_name) = LOWER($1)
      LIMIT 1
    `, [term]);

    if (existing.rows.length > 0) {
      // Update existing term if we have better definition
      if (definition && definition.length > 20) {
        await queryEdcatAI(`
          UPDATE edcat.terms_and_definitions
          SET definition = COALESCE(definition, $1),
              acronym = COALESCE(acronym, $2),
              updated_at = NOW()
          WHERE LOWER(term_name) = LOWER($3)
        `, [definition, acronym, term]);
      }
      return;
    }

    // Insert new term
    await queryEdcatAI(`
      INSERT INTO edcat.terms_and_definitions
      (id, tenant_id, term_name, definition, acronym, standard_code, context, source, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (tenant_id, term_name) DO NOTHING
    `, [
      uuidv4(),
      '00000000-0000-0000-0000-000000000000',
      term,
      definition,
      acronym,
      standardCode || null,
      standardCode || 'general',
      source
    ]);

  } catch (error: any) {
    // Ignore duplicate key errors
    if (!error.message.includes('duplicate') && !error.message.includes('unique')) {
      console.error('[VeraEnrichment] Error storing term:', error.message);
    }
  }
}

/**
 * Classify and store document as example
 */
async function classifyExample(params: {
  documentId: string;
  standardCode?: string;
  contentText: string;
  quality: "approved" | "bad" | "neutral";
  documentType?: string;
  fileName?: string;
}): Promise<void> {
  try {
    const { documentId, standardCode, contentText, quality, documentType, fileName } = params;

    // Determine if this is a good or bad example based on quality tag and filename
    const isGoodExample = quality === "approved";
    const isBadExample = quality === "bad";

    // Extract example title from filename or first sentence
    let exampleTitle = fileName || `Example from ${standardCode || 'document'}`;
    if (fileName) {
      // Remove extension and clean up
      exampleTitle = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    }

    // Extract first 500 chars as example content
    const exampleContent = contentText.substring(0, 500);

    // Only store if it's explicitly marked as good or bad
    if (isGoodExample || isBadExample) {
      await queryEdcatAI(`
        INSERT INTO edcat.example_documents
        (id, tenant_id, example_title, example_content, applicable_to, approval_status, quality_score, source_document_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT DO NOTHING
      `, [
        uuidv4(),
        '00000000-0000-0000-0000-000000000000',
        exampleTitle,
        exampleContent,
        standardCode || 'general',
        isGoodExample ? 'approved' : 'rejected',
        isGoodExample ? 0.9 : 0.2,
        documentId
      ]);

      console.log(`[VeraEnrichment] Stored ${isGoodExample ? 'approved' : 'rejected'} example: ${exampleTitle}`);
    }

  } catch (error: any) {
    console.error('[VeraEnrichment] Error classifying example:', error.message);
  }
}

/**
 * Extract requirement relationships (e.g., "see clause 8.7", "as required by ISO 9001")
 */
async function extractRequirementRelationships(params: {
  documentId: string;
  standardCode?: string;
  contentText: string;
}): Promise<void> {
  try {
    const { documentId, standardCode, contentText } = params;

    // Pattern 1: "see clause X", "see section X.Y"
    const clauseRefPattern = /(?:see|refer to|per|as per|according to|as required by)\s+(?:clause|section|paragraph)\s+(\d+\.\d+(?:\.\d+)?(?:\([a-z]\))?)/gi;
    
    // Pattern 2: Standard references (e.g., "ISO 9001 8.7", "AS9100D clause 8.5")
    const standardRefPattern = /\b(ISO\s*\d{4,5}|AS\d{4}[A-Z]?|IATF\s*\d{4,5}|FAA|EASA|CASA)\s+(\d+\.\d+(?:\.\d+)?(?:\([a-z]\))?)/gi;

    const relationships: Array<{ source: string; target: string; relationshipType: string }> = [];

    // Extract clause references
    let match;
    while ((match = clauseRefPattern.exec(contentText)) !== null) {
      const clauseRef = match[1];
      relationships.push({
        source: standardCode || 'unknown',
        target: clauseRef,
        relationshipType: 'references'
      });
    }

    // Extract standard references
    while ((match = standardRefPattern.exec(contentText)) !== null) {
      const standard = match[1].replace(/\s+/g, '');
      const clauseRef = match[2];
      relationships.push({
        source: standardCode || 'unknown',
        target: `${standard} ${clauseRef}`,
        relationshipType: 'references'
      });
    }

    // Store relationships (if we have a relationship table)
    // For now, we'll store them in metadata or create a simple tracking table
    if (relationships.length > 0) {
      console.log(`[VeraEnrichment] Found ${relationships.length} requirement relationships`);
      
      // Store in document metadata or a relationships table if it exists
      // This could be extended to create a proper knowledge graph
    }

  } catch (error: any) {
    console.error('[VeraEnrichment] Error extracting relationships:', error.message);
  }
}

/**
 * Mark document as enriched
 */
async function markAsEnriched(documentId: string): Promise<void> {
  try {
    // Update document_content_for_learning with enrichment flag
    await queryEdcatAI(`
      UPDATE edcat.document_content_for_learning
      SET enriched_at = NOW()
      WHERE id = $1
    `, [documentId]).catch(() => {
      // Table might not exist or column might not exist - that's okay
    });

  } catch (error: any) {
    // Non-critical - enrichment tracking is optional
  }
}

/**
 * Batch enrich all unenriched documents
 */
export async function batchEnrichDocuments(params: {
  limit?: number;
  standardCode?: string;
}): Promise<{ enriched: number; errors: number }> {
  try {
    const { limit = 100, standardCode } = params;

    console.log(`[VeraEnrichment] Starting batch enrichment (limit: ${limit})...`);

    // Get unenriched documents
    let query = `
      SELECT id, content_text, standard_code, document_type, file_name, quality_tag
      FROM edcat.document_content_for_learning
      WHERE enriched_at IS NULL
    `;

    const paramsArray: any[] = [];
    if (standardCode) {
      query += ` AND standard_code = $1`;
      paramsArray.push(standardCode);
      query += ` LIMIT $2`;
      paramsArray.push(limit);
    } else {
      query += ` LIMIT $1`;
      paramsArray.push(limit);
    }

    const result = await queryEdcatAI(query, paramsArray);
    const documents = result.rows;

    let enriched = 0;
    let errors = 0;

    for (const doc of documents) {
      try {
        await enrichLearningDocument({
          documentId: doc.id,
          standardCode: doc.standard_code || standardCode,
          contentText: doc.content_text || '',
          quality: doc.quality_tag || 'neutral',
          documentType: doc.document_type,
          fileName: doc.file_name
        });
        enriched++;
      } catch (error: any) {
        console.error(`[VeraEnrichment] Error enriching document ${doc.id}:`, error.message);
        errors++;
      }
    }

    console.log(`[VeraEnrichment] Batch enrichment complete: ${enriched} enriched, ${errors} errors`);

    return { enriched, errors };

  } catch (error: any) {
    console.error('[VeraEnrichment] Error in batch enrichment:', error.message);
    return { enriched: 0, errors: 1 };
  }
}

