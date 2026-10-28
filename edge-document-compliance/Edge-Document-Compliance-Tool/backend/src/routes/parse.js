/**
 * Document Parsing Routes
 * Parse uploaded documents to extract requirements and procedures
 */

import express from 'express';
import { queryPostgres, queryEdcatAI } from '../config/databases.js';
import fs from 'fs';
import path from 'path';
import { shouldIncludeSubParagraph } from '../services/standardizedFormatExtractor.js';
import { fileURLToPath } from 'url';
import { formatRequirementsList, formatRequirementsAsText, formatRequirementsAsMarkdown } from '../services/requirementsFormatter.js';
import ParseService from '../services/parseService.js';
import { retrieveFile } from '../../config/storage.js';
import { requirementMetrics } from '../services/metricsService.js';
import { inRequirementScope } from '../services/requirementClassifier.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// ============================================================
// ROBUST FILE FINDING FUNCTIONS
// ============================================================

/**
 * Find file for standard using multiple strategies in uploads folder
 * @param {Object} standard - Standard object with code, name, etc.
 * @param {boolean} isRegulatory - Whether this is a regulatory document (prioritizes regulatory folder)
 * @param {boolean} isCustomer - Whether this is a customer requirement document
 */
async function findFileForStandard(standard, isRegulatory = false, isCustomer = false) {
  console.log(`🔍 Looking for file in uploads folder for standard: "${standard.code}" (ID: ${standard.standard_id})`);
  if (isRegulatory) {
    console.log(`   📋 Regulatory document - prioritizing regulatory folder`);
  } else if (isCustomer) {
    console.log(`   📋 Customer requirement - prioritizing customer folder`);
  }

  // Strategy 1: Search all upload subdirectories
  const uploadsBaseDir = path.join(__dirname, '../../../uploads');
  // Prioritize based on document type
  const searchDirs = isRegulatory
    ? ['regulatory', 'documents', 'standards', 'customer_requirements'] // Regulatory first
    : isCustomer
    ? ['customer_requirements', 'customer', 'documents', 'standards', 'regulatory'] // Customer first
    : ['standards', 'documents', 'regulatory', 'customer_requirements']; // Standards first
  
  // Build comprehensive search terms from standard code/name
  const standardCodeLower = standard.code.toLowerCase().replace(/[_\s-]/g, '');
  const standardNameLower = (standard.name || '').toLowerCase().replace(/[_\s-]/g, '');
  const searchTerms = [
    standard.code.toLowerCase(),
    standard.name?.toLowerCase(),
    standardCodeLower,
    standardNameLower,
    standard.code.replace(/[_\s-]/g, ''),
    standard.name?.replace(/[_\s-]/g, '')
  ];
  
  // Add partial matches
  if (standard.code.length > 10) {
    searchTerms.push(standard.code.substring(0, 10).toLowerCase());
  }
  if (standard.name && standard.name.length > 10) {
    searchTerms.push(standard.name.substring(0, 10).toLowerCase());
  }
  
  // Add domain-specific patterns
  if (standard.code.toLowerCase().includes('as9100')) {
    searchTerms.push('as9100', 'as9100d', 'as9100-d', 'as 9100');
  }
  if (standard.code.toLowerCase().includes('iso')) {
    searchTerms.push('iso', 'iso9001', 'iso 9001');
  }
  if (standard.code.toLowerCase().includes('faa') || standard.code.toLowerCase().includes('cfr')) {
    searchTerms.push('faa', 'cfr', 'part');
  }
  if (standard.code.toLowerCase().includes('casa')) {
    searchTerms.push('casa', 'casrs');
  }

  console.log(`   📂 Searching in directories: ${searchDirs.join(', ')}`);
  console.log(`   🔍 Search terms: ${searchTerms.slice(0, 8).join(', ')}...`);

  for (const subDir of searchDirs) {
    const searchDir = path.join(uploadsBaseDir, subDir);
    if (!fs.existsSync(searchDir)) {
      continue;
    }

    try {
      const files = fs.readdirSync(searchDir);
      console.log(`   Checking ${subDir}/ (${files.length} files)`);

      for (const file of files) {
        const filePath = path.join(searchDir, file);
        const fileNameLower = file.toLowerCase();
        
        // Check if filename matches any search term
        for (const term of searchTerms) {
          const termLower = term.toLowerCase();
          if (fileNameLower.includes(termLower) || termLower.includes(fileNameLower.replace(/^\d+_/, ''))) {
            // Verify it's a valid file
            if (fs.statSync(filePath).isFile() && /\.(pdf|docx?|txt)$/i.test(file)) {
              console.log(`✅ Found matching file: ${file} in ${subDir}/`);
              return filePath;
            }
          }
        }
      }
    } catch (err) {
      console.warn(`   ⚠️  Error reading ${subDir}: ${err.message}`);
    }
  }

  // Strategy 3: List all files for debugging
  console.log(`⚠️  File not found. Listing available files for debugging...`);
  const allFiles = [];
  for (const subDir of searchDirs) {
    const searchDir = path.join(uploadsBaseDir, subDir);
    if (fs.existsSync(searchDir)) {
      try {
        const files = fs.readdirSync(searchDir);
        allFiles.push(...files.map(f => `${subDir}/${f}`));
      } catch (err) {
        // Ignore
      }
    }
  }
  console.log(`   Available files (first 10): ${allFiles.slice(0, 10).join(', ')}`);

  return null;
}

/**
 * Read document file content
 * Handles both filesystem and database blob storage
 * EXPORTED for use by VeraParserSupervisorService
 */
export async function readDocumentFile(filePath, standardId = null, fileMetadataId = null) {
  // NEW: Check if file is stored in database
  if (filePath === 'database') {
    if (!standardId) {
      throw new Error('standardId required when reading from database storage');
    }
    return await readDocumentFromDatabase(standardId, fileMetadataId);
  }

  // EXISTING: Filesystem path handling
  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }

  const ext = path.extname(filePath).toLowerCase();
  console.log(`📖 Reading ${ext} file: ${filePath}`);

  try {
    if (ext === '.pdf') {
      const pdfParse = (await import('pdf-parse')).default;
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      console.log(`✅ Extracted ${pdfData.numpages} pages from PDF`);
      return pdfData.text;
    } 
    else if (ext === '.docx' || ext === '.doc') {
      const mammoth = (await import('mammoth')).default;
      const result = await mammoth.extractRawText({ path: filePath });
      console.log(`✅ Extracted text from DOCX`);
      return result.value;
    } 
    else if (ext === '.txt') {
      const text = fs.readFileSync(filePath, 'utf-8');
      console.log(`✅ Read ${text.length} characters from TXT`);
      return text;
    }
    else {
      throw new Error(`Unsupported file type: ${ext}`);
    }
  } catch (error) {
    console.error(`❌ Error reading file: ${error.message}`);
    throw error;
  }
}

/**
 * NEW FUNCTION: Read file content from database blob storage
 * EXPORTED for use by VeraParserSupervisorService
 */
export async function readDocumentFromDatabase(standardId, fileMetadataId) {
  console.log(`📖 Reading file from database blob storage (standardId: ${standardId})`);
  
  try {
    // Strategy 1: Check standard_files_content table (production storage)
    let result = await queryPostgres(
      `SELECT file_content, file_size, filename
       FROM public.standard_files_content
       WHERE standard_id = $1 AND file_content IS NOT NULL
       LIMIT 1`,
      [standardId]
    );

    // Strategy 2: Fallback to standards table (legacy storage)
    if (result.rows.length === 0) {
      console.log(`   ⚠️  Not found in standard_files_content, checking standards table...`);
      result = await queryPostgres(
        `SELECT file_content, file_size, file_name as filename
         FROM public.standards
         WHERE id = $1 AND file_content IS NOT NULL
         LIMIT 1`,
        [standardId]
      );
    }

    if (result.rows.length === 0) {
      throw new Error(`No file content found in database for standard ${standardId} (checked standard_files_content and standards tables)`);
    }

    const row = result.rows[0];
    const base64Content = row.file_content;
    const filename = row.filename || 'document';
    const fileSize = row.file_size || 0;

    console.log(`✅ Retrieved ${fileSize} bytes from database`);

    // Determine file type from metadata if available, otherwise guess from content
    let fileType = 'pdf'; // Default
    if (filename) {
      const ext = path.extname(filename).toLowerCase().slice(1);
      if (['pdf', 'docx', 'doc', 'txt'].includes(ext)) {
        fileType = ext;
      }
    }

    // Convert base64 to Buffer
    const buffer = Buffer.from(base64Content, 'base64');
    console.log(`📦 Decoded base64: ${buffer.length} bytes`);

    // Parse based on file type
    if (fileType === 'pdf') {
      const pdfParse = (await import('pdf-parse')).default;
      const pdfData = await pdfParse(buffer);
      console.log(`✅ Extracted ${pdfData.numpages} pages from PDF (from DB)`);
      return pdfData.text;
    } 
    else if (fileType === 'docx' || fileType === 'doc') {
      const mammoth = (await import('mammoth')).default;
      // For DOCX, need to write buffer to temp file (mammoth reads from path)
      const tmpFile = `/tmp/doc_${standardId}.${fileType}`;
      await fs.promises.writeFile(tmpFile, buffer);
      const result = await mammoth.extractRawText({ path: tmpFile });
      await fs.promises.unlink(tmpFile).catch(() => {}); // Cleanup (ignore errors)
      console.log(`✅ Extracted text from DOCX (from DB)`);
      return result.value;
    } 
    else if (fileType === 'txt') {
      const text = buffer.toString('utf-8');
      console.log(`✅ Read ${text.length} characters from TXT (from DB)`);
      return text;
    }
    else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
  } catch (error) {
    console.error(`❌ Error reading from database: ${error.message}`);
    throw error;
  }
}

/**
 * Get available uploads for debugging
 */
async function getAvailableUploads() {
  const uploadsBaseDir = path.join(__dirname, '../../../uploads');
  const searchDirs = ['documents', 'standards', 'regulatory'];
  const files = [];

  for (const subDir of searchDirs) {
    const searchDir = path.join(uploadsBaseDir, subDir);
    if (fs.existsSync(searchDir)) {
      try {
        const dirFiles = fs.readdirSync(searchDir);
        files.push(...dirFiles.filter(f => f.match(/\.(pdf|docx?|txt)$/i)).map(f => `${subDir}/${f}`));
      } catch (err) {
        // Ignore
      }
    }
  }

  return files.slice(0, 20);
}

/**
 * Extract requirements using NEW Sequential Shall Parser
 * 
 * Uses SimpleShallParser which:
 * - Finds each "shall" statement sequentially
 * - Extracts: Clause + Paragraph + Full Statement + Complete List
 * - Keeps list items together (doesn't split them)
 * - Tracks incomplete lists as GAPs
 * 
 * EXPORTED for use by VeraParserSupervisorService
 */
export async function extractRequirementsBounded(text, documentName, standardCode, standardId, metadata = {}) {
  // STEP 1: Try UniversalComplianceParser first (handles Standards, Regulations, Customer Requirements)
  try {
    const UniversalComplianceParser = (await import('../services/universalComplianceParser.js')).default;
    const parser = new UniversalComplianceParser('1.0.0');
    
    // Get standard metadata for better type detection
    const standardMetadata = {
      standardCode: standardCode,
      standardName: documentName,
      ...metadata
    };
    
    const requirements = await parser.parse(text, standardMetadata);
    
    console.log(`✅ UniversalComplianceParser extracted ${requirements.length} requirements (type: ${parser.documentType})`);
    
    // Map universal parser output to standardized format
    const mappedRequirements = requirements.map(req => {
      // Universal parser outputs different formats based on document type
      if (parser.documentType === 'STANDARD') {
        // Standards: clause-based (4.1, 4.2, 4.3...)
        const clauseParts = (req.clause_number || req.number || '').toString().split('.');
        const topLevel = clauseParts[0] || 'N/A';
        
        return {
          clause: topLevel,
          clause_name: req.clause_name || null,
          subclause: req.clause_number || req.number || 'N/A',
          subclause_name: req.clause_title || null,
          paragraph: `P${req.paragraph || 1}`,
          requirement: req.requirement_text || '',
          requirement_text: req.requirement_text || '',
          confidence: req.confidence || 0.85,
          requirement_uid: req.requirement_uid || null,
          keyword: req.keyword || 'shall',
          requirement_type: 'Requirement',
          intent: 'OTHER',
          is_in_scope: true
        };
      } else if (parser.documentType === 'REGULATION') {
        // Regulations: section-based (21.139, 21.143...)
        const sectionParts = (req.section_number || req.number || '').toString().split('.');
        const topLevel = sectionParts[0] || 'N/A';
        
        return {
          clause: topLevel,
          clause_name: req.section_title || null,
          subclause: req.section_number || req.number || 'N/A',
          subclause_name: req.subsection ? `(${req.subsection})` : null,
          paragraph: req.subsection ? `(${req.subsection})` : 'P1',
          requirement: req.requirement_text || '',
          requirement_text: req.requirement_text || '',
          confidence: req.confidence || 0.85,
          requirement_uid: req.requirement_uid || null,
          keyword: req.keyword || 'must',
          requirement_type: 'Requirement',
          intent: 'OTHER',
          is_in_scope: true
        };
      } else if (parser.documentType === 'CUSTOMER') {
        // Customer requirements: requirement-based (SQ01, A1505...)
        return {
          clause: req.customer_company || 'CUSTOMER',
          clause_name: req.requirement_title || null,
          subclause: req.requirement_reference || req.number || 'N/A',
          subclause_name: req.requirement_title || null,
          paragraph: 'P1',
          requirement: req.requirement_text || '',
          requirement_text: req.requirement_text || '',
          confidence: req.confidence || 0.85,
          requirement_uid: req.requirement_uid || null,
          keyword: req.keyword || 'shall',
          requirement_type: 'Requirement',
          intent: 'OTHER',
          is_in_scope: true
        };
      }
      
      // Fallback for unknown types
      return {
        clause: 'N/A',
        clause_name: null,
        subclause: req.reference || req.number || 'N/A',
        subclause_name: null,
        paragraph: 'P1',
        requirement: req.requirement_text || '',
        requirement_text: req.requirement_text || '',
        confidence: req.confidence || 0.85,
        keyword: req.keyword || 'shall',
        requirement_type: 'Requirement',
        intent: 'OTHER',
        is_in_scope: true
      };
    });
    
    console.log(`[extractRequirementsBounded] 📊 Returning ${mappedRequirements.length} requirements from UniversalComplianceParser`);
    return mappedRequirements;
  } catch (universalParserError) {
    console.warn(`⚠️  UniversalComplianceParser failed (${universalParserError.message}), falling back to SimpleShallParser`);
    console.error(`   Stack:`, universalParserError.stack);
  }
  
  // STEP 2: Fallback to SimpleShallParser (standards only)
  try {
    const SimpleShallParser = (await import('../services/simpleShallParser.js')).default;
    const parser = new SimpleShallParser(standardCode, standardId, '1.0.0');
    const requirements = parser.parse(text);

    console.log(`✅ SimpleShallParser extracted ${requirements.length} requirements`);

    // Return standardized format directly (parser outputs this format)
    const mappedRequirements = requirements.map(req => {
      // SimpleShallParser already outputs standardized format
      if (req.clause && req.subclause && req.paragraph) {
        return {
          clause: req.clause,
          clause_name: req.clause_name,
          subclause: req.subclause,
          subclause_name: req.subclause_name,
          paragraph: req.paragraph,
          requirement: req.requirement || req.requirement_text || req.statement || '',
          requirement_text: req.requirement_text || req.requirement || req.statement || '',
          confidence: req.confidence || 0.85,
          requirement_uid: req.requirement_uid,
          keyword: req.keyword || 'shall',
          // List metadata
          has_list: req.has_list || false,
          list_items: req.list_items || [],
          list_complete: req.list_complete !== false,
          // Additional metadata
          requirement_type: 'Requirement',
          intent: 'OTHER',
          is_in_scope: req.is_in_scope !== false
        };
      }
      
      // Fallback mapping if format is unexpected
      const fullRef = req.clause_number || req.subclause || 'N/A';
      const topLevel = fullRef.split('.')[0];
      
      return {
        clause: topLevel,
        clause_name: req.clause_name || null,
        subclause: fullRef,
        subclause_name: req.clause_title || req.subclause_name || null,
        paragraph: req.paragraph || `P${req.paragraph_number || 1}`,
        requirement: req.requirement || req.requirement_text || req.statement || '',
        requirement_text: req.requirement_text || req.requirement || req.statement || '',
        confidence: req.confidence || 0.85,
        requirement_uid: req.requirement_uid,
        keyword: req.keyword || 'shall',
        has_list: req.has_list || false,
        list_items: req.list_items || [],
        list_complete: req.list_complete !== false,
        requirement_type: 'Requirement',
        intent: 'OTHER',
        is_in_scope: req.is_in_scope !== false
      };
    });
    
    console.log(`[extractRequirementsBounded] 📊 Returning ${mappedRequirements.length} requirements from SimpleShallParser`);
    return mappedRequirements;
  } catch (simpleParserError) {
    console.warn(`⚠️  SimpleShallParser failed (${simpleParserError.message}), falling back to clause-aware parser`);
    console.error(`   Stack:`, simpleParserError.stack);
  }

  // Fallback to clause-aware parser
  try {
    const { ClauseAwareParser } = await import('../services/clauseAwareParser.js');
    const parser = new ClauseAwareParser(standardCode, standardId, '1.0.0');
    const parseResult = parser.parse(text);

    console.log(`✅ Clause-aware parser extracted ${parseResult.totalRequirements} requirements from ${parseResult.totalClauses} clauses`);

    // Return standardized format directly (parser now outputs this format)
    const mappedRequirements = parseResult.requirements.map(req => {
      // If already in standardized format, return as-is
      if (req.clause && req.subclause && req.paragraph) {
        return req;
      }
      
      // Otherwise, map legacy format to standardized format
      const fullRef = req.clause_number || req.full_ref || 'N/A';
      const topLevel = fullRef.split('.')[0];
      
      return {
        clause: topLevel,
        clause_name: null,
        subclause: fullRef,
        subclause_name: req.clause_title || null,
        paragraph: req.subject_text || 'P1',
        requirement: req.requirement_text || req.requirement || req.text || '',
        confidence: req.confidence || 0.75,
        requirement_type: req.requirement_type,
        intent: req.intent,
        keywords: req.keywords
      };
    });
    
    console.log(`[extractRequirementsBounded] 📊 Returning ${mappedRequirements.length} requirements from ClauseAwareParser`);
    return mappedRequirements;
  } catch (clauseAwareError) {
    console.warn(`⚠️  Clause-aware parser failed (${clauseAwareError.message}), falling back to advanced parser`);
  }

  try {
    const { RequirementExtractor } = await import('../services/requirementParser.js');
    const { AccurateClauseExtractor } = await import('../services/clauseExtractor.js');

    console.log(`📋 Building clause structure for ${standardCode}...`);
    const clauseExtractor = new AccurateClauseExtractor();
    clauseExtractor.buildClauseStructure(text);
    const validClauses = clauseExtractor.getValidClauses() || [];
    console.log(`✅ Found ${validClauses.length} valid clauses in document structure`);

    const extractor = new RequirementExtractor(standardCode, '1.0.0');
    const requirements = extractor.extractRequirements(text);
    console.log(`📊 Extracted ${requirements.length} requirements, assigning clause numbers...`);

    let currentClause = null;
    const formatted = [];

    for (let reqIndex = 0; reqIndex < requirements.length; reqIndex++) {
      const req = requirements[reqIndex];
      let clauseNumber = req.clause || req.clauseNumber || req.clause_number || null;
      const reqText = req.text || req.requirement_text || '';

      let reqStartIndex = text.indexOf(reqText);
      if (reqStartIndex < 0) {
        const firstSentence = reqText.split(/[.!?]/)[0].trim();
        if (firstSentence.length > 20) {
          reqStartIndex = text.indexOf(firstSentence);
        }
      }
      if (reqStartIndex < 0 && reqText.length > 50) {
        reqStartIndex = text.indexOf(reqText.substring(0, 50));
      }

      if (reqStartIndex >= 0) {
        const textBeforeReq = text.substring(0, reqStartIndex);
        const linesBefore = textBeforeReq.split('\n');
        for (let i = linesBefore.length - 1; i >= Math.max(0, linesBefore.length - 20); i--) {
          const line = linesBefore[i].trim();
          if (!line) continue;

          const clauseMatch = clauseExtractor.extractClauseNumber(line);
          if (clauseMatch?.number && clauseExtractor.hasClause(clauseMatch.number)) {
            clauseNumber = clauseMatch.number;
            currentClause = clauseMatch.number;
            break;
          }

          const clauseInText = line.match(/\b([\d]+\.[\d]+(?:\.[\d]+)*)\b/);
          if (clauseInText && clauseExtractor.hasClause(clauseInText[1])) {
            clauseNumber = clauseInText[1];
            currentClause = clauseInText[1];
            break;
          }
        }
      }

      if (!clauseNumber) {
        const clauseInReq = reqText.match(/\b([\d]+\.[\d]+(?:\.[\d]+)*)\b/);
        if (clauseInReq && clauseExtractor.hasClause(clauseInReq[1])) {
          clauseNumber = clauseInReq[1];
          currentClause = clauseNumber;
        }
      }

      if (!clauseNumber && currentClause) {
        clauseNumber = currentClause;
      }

      if (clauseNumber && !clauseExtractor.hasClause(clauseNumber)) {
        const parts = clauseNumber.split('.');
        for (let i = parts.length - 1; i > 0; i--) {
          const parent = parts.slice(0, i).join('.');
          if (clauseExtractor.hasClause(parent)) {
            clauseNumber = parent;
            break;
          }
        }
        if (!clauseExtractor.hasClause(clauseNumber)) {
          clauseNumber = null;
        }
      }

      if (clauseNumber) {
        currentClause = clauseNumber;
      }

      formatted.push({
        text: reqText,
        clause: clauseNumber,
        keyword: req.keyword || 'shall',
        confidence: req.confidence || 0.75
      });
    }

    const withValidClauses = formatted.filter(r => r.clause && clauseExtractor.hasClause(r.clause));
    console.log(`✅ ${withValidClauses.length}/${formatted.length} requirements have VALIDATED clause numbers`);

    return formatted.sort((a, b) => {
      if (!a.clause && !b.clause) return 0;
      if (!a.clause) return 1;
      if (!b.clause) return -1;

      const aParts = a.clause.split('.').map(n => parseInt(n, 10) || 0);
      const bParts = b.clause.split('.').map(n => parseInt(n, 10) || 0);
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aVal = aParts[i] || 0;
        const bVal = bParts[i] || 0;
        if (aVal !== bVal) return aVal - bVal;
      }
      return 0;
    });
  } catch (err) {
    console.warn(`⚠️  Could not use advanced parser (${err.message}), using basic extraction`);
    return extractBasicRequirements(text, standardCode);
  }
}

/**
 * Basic requirement extraction (fallback)
 */
function extractBasicRequirements(text, standardCode) {
  const requirements = [];
  const lines = text.split('\n');
  const mandatoryKeywords = /\b(shall|must|is required to|are required to)\b/gi;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length < 20) continue;
    
    if (mandatoryKeywords.test(line)) {
      requirements.push({
        text: line.substring(0, 500),
        clause: null,
        keyword: line.match(/\b(shall|must)\b/i)?.[0] || 'shall',
        confidence: 0.75
      });
    }
  }
  
  return requirements;
}

// ============================================================
// PARSE ROUTE
// ============================================================

/**
 * POST /api/parse/standard/:standardId
 * Parse a standard document to extract requirements
 */
router.post('/standard/:standardId', async (req, res) => {
  try {
    const { standardId } = req.params;
    
    console.log(`📥 Parse request received for standardId: ${standardId}`);

    // DATABASE CONNECTION FIX: Check BOTH databases for standards
    // Standards might be in Customer Data DB (DATABASE_URL) or EDCAT AI DB (EDCAT_AI_DATABASE_URL)
    let standardResult;
    let standard = null;
    let foundInDatabase = null;
    
    // Strategy 1: Check Customer Data DB (DATABASE_URL) - primary location
    try {
      console.log(`🔍 Checking Customer Data DB for standard ${standardId}...`);
      standardResult = await queryPostgres(
        `SELECT id, code, name, uploaded_at, 
                COALESCE(total_clauses, total_requirements, 0) as total_requirements,
                total_clauses, total_requirements
         FROM public.standards 
         WHERE id = $1`,
        [standardId]
      );
      
      if (standardResult.rows.length > 0) {
        standard = standardResult.rows[0];
        console.log(`✅ Found standard in Customer Data DB: ${standard.code} (${standard.name})`);
      }
    } catch (dbError) {
      console.warn(`⚠️  Error querying Customer Data DB: ${dbError.message}`);
    }
    
    // NOTE: Standards and parsed requirements live in the Customer Data DB (public.*).
    // Always use queryPostgres for these tables. EDCAT AI DB only contains edcat.* tables.
    // Removed fallback check to EDCAT AI DB for public.standards - standards are only in Customer Data DB.
    
    // If still not found, provide detailed error
    if (!standard) {
      console.error(`❌ Standard ${standardId} not found in either database`);
      
      // Try to get any standards from both DBs for debugging
      let sampleStandards = [];
      try {
        const customerDBStandards = await queryPostgres(
          `SELECT id, code, name FROM public.standards LIMIT 5`
        );
        if (customerDBStandards.rows.length > 0) {
          sampleStandards.push({
            database: 'Customer Data DB',
            count: customerDBStandards.rows.length,
            examples: customerDBStandards.rows.map(r => ({ id: r.id, code: r.code, name: r.name }))
          });
        }
      } catch (e) {
        console.warn(`Could not check Customer Data DB: ${e.message}`);
      }
      
      // NOTE: Standards are only in Customer Data DB (public.*), not EDCAT AI DB (edcat.*)
      // Removed check for standards in EDCAT AI DB
      
      return res.status(404).json({
        success: false,
        error: 'Standard not found',
        standardId: standardId,
        message: `Standard with ID ${standardId} was not found in Customer Data DB.`,
        diagnostic: {
          checkedDatabases: ['Customer Data DB (DATABASE_URL)'],
          note: 'Standards are stored in Customer Data DB (public.*), not EDCAT AI DB (edcat.*)',
          availableStandards: sampleStandards,
          suggestion: 'Please verify the standard ID is correct, or upload the standard file again.'
        }
      });
    }

    // Standard is always in Customer Data DB (public.*)
    // Just log that we found it and continue
    console.log(`✓ Using standard: ${standard.code} (${standard.name}) from Customer Data DB`);
    const totalCount = standard.total_clauses || standard.total_requirements || 0;
    console.log(`   Current total_requirements: ${totalCount}`);

    // CRITICAL: Ensure parsed_requirements table exists before proceeding
    // Use the robust function that checks and creates the table
    try {
      const { ensureParsedRequirementsTable } = await import('../scripts/ensure-parsed-requirements-table-robust.js');
      await ensureParsedRequirementsTable();
      console.log('✅ Verified parsed_requirements table exists and has all required columns');
    } catch (tableError) {
      console.error(`❌ Error ensuring parsed_requirements table: ${tableError.message}`);
      console.error(`   SQL State: ${tableError.code}`);
      console.error(`   Detail: ${tableError.detail}`);
      console.error(`   Full error:`, tableError);
      return res.status(500).json({
        success: false,
        error: `Parse failed: ${tableError.message}`,
        details: 'The parsed_requirements table could not be created or accessed. Please check database migrations and ensure the table exists.',
        hint: 'If the standard was already parsed, try re-parsing from the Parse tab.'
      });
    }

    // ARCHITECTURE: Check parsed_requirements in Customer Data DB (always stored here)
    let existingCount = 0;
    try {
      const result = await queryPostgres(
        `SELECT COUNT(*) as count FROM public.parsed_requirements WHERE standard_id = $1`,
        [standardId]
      );
      existingCount = parseInt(result.rows[0]?.count || 0);
      console.log(`📊 Found ${existingCount} existing parsed requirements in Customer Data DB`);
    } catch (error) {
      console.warn(`⚠️  Could not check existing requirements: ${error.message}`);
      existingCount = 0;
    }

    const forceReparse = req.query.force === 'true' || req.body.force === true;
    if (existingCount > 0 && !forceReparse) {
      return res.json({
        success: true,
        message: 'Standard already parsed. Use ?force=true to re-parse.',
        requirementsCount: existingCount,
        clausesExtracted: existingCount,
        standard: {
          id: standard.id,
          code: standard.code,
          name: standard.name
        },
        canReparse: true
      });
    }

    // Find file - check multiple sources
    let filePath = null;
    let fileContentFromDB = null;
    
    // Strategy 0A: Check standard_files_content table (PREFERRED for production - Railway)
    // This is where files are stored when uploaded in production mode
    if (!filePath) {
      try {
        console.log(`🔍 Checking standard_files_content table in Customer Data DB...`);
        console.log(`   Standard ID: ${standardId}`);
        console.log(`   Standard Code: ${standard.code}`);
        console.log(`   Standard Name: ${standard.name}`);
        
        // First, check if ANY files exist for this standard_id
        const countResult = await queryPostgres(
          `SELECT COUNT(*) as count FROM public.standard_files_content WHERE standard_id = $1`,
          [standardId]
        );
        const fileCount = parseInt(countResult.rows[0]?.count || 0, 10);
        console.log(`   Files in standard_files_content for this standard_id: ${fileCount}`);
        
        // If files exist but none have content, log that
        if (fileCount > 0) {
          const withContentResult = await queryPostgres(
            `SELECT COUNT(*) as count FROM public.standard_files_content 
             WHERE standard_id = $1 AND file_content IS NOT NULL`,
            [standardId]
          );
          const withContentCount = parseInt(withContentResult.rows[0]?.count || 0, 10);
          console.log(`   Files with content: ${withContentCount}`);
          
          if (withContentCount === 0 && fileCount > 0) {
            console.error(`   ⚠️  WARNING: ${fileCount} file(s) found but NONE have file_content!`);
            console.error(`   This means files were uploaded but content was not stored.`);
          }
        }
        
        const standardFilesResult = await queryPostgres(
          `SELECT file_content, filename, file_size, id, stored_at
           FROM public.standard_files_content
           WHERE standard_id = $1 AND file_content IS NOT NULL
           LIMIT 1`,
          [standardId]
        );
        
        if (standardFilesResult.rows.length > 0 && standardFilesResult.rows[0].file_content) {
          const fileRow = standardFilesResult.rows[0];
          console.log(`✅ Found file_content in standard_files_content table`);
          console.log(`   File ID: ${fileRow.id}`);
          console.log(`   Filename: ${fileRow.filename || 'N/A'}`);
          console.log(`   File size: ${fileRow.file_size || 0} bytes`);
          console.log(`   Stored at: ${fileRow.stored_at || 'N/A'}`);
          console.log(`   Content length: ${fileRow.file_content ? fileRow.file_content.length : 0} characters (base64)`);
          filePath = 'database'; // Signal to read from database
          fileContentFromDB = {
            content: fileRow.file_content,
            fileName: fileRow.filename,
            fileType: null, // Will be inferred from filename
            fileSize: fileRow.file_size
          };
        } else {
          console.log(`   ❌ No file_content found in standard_files_content table for standard_id: ${standardId}`);
        }
      } catch (dbError) {
        console.error(`❌ Error querying standard_files_content from Customer Data DB: ${dbError.message}`);
        console.error(`   Stack: ${dbError.stack}`);
      }
    }
    
    // Strategy 0B: Check if file_content exists in standards table (legacy storage)
    // NOTE: Standards and file_content are always in Customer Data DB (public.*)
    // Always use queryPostgres for public.standards
    if (!filePath) {
      try {
        console.log(`🔍 Checking file_content in standards table...`);
        const dbFileResult = await queryPostgres(
          `SELECT file_content, file_name, file_type, file_size, file_path
           FROM public.standards
           WHERE id = $1`,
          [standardId]
        );
        
        if (dbFileResult.rows.length > 0) {
          const row = dbFileResult.rows[0];
          if (row.file_content) {
            console.log(`✅ Found file_content in standards table (${row.file_size || 0} bytes)`);
            filePath = 'database'; // Signal to read from database
            fileContentFromDB = {
              content: row.file_content,
              fileName: row.file_name,
              fileType: row.file_type,
              fileSize: row.file_size
            };
          } else {
            console.log(`   ⚠️  Standard found but file_content is NULL`);
            console.log(`   File path in standards table: ${row.file_path || 'NULL'}`);
            console.log(`   File name: ${row.file_name || 'NULL'}`);
          }
        }
      } catch (dbError) {
        console.warn(`⚠️  Error querying standards.file_content from Customer Data DB: ${dbError.message}`);
      }
    }
    
    // Strategy 1: Get file_path from standards table (CONSOLIDATED) - fallback if no file_content
    // NOTE: Standards are always in Customer Data DB (public.*)
    if (!filePath) {
      try {
        console.log(`🔍 Checking file_path in Customer Data DB...`);
        const fileResult = await queryPostgres(
          `SELECT file_path FROM public.standards
           WHERE id = $1 AND file_path IS NOT NULL
           LIMIT 1`,
          [standardId]
        );
        
        if (fileResult.rows.length > 0 && fileResult.rows[0].file_path && fs.existsSync(fileResult.rows[0].file_path)) {
          filePath = fileResult.rows[0].file_path;
          console.log(`✅ Found file from standards table in Customer Data DB: ${filePath}`);
        }
      } catch (dbError) {
        console.warn(`⚠️  Error querying standards.file_path from Customer Data DB: ${dbError.message}`);
      }
    }
    
    // Strategy 3: Check Requirements folder directly (DEVELOPMENT ONLY - not available on Railway)
    // This is the KEY folder where all documents are stored: Requirements/Standards, Requirements/Regulatory, Requirements/Customer
    // NOTE: On Railway, files should be in database (standard_files_content or standards.file_content)
    // Only search filesystem if we're in development and the Requirements folder exists
    if (!filePath && process.env.NODE_ENV !== 'production') {
      const requirementsBaseDir = path.join(__dirname, '../../../EDCAT AIP/Requirements');
      
      // Only search if the base Requirements folder exists (development/local only)
      if (fs.existsSync(requirementsBaseDir)) {
        console.log(`🔍 Searching Requirements folder (development mode): ${requirementsBaseDir}`);
        
        // Get file_category to determine which folder to prioritize
        const standardWithCategory = await queryPostgres(
          `SELECT file_category, sector FROM public.standards WHERE id = $1`,
          [standardId]
        ).catch(() => ({ rows: [] }));
        
        const fileCategory = standardWithCategory.rows[0]?.file_category || standardWithCategory.rows[0]?.sector || null;
        const isRegulatory = fileCategory === 'regulatory' || standard.sector === 'regulatory';
        const isCustomer = fileCategory === 'customer' || fileCategory === 'customer_requirements' || standard.sector === 'customer';
        
        // Prioritize based on document type, but check ALL folders
        const requirementsDirs = isRegulatory
          ? [
              path.join(requirementsBaseDir, 'Regulatory'), // Check regulatory first
              path.join(requirementsBaseDir, 'Standards'),
              path.join(requirementsBaseDir, 'Customer')
            ]
          : isCustomer
          ? [
              path.join(requirementsBaseDir, 'Customer'), // Check customer first
              path.join(requirementsBaseDir, 'Standards'),
              path.join(requirementsBaseDir, 'Regulatory')
            ]
          : [
              path.join(requirementsBaseDir, 'Standards'), // Check standards first
              path.join(requirementsBaseDir, 'Regulatory'),
              path.join(requirementsBaseDir, 'Customer')
            ];
        
        // Build comprehensive search terms from standard code and name
        const standardCodeLower = standard.code.toLowerCase().replace(/[_\s-]/g, '');
        const standardNameLower = (standard.name || '').toLowerCase().replace(/[_\s-]/g, '');
        const searchTerms = [
          standard.code.toLowerCase(),
          standard.name?.toLowerCase(),
          standardCodeLower,
          standardNameLower,
          standard.code.replace(/[_\s-]/g, ''),
          standard.name?.replace(/[_\s-]/g, '')
        ];
        
        // Add partial matches (first 10 chars, first 20 chars, etc.)
        if (standard.code.length > 10) {
          searchTerms.push(standard.code.substring(0, 10).toLowerCase());
        }
        if (standard.name && standard.name.length > 10) {
          searchTerms.push(standard.name.substring(0, 10).toLowerCase());
        }
        
        console.log(`   Search terms: ${searchTerms.slice(0, 5).join(', ')}...`);
        console.log(`   Checking folders: ${requirementsDirs.map(d => path.basename(d)).join(', ')}`);
        
        // Recursive file search function
        const searchFilesRecursively = (dir, maxDepth = 10, currentDepth = 0) => {
          const results = [];
          if (currentDepth > maxDepth || !fs.existsSync(dir)) {
            return results;
          }
          
          try {
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
              const itemPath = path.join(dir, item);
              try {
                const stat = fs.statSync(itemPath);
                
                if (stat.isDirectory()) {
                  // Recursively search subdirectories
                  results.push(...searchFilesRecursively(itemPath, maxDepth, currentDepth + 1));
                } else if (stat.isFile() && /\.(pdf|docx?|xlsx?|txt)$/i.test(item)) {
                  results.push(itemPath);
                }
              } catch (statError) {
                // Skip files we can't access
                continue;
              }
            }
          } catch (readError) {
            console.warn(`   ⚠️  Error reading directory ${dir}: ${readError.message}`);
          }
          
          return results;
        };
        
        // Search all Requirements subfolders
        for (const reqDir of requirementsDirs) {
          if (!fs.existsSync(reqDir)) {
            console.log(`   ⚠️  Requirements folder does not exist: ${reqDir}`);
            continue;
          }
          
          try {
            console.log(`   📂 Searching: ${path.basename(reqDir)}/`);
            const files = searchFilesRecursively(reqDir);
            console.log(`   📄 Found ${files.length} files in ${path.basename(reqDir)}/`);
            
            // Try to match files
            for (const foundFilePath of files) {
              const fileName = path.basename(foundFilePath).toLowerCase();
              const fileNameNoExt = fileName.replace(/\.[^.]+$/, '').replace(/[_\s-]/g, '');
              
              // Check if filename matches any search term
              let matches = false;
              for (const term of searchTerms) {
                const termClean = term.replace(/[_\s-]/g, '');
                if (fileName.includes(term) || 
                    fileNameNoExt.includes(termClean) ||
                    termClean.includes(fileNameNoExt) ||
                    fileNameNoExt.includes(termClean.substring(0, Math.min(10, termClean.length)))) {
                  matches = true;
                  break;
                }
              }
              
              if (matches && fs.existsSync(foundFilePath)) {
                console.log(`✅ Found matching file in Requirements/${path.basename(reqDir)}/: ${path.basename(foundFilePath)}`);
                filePath = foundFilePath;
                break;
              }
            }
            
            if (filePath) break;
          } catch (err) {
            console.warn(`   ⚠️  Error searching Requirements folder ${reqDir}: ${err.message}`);
          }
        }
        
        if (!filePath) {
          console.log(`   ⚠️  No matching file found in Requirements folder`);
        }
      } else {
        console.log(`   ℹ️  Requirements folder not found (expected on Railway - files should be in database)`);
      }
    }
    
    // Strategy 4: Use filesystem search in uploads folder as fallback (secondary to Requirements folder)
    if (!filePath) {
      // Get file_category to prioritize regulatory folder
      const standardWithCategory = await queryPostgres(
        `SELECT file_category, sector FROM public.standards WHERE id = $1`,
        [standardId]
      ).catch(() => ({ rows: [] }));
      
      const fileCategory = standardWithCategory.rows[0]?.file_category || standardWithCategory.rows[0]?.sector || null;
      const isRegulatory = fileCategory === 'regulatory' || standard.sector === 'regulatory';
      const isCustomer = fileCategory === 'customer' || fileCategory === 'customer_requirements' || standard.sector === 'customer';
      
      console.log(`🔍 Fallback: Searching uploads folder...`);
      filePath = await findFileForStandard(standard, isRegulatory, isCustomer);
      if (filePath) {
        console.log(`✅ Found file via uploads folder search: ${filePath}`);
      }
    }
    
    if (!filePath && !fileContentFromDB) {
      // CRITICAL: On Railway, files MUST be in database (standard_files_content or standards.file_content)
      // If we reach here, the file is not in the database and not on filesystem
      console.error(`❌ File not found for standard ${standard.code}`);
      console.error(`   Checked:`);
      console.error(`   1. standard_files_content table (database blob storage)`);
      console.error(`   2. standards.file_content column (legacy database storage)`);
      console.error(`   3. standards.file_path (filesystem path)`);
      if (process.env.NODE_ENV !== 'production') {
        console.error(`   4. Requirements folder (development only)`);
        console.error(`   5. uploads folder (development only)`);
      }
      
      const availableFiles = await getAvailableUploads();
      return res.status(404).json({
        success: false,
        error: 'File not found',
        standard_code: standard.code,
        standard_name: standard.name,
        standard_id: standardId,
        file_category: standard.file_category || standard.sector,
        checked_locations: [
          'standard_files_content table (database)',
          'standards.file_content column (database)',
          'standards.file_path (filesystem)',
          ...(process.env.NODE_ENV !== 'production' ? ['Requirements folder', 'uploads folder'] : [])
        ],
        available_uploads: availableFiles,
        suggestion: process.env.NODE_ENV === 'production' 
          ? 'File content must be stored in the database. Please re-upload the document through the upload interface to store it in standard_files_content table.'
          : 'Please re-upload the standard file or ensure it exists in the Requirements folder or uploads directory.'
      });
    }

    // Read file content - handle database storage or filesystem
    console.log(`📖 Reading file: ${filePath || 'from database'}`);
    let fileContent;
    try {
      // If we have file_content from database, decode it directly
      if (fileContentFromDB && fileContentFromDB.content) {
        console.log(`📦 Using file_content from database (${fileContentFromDB.fileSize || 0} bytes)`);
        // fileContentFromDB.content is base64-encoded, decode it to buffer then extract text
        const fileBuffer = Buffer.from(fileContentFromDB.content, 'base64');
        const fileName = fileContentFromDB.fileName || 'document';
        const fileExt = path.extname(fileName).toLowerCase();
        
        // Extract text based on file type
        if (fileExt === '.pdf') {
          const pdfParse = (await import('pdf-parse')).default;
          const pdfData = await pdfParse(fileBuffer);
          fileContent = pdfData.text;
          console.log(`✅ Extracted ${pdfData.numpages} pages from PDF (${fileContent.length} characters)`);
        } else if (fileExt === '.docx' || fileExt === '.doc') {
          const mammoth = (await import('mammoth')).default;
          // For DOCX, we need to write to temp file or use buffer directly
          const tempPath = path.join(__dirname, '../../../temp', `temp_${standardId}${fileExt}`);
          const tempDir = path.dirname(tempPath);
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          fs.writeFileSync(tempPath, fileBuffer);
          const result = await mammoth.extractRawText({ path: tempPath });
          fileContent = result.value;
          // Clean up temp file
          try { fs.unlinkSync(tempPath); } catch (e) {}
          console.log(`✅ Extracted text from DOCX (${fileContent.length} characters)`);
        } else if (fileExt === '.txt') {
          fileContent = fileBuffer.toString('utf-8');
          console.log(`✅ Read text file (${fileContent.length} characters)`);
        } else {
          // Try PDF as default
          try {
            const pdfParse = (await import('pdf-parse')).default;
            const pdfData = await pdfParse(fileBuffer);
            fileContent = pdfData.text;
            console.log(`✅ Extracted ${pdfData.numpages} pages from PDF (${fileContent.length} characters)`);
          } catch (pdfError) {
            // Fallback to text
            fileContent = fileBuffer.toString('utf-8');
            console.log(`✅ Read as text (${fileContent.length} characters)`);
          }
        }
      } else if (filePath === 'database') {
        // Fallback: try reading from database using standardId
        fileContent = await readDocumentFromDatabase(standardId, null);
        console.log(`✅ Successfully read ${fileContent.length} characters from database`);
      } else if (filePath) {
        // Read from filesystem
        fileContent = await readDocumentFile(filePath);
        console.log(`✅ Successfully read ${fileContent.length} characters from filesystem`);
      } else {
        throw new Error('No file source found (neither file_content in database nor file_path on filesystem)');
      }
    } catch (readError) {
      console.error(`❌ Error reading file: ${readError.message}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to read file',
        details: readError.message,
        filePath: filePath,
        hint: 'File may have been lost due to Railway redeploy. Please re-upload the document.'
      });
    }

    // Extract requirements
    console.log(`🔍 Extracting requirements from ${standard.code}...`);
    console.log(`   File content length: ${fileContent.length} characters`);
    console.log(`   First 200 chars: ${fileContent.substring(0, 200)}...`);
    
    // Get file_category from standard to help parser detect document type
    // NOTE: Standards are always in Customer Data DB (public.*)
    const standardWithCategory = await queryPostgres(
      `SELECT file_category, sector FROM public.standards WHERE id = $1`,
      [standardId]
    );
    const fileCategory = standardWithCategory.rows[0]?.file_category || standardWithCategory.rows[0]?.sector || null;
    
    let extractedRequirements;
    try {
      extractedRequirements = await extractRequirementsBounded(
        fileContent,
        standard.name,
        standard.code,
        standardId,
        {
          fileCategory: fileCategory,
          documentName: standard.name,
          standardCode: standard.code
        }
      );
      console.log(`✅ Extracted ${extractedRequirements.length} requirements`);
      
      if (extractedRequirements.length === 0) {
        console.warn(`⚠️  WARNING: No requirements extracted from ${fileContent.length} character document`);
        console.warn(`   This could mean:`);
        console.warn(`   1. Document is empty or corrupted`);
        console.warn(`   2. Extraction logic didn't find any requirements`);
        console.warn(`   3. Document format is not supported`);
        console.warn(`   Document preview (first 500 chars): ${fileContent.substring(0, 500)}`);
      }
    } catch (extractError) {
      console.error(`❌ Error extracting requirements: ${extractError.message}`);
      console.error(`   Stack: ${extractError.stack}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to extract requirements',
        details: extractError.message
      });
    }

    // CRITICAL FIX: Always delete existing requirements before re-parsing
    // This ensures we don't have stale data and can properly update the count
    if (existingCount > 0) {
      console.log(`🗑️  Clearing old requirements for standard ${standardId}...`);
      const deleteResult = await queryPostgres(
        `DELETE FROM public.parsed_requirements WHERE standard_id = $1`,
        [standardId]
      );
      console.log(`🗑️  Deleted ${deleteResult.rowCount || existingCount} old requirements`);
      console.log(`✅ Ready to insert new requirements`);
      
      // Reset existingCount since we just deleted everything
      existingCount = 0;
    }

    // Store requirements in database with clause titles and types
    let storedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    let duplicateCount = 0;

    console.log(`\n💾 STORING ${extractedRequirements.length} REQUIREMENTS:`);
    console.log(`   Force re-parse: ${forceReparse}`);

    for (const req of extractedRequirements) {
      try {
        // STANDARDIZED FORMAT: Map new format fields
        // Check if this is the new standardized format
        const isStandardizedFormat = req.clause !== undefined && req.subclause !== undefined;
        
        // DEBUG: Log first few requirements to see format
        if (storedCount < 5) {
          console.log(`[PARSE] Requirement ${storedCount + 1} format check:`, {
            hasClause: req.clause !== undefined,
            hasSubclause: req.subclause !== undefined,
            hasParagraph: req.paragraph !== undefined,
            isStandardized: isStandardizedFormat,
            clause: req.clause,
            subclause: req.subclause,
            paragraph: req.paragraph,
            requirement: req.requirement ? req.requirement.substring(0, 50) : req.text ? req.text.substring(0, 50) : req.requirement_text ? req.requirement_text.substring(0, 50) : 'N/A',
            allKeys: Object.keys(req)
          });
        }
        
        let clauseNumber, clauseTitle, clauseRef, subRef, fullRef, subjectText;
        let clauseName = null;
        let subclauseName = null;
        let subParagraph = null;
        
        if (isStandardizedFormat) {
          // NEW STANDARDIZED FORMAT
          const topLevelClause = req.clause || 'N/A';
          clauseName = req.clause_name || null;
          const subclause = req.subclause || 'N/A';
          subclauseName = req.subclause_name || null;
          subParagraph = req.sub_paragraph || null;
          const paragraph = req.paragraph || 'P1';
          
          // CRITICAL FIX: Map standardized format correctly to database columns
          // clause_number should contain the FULL subclause path (e.g., "8.5.1")
          clauseNumber = subclause; // Full subclause path (e.g., "8.5.1")
          // clause_title should contain the subclause name
          clauseTitle = subclauseName || clauseName || (subclause !== 'N/A' ? `Clause ${subclause}` : null);
          // clause_ref should contain the top-level clause (e.g., "8")
          clauseRef = topLevelClause; // Top-level clause number (e.g., "8")
          subRef = null; // Not used in standardized format
          // full_ref should also contain the subclause path for backward compatibility
          fullRef = subclause; // Full subclause path (e.g., "8.5.1")
          // subject_text should contain the paragraph (e.g., "P1", "P2")
          subjectText = paragraph; // Paragraph designation (P1, P2, etc.)
          
          // Reduced logging
        } else {
          // LEGACY FORMAT (backward compatibility)
          clauseNumber = req.clause || req.clauseNumber || req.clause_number || req.full_ref || 'N/A';
          clauseTitle = req.clauseTitle || req.clause_title || (clauseNumber !== 'N/A' ? `Clause ${clauseNumber}` : null);
          clauseRef = req.clause_ref || (clauseNumber.includes('.') ? clauseNumber.split('.').slice(0, -1).join('.') : clauseNumber);
          subRef = req.sub_ref || null;
          fullRef = req.full_ref || clauseNumber;
          subjectText = req.subject_text || 'implicit';
          
          // Reduced logging
        }
        
        // CRITICAL FIX: Ensure clauseTitle is never null or 'Untitled' - use fallback
        if (!clauseTitle || clauseTitle === 'Untitled') {
          if (fullRef && fullRef !== 'N/A') {
            clauseTitle = `Clause ${fullRef}`;
          } else {
            clauseTitle = 'Untitled';
          }
        }
        
        const requirementType = req.requirement_type || req.requirementType || null;
        const requirementSubtype = req.requirement_subtype || null;
        const intent = req.intent || 'OTHER';
        const requirementUid = req.requirement_uid || req.requirement_id || null;
        
        // NEW: Classification metadata
        const clausePathDepth = req.clause_path_depth || (fullRef.split('.').length);
        const modalVerb = req.modal_verb || null;
        const isInformativeNote = req.is_informative_note || false;
        const isRecommendation = req.is_recommendation || false;
        const isInScope = req.is_in_scope !== false; // Default true
        const extractionFlags = req.extraction_flags || [];
        
        // NEW: Aerospace and documentation flags
        const aerospaceAddition = req.aerospace_addition || false;
        const requiresMaintainedDi = req.requires_maintained_di || false;
        const requiresRetainedDi = req.requires_retained_di || false;
        
        // Handle keywords: convert to simple text or JSON properly
        let keywordsValue = '';
        if (req.keywords) {
          if (Array.isArray(req.keywords)) {
            // It's already an array - store as comma-separated text
            keywordsValue = req.keywords.join(', ');
          } else if (typeof req.keywords === 'string') {
            // Already a string - use as-is
            keywordsValue = req.keywords;
          } else {
            // Try to stringify it
            keywordsValue = JSON.stringify(req.keywords);
          }
        }
        
        const requirementText = req.requirement || req.text || req.requirement_text || '';
        
        if (!requirementText || requirementText.trim().length === 0) {
          skippedCount++;
          if (skippedCount <= 5) {
            console.warn(`⚠️  Skipping requirement with empty text for clause ${clauseNumber}`);
          }
          continue;
        }
        
        // Check if requirement already exists
        // CRITICAL FIX: Use better unique identifier - prefer (standard_id, subclause, paragraph) for new format
        // or (standard_id, requirement_uid) if available, otherwise fall back to (standard_id, full_ref)
        let existingReq;
        if (requirementUid) {
          existingReq = await queryPostgres(
            `SELECT id FROM public.parsed_requirements 
             WHERE standard_id = $1 AND requirement_uid = $2
             LIMIT 1`,
            [standardId, requirementUid]
          );
        } else if (isStandardizedFormat && subjectText && subjectText !== 'implicit' && subjectText !== 'P1') {
          // NEW FORMAT: Use (standard_id, clause_number, subject_text) as unique key
          // CRITICAL FIX: Use existing columns clause_number (stores subclause) and subject_text (stores paragraph)
          existingReq = await queryPostgres(
            `SELECT id FROM public.parsed_requirements 
             WHERE standard_id = $1 AND clause_number = $2 AND subject_text = $3
             LIMIT 1`,
            [standardId, fullRef, subjectText]
          );
        } else {
          // LEGACY FORMAT: Use (standard_id, full_ref) but also check requirement_text to avoid false duplicates
          existingReq = await queryPostgres(
            `SELECT id FROM public.parsed_requirements 
             WHERE standard_id = $1 AND full_ref = $2 AND requirement_text = $3
             LIMIT 1`,
            [standardId, fullRef, requirementText.substring(0, 100)] // Use first 100 chars to match
          );
        }

        let result = null;
        if (existingReq.rows.length > 0 && !forceReparse) {
          // Skip if already exists and not force re-parsing
          duplicateCount++;
          if (duplicateCount <= 5) {
            console.log(`⏭️  Skipping duplicate: ${clauseNumber} (already exists)`);
          } else if (duplicateCount === 6) {
            console.log(`⏭️  ... (skipping more duplicates, will show total at end)`);
          }
          continue;
        }

        if (existingReq.rows.length > 0 && forceReparse) {
          // Update existing requirement with all new fields including sub-refs
          // CRITICAL FIX: Use PostgreSQL as single source of truth
          result = await queryPostgres(
            `UPDATE public.parsed_requirements
             SET clause_title = $1, requirement_text = $2, confidence = $3,
                 intent = $4, keywords = $5, requirement_type = $6, keyword = $7,
                 requirement_subtype = $8, clause_path_depth = $9, subject_text = $10,
                 modal_verb = $11, is_informative_note = $12, is_recommendation = $13,
                 is_in_scope = $14, extraction_flags = $15,
                 clause_ref = $16, sub_ref = $17, full_ref = $18, requirement_uid = $19,
                 aerospace_addition = $20, requires_maintained_di = $21, requires_retained_di = $22,
                 clause_number = $23, extracted_at = NOW()
             WHERE id = $24
             RETURNING id`,
            [
              clauseTitle, requirementText, req.confidence || 0.75, intent, keywordsValue,
              requirementType, req.keyword || 'shall', requirementSubtype, clausePathDepth,
              subjectText, modalVerb, isInformativeNote, isRecommendation, isInScope,
              extractionFlags, clauseRef, subRef, fullRef, requirementUid,
              aerospaceAddition, requiresMaintainedDi, requiresRetainedDi,
              clauseNumber, // CRITICAL FIX: Also update clause_number
              existingReq.rows[0].id
            ]
          );
        } else if (existingReq.rows.length === 0) {
          // Insert new requirement with all new fields including sub-refs
          // ROOT CAUSE FIX: Use PostgreSQL as single source of truth
          // NOTE: Table doesn't have subclause/paragraph columns yet, so we store in existing columns
          result = await queryPostgres(
            `INSERT INTO public.parsed_requirements 
            (standard_id, clause_number, clause_title, requirement_text, 
             confidence, extracted_at, intent, keywords, requirement_type, keyword,
             requirement_subtype, clause_path_depth, subject_text, modal_verb,
             is_informative_note, is_recommendation, is_in_scope, extraction_flags,
             clause_ref, sub_ref, full_ref, requirement_uid,
             aerospace_addition, requires_maintained_di, requires_retained_di)
            VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
            RETURNING id`,
            [
              standardId,
              clauseNumber, // CRITICAL FIX: Use clauseNumber (subclause path) not fullRef
              clauseTitle,
              requirementText,
              req.confidence || 0.75,
              intent,
              keywordsValue,
              requirementType,
              req.keyword || 'shall',
              requirementSubtype,
              clausePathDepth,
              subjectText, // Store paragraph (P1, P2, etc.) in subject_text
              modalVerb,
              isInformativeNote,
              isRecommendation,
              isInScope,
              extractionFlags,
              clauseRef, // Top-level clause (e.g., "8")
              subRef,
              fullRef, // Full subclause path (e.g., "8.5.1") - same as clauseNumber for standardized format
              requirementUid,
              aerospaceAddition,
              requiresMaintainedDi,
              requiresRetainedDi
            ]
          );
        }
        
        // Count as stored if we inserted/updated a row
        if (result && ((result.rows && result.rows.length > 0) || result.rowCount > 0)) {
          storedCount++;
          
          // Auto-index the new parsed requirement
          try {
            const requirementId = result.rows?.[0]?.id;
            if (requirementId) {
              const VeraAutoIndexingService = (await import('../services/vera/VeraAutoIndexingService.js')).default;
              await VeraAutoIndexingService.indexParsedRequirement({
                requirementId,
                tenantId: standardId // Using standardId as tenant context
              });
            }
          } catch (indexError) {
            console.warn('[parse] Could not auto-index requirement:', indexError.message);
          }
        } else if (result && result.rows && result.rows.length === 0 && existingReq.rows.length === 0) {
          // ON CONFLICT DO NOTHING was triggered - requirement already exists
          duplicateCount++;
          if (duplicateCount <= 5) {
            console.log(`⏭️  Skipped due to unique constraint: ${clauseNumber} (ON CONFLICT)`);
          }
        }
        
      } catch (error) {
        errorCount++;
        const clauseInfo = req.clause_number || req.clause || req.full_ref || 'N/A';
        const requirementPreview = (req.requirement || req.text || req.requirement_text || '').substring(0, 100);
        
        console.error(`❌ Could not store requirement for clause ${clauseInfo}: ${error.message}`);
        console.error(`   Requirement preview: ${requirementPreview}...`);
        
        if (error.code === '23505') { // Unique constraint violation
          console.error(`   ⚠️  UNIQUE CONSTRAINT VIOLATION - This requirement already exists`);
        } else if (error.code === '42703') { // Undefined column
          console.error(`   ⚠️  DATABASE SCHEMA ERROR - Column does not exist: ${error.message}`);
          console.error(`   This is a critical bug - check INSERT statement column names`);
        } else {
          console.error(`   ⚠️  STORAGE ERROR - ${error.code || 'UNKNOWN'}: ${error.message}`);
        }
        
        // Always log first 10 errors with full details
        if (errorCount <= 10) {
          console.error(`   Full error:`, error);
          console.error(`   Stack:`, error.stack);
        } else if (errorCount === 11) {
          console.error(`   ... (suppressing further error details, total errors: ${errorCount}+)`);
        }
      }
    }
    
    console.log(`\n📊 STORAGE SUMMARY:`);
    console.log(`   Total extracted: ${extractedRequirements.length}`);
    console.log(`   Successfully stored: ${storedCount}`);
    console.log(`   Skipped (empty text): ${skippedCount}`);
    console.log(`   Skipped (duplicates, not force): ${duplicateCount}`);
    console.log(`   Storage errors: ${errorCount}`);
    
    // CRITICAL: Report if error rate is high
    if (errorCount > 0) {
      const errorRate = (errorCount / extractedRequirements.length * 100).toFixed(1);
      console.error(`\n⚠️  WARNING: ${errorCount} storage error(s) (${errorRate}% failure rate)`);
      if (errorRate > 10) {
        console.error(`   ❌ CRITICAL: Error rate exceeds 10% - parsing may be broken`);
        console.error(`   Check database schema and column names in INSERT statement`);
      }
    }
    
    // Report if stored count is much lower than extracted
    if (storedCount < extractedRequirements.length * 0.5) {
      const lossRate = ((extractedRequirements.length - storedCount) / extractedRequirements.length * 100).toFixed(1);
      console.error(`\n⚠️  WARNING: Only ${storedCount} of ${extractedRequirements.length} requirements stored (${lossRate}% lost)`);
      console.error(`   This indicates silent failures - check error logs above`);
    }

    // CRITICAL FIX: Count actual requirements in database (not just storedCount)
    // This ensures the count is accurate even if some inserts failed
    const countResult = await queryPostgres(
      `SELECT COUNT(*) as total FROM public.parsed_requirements WHERE standard_id = $1`,
      [standardId]
    );
    const actualCount = parseInt(countResult.rows[0]?.total || 0, 10);
    
    // Update standard requirement count in PostgreSQL (single source of truth)
    // CRITICAL: Always update, even if storedCount is 0 (for re-parses that result in 0 requirements)
    await queryPostgres(
      `UPDATE public.standards
       SET total_clauses = $1, total_requirements = $1, parsed_at = NOW()
       WHERE id = $2`,
      [actualCount, standardId]
    );
    console.log(`📊 Updated standards table: total_clauses=${actualCount}, total_requirements=${actualCount}, parsed_at=NOW()`);
    console.log(`   (Stored ${storedCount} new requirements, actual count in DB: ${actualCount})`);

    console.log(`\n✅ PARSE COMPLETE`);
    console.log(`   Standard: ${standard.code}`);
    console.log(`   Requirements stored: ${storedCount}`);
    console.log(`   Storage errors: ${errorCount}`);
    console.log(`   Skipped (empty): ${skippedCount}`);
    console.log(`   Skipped (duplicates): ${duplicateCount}`);
    console.log(`   Total extracted: ${extractedRequirements.length}`);

    // ROOT CAUSE FIX: Use PostgreSQL as single source of truth
    // Use actualCount from database query above
    const updatedCount = actualCount;
    
    // QA: Comprehensive health checks with hard gates
    // CRITICAL: Skip strict QA validation for regulatory and customer requirement documents
    // They have different structures (section-based like 21.137, not clause-based like 4.1, 8.5.1)
    const isRegulatory = fileCategory === 'regulatory' || 
                        standard.code?.toUpperCase().includes('CASA') ||
                        standard.code?.toUpperCase().includes('FAA') ||
                        standard.code?.toUpperCase().includes('EASA') ||
                        standard.code?.toUpperCase().includes('PART') ||
                        standard.code?.toUpperCase().includes('CFR') ||
                        standard.sector === 'regulatory';
    
    const isCustomerRequirement = fileCategory === 'customer' || 
                                  fileCategory === 'customer_requirement' ||
                                  standard.sector === 'customer';
    
    const isStandard = !isRegulatory && !isCustomerRequirement;
    
    console.log(`\n🔍 QA CHECKS:`);
    console.log(`   Document type: ${isRegulatory ? 'REGULATORY' : isCustomerRequirement ? 'CUSTOMER REQUIREMENT' : 'STANDARD'}`);
    
    // Get metrics
    const metrics = await requirementMetrics(standardId);
    const totalInScope = parseInt(metrics.totals.in_scope_total || '0', 10);
    const totalOutScope = parseInt(metrics.totals.out_scope_total || '0', 10);
    
    // Build QA report
    const qaIssues = [];
    const qaWarnings = [];
    
    // STANDARD-SPECIFIC QA CHECKS (only for ISO/AS standards)
    if (isStandard) {
      // Check for requirements in clauses 1-3 (should be zero) - PostgreSQL
      const badScopeResult = await queryPostgres(`
        SELECT clause_ref FROM public.parsed_requirements
        WHERE standard_id = $1 AND requirement_type IS NOT NULL
          AND (split_part(clause_ref, '.', 1) IN ('1', '2', '3') OR NOT is_in_scope)
        LIMIT 5
      `, [standardId]);
      
      // Check which top clauses have requirements
      const topClauseSet = new Set(metrics.byClause.map(r => r.top_clause));
      const missingTopClauses = ['4', '5', '6', '7', '8', '9', '10'].filter(c => !topClauseSet.has(c));
      
      // HARD GATES: Fail if out-of-scope requirements found
      if (badScopeResult.rows.length > 0) {
        qaIssues.push(`OUT-OF-SCOPE: Requirements found in clauses 1-3 or marked out-of-scope (e.g., ${badScopeResult.rows.map(r => r.clause_ref).join(', ')})`);
      }
      
      // WARNINGS: Range checks (ISO/AS standards typically have 300-420 requirements)
      if (totalInScope < 300) {
        qaWarnings.push(`Requirement total ${totalInScope} below expected minimum (300)`);
      }
      if (totalInScope > 420) {
        qaWarnings.push(`Requirement total ${totalInScope} above expected maximum (420)`);
      }
      
      // WARNINGS: Missing clauses
      if (missingTopClauses.length > 0) {
        qaWarnings.push(`No requirements found in clauses: ${missingTopClauses.join(', ')}`);
      }
    } else {
      // REGULATORY/CUSTOMER REQUIREMENT QA CHECKS (relaxed)
      console.log(`   ⚠️  Skipping standard-specific QA checks (regulatory/customer document)`);
      
      // Only check for minimum requirements (regulatory docs can vary widely)
      if (totalInScope < 10) {
        qaWarnings.push(`Requirement total ${totalInScope} is very low (expected at least 10)`);
      }
    }
    
    // WARNINGS: Out-of-scope count (applies to all document types)
    if (totalOutScope > 0) {
      qaWarnings.push(`${totalOutScope} requirement(s) marked as out-of-scope (should be 0)`);
    }
    
    const qaReport = {
      document_type: isRegulatory ? 'regulatory' : isCustomerRequirement ? 'customer_requirement' : 'standard',
      expected_range: isStandard ? '300–420' : 'variable',
      total_in_scope: totalInScope,
      total_out_scope: totalOutScope,
      by_clause: metrics.byClause,
      by_subtype: metrics.bySubtype,
      by_type: metrics.byType,
      issues: qaIssues,
      warnings: qaWarnings,
      status: qaIssues.length > 0 ? 'FAIL' : (qaWarnings.length > 0 ? 'WARN' : 'PASS')
    };
    
    console.log(`   ✓ Total in-scope: ${totalInScope}`);
    console.log(`   ✓ Total out-scope: ${totalOutScope}`);
    console.log(`   ✓ Status: ${qaReport.status}`);
    if (qaIssues.length > 0) {
      console.log(`   ❌ ISSUES: ${qaIssues.join('; ')}`);
    }
    if (qaWarnings.length > 0) {
      console.log(`   ⚠️  WARNINGS: ${qaWarnings.join('; ')}`);
    }
    
    // FAIL parse if hard gates violated (only for standards)
    // Regulatory and customer requirements get more lenient treatment
    if (qaIssues.length > 0 && isStandard) {
      return res.status(422).json({
        success: false,
        error: 'QA validation failed',
        qa: qaReport,
        message: 'Parse completed but QA gates failed. See qa.issues for details.'
      });
    }
    
    console.log(`\n📊 VERIFICATION:`);
    console.log(`   Stored in DB: ${storedCount} requirements`);
    console.log(`   Updated total_requirements field: ${updatedCount}`);
    console.log(`   Standard ID: ${standardId}`);

        res.json({
          success: true,
          message: `Standard parsed successfully. ${storedCount} requirements extracted.`,
          standard: {
            id: standard.id,
            code: standard.code,
            name: standard.name
          },
          requirementsCount: storedCount,
          clausesExtracted: storedCount, // Alias for frontend compatibility
          totalRequirements: updatedCount, // The actual value in the database
          qa: qaReport, // QA health report with metrics
          metrics: metrics, // Full metrics breakdown
          parsedAt: new Date().toISOString(),
          status: qaReport.status // PASS, WARN, or FAIL
        });

  } catch (error) {
    console.error('❌ Parse error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/parse/status/:standardId
 * Get parsing status for a standard
 */
router.get('/status/:standardId', async (req, res) => {
  try {
    const { standardId } = req.params;

    // CRITICAL: Use parsed_requirements table (single source of truth)
    const requirementsResult = await queryPostgres(
      `SELECT COUNT(*) as count FROM public.parsed_requirements WHERE standard_id = $1`,
      [standardId]
    );

    const requirementsCount = parseInt(requirementsResult.rows[0].count);

    res.json({
      success: true,
      standardId: standardId,
      isParsed: requirementsCount > 0,
      requirementsCount: requirementsCount,
      message: requirementsCount > 0 ? 'Standard has been parsed.' : 'Standard has not been parsed yet.'
    });
  } catch (error) {
    console.error('Error getting parse status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
