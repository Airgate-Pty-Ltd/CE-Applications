/**
 * Ingest Terms and Definitions
 * 
 * Extracts terms, acronyms, and definitions from DOCX and PDF files
 * in the "Terms and Definitions" folder and stores them in edcat.terms_and_definitions
 * 
 * Usage: node backend/src/scripts/ingest-terms-definitions.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import dotenv from 'dotenv';
import { queryEdcatAI } from '../config/databases.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

// Terms folder path - try multiple possible locations
const possiblePaths = [
  'C:\\Users\\oleab\\OneDrive\\Conform-Edge\\EDCAT-Administrator\\backend\\EDCAT AIP\\Requirements\\Terms and Definitions', // Exact path from user
  path.join(__dirname, '../../../EDCAT AIP/Requirements/Terms and Definitions'),
  path.join(__dirname, '../../../../EDCAT AIP/Requirements/Terms and Definitions'),
  path.join(process.cwd(), 'backend/EDCAT AIP/Requirements/Terms and Definitions'),
  path.join(process.cwd(), 'EDCAT AIP/Requirements/Terms and Definitions')
];

let TERMS_FOLDER = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    TERMS_FOLDER = p;
    break;
  }
}

if (!TERMS_FOLDER) {
  console.error('[ingest-terms] ERROR: Could not find Terms and Definitions folder. Tried:');
  possiblePaths.forEach(p => console.error(`  - ${p}`));
  process.exit(1);
}

/**
 * Extract text from PDF
 */
async function extractTextFromPDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error(`[ingest-terms] Error reading PDF ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Extract text from DOCX
 */
async function extractTextFromDOCX(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.error(`[ingest-terms] Error reading DOCX ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Detect source standard/organization from filename
 */
function detectSourceStandard(fileName) {
  const upper = fileName.toUpperCase();
  
  // Aerospace standards (highest priority for aerospace files)
  if (upper.includes('AS9100') || upper.includes('AS 9100') || upper.includes('AS9110') || upper.includes('AS9120')) return 'AS9100';
  if (upper.includes('FAA')) return 'FAA';
  if (upper.includes('CASA')) return 'CASA';
  if (upper.includes('EASA')) return 'EASA';
  if (upper.includes('UK CAA') || upper.includes('UKCAA')) return 'UK CAA';
  if (upper.includes('AEROSPACE') || upper.includes('AIRCRAFT') || upper.includes('AVIATION')) return 'ASQ'; // ASQ often covers aerospace
  
  // Automotive standards
  if (upper.includes('IATF') || upper.includes('16949')) return 'IATF';
  if (upper.includes('AUTOMOTIVE') || upper.includes('AUTONATION') || upper.includes('NOREGON')) return 'IATF'; // Default to IATF for automotive
  
  // Quality standards
  if (upper.includes('ISO9001') || upper.includes('ISO 9001') || upper.includes('ISO')) return 'ISO9001';
  if (upper.includes('ASQ')) return 'ASQ';
  if (upper.includes('ETQ')) return 'ETQ';
  if (upper.includes('VEEVA')) return 'VEEVA';
  if (upper.includes('WESTGARD')) return 'WESTGARD';
  if (upper.includes('MANUFACTURING')) return 'MANUFACTURING';
  if (upper.includes('QUALITY')) return 'QUALITY_GENERAL';
  
  return 'UNKNOWN';
}

/**
 * Detect category from filename
 */
function detectCategory(fileName) {
  const upper = fileName.toUpperCase();
  
  // Industry-specific categories (highest priority)
  if (upper.includes('AUTOMOTIVE') || upper.includes('AUTONATION') || upper.includes('IATF') || upper.includes('NOREGON')) {
    return 'automotive';
  }
  if (upper.includes('AEROSPACE') || upper.includes('AS9100') || upper.includes('AS9110') || upper.includes('AS9120') || upper.includes('FAA') || upper.includes('AIRCRAFT') || upper.includes('AVIATION')) {
    return 'aerospace';
  }
  
  // General categories
  if (upper.includes('QUALITY')) return 'quality';
  if (upper.includes('MANUFACTURING')) return 'manufacturing';
  if (upper.includes('STATISTICAL') || upper.includes('STATISTICS')) return 'statistics';
  if (upper.includes('REGULATORY')) return 'regulatory';
  if (upper.includes('ACRONYM')) return 'acronyms';
  
  return 'general';
}

/**
 * Parse terms and definitions from text
 * Handles various formats:
 * - "Term: Definition"
 * - "Term - Definition"
 * - "Term (ACRONYM): Definition"
 * - "ACRONYM: Expanded Form - Definition"
 * - Bullet lists
 * - Numbered lists
 * - Table formats (term in one column, definition in another)
 * - Multi-line definitions
 */
function parseTermsFromText(text, fileName) {
  const terms = [];
  // Split by lines but also handle multi-line definitions
  const lines = text.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);
  
  const sourceStandard = detectSourceStandard(fileName);
  const category = detectCategory(fileName);
  
  // Pattern 1: "Term: Definition" or "Term - Definition"
  const colonPattern = /^([A-Z][A-Z0-9\s\-\.]+?)[:\-]\s*(.+)$/i;
  // Pattern 2: "Term (ACRONYM): Definition"
  const acronymPattern = /^([A-Z][A-Z0-9\s\-\.]+?)\s*\(([A-Z]{2,})\)[:\-]\s*(.+)$/i;
  // Pattern 3: "ACRONYM: Expanded Form - Definition"
  const expandedAcronymPattern = /^([A-Z]{2,})[:\-]\s*([A-Z][^:\-]+?)[:\-]\s*(.+)$/i;
  // Pattern 4: Bullet point with term
  const bulletPattern = /^[•\-\*]\s*([A-Z][A-Z0-9\s\-\.]+?)[:\-]\s*(.+)$/i;
  // Pattern 5: Numbered list
  const numberedPattern = /^\d+[\.\)]\s*([A-Z][A-Z0-9\s\-\.]+?)[:\-]\s*(.+)$/i;
  // Pattern 6: Tab-separated (common in tables)
  const tabPattern = /^([A-Z][A-Z0-9\s\-\.]+?)\t+(.+)$/i;
  // Pattern 7: Multiple spaces (table-like)
  const spaceTablePattern = /^([A-Z][A-Z0-9\s\-\.]{1,30})\s{3,}(.+)$/i;
  
  // Track current term/definition for multi-line definitions
  let currentTerm = null;
  let currentDefinition = null;
  let currentAcronym = null;
  let currentIsAcronym = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let term = null;
    let acronym = null;
    let definition = null;
    let isAcronym = false;
    
    // Try expanded acronym pattern first
    const expandedMatch = line.match(expandedAcronymPattern);
    if (expandedMatch) {
      term = expandedMatch[1].trim();
      acronym = expandedMatch[2].trim();
      definition = expandedMatch[3].trim();
      isAcronym = true;
    }
    // Try acronym pattern
    else {
      const acronymMatch = line.match(acronymPattern);
      if (acronymMatch) {
        term = acronymMatch[1].trim();
        acronym = acronymMatch[2].trim();
        definition = acronymMatch[3].trim();
        isAcronym = true;
      }
      // Try bullet pattern
      else {
        const bulletMatch = line.match(bulletPattern);
        if (bulletMatch) {
          term = bulletMatch[1].trim();
          definition = bulletMatch[2].trim();
        }
        // Try numbered pattern
        else {
          const numberedMatch = line.match(numberedPattern);
          if (numberedMatch) {
            term = numberedMatch[1].trim();
            definition = numberedMatch[2].trim();
          }
          // Try colon/dash pattern
          else {
            const colonMatch = line.match(colonPattern);
            if (colonMatch) {
              term = colonMatch[1].trim();
              definition = colonMatch[2].trim();
              
              // Check if term looks like an acronym (all caps, 2-10 chars)
              if (/^[A-Z]{2,10}$/.test(term)) {
                isAcronym = true;
              }
            }
          }
        }
      }
    }
    
    // If we found a term, store it (may be multi-line)
    if (term && definition && definition.length > 5) {
      // Clean term (remove extra spaces, normalize)
      term = term.replace(/\s+/g, ' ').trim();
      
      // Clean definition
      definition = definition.replace(/\s+/g, ' ').trim();
      
      // Skip if term is too short
      if (term.length < 2) {
        continue;
      }
      
      // If definition is very short, it might continue on next line
      if (definition.length < 20 && i < lines.length - 1) {
        // Check if next line doesn't look like a new term
        const nextLine = lines[i + 1];
        if (nextLine && !nextLine.match(/^[A-Z][A-Z0-9\s\-\.]+?[:\-]/i) && !nextLine.match(/^[•\-\*]/) && !nextLine.match(/^\d+[\.\)]/)) {
          // Continue definition on next line
          currentTerm = term;
          currentAcronym = acronym || null;
          currentDefinition = definition;
          currentIsAcronym = isAcronym;
          continue;
        }
      }
      
      // Create short definition (first 100 chars)
      const shortDefinition = definition.length > 100 
        ? definition.substring(0, 100) + '...' 
        : definition;
      
      terms.push({
        term,
        acronym: acronym || null,
        definition,
        short_definition: shortDefinition,
        category,
        source_standard: sourceStandard,
        source_document: fileName,
        is_acronym: isAcronym,
        is_standard_term: sourceStandard !== 'UNKNOWN'
      });
    }
  }
  
  // Save any remaining accumulated definition
  if (currentTerm && currentDefinition) {
    terms.push({
      term: currentTerm,
      acronym: currentAcronym || null,
      definition: currentDefinition.trim(),
      short_definition: currentDefinition.length > 100 
        ? currentDefinition.substring(0, 100) + '...' 
        : currentDefinition.trim(),
      category,
      source_standard: sourceStandard,
      source_document: fileName,
      is_acronym: currentIsAcronym,
      is_standard_term: sourceStandard !== 'UNKNOWN'
    });
  }
  
  return terms;
}

/**
 * Store term in database
 */
async function storeTerm(termData, fileId, filePath) {
  try {
    await queryEdcatAI(
      `INSERT INTO edcat.terms_and_definitions (
        tenant_id, term, acronym, definition, short_definition,
        category, source_standard, source_document,
        is_acronym, is_standard_term, source_file_path,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
      )
      ON CONFLICT (term, source_standard, source_document) 
      DO UPDATE SET
        definition = EXCLUDED.definition,
        short_definition = EXCLUDED.short_definition,
        acronym = COALESCE(EXCLUDED.acronym, terms_and_definitions.acronym),
        category = COALESCE(EXCLUDED.category, terms_and_definitions.category),
        updated_at = NOW()`,
      [
        DEFAULT_TENANT_ID,
        termData.term,
        termData.acronym,
        termData.definition,
        termData.short_definition,
        termData.category,
        termData.source_standard,
        termData.source_document,
        termData.is_acronym,
        termData.is_standard_term,
        filePath
      ]
    );
    return true;
  } catch (error) {
    console.error(`[ingest-terms] Error storing term "${termData.term}":`, error.message);
    return false;
  }
}

/**
 * Process a single file
 */
async function processFile(filePath) {
  const fileName = path.basename(filePath);
  const ext = path.extname(fileName).toLowerCase();
  
  console.log(`[ingest-terms] Processing: ${fileName}`);
  
  let text = null;
  
  if (ext === '.pdf') {
    text = await extractTextFromPDF(filePath);
  } else if (ext === '.docx') {
    text = await extractTextFromDOCX(filePath);
  } else {
    console.warn(`[ingest-terms] Skipping unsupported file type: ${fileName}`);
    return { processed: 0, stored: 0 };
  }
  
  if (!text || text.length < 50) {
    console.warn(`[ingest-terms] No text extracted from ${fileName}`);
    return { processed: 0, stored: 0 };
  }
  
  // Parse terms from text
  const terms = parseTermsFromText(text, fileName);
  console.log(`[ingest-terms] Found ${terms.length} terms in ${fileName}`);
  
  // Store each term
  let stored = 0;
  for (const termData of terms) {
    if (await storeTerm(termData, null, filePath)) {
      stored++;
    }
  }
  
  return { processed: terms.length, stored };
}

/**
 * Main ingestion function
 */
async function ingestTermsAndDefinitions() {
  console.log('[ingest-terms] Starting terms and definitions ingestion...');
  console.log(`[ingest-terms] Source folder: ${TERMS_FOLDER}`);
  
  // Check if folder exists
  if (!fs.existsSync(TERMS_FOLDER)) {
    console.error(`[ingest-terms] ERROR: Folder does not exist: ${TERMS_FOLDER}`);
    process.exit(1);
  }
  
  // Check if table exists (migration 044 should have created it)
  try {
    const tableCheck = await queryEdcatAI(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'edcat' 
        AND table_name = 'terms_and_definitions'
      )
    `);
    
    if (!tableCheck.rows[0]?.exists) {
      console.warn('[ingest-terms] ⚠️  Table edcat.terms_and_definitions does not exist. Please run migration 044_create_terms_definitions_table.sql first.');
      console.log('[ingest-terms] Attempting to create table...');
      
      // Try to create with minimal schema
      await queryEdcatAI(`
        CREATE TABLE IF NOT EXISTS edcat.terms_and_definitions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
          term TEXT NOT NULL,
          acronym TEXT,
          definition TEXT NOT NULL,
          short_definition TEXT,
          category TEXT,
          subcategory TEXT,
          source_standard TEXT,
          source_document TEXT,
          context TEXT,
          related_terms TEXT[],
          synonyms TEXT[],
          usage_examples TEXT[],
          quality_score DECIMAL(3,2) DEFAULT 1.0,
          is_acronym BOOLEAN DEFAULT FALSE,
          is_standard_term BOOLEAN DEFAULT FALSE,
          language TEXT DEFAULT 'en',
          source_file_id UUID,
          source_file_path TEXT,
          extracted_at TIMESTAMPTZ DEFAULT NOW(),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT unique_term_source UNIQUE (term, source_standard, source_document)
        )
      `);
    }
    console.log('[ingest-terms] ✓ Table exists');
  } catch (error) {
    console.error('[ingest-terms] Error checking/creating table:', error.message);
    console.error('[ingest-terms] Full error:', error);
    // Don't exit - try to continue anyway
  }
  
  // Get all files in folder
  const files = fs.readdirSync(TERMS_FOLDER)
    .filter(f => f.endsWith('.pdf') || f.endsWith('.docx'))
    .map(f => path.join(TERMS_FOLDER, f));
  
  console.log(`[ingest-terms] Found ${files.length} files to process`);
  
  // Process each file
  let totalProcessed = 0;
  let totalStored = 0;
  
  for (const filePath of files) {
    const result = await processFile(filePath);
    totalProcessed += result.processed;
    totalStored += result.stored;
  }
  
  console.log('\n[ingest-terms] ========================================');
  console.log(`[ingest-terms] Ingestion complete!`);
  console.log(`[ingest-terms] Total terms processed: ${totalProcessed}`);
  console.log(`[ingest-terms] Total terms stored: ${totalStored}`);
  console.log('[ingest-terms] ========================================\n');
}

// Run if called directly
const isMainModule = import.meta.url === `file://${path.resolve(process.argv[1])}` || 
                     process.argv[1] && import.meta.url.includes(process.argv[1].replace(/\\/g, '/'));

if (isMainModule || process.argv[1]?.includes('ingest-terms-definitions')) {
  ingestTermsAndDefinitions()
    .then(() => {
      console.log('[ingest-terms] Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[ingest-terms] Fatal error:', error);
      process.exit(1);
    });
}

export { ingestTermsAndDefinitions, parseTermsFromText, storeTerm };

