/**
 * Process Requirements Folder
 * Automatically scans, uploads, parses, and learns from documents in Requirements folder
 * 
 * Folder Structure:
 * backend/EDCAT AIP/Requirements/
 *   ├── Standards/        # Standard documents (ISO 9001, AS9100, etc.) - PROCESSED
 *   ├── Regulatory/       # Regulatory documents (FAA, FDA, etc.) - PROCESSED
 *   ├── Customer/         # Customer-specific documents - PROCESSED
 *   └── Examples/         # Good example documents for learning - NOT PROCESSED
 *                         # Examples should NOT be added to compliance library
 *                         # They are for Vera's learning system only
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import xlsx from 'xlsx';
import { queryPostgres, queryEdcatAI } from '../config/databases.js';
import { storeFile } from '../../config/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database timeout configuration
const DATABASE_TIMEOUT = 5000; // 5 seconds

// Requirements folder path
// Script is at: backend/src/scripts/process-requirements-folder.js
// Target is at: backend/EDCAT AIP/Requirements
// So we need: ../../EDCAT AIP/Requirements (up 2 levels from scripts to backend)
const REQUIREMENTS_DIR = path.join(__dirname, '../../EDCAT AIP/Requirements');
const STANDARDS_DIR = path.join(REQUIREMENTS_DIR, 'Standards');
const REGULATORY_DIR = path.join(REQUIREMENTS_DIR, 'Regulatory');
const CUSTOMER_DIR = path.join(REQUIREMENTS_DIR, 'Customer');
const EXAMPLES_DIR = path.join(REQUIREMENTS_DIR, 'Examples');

// Supported file extensions
const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.txt'];

/**
 * Extract text from file
 */
async function extractTextFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  try {
    if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    }
    
    if (ext === '.docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    }
    
    if (ext === '.xlsx' || ext === '.xls') {
      const workbook = xlsx.readFile(filePath);
      let text = '';
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        text += xlsx.utils.sheet_to_txt(sheet) + '\n';
      }
      return text;
    }
    
    if (ext === '.txt') {
      return fs.readFileSync(filePath, 'utf8');
    }
    
    // PowerPoint files - extract text from slides (basic extraction)
    if (ext === '.pptx' || ext === '.ppt') {
      // For now, return empty - could add pptx parsing later
      console.log(`[process-requirements] ⚠️  PowerPoint files (${ext}) - text extraction not yet implemented`);
      return '';
    }
    
    return '';
  } catch (error) {
    console.error(`[process-requirements] Error extracting text from ${filePath}:`, error.message);
    return '';
  }
}

/**
 * Create or get standard record
 */
async function createOrGetStandard(code, name, category = 'standard') {
  try {
    // CRITICAL FIX: PostgreSQL is single source of truth for Compliance Library
    // Create/get standard in PostgreSQL FIRST (this is what the API queries)
    let standardId;
    
    // Check PostgreSQL first (single source of truth)
    let existingPostgres;
    try {
      const checkPromise = queryPostgres(
        `SELECT id FROM public.standards WHERE code = $1 LIMIT 1`,
        [code]
      );
      
      existingPostgres = await Promise.race([
        checkPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database timeout')), DATABASE_TIMEOUT)
        )
      ]);
    } catch (error) {
      if (error.message.includes('timeout')) {
        console.log('[process-requirements] Database unavailable, skipping database check');
        // Return a temporary ID so processing can continue
        return uuidv4();
      }
      throw error;
    }
    
    if (existingPostgres.rows.length > 0) {
      standardId = existingPostgres.rows[0].id;
      // Update uploaded_at if it's NULL
      try {
        const updatePromise = queryPostgres(
          `UPDATE public.standards SET uploaded_at = COALESCE(uploaded_at, NOW()) WHERE id = $1`,
          [standardId]
        );
        
        await Promise.race([
          updatePromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database timeout')), DATABASE_TIMEOUT)
          )
        ]);
      } catch (error) {
        if (error.message.includes('timeout')) {
          console.log('[process-requirements] Database unavailable, skipping database update');
          return standardId;
        }
        throw error;
      }
    } else {
      // Create new standard in PostgreSQL
      standardId = uuidv4();
      
      // Map category to sector/authority_source
      // CRITICAL: sector must be 'standard', 'regulatory', or 'customer' (not 'standards', 'compliance', etc.)
      let sector = 'standard'; // Default to 'standard'
      let authoritySource = null;
      
      if (category === 'regulatory') {
        sector = 'regulatory';
        if (code.includes('FAA') || code.includes('Part 120')) authoritySource = 'FAA';
        else if (code.includes('EASA')) authoritySource = 'EASA';
        else if (code.includes('FDA') || code.includes('21 CFR') || code.includes('CFR11')) authoritySource = 'FDA';
        else if (code.includes('title 49') || code.includes('part 40')) authoritySource = 'DOT';
        else authoritySource = 'Regulatory';
      } else if (category === 'customer') {
        sector = 'customer';
        authoritySource = 'Customer';
      } else {
        // Standards category
        sector = 'standard';
        // Try to detect authority from code
        if (code.includes('ISO')) authoritySource = 'ISO';
        else if (code.includes('AS')) authoritySource = 'SAE';
        else if (code.includes('IATF')) authoritySource = 'IATF';
        else if (code.includes('IEC')) authoritySource = 'IEC';
        else if (code.includes('NIST')) authoritySource = 'NIST';
        else if (code.includes('EU') || code.includes('MDR') || code.includes('IVDR')) authoritySource = 'EU';
      }
      
      // First, ensure authority_source column exists
      try {
        const alterPromise = queryPostgres(`
          ALTER TABLE public.standards 
          ADD COLUMN IF NOT EXISTS authority_source VARCHAR(100)
        `);
        
        await Promise.race([
          alterPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database timeout')), DATABASE_TIMEOUT)
          )
        ]);
      } catch (colError) {
        if (colError.message.includes('timeout')) {
          console.log('[process-requirements] Database unavailable, skipping column creation');
        } else {
          // Column might already exist, or table might not exist yet - that's okay
          console.log(`[process-requirements] Note: Could not ensure authority_source column: ${colError.message}`);
        }
      }
      
      // Try insert with authority_source first
      let insertResult;
      try {
        const insertPromise = queryPostgres(
          `INSERT INTO public.standards (id, code, name, authority_source, sector, uploaded_at, is_active)
           VALUES ($1, $2, $3, $4, $5, NOW(), TRUE)
           ON CONFLICT (code) DO UPDATE SET
             uploaded_at = COALESCE(public.standards.uploaded_at, NOW()),
             name = EXCLUDED.name,
             sector = EXCLUDED.sector,
             authority_source = EXCLUDED.authority_source
           RETURNING id, code, sector`,
          [standardId, code, name, authoritySource, sector]
        );
        
        insertResult = await Promise.race([
          insertPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database timeout')), DATABASE_TIMEOUT)
          )
        ]);
      } catch (insertError) {
        if (insertError.message.includes('timeout')) {
          console.log('[process-requirements] Database unavailable, skipping database write');
          // Return a temporary ID so processing can continue
          return standardId;
        }
        // If authority_source column doesn't exist, try without it
        if (insertError.message.includes('authority_source')) {
          console.log(`[process-requirements] ⚠️  authority_source column missing, inserting without it`);
          try {
            const insertPromise = queryPostgres(
              `INSERT INTO public.standards (id, code, name, sector, uploaded_at, is_active)
               VALUES ($1, $2, $3, $4, NOW(), TRUE)
               ON CONFLICT (code) DO UPDATE SET
                 uploaded_at = COALESCE(public.standards.uploaded_at, NOW()),
                 name = EXCLUDED.name,
                 sector = EXCLUDED.sector
               RETURNING id, code, sector`,
              [standardId, code, name, sector]
            );
            
            insertResult = await Promise.race([
              insertPromise,
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Database timeout')), DATABASE_TIMEOUT)
              )
            ]);
          } catch (retryError) {
            if (retryError.message.includes('timeout')) {
              console.log('[process-requirements] Database unavailable, skipping database write');
              return standardId;
            }
            throw retryError;
          }
        } else {
          throw insertError;
        }
      }
      
      const inserted = insertResult.rows[0];
      console.log(`[process-requirements] ✅ Created/updated standard in PostgreSQL: ${inserted.code} (sector: ${inserted.sector}, id: ${inserted.id})`);
      
      // Verify it was actually inserted
      try {
        const verifyPromise = queryPostgres(
          `SELECT id, code, sector FROM public.standards WHERE id = $1`,
          [inserted.id]
        );
        
        const verifyResult = await Promise.race([
          verifyPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database timeout')), DATABASE_TIMEOUT)
          )
        ]);
        
        if (verifyResult.rows.length === 0) {
          console.error(`[process-requirements] ❌ WARNING: Standard ${code} was not found after insert!`);
        }
      } catch (verifyError) {
        if (verifyError.message.includes('timeout')) {
          console.log('[process-requirements] Database unavailable, skipping verification');
        } else {
          throw verifyError;
        }
      }
    }
    
    // Also create/update in EDCAT AI DB for Vera's learning (if table exists)
    try {
      const checkPromise = queryEdcatAI(
        `SELECT id FROM standards WHERE code = $1 LIMIT 1`,
        [code]
      );
      
      const existingEdcat = await Promise.race([
        checkPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database timeout')), DATABASE_TIMEOUT)
        )
      ]);
      
      if (existingEdcat.rows.length === 0) {
        // Only create if table exists (we removed it, but check anyway)
        try {
          const insertPromise = queryEdcatAI(
            `INSERT INTO standards (id, code, name, sector, uploaded_at, is_active)
             VALUES ($1, $2, $3, $4, NOW(), TRUE)
             ON CONFLICT (code) DO NOTHING`,
            [standardId, code, name, category]
          );
          
          await Promise.race([
            insertPromise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Database timeout')), DATABASE_TIMEOUT)
            )
          ]);
        } catch (insertError) {
          if (insertError.message.includes('timeout')) {
            console.log('[process-requirements] Database unavailable, skipping EDCAT AI insert');
          } else {
            throw insertError;
          }
        }
      }
    } catch (edcatError) {
      if (edcatError.message.includes('timeout')) {
        console.log('[process-requirements] Database unavailable, skipping EDCAT AI check');
      } else {
        // EDCAT AI standards table might not exist (we removed duplicates)
        // That's okay - PostgreSQL is the source of truth
        console.log(`[process-requirements] Note: Could not update EDCAT AI standards (expected if table was removed): ${edcatError.message}`);
      }
    }
    
    return standardId;
  } catch (error) {
    console.error(`[process-requirements] Error creating standard:`, error.message);
    throw error;
  }
}

/**
 * Store file in database
 */
async function storeFileInDatabase(filePath, fileName, fileType, standardId, category, isExample = false, standardCode = null) {
  const fileId = uuidv4();
  const fileSize = fs.statSync(filePath).size;
  const fileBuffer = fs.readFileSync(filePath);
  
  // Store file content
  await storeFile(filePath, fileBuffer, standardId, fileName);
  
  // Map category to file_category for database
  // CRITICAL: file_category must match: 'standard', 'regulatory', or 'customer_requirements'
  let fileCategory = 'standard'; // Default
  if (category === 'regulatory') {
    fileCategory = 'regulatory';
  } else if (category === 'customer') {
    fileCategory = 'customer_requirements';
  } else {
    // category === 'standards' or 'standard'
    fileCategory = 'standard';
  }
  
  // CONSOLIDATED: Save file metadata directly to standards table
  try {
    const updatePromise = queryPostgres(
      `UPDATE public.standards 
       SET file_path = $1,
           file_name = $2,
           file_size = $3,
           file_type = $4,
           file_category = $5,
           uploaded_at = COALESCE(uploaded_at, NOW()),
           updated_at = NOW()
       WHERE id = $6`,
      [filePath, fileName, fileSize, fileType, fileCategory, standardId]
    );
    
    await Promise.race([
      updatePromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), DATABASE_TIMEOUT)
      )
    ]);
    
    // If it's an example document, mark it for learning
    if (isExample) {
      await markAsExampleDocument(standardId, standardId, fileName, category, standardCode);
    }
    
    return standardId;
  } catch (error) {
    if (error.message.includes('timeout')) {
      console.log('[process-requirements] Database unavailable, skipping database write');
      return standardId;
    } else {
      console.error(`[process-requirements] Error storing file metadata:`, error.message);
      throw error;
    }
  }
}

/**
 * Mark document as example for learning
 */
async function markAsExampleDocument(fileId, standardId, fileName, category, standardCode = null) {
  try {
    // Create example documents table if it doesn't exist
    try {
      const createPromise = queryEdcatAI(`
        CREATE TABLE IF NOT EXISTS example_documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          file_id UUID NOT NULL UNIQUE,
          standard_id UUID NOT NULL,
          file_name TEXT NOT NULL,
          category TEXT NOT NULL,
          standard_code TEXT,
          quality_score DECIMAL(3,2) DEFAULT 1.0,
          usage_count INT DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        
        CREATE INDEX IF NOT EXISTS idx_example_documents_standard 
          ON example_documents(standard_code);
        CREATE INDEX IF NOT EXISTS idx_example_documents_category 
          ON example_documents(category);
        CREATE INDEX IF NOT EXISTS idx_example_documents_file 
          ON example_documents(file_id);
      `);
      
      await Promise.race([
        createPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database timeout')), DATABASE_TIMEOUT)
        )
      ]);
    } catch (createError) {
      if (createError.message.includes('timeout')) {
        console.log('[process-requirements] Database unavailable, skipping example document table creation');
        return;
      }
      throw createError;
    }
    
    // Extract standard code from filename if not provided
    if (!standardCode) {
      const standardInfo = extractStandardCode(fileName);
      standardCode = standardInfo.code;
    }
    
    try {
      const insertPromise = queryEdcatAI(
        `INSERT INTO example_documents (file_id, standard_id, file_name, category, standard_code)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (file_id) DO UPDATE SET
           standard_code = EXCLUDED.standard_code,
           updated_at = NOW()`,
        [fileId, standardId, fileName, category, standardCode]
      );
      
      await Promise.race([
        insertPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database timeout')), DATABASE_TIMEOUT)
        )
      ]);
      
      console.log(`[process-requirements] ✅ Marked as example document: ${fileName} (${standardCode})`);
    } catch (insertError) {
      if (insertError.message.includes('timeout')) {
        console.log('[process-requirements] Database unavailable, skipping example document insert');
      } else {
        throw insertError;
      }
    }
  } catch (error) {
    if (error.message.includes('timeout')) {
      console.log('[process-requirements] Database unavailable, skipping example document operations');
    } else {
      console.error(`[process-requirements] Error marking as example:`, error.message);
    }
  }
}

/**
 * Extract standard code from filename or folder path
 */
function extractStandardCode(fileName, folderPath = '') {
  const combined = `${folderPath} ${fileName}`.toLowerCase();
  
  // ISO 9001 variations
  if (combined.match(/iso[\s-]?9001|iso9001/i)) {
    return { code: 'ISO9001:2015', name: 'ISO 9001:2015 Quality Management System' };
  }
  
  // AS9100 variations
  if (combined.match(/as9100/i)) {
    return { code: 'AS9100D', name: 'AS9100D Aerospace Quality Management System' };
  }
  
  // ISO 13485
  if (combined.match(/iso[\s-]?13485/i)) {
    return { code: 'ISO13485', name: 'ISO 13485 Medical Device Quality Management' };
  }
  
  // AS9110
  if (combined.match(/as9110/i)) {
    return { code: 'AS9110C', name: 'AS9110C Aerospace Repair & Maintenance' };
  }
  
  // IEC 62304
  if (combined.match(/iec[\s-]?62304/i)) {
    return { code: 'IEC62304', name: 'IEC 62304 Medical Device Software' };
  }
  
  // ISO 14971
  if (combined.match(/iso[\s-]?14971/i)) {
    return { code: 'ISO14971', name: 'ISO 14971 Risk Management' };
  }
  
  // ISO 27001
  if (combined.match(/iso[\s-]?27001/i)) {
    return { code: 'ISO27001', name: 'ISO 27001 Information Security' };
  }
  
  // ISO 22000
  if (combined.match(/iso[\s-]?22000/i)) {
    return { code: 'ISO22000', name: 'ISO 22000 Food Safety' };
  }
  
  // ISO 55000
  if (combined.match(/iso[\s-]?55000/i)) {
    return { code: 'ISO55000', name: 'ISO 55000 Asset Management' };
  }
  
  // IATF 16949
  if (combined.match(/iatf[\s-]?16949/i)) {
    return { code: 'IATF16949', name: 'IATF 16949 Automotive Quality Management' };
  }
  
  // EU MDR
  if (combined.match(/eu[\s-]?mdr|mdr/i)) {
    return { code: 'EUMDR', name: 'EU Medical Device Regulation' };
  }
  
  // IVDR
  if (combined.match(/ivdr/i)) {
    return { code: 'IVDR', name: 'EU In Vitro Diagnostic Regulation' };
  }
  
  // FDA 21 CFR Part 11
  if (combined.match(/21[\s-]?cfr[\s-]?part[\s-]?11|part[\s-]?11/i)) {
    return { code: 'FDA21CFR11', name: 'FDA 21 CFR Part 11 Electronic Records' };
  }
  
  // FAA Part 21
  if (combined.match(/faa[\s-]?part[\s-]?21|part[\s-]?21/i)) {
    return { code: 'FAAPart21', name: 'FAA Part 21 Certification Procedures' };
  }
  
  // FAA Part 120
  if (combined.match(/faa[\s-]?part[\s-]?120|part[\s-]?120/i)) {
    return { code: 'FAAPart120', name: 'FAA Part 120 Drug and Alcohol Testing' };
  }
  
  // ARP9134A
  if (combined.match(/arp[\s-]?9134/i)) {
    return { code: 'ARP9134A', name: 'ARP9134A Aerospace Standard' };
  }
  
  // AS6500
  if (combined.match(/as[\s-]?6500/i)) {
    return { code: 'AS6500', name: 'AS6500 Aerospace Standard' };
  }
  
  // NIST
  if (combined.match(/nist/i)) {
    return { code: 'NIST800-53', name: 'NIST SP 800-53 Security Controls' };
  }
  
  // MDSAP
  if (combined.match(/mdsap/i)) {
    return { code: 'MDSAP', name: 'MDSAP Medical Device Single Audit Program' };
  }
  
  // Default: use filename
  const baseName = path.basename(fileName, path.extname(fileName));
  return { code: baseName.replace(/[\s-]/g, '_'), name: baseName };
}

/**
 * Process files in a directory (recursively)
 */
async function processDirectory(dirPath, category, isExample = false, relativePath = '') {
  if (!fs.existsSync(dirPath)) {
    console.log(`[process-requirements] ⚠️  Directory does not exist: ${dirPath}`);
    return { processed: 0, errors: [] };
  }
  
  const results = { processed: 0, errors: [] };
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const stat = fs.statSync(itemPath);
    const currentRelativePath = relativePath ? `${relativePath}/${item}` : item;
    
    // If it's a directory, process recursively
    if (stat.isDirectory()) {
      console.log(`[process-requirements] 📁 Processing subdirectory: ${currentRelativePath}`);
      const subResults = await processDirectory(itemPath, category, isExample, currentRelativePath);
      results.processed += subResults.processed;
      results.errors.push(...subResults.errors);
      continue;
    }
    
    // Check if file is supported
    const ext = path.extname(item).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      // Skip ZIP files for now (could add extraction later)
      if (ext === '.zip') {
        console.log(`[process-requirements] ⏭️  Skipping ZIP file (extraction not implemented): ${item}`);
      } else {
        console.log(`[process-requirements] ⏭️  Skipping unsupported file: ${item}`);
      }
      continue;
    }
    
    try {
      console.log(`[process-requirements] 📄 Processing: ${currentRelativePath} (${category})`);
      
      // Extract standard code from filename and folder path
      const standardInfo = extractStandardCode(item, currentRelativePath);
      const { code, name } = standardInfo;
      
      // Create or get standard
      const standardId = await createOrGetStandard(code, name, category);
      
      // Store file
      const fileId = await storeFileInDatabase(
        itemPath,
        item,
        ext.substring(1),
        standardId,
        category,
        isExample,
        standardInfo.code
      );
      
      // Extract text for learning
      const text = await extractTextFromFile(itemPath);
      if (text) {
        // Store extracted text for learning
        await storeExtractedText(fileId, standardId, text, category, isExample, standardInfo.code);
      }
      
      results.processed++;
      console.log(`[process-requirements] ✅ Processed: ${item} → ${code}`);
      
    } catch (error) {
      // If it's a permission error (OneDrive lock), try again after a short delay
      if (error.code === 'EPERM' || error.message.includes('operation not permitted')) {
        console.log(`[process-requirements] ⚠️  Permission error for ${item}, retrying in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          // Retry once
          const standardInfo = extractStandardCode(item, currentRelativePath);
          const { code, name } = standardInfo;
          const standardId = await createOrGetStandard(code, name, category);
          const fileId = await storeFileInDatabase(
            itemPath,
            item,
            ext.substring(1),
            standardId,
            category,
            isExample,
            standardInfo.code
          );
          const text = await extractTextFromFile(itemPath);
          if (text) {
            await storeExtractedText(fileId, standardId, text, category, isExample, standardInfo.code);
          }
          results.processed++;
          console.log(`[process-requirements] ✅ Processed on retry: ${item} → ${code}`);
        } catch (retryError) {
          console.error(`[process-requirements] ❌ Error processing ${item} (retry failed):`, retryError.message);
          results.errors.push({ file: currentRelativePath, error: retryError.message });
        }
      } else {
        console.error(`[process-requirements] ❌ Error processing ${item}:`, error.message);
        results.errors.push({ file: currentRelativePath, error: error.message });
      }
    }
  }
  
  return results;
}

/**
 * Store extracted text for learning
 */
async function storeExtractedText(fileId, standardId, text, category, isExample, standardCode = null) {
  try {
    // Create document content table if it doesn't exist
    try {
      const createPromise = queryEdcatAI(`
        CREATE TABLE IF NOT EXISTS document_content_for_learning (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          file_id UUID NOT NULL,
          standard_id UUID NOT NULL,
          standard_code TEXT,
          category TEXT NOT NULL,
          content_text TEXT NOT NULL,
          is_example BOOLEAN DEFAULT false,
          word_count INT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        
        CREATE INDEX IF NOT EXISTS idx_doc_content_file 
          ON document_content_for_learning(file_id);
        CREATE INDEX IF NOT EXISTS idx_doc_content_standard 
          ON document_content_for_learning(standard_id);
        CREATE INDEX IF NOT EXISTS idx_doc_content_standard_code 
          ON document_content_for_learning(standard_code);
        CREATE INDEX IF NOT EXISTS idx_doc_content_example 
          ON document_content_for_learning(is_example) WHERE is_example = true;
      `);
      
      await Promise.race([
        createPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database timeout')), DATABASE_TIMEOUT)
        )
      ]);
    } catch (createError) {
      if (createError.message.includes('timeout')) {
        console.log('[process-requirements] Database unavailable, skipping table creation');
        return;
      }
      throw createError;
    }
    
    const wordCount = text.split(/\s+/).length;
    
    try {
      const insertPromise = queryEdcatAI(
        `INSERT INTO document_content_for_learning 
         (file_id, standard_id, standard_code, category, content_text, is_example, word_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT DO NOTHING`,
        [fileId, standardId, standardCode, category, text, isExample, wordCount]
      );
      
      await Promise.race([
        insertPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database timeout')), DATABASE_TIMEOUT)
        )
      ]);
      
      console.log(`[process-requirements] ✅ Stored extracted text (${wordCount} words)`);
    } catch (insertError) {
      if (insertError.message.includes('timeout')) {
        console.log('[process-requirements] Database unavailable, skipping extracted text storage');
      } else {
        throw insertError;
      }
    }
  } catch (error) {
    if (error.message.includes('timeout')) {
      console.log('[process-requirements] Database unavailable, skipping extracted text storage');
    } else {
      console.error(`[process-requirements] Error storing extracted text:`, error.message);
    }
  }
}

/**
 * Main processing function
 */
async function processRequirementsFolder() {
  console.log('\n📁 Processing Requirements Folder...\n');
  console.log('='.repeat(60));
  console.log(`[process-requirements] Requirements directory: ${REQUIREMENTS_DIR}`);
  console.log(`[process-requirements] Standards directory: ${STANDARDS_DIR}`);
  console.log(`[process-requirements] Regulatory directory: ${REGULATORY_DIR}`);
  console.log(`[process-requirements] Customer directory: ${CUSTOMER_DIR}`);
  console.log('');
  
  // Check if directories exist
  console.log(`[process-requirements] Checking directories...`);
  console.log(`   Requirements dir exists: ${fs.existsSync(REQUIREMENTS_DIR)}`);
  console.log(`   Standards dir exists: ${fs.existsSync(STANDARDS_DIR)}`);
  console.log(`   Regulatory dir exists: ${fs.existsSync(REGULATORY_DIR)}`);
  console.log(`   Customer dir exists: ${fs.existsSync(CUSTOMER_DIR)}`);
  console.log('');
  
  // Create directories if they don't exist (excluding Examples - it's for learning only)
  [REQUIREMENTS_DIR, STANDARDS_DIR, REGULATORY_DIR, CUSTOMER_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`[process-requirements] ✅ Created directory: ${dir}`);
    } else {
      // Count files in directory
      try {
        const files = fs.readdirSync(dir);
        console.log(`[process-requirements] 📂 ${path.basename(dir)}: ${files.length} items`);
      } catch (err) {
        console.log(`[process-requirements] ⚠️  Could not read ${dir}: ${err.message}`);
      }
    }
  });
  console.log('');
  
  const results = {
    standards: { processed: 0, errors: [] },
    regulatory: { processed: 0, errors: [] },
    customer: { processed: 0, errors: [] }
  };
  
  // Process Standards folder
  console.log('\n📚 Processing Standards folder...');
  results.standards = await processDirectory(STANDARDS_DIR, 'standards', false);
  
  // Process Regulatory folder
  console.log('\n⚖️  Processing Regulatory folder...');
  results.regulatory = await processDirectory(REGULATORY_DIR, 'regulatory', false);
  
  // Process Customer folder
  console.log('\n🏢 Processing Customer folder...');
  results.customer = await processDirectory(CUSTOMER_DIR, 'customer', false);
  
  // NOTE: Examples folder is NOT processed here - it should only be used for learning
  // Examples folder documents should be manually added to example_documents table if needed
  // They should NOT create standards in the compliance library
  console.log('\n⚠️  Skipping Examples folder - examples should not be added as standards');
  console.log('   Examples folder is for learning only, not for compliance library');
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Processing Summary:');
  console.log(`   Standards: ${results.standards.processed} processed, ${results.standards.errors.length} errors`);
  console.log(`   Regulatory: ${results.regulatory.processed} processed, ${results.regulatory.errors.length} errors`);
  console.log(`   Customer: ${results.customer.processed} processed, ${results.customer.errors.length} errors`);
  
  const totalProcessed = results.standards.processed + results.regulatory.processed + 
                         results.customer.processed;
  const totalErrors = results.standards.errors.length + results.regulatory.errors.length + 
                      results.customer.errors.length;
  
  console.log(`\n   Total: ${totalProcessed} files processed, ${totalErrors} errors`);
  
  if (totalErrors > 0) {
    console.log('\n⚠️  Errors:');
    Object.entries(results).forEach(([category, result]) => {
      if (result.errors.length > 0) {
        console.log(`   ${category}:`);
        result.errors.forEach(err => {
          console.log(`     - ${err.file}: ${err.error}`);
        });
      }
    });
  }
  
  console.log('\n✅ Processing complete!');
  console.log('\n💡 Next steps:');
  console.log('   1. Review processed documents in EDCAT Administrator');
  console.log('   2. Parse standards using the parse interface');
  console.log('   3. Ask Vera to reference example documents when generating procedures');
  
  return results;
}

// Run if called directly
// Always execute when run via node (simpler check)
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.includes('process-requirements-folder.js') ||
                     process.argv[1]?.endsWith('process-requirements-folder.js');

if (isMainModule || !process.env.NODE_ENV) {
  // Always run when called directly via node
  console.log(`[process-requirements] Starting script execution...`);
  console.log(`[process-requirements] Script path: ${fileURLToPath(import.meta.url)}`);
  console.log(`[process-requirements] Called as: ${process.argv[1]}`);
  
  processRequirementsFolder()
    .then(() => {
      console.log('\n✅ Script execution complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Fatal error:', error);
      console.error(error.stack);
      process.exit(1);
    });
} else {
  // If imported as module, just export the function
  console.log(`[process-requirements] Script loaded as module (not executing)`);
}

export { processRequirementsFolder, REQUIREMENTS_DIR, STANDARDS_DIR, REGULATORY_DIR, CUSTOMER_DIR, EXAMPLES_DIR };

