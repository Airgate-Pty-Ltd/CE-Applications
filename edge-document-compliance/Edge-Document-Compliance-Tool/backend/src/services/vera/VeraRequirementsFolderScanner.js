/**
 * Vera Requirements Folder Scanner
 * 
 * Scans the Requirements folder structure to discover and index:
 * - "Approved Documents" folders (good examples)
 * - "BAD Documents" folders (bad examples that failed audit)
 * 
 * Makes these documents available to Vera for learning what good vs bad documents look like
 * when doing gap analysis or assessments.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { queryPostgres, queryEdcatAI } from '../../config/databases.js';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Requirements folder path
const REQUIREMENTS_DIR = path.join(__dirname, '../../../EDCAT AIP/Requirements');
const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.xlsx', '.xls'];

/**
 * Extract text from file
 */
async function extractTextFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  try {
    if (ext === '.pdf') {
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      return data.text;
    } else if (ext === '.docx' || ext === '.doc') {
      const buffer = fs.readFileSync(filePath);
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } else if (ext === '.xlsx' || ext === '.xls') {
      const xlsx = await import('xlsx');
      const workbook = xlsx.readFile(filePath);
      const sheetNames = workbook.SheetNames;
      let text = '';
      for (const sheetName of sheetNames) {
        const sheet = workbook.Sheets[sheetName];
        text += xlsx.utils.sheet_to_txt(sheet) + '\n';
      }
      return text;
    }
    return null;
  } catch (error) {
    console.error(`[VeraRequirementsFolderScanner] Error extracting text from ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Parse standard code from folder name
 * Examples:
 * - "AS9100 2016 Approved Documents" -> "AS9100D" or "AS9100"
 * - "ISO13485 2016 BAD Documents" -> "ISO13485"
 * - "FAA Part 21 Approved Documents" -> "FAA_PART_21"
 */
function parseStandardFromFolderName(folderName) {
  const upper = folderName.toUpperCase();
  
  // Remove "APPROVED DOCUMENTS" or "BAD DOCUMENTS" suffix
  let cleaned = upper.replace(/\s*(APPROVED|BAD)\s*DOCUMENTS?/i, '').trim();
  
  // Extract standard patterns
  if (cleaned.includes('AS9100')) {
    if (cleaned.includes('2016') || cleaned.includes('D')) return 'AS9100D';
    return 'AS9100';
  }
  if (cleaned.includes('AS9120')) {
    if (cleaned.includes('2016')) return 'AS9120';
    return 'AS9120';
  }
  if (cleaned.includes('AS9110')) {
    return 'AS9110';
  }
  if (cleaned.includes('ISO9001') || cleaned.includes('ISO 9001')) {
    if (cleaned.includes('2015')) return 'ISO9001_2015';
    return 'ISO9001';
  }
  if (cleaned.includes('ISO13485') || cleaned.includes('ISO 13485')) {
    if (cleaned.includes('2016')) return 'ISO13485_2016';
    return 'ISO13485';
  }
  if (cleaned.includes('IATF') && cleaned.includes('16949')) {
    return 'IATF16949';
  }
  if (cleaned.includes('FAA') && cleaned.includes('PART') && cleaned.includes('21')) {
    return 'FAA_PART_21';
  }
  if (cleaned.includes('FAA') && cleaned.includes('PART') && cleaned.includes('145')) {
    return 'FAA_PART_145';
  }
  if (cleaned.includes('CAAC') && cleaned.includes('PART') && cleaned.includes('145')) {
    return 'CAAC_PART_145';
  }
  
  return cleaned.replace(/\s+/g, '_');
}

/**
 * Determine if folder contains approved or bad documents
 */
function getDocumentQuality(folderName) {
  const upper = folderName.toUpperCase();
  if (upper.includes('BAD')) {
    return 'bad';
  }
  if (upper.includes('APPROVED')) {
    return 'approved';
  }
  return 'unknown';
}

/**
 * Scan a folder and return all documents
 */
function scanFolder(folderPath, relativePath = '') {
  const documents = [];
  
  if (!fs.existsSync(folderPath)) {
    return documents;
  }
  
  const entries = fs.readdirSync(folderPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name);
    const relative = path.join(relativePath, entry.name).replace(/\\/g, '/');
    
    if (entry.isDirectory()) {
      // Recursively scan subdirectories
      documents.push(...scanFolder(fullPath, relative));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (SUPPORTED_EXTENSIONS.includes(ext)) {
        documents.push({
          filePath: fullPath,
          fileName: entry.name,
          relativePath: relative,
          extension: ext
        });
      }
    }
  }
  
  return documents;
}

/**
 * Find standard_id from standard_code
 */
async function findStandardId(standardCode) {
  try {
    // Try exact match first
    let result = await queryPostgres(
      `SELECT id, code, name FROM public.standards 
       WHERE UPPER(REPLACE(code, ' ', '')) = UPPER(REPLACE($1, ' ', ''))
       LIMIT 1`,
      [standardCode]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0].id;
    }
    
    // Try partial match
    result = await queryPostgres(
      `SELECT id, code, name FROM public.standards 
       WHERE UPPER(code) LIKE '%' || UPPER($1) || '%'
       LIMIT 1`,
      [standardCode]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0].id;
    }
    
    return null;
  } catch (error) {
    console.error(`[VeraRequirementsFolderScanner] Error finding standard:`, error.message);
    return null;
  }
}

/**
 * Scan Requirements folder and index documents
 */
export async function scanAndIndexRequirementsFolder({ tenantId = null, dryRun = false }) {
  try {
    console.log('[VeraRequirementsFolderScanner] Starting scan of Requirements folder...');
    console.log(`[VeraRequirementsFolderScanner] Folder: ${REQUIREMENTS_DIR}`);
    
    if (!fs.existsSync(REQUIREMENTS_DIR)) {
      console.warn(`[VeraRequirementsFolderScanner] Requirements folder not found: ${REQUIREMENTS_DIR}`);
      return {
        success: false,
        error: 'Requirements folder not found',
        scanned: 0,
        indexed: 0
      };
    }
  
    const stats = {
      scanned: 0,
      indexed: 0,
      approved: 0,
      bad: 0,
      errors: 0,
      skipped: 0
    };
    
    // Scan all folders in Requirements directory
    const folders = fs.readdirSync(REQUIREMENTS_DIR, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => ({
        name: entry.name,
        path: path.join(REQUIREMENTS_DIR, entry.name)
      }));
    
    console.log(`[VeraRequirementsFolderScanner] Found ${folders.length} folders to scan`);
    
    for (const folder of folders) {
      const quality = getDocumentQuality(folder.name);
      const standardCode = parseStandardFromFolderName(folder.name);
      
      console.log(`[VeraRequirementsFolderScanner] Processing folder: ${folder.name}`);
      console.log(`[VeraRequirementsFolderScanner]   Quality: ${quality}, Standard: ${standardCode}`);
      
      // Scan documents in this folder
      const documents = scanFolder(folder.path, folder.name);
      console.log(`[VeraRequirementsFolderScanner]   Found ${documents.length} documents`);
      
      for (const doc of documents) {
        stats.scanned++;
        
        try {
          // Extract text
          const text = await extractTextFromFile(doc.filePath);
          if (!text || text.trim().length < 50) {
            console.warn(`[VeraRequirementsFolderScanner]   Skipping ${doc.fileName}: insufficient text`);
            stats.skipped++;
            continue;
          }
          
          // Find standard_id
          const standardId = await findStandardId(standardCode);
          
          // Generate file_id (use hash of path for consistency)
          const fileId = uuidv4();
          
          if (dryRun) {
            console.log(`[VeraRequirementsFolderScanner]   [DRY RUN] Would index: ${doc.fileName}`);
            console.log(`[VeraRequirementsFolderScanner]     Quality: ${quality}, Standard: ${standardCode}, Standard ID: ${standardId || 'not found'}`);
            stats.indexed++;
            if (quality === 'approved') stats.approved++;
            if (quality === 'bad') stats.bad++;
            continue;
          }
          
          // Insert into document_content_for_learning
          await queryEdcatAI(
            `INSERT INTO edcat.document_content_for_learning
             (file_id, standard_id, standard_code, category, content_text, is_example, word_count, metadata, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
             ON CONFLICT (file_id) DO UPDATE SET
               content_text = EXCLUDED.content_text,
               standard_id = EXCLUDED.standard_id,
               standard_code = EXCLUDED.standard_code,
               category = EXCLUDED.category,
               is_example = EXCLUDED.is_example,
               word_count = EXCLUDED.word_count,
               metadata = EXCLUDED.metadata`,
            [
              fileId,
              standardId,
              standardCode,
              quality === 'approved' ? 'approved_example' : (quality === 'bad' ? 'bad_example' : 'example'),
              text,
              true, // is_example = true
              text.split(/\s+/).length,
              JSON.stringify({
                source_folder: folder.name,
                relative_path: doc.relativePath,
                file_name: doc.fileName,
                quality: quality,
                standard_code: standardCode,
                scanned_at: new Date().toISOString()
              })
            ]
          );
          
          // Insert into example_documents (only for approved examples)
          if (quality === 'approved') {
            await queryEdcatAI(
              `INSERT INTO edcat.example_documents
               (file_id, standard_id, file_name, category, standard_code, quality_score, metadata, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
               ON CONFLICT (file_id) DO UPDATE SET
                 standard_id = EXCLUDED.standard_id,
                 file_name = EXCLUDED.file_name,
                 category = EXCLUDED.category,
                 standard_code = EXCLUDED.standard_code,
                 metadata = EXCLUDED.metadata,
                 updated_at = NOW()`,
              [
                fileId,
                standardId,
                doc.fileName,
                'approved_example',
                standardCode,
                1.0, // High quality score for approved documents
                JSON.stringify({
                  source_folder: folder.name,
                  relative_path: doc.relativePath,
                  quality: 'approved',
                  standard_code: standardCode
                })
              ]
            );
          } else if (quality === 'bad') {
            // For bad examples, store with lower quality score
            await queryEdcatAI(
              `INSERT INTO edcat.example_documents
               (file_id, standard_id, file_name, category, standard_code, quality_score, metadata, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
               ON CONFLICT (file_id) DO UPDATE SET
                 standard_id = EXCLUDED.standard_id,
                 file_name = EXCLUDED.file_name,
                 category = EXCLUDED.category,
                 standard_code = EXCLUDED.standard_code,
                 metadata = EXCLUDED.metadata,
                 updated_at = NOW()`,
              [
                fileId,
                standardId,
                doc.fileName,
                'bad_example',
                standardCode,
                0.3, // Low quality score for bad documents
                JSON.stringify({
                  source_folder: folder.name,
                  relative_path: doc.relativePath,
                  quality: 'bad',
                  standard_code: standardCode,
                  note: 'This document failed audit - use as negative example'
                })
              ]
            );
          }
          
          stats.indexed++;
          if (quality === 'approved') stats.approved++;
          if (quality === 'bad') stats.bad++;
          
          console.log(`[VeraRequirementsFolderScanner]   ✓ Indexed: ${doc.fileName} (${quality})`);
        } catch (error) {
          console.error(`[VeraRequirementsFolderScanner]   ✗ Error indexing ${doc.fileName}:`, error.message);
          stats.errors++;
        }
      }
    }
    
    console.log(`[VeraRequirementsFolderScanner] Scan complete:`);
    console.log(`[VeraRequirementsFolderScanner]   Scanned: ${stats.scanned}`);
    console.log(`[VeraRequirementsFolderScanner]   Indexed: ${stats.indexed}`);
    console.log(`[VeraRequirementsFolderScanner]   Approved: ${stats.approved}`);
    console.log(`[VeraRequirementsFolderScanner]   Bad: ${stats.bad}`);
    console.log(`[VeraRequirementsFolderScanner]   Errors: ${stats.errors}`);
    console.log(`[VeraRequirementsFolderScanner]   Skipped: ${stats.skipped}`);
    
    return {
      success: true,
      stats
    };
  } catch (error) {
    console.error('[VeraRequirementsFolderScanner] Failed to scan requirements folder:', error.message);
    console.error('[VeraRequirementsFolderScanner] Stack:', error.stack);
    // Do NOT throw; let the rest of the app continue
    return {
      success: false,
      error: error.message,
      stats: {
        scanned: 0,
        indexed: 0,
        approved: 0,
        bad: 0,
        errors: 1,
        skipped: 0
      }
    };
  }
}

/**
 * Get summary of indexed documents by quality and standard
 */
export async function getRequirementsFolderSummary() {
  try {
    const summary = await queryEdcatAI(
      `SELECT 
        metadata->>'quality' as quality,
        standard_code,
        COUNT(*) as count
       FROM edcat.document_content_for_learning
       WHERE is_example = true
         AND metadata->>'source_folder' IS NOT NULL
       GROUP BY metadata->>'quality', standard_code
       ORDER BY standard_code, quality`
    );
    
    return {
      success: true,
      summary: summary.rows || []
    };
  } catch (error) {
    console.error('[VeraRequirementsFolderScanner] Error getting summary:', error.message);
    return {
      success: false,
      error: error.message,
      summary: []
    };
  }
}

