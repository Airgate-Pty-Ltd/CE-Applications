/**
 * Requirement Extraction Service
 * Connects EDC extraction pipeline to audit module
 * Extracts normalized requirements from source documents
 */

import { query } from '../../../database/connection.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Extract requirements from a source document
 * Uses EDC's existing parsing/analysis capabilities
 * @param {string} sourceDocumentId - Source document ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Object[]>} - Extracted requirements
 */
export async function extractRequirementsFromSource(sourceDocumentId, tenantId) {
  // Get source document
  const sourceResult = await query(
    'SELECT * FROM audits.source_documents WHERE id = $1 AND tenant_id = $2',
    [sourceDocumentId, tenantId]
  );

  if (sourceResult.rows.length === 0) {
    throw new Error('Source document not found');
  }

  const source = sourceResult.rows[0];

  // Check if already extracted
  const existingResult = await query(
    'SELECT * FROM audits.requirements WHERE source_document_id = $1',
    [sourceDocumentId]
  );

  if (existingResult.rows.length > 0) {
    return existingResult.rows;
  }

  // Extract requirements based on source type
  let requirements = [];

  if (source.source_type === 'STANDARD') {
    requirements = await extractStandardRequirements(source);
  } else if (source.source_type === 'REGULATION') {
    requirements = await extractRegulationRequirements(source);
  } else if (source.source_type === 'CUSTOMER') {
    requirements = await extractCustomerRequirements(source);
  } else if (source.source_type === 'CHECKLIST') {
    requirements = await extractChecklistRequirements(source);
  }

  // Save requirements to database
  const savedRequirements = [];
  for (const req of requirements) {
    const reqId = uuidv4();
    await query(
      `INSERT INTO audits.requirements
       (id, tenant_id, source_document_id, requirement_ref, requirement_text, 
        requirement_type, clause_number, section_key, keywords, tags, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        reqId,
        tenantId,
        sourceDocumentId,
        req.requirement_ref,
        req.requirement_text,
        req.requirement_type || null,
        req.clause_number || null,
        req.section_key || null,
        req.keywords || [],
        req.tags || [],
        JSON.stringify(req.metadata || {})
      ]
    );
    savedRequirements.push({ ...req, id: reqId });
  }

  return savedRequirements;
}

/**
 * Extract requirements from standard document
 * Uses clause-based parsing
 */
async function extractStandardRequirements(source) {
  const text = source.extracted_text || '';
  const requirements = [];

  // Try to extract from compliance_lib.requirements if source links to existing standard
  if (source.code) {
    const existingReqs = await query(
      `SELECT r.*, s.code as standard_code
       FROM compliance_lib.requirements r
       JOIN compliance_lib.standards s ON r.standard_id = s.standard_id
       WHERE s.code = $1`,
      [source.code]
    );

    if (existingReqs.rows.length > 0) {
      for (const req of existingReqs.rows) {
        requirements.push({
          requirement_ref: req.clause_number || `clause-${req.requirement_id}`,
          requirement_text: req.requirement_text,
          requirement_type: req.keyword || 'shall',
          clause_number: req.clause_number,
          keywords: [req.keyword].filter(Boolean),
          tags: [],
          metadata: {}
        });
      }
      return requirements;
    }
  }

  // Fallback: Parse text for clause patterns
  // Look for patterns like "7.5.3.2", "8.2.1", etc.
  const clausePattern = /(\d+(?:\.\d+)+)\s+(.+?)(?=\d+\.\d+|$)/gs;
  let match;
  let index = 0;

  while ((match = clausePattern.exec(text)) !== null) {
    const clauseRef = match[1];
    const clauseText = match[2].trim();

    // Extract requirement type
    const requirementType = clauseText.match(/\b(shall|must|should)\b/i)?.[1]?.toLowerCase() || null;

    // Extract keywords
    const keywords = [];
    const keywordPatterns = ['establish', 'define', 'maintain', 'control', 'ensure', 'verify'];
    for (const pattern of keywordPatterns) {
      if (clauseText.toLowerCase().includes(pattern)) {
        keywords.push(pattern);
      }
    }

    requirements.push({
      requirement_ref: clauseRef,
      requirement_text: clauseText.substring(0, 2000), // Limit length
      requirement_type: requirementType,
      clause_number: clauseRef,
      keywords,
      tags: [],
      metadata: { extracted_method: 'pattern_matching', index: index++ }
    });
  }

  // If no clauses found, create single requirement from document
  if (requirements.length === 0 && text.length > 0) {
    requirements.push({
      requirement_ref: '1.0',
      requirement_text: text.substring(0, 2000),
      requirement_type: null,
      clause_number: '1.0',
      keywords: [],
      tags: [],
      metadata: { extracted_method: 'full_document', note: 'No clause structure detected' }
    });
  }

  return requirements;
}

/**
 * Extract requirements from regulation document
 * Uses section-based parsing
 */
async function extractRegulationRequirements(source) {
  const text = source.extracted_text || '';
  const requirements = [];

  // Look for regulation patterns like "14 CFR 21.137(a)", "Section 21.137", etc.
  const sectionPattern = /(?:Section|§|14\s+CFR)\s*(\d+\.\d+(?:\([a-z]\))*(?:\d+)?)\s+(.+?)(?=(?:Section|§|14\s+CFR|\d+\.\d+)|$)/gis;
  let match;
  let index = 0;

  while ((match = sectionPattern.exec(text)) !== null) {
    const sectionRef = match[1];
    const sectionText = match[2].trim();

    const requirementType = sectionText.match(/\b(must|shall|should|may)\b/i)?.[1]?.toLowerCase() || null;

    const keywords = [];
    const keywordPatterns = ['must', 'shall', 'establish', 'maintain', 'ensure'];
    for (const pattern of keywordPatterns) {
      if (sectionText.toLowerCase().includes(pattern)) {
        keywords.push(pattern);
      }
    }

    requirements.push({
      requirement_ref: source.code ? `${source.code} ${sectionRef}` : sectionRef,
      requirement_text: sectionText.substring(0, 2000),
      requirement_type: requirementType,
      section_key: sectionRef,
      keywords,
      tags: [],
      metadata: { extracted_method: 'regulation_pattern', index: index++ }
    });
  }

  // Fallback: single requirement
  if (requirements.length === 0 && text.length > 0) {
    requirements.push({
      requirement_ref: source.code || '1.0',
      requirement_text: text.substring(0, 2000),
      requirement_type: null,
      section_key: '1.0',
      keywords: [],
      tags: [],
      metadata: { extracted_method: 'full_document', note: 'No section structure detected' }
    });
  }

  return requirements;
}

/**
 * Extract requirements from customer document
 * Uses paragraph/section segmentation
 */
async function extractCustomerRequirements(source) {
  const text = source.extracted_text || '';
  const requirements = [];

  // Split by paragraphs or numbered sections
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 50);

  paragraphs.forEach((para, index) => {
    // Look for requirement indicators
    if (para.match(/\b(shall|must|should|required|requirement)\b/i)) {
      const ref = `CUST-${index + 1}`;
      requirements.push({
        requirement_ref: ref,
        requirement_text: para.trim().substring(0, 2000),
        requirement_type: para.match(/\b(shall|must|should)\b/i)?.[1]?.toLowerCase() || null,
        keywords: extractKeywords(para),
        tags: ['customer'],
        metadata: { extracted_method: 'paragraph_segmentation', paragraph_index: index }
      });
    }
  });

  return requirements;
}

/**
 * Extract requirements from existing checklist
 * Preserves checklist structure
 */
async function extractChecklistRequirements(source) {
  const text = source.extracted_text || '';
  const requirements = [];

  // Look for checklist items (numbered, bulleted, etc.)
  const itemPattern = /(?:^\s*(?:\d+\.|[-*])\s+)(.+?)(?=^\s*(?:\d+\.|[-*])|$)/gms;
  let match;
  let index = 0;

  while ((match = itemPattern.exec(text)) !== null) {
    const itemText = match[1].trim();
    if (itemText.length > 20) {
      requirements.push({
        requirement_ref: `CHECK-${index + 1}`,
        requirement_text: itemText.substring(0, 2000),
        requirement_type: null,
        keywords: extractKeywords(itemText),
        tags: ['checklist'],
        metadata: { extracted_method: 'checklist_parsing', item_index: index++ }
      });
    }
  }

  return requirements;
}

/**
 * Extract keywords from text
 */
function extractKeywords(text) {
  const keywords = [];
  const keywordPatterns = [
    'establish', 'define', 'maintain', 'control', 'ensure', 'verify',
    'document', 'record', 'procedure', 'process', 'plan', 'review'
  ];

  const lowerText = text.toLowerCase();
  for (const pattern of keywordPatterns) {
    if (lowerText.includes(pattern)) {
      keywords.push(pattern);
    }
  }

  return keywords;
}
