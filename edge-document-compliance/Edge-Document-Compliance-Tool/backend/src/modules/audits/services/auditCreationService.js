/**
 * Audit Creation Service
 * Handles audit creation and checklist generation
 */

import { query } from '../../../database/connection.js';
import { createAudit, createAuditItems, updateAudit } from '../storage/auditRepository.js';
import { validateAuditPack, createEmptyAuditPack } from '../../../contracts/auditPack.js';
import { isValidSourceType, isValidRequirementRef } from '../domain/validators.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a new audit
 * @param {Object} auditData - Audit creation data
 * @param {string} auditData.tenant_id - Tenant ID
 * @param {string} auditData.title - Audit title
 * @param {string} [auditData.description] - Description
 * @param {string} [auditData.audit_type] - Audit type
 * @param {string} auditData.created_by - User ID
 * @returns {Promise<Object>} - Created audit
 */
export async function createNewAudit(auditData) {
  return await createAudit(auditData);
}

/**
 * Generate checklist from selected sources
 * @param {string} auditId - Audit ID
 * @param {string} tenantId - Tenant ID
 * @param {Object} options - Generation options
 * @param {string[]} options.sourceIds - Source document IDs
 * @param {Object} [options.filters] - Filters (scope, granularity, evidenceDepth, clausePrefixes)
 * @returns {Promise<Object>} - Generated audit pack
 */
export async function generateChecklist(auditId, tenantId, options) {
  const { sourceIds, filters = {} } = options;

  if (!sourceIds || sourceIds.length === 0) {
    throw new Error('At least one source must be selected');
  }

  // Get source documents
  const sourcesResult = await query(
    `SELECT * FROM audits.source_documents 
     WHERE id = ANY($1) AND tenant_id = $2`,
    [sourceIds, tenantId]
  );

  if (sourcesResult.rows.length === 0) {
    throw new Error('No valid sources found');
  }

  const sources = sourcesResult.rows;

  // Get requirements from selected sources
  const requirementsResult = await query(
    `SELECT * FROM audits.requirements 
     WHERE source_document_id = ANY($1) AND tenant_id = $2
     ORDER BY requirement_ref`,
    [sourceIds, tenantId]
  );

  let requirements = requirementsResult.rows;

  // Apply filters
  if (filters.clausePrefixes && filters.clausePrefixes.length > 0) {
    requirements = requirements.filter(req => {
      return filters.clausePrefixes.some(prefix => 
        req.requirement_ref.startsWith(prefix) || 
        req.clause_number?.startsWith(prefix) ||
        req.section_key?.startsWith(prefix)
      );
    });
  }

  // Build audit pack
  const auditPack = createEmptyAuditPack(auditId);
  auditPack.sources = sources.map(s => ({
    sourceId: s.id,
    sourceType: s.source_type,
    name: s.name,
    code: s.code,
    revision: s.revision,
    metadata: s.metadata || {}
  }));

  auditPack.filters = filters;

  // Group requirements by source type for display
  const standardReqs = requirements.filter(r => {
    const source = sources.find(s => s.id === r.source_document_id);
    return source?.source_type === 'STANDARD';
  });

  const regulationReqs = requirements.filter(r => {
    const source = sources.find(s => s.id === r.source_document_id);
    return source?.source_type === 'REGULATION';
  });

  const customerReqs = requirements.filter(r => {
    const source = sources.find(s => s.id === r.source_document_id);
    return source?.source_type === 'CUSTOMER';
  });

  // Create audit items
  const auditItems = [];
  let sortOrder = 0;

  // Section A: Standards
  if (standardReqs.length > 0) {
    for (const req of standardReqs) {
      const source = sources.find(s => s.id === req.source_document_id);
      const itemId = uuidv4();
      
      auditItems.push({
        id: itemId,
        audit_id: auditId,
        tenant_id: tenantId,
        source_type: 'STANDARD',
        requirement_id: req.id,
        requirement_ref: req.requirement_ref,
        requirement_text: req.requirement_text,
        question: generateQuestion(req.requirement_text, req.requirement_ref),
        evidence_expectations: inferEvidenceExpectations(req.requirement_text, req.keywords || []),
        grouping_section: 'Section A: Standards',
        grouping_subsection: null,
        sort_order: sortOrder++,
        metadata: {}
      });

      auditPack.items.push({
        itemId,
        sourceType: 'STANDARD',
        requirementId: req.id,
        requirementRef: req.requirement_ref,
        requirementText: req.requirement_text,
        question: generateQuestion(req.requirement_text, req.requirement_ref),
        evidenceExpectations: inferEvidenceExpectations(req.requirement_text, req.keywords || [])
      });
    }
  }

  // Section B: Regulations
  if (regulationReqs.length > 0) {
    for (const req of regulationReqs) {
      const source = sources.find(s => s.id === req.source_document_id);
      const itemId = uuidv4();
      
      auditItems.push({
        id: itemId,
        audit_id: auditId,
        tenant_id: tenantId,
        source_type: 'REGULATION',
        requirement_id: req.id,
        requirement_ref: req.requirement_ref,
        requirement_text: req.requirement_text,
        question: generateQuestion(req.requirement_text, req.requirement_ref),
        evidence_expectations: inferEvidenceExpectations(req.requirement_text, req.keywords || []),
        grouping_section: 'Section B: Regulations',
        grouping_subsection: null,
        sort_order: sortOrder++,
        metadata: {}
      });

      auditPack.items.push({
        itemId,
        sourceType: 'REGULATION',
        requirementId: req.id,
        requirementRef: req.requirement_ref,
        requirementText: req.requirement_text,
        question: generateQuestion(req.requirement_text, req.requirement_ref),
        evidenceExpectations: inferEvidenceExpectations(req.requirement_text, req.keywords || [])
      });
    }
  }

  // Section C: Customer Requirements
  if (customerReqs.length > 0) {
    for (const req of customerReqs) {
      const source = sources.find(s => s.id === req.source_document_id);
      const itemId = uuidv4();
      
      auditItems.push({
        id: itemId,
        audit_id: auditId,
        tenant_id: tenantId,
        source_type: 'CUSTOMER',
        requirement_id: req.id,
        requirement_ref: req.requirement_ref,
        requirement_text: req.requirement_text,
        question: generateQuestion(req.requirement_text, req.requirement_ref),
        evidence_expectations: inferEvidenceExpectations(req.requirement_text, req.keywords || []),
        grouping_section: 'Section C: Customer Requirements',
        grouping_subsection: null,
        sort_order: sortOrder++,
        metadata: {}
      });

      auditPack.items.push({
        itemId,
        sourceType: 'CUSTOMER',
        requirementId: req.id,
        requirementRef: req.requirement_ref,
        requirementText: req.requirement_text,
        question: generateQuestion(req.requirement_text, req.requirement_ref),
        evidenceExpectations: inferEvidenceExpectations(req.requirement_text, req.keywords || [])
      });
    }
  }

  // Validate audit pack
  if (!validateAuditPack(auditPack)) {
    throw new Error('Generated audit pack failed validation');
  }

  // Save audit items to database
  await createAuditItems(auditItems);

  // Update audit with audit pack JSON
  await updateAudit(auditId, tenantId, {
    audit_pack_json: auditPack
  });

  return auditPack;
}

/**
 * Generate audit question from requirement text
 * @param {string} requirementText - Requirement text
 * @param {string} requirementRef - Requirement reference
 * @returns {string} - Generated question
 */
function generateQuestion(requirementText, requirementRef) {
  // Simple question generation - can be enhanced with LLM
  const lowerText = requirementText.toLowerCase();
  
  if (lowerText.includes('shall') || lowerText.includes('must')) {
    return `Does the organization ${requirementText.substring(0, 200)}?`;
  }
  
  return `How does the organization address requirement ${requirementRef}: ${requirementText.substring(0, 150)}?`;
}

/**
 * Infer evidence expectations from requirement text
 * @param {string} requirementText - Requirement text
 * @param {string[]} keywords - Keywords from requirement
 * @returns {Object} - Evidence expectations
 */
function inferEvidenceExpectations(requirementText, keywords) {
  const lowerText = requirementText.toLowerCase();
  const docTypes = [];
  const foundKeywords = [];

  // Infer document types
  if (lowerText.match(/\b(establish|define|plan|control|procedure|process)\b/)) {
    docTypes.push('Procedure');
  }
  if (lowerText.match(/\b(record|document|evidence|log|register)\b/)) {
    docTypes.push('Record', 'Register');
  }
  if (lowerText.match(/\b(form|field|complete|fill)\b/)) {
    docTypes.push('Form');
  }
  if (lowerText.match(/\b(instruction|how to|step|guide)\b/)) {
    docTypes.push('WorkInstruction');
  }
  if (lowerText.match(/\b(manual|reference|guidebook)\b/)) {
    docTypes.push('Manual');
  }

  // Extract keywords
  const keywordPatterns = ['shall', 'must', 'should', 'establish', 'define', 'maintain', 'control'];
  for (const pattern of keywordPatterns) {
    if (lowerText.includes(pattern)) {
      foundKeywords.push(pattern);
    }
  }

  return {
    docTypes: [...new Set(docTypes)],
    keywords: [...new Set([...foundKeywords, ...keywords])],
    criteria: `Evidence should demonstrate compliance with: ${requirementText.substring(0, 200)}`
  };
}
