/**
 * Vera Upload Orchestrator Service
 * 
 * Orchestrates document uploads when files are uploaded directly to Vera
 * without explicit context. Vera asks clarifying questions, classifies documents,
 * routes them to the correct tables, and triggers appropriate actions.
 */

import { queryPostgres, queryEdcatAI } from '../../config/databases.js';
import VeraParserSupervisorService from './VeraParserSupervisorService.js';
import VeraLearningIngestionService from './VeraLearningIngestionService.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Document classification types
 */
export const DOCUMENT_TYPES = {
  STANDARD: 'STANDARD',
  REGULATION: 'REGULATION',
  CUSTOMER_REQUIREMENTS: 'CUSTOMER_REQUIREMENTS',
  CUSTOMER_INTERNAL_DOCUMENT: 'CUSTOMER_INTERNAL_DOCUMENT',
  INTERNAL_TRAINING_OR_GUIDE: 'INTERNAL_TRAINING_OR_GUIDE',
  OTHER: 'OTHER'
};

/**
 * File categories for standards table
 */
export const FILE_CATEGORIES = {
  standard: 'standard',
  regulatory: 'regulatory',
  customer_requirements: 'customer_requirements'
};

/**
 * Orchestrate document upload based on user answers
 * @param {Object} params
 * @param {string} params.tenantId
 * @param {string} params.documentId - ID of uploaded document (from customer_documents or standards)
 * @param {string} params.filePath - Path to uploaded file
 * @param {string} params.fileName - Original filename
 * @param {string} params.documentPurpose - User's answer: 'standard', 'regulation', 'customer_requirement', 'customer_document', 'training', etc.
 * @param {string} params.documentOwner - User's answer: 'my_organization', 'customer_name', 'regulator_name', etc.
 * @param {string} params.documentUsage - User's answer: 'compliance', 'learning', 'both'
 * @param {string} [params.userId] - User who uploaded
 * @param {string} [params.standardCode] - Optional standard code if known
 * @param {string} [params.customerName] - Optional customer name if known
 * @returns {Promise<Object>} Orchestration result
 */
export async function orchestrateDocumentUpload({
  tenantId = DEFAULT_TENANT_ID,
  documentId,
  filePath,
  fileName,
  documentPurpose,
  documentOwner,
  documentUsage,
  userId = null,
  standardCode = null,
  customerName = null
}) {
  console.log(`[VeraUploadOrchestrator] Orchestrating upload: ${fileName}`);
  console.log(`  Purpose: ${documentPurpose}, Owner: ${documentOwner}, Usage: ${documentUsage}`);

  // Step 1: Classify document type
  const documentType = classifyDocumentType(documentPurpose, fileName, standardCode);
  console.log(`[VeraUploadOrchestrator] Classified as: ${documentType}`);

  const result = {
    documentId: null,
    standardId: null,
    documentType,
    tenantId,
    actionsPerformed: [],
    gapAnalysisId: null,
    parsingSummary: null,
    learningSummary: null,
    error: null
  };

  try {
    // Step 2: Route to appropriate table and perform actions
    if (documentType === DOCUMENT_TYPES.STANDARD || 
        documentType === DOCUMENT_TYPES.REGULATION || 
        documentType === DOCUMENT_TYPES.CUSTOMER_REQUIREMENTS) {
      
      // Route to standards table
      result.standardId = await routeToStandards({
        tenantId,
        filePath,
        fileName,
        documentType,
        standardCode,
        customerName,
        documentOwner
      });
      result.documentId = result.standardId;
      result.actionsPerformed.push('stored_as_standard');

      // Trigger parsing
      if (documentUsage === 'compliance' || documentUsage === 'both') {
        const parsingSummary = await VeraParserSupervisorService.parseStandard({
          tenantId,
          standardId: result.standardId,
          force: true,
          userId
        });
        result.parsingSummary = parsingSummary;
        result.actionsPerformed.push('parsed_requirements');
      }

    } else if (documentType === DOCUMENT_TYPES.CUSTOMER_INTERNAL_DOCUMENT) {
      
      // Route to customer_documents table
      result.documentId = await routeToCustomerDocuments({
        tenantId,
        filePath,
        fileName,
        documentOwner,
        customerName,
        userId
      });
      result.actionsPerformed.push('stored_as_customer_document');

      // Trigger learning
      if (documentUsage === 'learning' || documentUsage === 'both') {
        const learningResult = await VeraLearningIngestionService.learnFromDocument({
          tenantId,
          documentId: result.documentId,
          userId
        });
        result.learningSummary = learningResult;
        result.actionsPerformed.push('learning_ingested');
      }

      // Trigger gap analysis if compliance analysis requested
      if (documentUsage === 'compliance' || documentUsage === 'both') {
        const gapAnalysisId = await triggerGapAnalysis({
          tenantId,
          documentId: result.documentId,
          userId
        });
        result.gapAnalysisId = gapAnalysisId;
        result.actionsPerformed.push('gap_analysis_started');
      }

    } else if (documentType === DOCUMENT_TYPES.INTERNAL_TRAINING_OR_GUIDE) {
      
      // Route to customer_documents with training tag
      result.documentId = await routeToCustomerDocuments({
        tenantId,
        filePath,
        fileName,
        documentOwner,
        customerName,
        userId,
        isTraining: true
      });
      result.actionsPerformed.push('stored_as_training_document');

      // Trigger learning
      const learningResult = await VeraLearningIngestionService.learnFromDocument({
        tenantId,
        documentId: result.documentId,
        userId
      });
      result.learningSummary = learningResult;
      result.actionsPerformed.push('learning_ingested');

    } else {
      // OTHER - store as customer document but don't auto-process
      result.documentId = await routeToCustomerDocuments({
        tenantId,
        filePath,
        fileName,
        documentOwner,
        customerName,
        userId
      });
      result.actionsPerformed.push('stored_as_document');
    }

    console.log(`[VeraUploadOrchestrator] ✅ Orchestration complete: ${result.actionsPerformed.join(', ')}`);
    return result;

  } catch (error) {
    console.error(`[VeraUploadOrchestrator] ❌ Error orchestrating upload: ${error.message}`);
    result.error = error.message;
    return result;
  }
}

/**
 * Classify document type from user purpose and filename hints
 * @param {string} documentPurpose - User's answer
 * @param {string} fileName - Filename for hints
 * @param {string} standardCode - Optional standard code
 * @returns {string} Document type
 */
function classifyDocumentType(documentPurpose, fileName, standardCode) {
  const purposeLower = (documentPurpose || '').toLowerCase();
  const fileNameLower = (fileName || '').toLowerCase();

  // Check for standard indicators
  if (purposeLower.includes('standard') || 
      fileNameLower.match(/\b(as9100|iso\s*9001|iso\s*13485|iatf\s*16949)\b/i) ||
      standardCode) {
    return DOCUMENT_TYPES.STANDARD;
  }

  // Check for regulation indicators
  if (purposeLower.includes('regulation') || purposeLower.includes('regulatory') ||
      fileNameLower.match(/\b(faa|easa|casa|part\s*21|part\s*145|14\s*cfr|21\s*cfr)\b/i)) {
    return DOCUMENT_TYPES.REGULATION;
  }

  // Check for customer requirement indicators
  if (purposeLower.includes('customer requirement') || purposeLower.includes('customer spec') ||
      fileNameLower.match(/\b(sq|asr|sqr|customer\s*requirement)\b/i)) {
    return DOCUMENT_TYPES.CUSTOMER_REQUIREMENTS;
  }

  // Check for training indicators
  if (purposeLower.includes('training') || purposeLower.includes('guide') ||
      fileNameLower.match(/\b(training|guide|instruction|manual)\b/i)) {
    return DOCUMENT_TYPES.INTERNAL_TRAINING_OR_GUIDE;
  }

  // Check for customer document indicators
  if (purposeLower.includes('procedure') || purposeLower.includes('work instruction') ||
      purposeLower.includes('sop') || purposeLower.includes('quality manual') ||
      fileNameLower.match(/\b(p-|procedure|wi-|work\s*instruction|sop)\b/i)) {
    return DOCUMENT_TYPES.CUSTOMER_INTERNAL_DOCUMENT;
  }

  // Default to customer internal document if purpose suggests internal use
  if (purposeLower.includes('internal') || purposeLower.includes('our') || 
      purposeLower.includes('company') || purposeLower.includes('organization')) {
    return DOCUMENT_TYPES.CUSTOMER_INTERNAL_DOCUMENT;
  }

  return DOCUMENT_TYPES.OTHER;
}

/**
 * Route document to standards table
 * @param {Object} params
 * @returns {Promise<string>} Standard ID
 */
async function routeToStandards({ tenantId, filePath, fileName, documentType, standardCode, customerName, documentOwner }) {
  console.log(`[VeraUploadOrchestrator] Routing to standards table`);

  // Determine file category
  let fileCategory;
  if (documentType === DOCUMENT_TYPES.STANDARD) {
    fileCategory = FILE_CATEGORIES.standard;
  } else if (documentType === DOCUMENT_TYPES.REGULATION) {
    fileCategory = FILE_CATEGORIES.regulatory;
  } else {
    fileCategory = FILE_CATEGORIES.customer_requirements;
  }

  // Extract standard code from filename if not provided
  if (!standardCode) {
    const codeMatch = fileName.match(/\b(as9100|iso\s*9001|iso\s*13485|iatf\s*16949|faa\s*part\s*21|easa\s*part\s*145)\b/i);
    if (codeMatch) {
      standardCode = codeMatch[0].replace(/\s+/g, '').toUpperCase();
    } else {
      // Generate a code from customer name if customer requirement
      if (documentType === DOCUMENT_TYPES.CUSTOMER_REQUIREMENTS && customerName) {
        standardCode = `${customerName.toUpperCase().replace(/\s+/g, '')}_REQUIREMENTS`;
      } else {
        standardCode = fileName.replace(/\.[^.]+$/, '').replace(/\s+/g, '_').toUpperCase();
      }
    }
  }

  // Read file content for blob storage
  let fileContent = null;
  let fileSize = 0;
  if (fs.existsSync(filePath)) {
    const buffer = fs.readFileSync(filePath);
    fileContent = buffer.toString('base64');
    fileSize = buffer.length;
  }

  // Determine file type
  const ext = path.extname(fileName).toLowerCase().slice(1);
  const fileType = ['pdf', 'docx', 'doc', 'txt'].includes(ext) ? ext : 'pdf';

  // Insert into standards table
  const standardId = uuidv4();
  const insertSql = `
    INSERT INTO public.standards 
      (id, tenant_id, code, name, file_category, file_path, file_content, file_name, file_type, file_size, uploaded_at, sector)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11)
    RETURNING id
  `;

  const name = customerName ? `${customerName} Requirements` : fileName.replace(/\.[^.]+$/, '');
  const sector = inferSector(documentType, fileName);

  await queryPostgres(insertSql, [
    standardId,
    tenantId,
    standardCode,
    name,
    fileCategory,
    filePath, // Keep filesystem path for now
    fileContent, // Also store as blob
    fileName,
    fileType,
    fileSize,
    sector
  ]);

  console.log(`[VeraUploadOrchestrator] ✅ Created standard: ${standardCode} (${standardId})`);
  return standardId;
}

/**
 * Route document to customer_documents table
 * @param {Object} params
 * @returns {Promise<string>} Document ID
 */
async function routeToCustomerDocuments({ tenantId, filePath, fileName, documentOwner, customerName, userId, isTraining = false }) {
  console.log(`[VeraUploadOrchestrator] Routing to customer_documents table`);

  // Extract text from file
  const extractedText = await extractTextFromFile(filePath, fileName);

  // Read file content for blob storage
  let fileContent = null;
  let fileSize = 0;
  if (fs.existsSync(filePath)) {
    const buffer = fs.readFileSync(filePath);
    fileContent = buffer.toString('base64');
    fileSize = buffer.length;
  }

  // Determine file type
  const ext = path.extname(fileName).toLowerCase().slice(1);
  const fileType = ['pdf', 'docx', 'doc', 'txt'].includes(ext) ? ext : 'pdf';

  // Insert into customer_documents table
  const documentId = uuidv4();
  const insertSql = `
    INSERT INTO public.customer_documents 
      (id, tenant_id, name, file_path, file_content, file_type, file_size, extracted_text, uploaded_at, uploaded_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
    RETURNING id
  `;

  await queryPostgres(insertSql, [
    documentId,
    tenantId,
    fileName,
    filePath,
    fileContent,
    fileType,
    fileSize,
    extractedText,
    userId
  ]);

  // If it's a procedure, also create customer_procedures entry
  if (fileName.match(/\b(p-|procedure|wi-|work\s*instruction)\b/i)) {
    try {
      const procedureName = fileName.replace(/\.[^.]+$/, '');
      await queryPostgres(
        `INSERT INTO public.customer_procedures 
         (id, tenant_id, document_id, procedure_name, procedure_text, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT DO NOTHING`,
        [uuidv4(), tenantId, documentId, procedureName, extractedText.substring(0, 10000)]
      );
      console.log(`[VeraUploadOrchestrator] ✅ Also created customer_procedure entry`);
    } catch (e) {
      console.warn(`[VeraUploadOrchestrator] Could not create procedure entry: ${e.message}`);
    }
  }

  console.log(`[VeraUploadOrchestrator] ✅ Created customer document: ${documentId}`);
  return documentId;
}

/**
 * Extract text from file
 * @param {string} filePath
 * @param {string} fileName
 * @returns {Promise<string>}
 */
async function extractTextFromFile(filePath, fileName) {
  const ext = path.extname(fileName).toLowerCase();

  try {
    if (ext === '.pdf') {
      const pdfParse = (await import('pdf-parse')).default;
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      return data.text;
    } else if (ext === '.docx') {
      const mammoth = (await import('mammoth')).default;
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } else if (ext === '.txt') {
      return fs.readFileSync(filePath, 'utf-8');
    }
    return '';
  } catch (error) {
    console.warn(`[VeraUploadOrchestrator] Could not extract text: ${error.message}`);
    return '';
  }
}

/**
 * Infer sector from document type and filename
 * @param {string} documentType
 * @param {string} fileName
 * @returns {string}
 */
function inferSector(documentType, fileName) {
  const fileNameLower = (fileName || '').toLowerCase();
  
  if (documentType === DOCUMENT_TYPES.REGULATION) {
    if (fileNameLower.includes('faa') || fileNameLower.includes('part 21') || fileNameLower.includes('part 145')) {
      return 'Aerospace';
    }
    if (fileNameLower.includes('fda') || fileNameLower.includes('cfr 21')) {
      return 'Medical Device';
    }
  }
  
  if (fileNameLower.includes('aerospace') || fileNameLower.includes('as9100')) {
    return 'Aerospace';
  }
  if (fileNameLower.includes('medical') || fileNameLower.includes('iso 13485')) {
    return 'Medical Device';
  }
  if (fileNameLower.includes('automotive') || fileNameLower.includes('iatf')) {
    return 'Automotive';
  }
  
  return 'General';
}

/**
 * Trigger gap analysis for a customer document
 * @param {Object} params
 * @returns {Promise<string|null>} Gap analysis ID
 */
async function triggerGapAnalysis({ tenantId, documentId, userId }) {
  console.log(`[VeraUploadOrchestrator] Triggering gap analysis for document ${documentId}`);

  try {
    // Get primary standard for tenant (or ask user if multiple)
    const standardsResult = await queryPostgres(
      `SELECT id, code, name FROM public.standards 
       WHERE tenant_id = $1 AND file_category IN ('standard', 'regulatory')
       ORDER BY uploaded_at DESC
       LIMIT 5`,
      [tenantId]
    );

    if (standardsResult.rows.length === 0) {
      console.warn(`[VeraUploadOrchestrator] No standards found for gap analysis`);
      return null;
    }

    // Use the most recent standard (or could ask user)
    const standard = standardsResult.rows[0];
    console.log(`[VeraUploadOrchestrator] Using standard ${standard.code} for gap analysis`);

    // Create gap analysis record
    const gapAnalysisId = uuidv4();
    const insertSql = `
      INSERT INTO public.gap_analyses 
        (id, tenant_id, standard_id, customer_document_id, status, created_at, created_by)
      VALUES ($1, $2, $3, $4, 'pending', NOW(), $5)
      RETURNING id
    `;

    await queryPostgres(insertSql, [
      gapAnalysisId,
      tenantId,
      standard.id,
      documentId,
      userId
    ]);

    // Trigger actual gap analysis (async - could use a job queue)
    // For now, just create the record
    console.log(`[VeraUploadOrchestrator] ✅ Created gap analysis: ${gapAnalysisId}`);
    return gapAnalysisId;

  } catch (error) {
    console.error(`[VeraUploadOrchestrator] Error triggering gap analysis: ${error.message}`);
    return null;
  }
}

/**
 * Generate natural language summary of orchestration result
 * @param {Object} result - Orchestration result
 * @returns {string}
 */
export function generateOrchestrationSummary(result) {
  if (result.error) {
    return `I encountered an error processing that document: ${result.error}. Please try again or check the file format.`;
  }

  const actions = result.actionsPerformed || [];
  const parts = [];

  if (result.documentType === DOCUMENT_TYPES.STANDARD) {
    parts.push(`I've registered this as a standard`);
    if (actions.includes('parsed_requirements')) {
      parts.push(`parsed its requirements`);
      if (result.parsingSummary) {
        parts.push(`and extracted ${result.parsingSummary.requirementsCount} requirements`);
      }
    }
    parts.push(`It's now available for clause-level questions and gap analysis.`);
  } else if (result.documentType === DOCUMENT_TYPES.REGULATION) {
    parts.push(`I've treated this as a regulatory source`);
    if (actions.includes('parsed_requirements')) {
      parts.push(`and parsed its requirements`);
    }
    parts.push(`I'll align your procedures both by intent and by explicit regulation references.`);
  } else if (result.documentType === DOCUMENT_TYPES.CUSTOMER_REQUIREMENTS) {
    parts.push(`I've stored these as customer-specific requirements`);
    if (actions.includes('parsed_requirements')) {
      parts.push(`and parsed them`);
    }
    parts.push(`I can now check whether your procedures meet both your standards and these customer expectations.`);
  } else if (result.documentType === DOCUMENT_TYPES.CUSTOMER_INTERNAL_DOCUMENT) {
    parts.push(`I've stored this as a customer document`);
    if (actions.includes('learning_ingested')) {
      parts.push(`learned from its content`);
    }
    if (actions.includes('gap_analysis_started')) {
      parts.push(`and started a gap analysis`);
    }
    parts.push(`It's ready for compliance checking and future reference.`);
  } else {
    parts.push(`I've stored the document`);
    if (actions.length > 1) {
      parts.push(`and performed ${actions.length - 1} additional action(s)`);
    }
  }

  return parts.join(', ') + '.';
}

export default {
  orchestrateDocumentUpload,
  classifyDocumentType,
  generateOrchestrationSummary,
  DOCUMENT_TYPES,
  FILE_CATEGORIES
};

