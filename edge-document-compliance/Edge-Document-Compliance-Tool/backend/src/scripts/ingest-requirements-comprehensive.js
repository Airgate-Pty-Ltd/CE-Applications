/**
 * Comprehensive Requirements Folder Ingestion
 * 
 * Processes ALL documents from Requirements folder structure:
 * - Standards/ - Standard documents (ISO, AS, etc.)
 * - Regulatory/ - Regulatory documents (CASA, EASA, UK CAA, FAA, etc.)
 * - Examples/ - Approved and bad example documents for learning
 * - Customer/ - Customer-specific documents
 * 
 * Makes all documents available to VeraCoreEngine for compliance analysis.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import xlsx from 'xlsx';
import dotenv from 'dotenv';
import { queryPostgres, queryEdcatAI } from '../config/databases.js';

/**
 * Try to fulfill open information requests when documents are ingested
 */
async function tryFulfillInformationRequests(tenantId, standardCode, fileId, metadata) {
  try {
    const folderPath = metadata?.path || metadata?.relativePath || '';
    const fileName = metadata?.fileName || '';
    
    // Find open requests that might match this document
    const res = await queryEdcatAI(
      `SELECT id, request_type, standard_code, suggested_folder, description
       FROM edcat.ai_information_request
       WHERE tenant_id = $1
         AND status = 'open'
         AND (
           standard_code = $2 
           OR standard_code IS NULL
           OR standard_code ILIKE $3
           OR $2 ILIKE '%' || standard_code || '%'
         )
       ORDER BY created_at ASC
       LIMIT 10`,
      [tenantId, standardCode || null, `%${standardCode}%`]
    );

    for (const row of res.rows ?? []) {
      let shouldFulfill = false;
      
      // Match by standard code
      if (row.standard_code && standardCode) {
        const rowCode = row.standard_code.toUpperCase();
        const docCode = standardCode.toUpperCase();
        if (rowCode === docCode || 
            rowCode.includes(docCode) || 
            docCode.includes(rowCode)) {
          shouldFulfill = true;
        }
      }
      
      // Match by folder path
      if (row.suggested_folder && folderPath) {
        const suggested = row.suggested_folder.toLowerCase();
        const actual = folderPath.toLowerCase();
        if (actual.includes(suggested) || suggested.includes(actual)) {
          shouldFulfill = true;
        }
      }
      
      // Match by description keywords in filename
      if (row.description && fileName) {
        const keywords = row.description.toLowerCase().split(/\s+/).filter(w => w.length > 4);
        const fileNameLower = fileName.toLowerCase();
        if (keywords.some(kw => fileNameLower.includes(kw))) {
          shouldFulfill = true;
        }
      }
      
      if (shouldFulfill) {
        // Update request as fulfilled
        await queryEdcatAI(
          `UPDATE edcat.ai_information_request
           SET status = 'fulfilled',
               fulfilled_at = NOW(),
               fulfilled_by_file_ids = 
                 CASE
                   WHEN fulfilled_by_file_ids IS NULL THEN ARRAY[$1::uuid]
                   ELSE array_append(fulfilled_by_file_ids, $1::uuid)
                 END
           WHERE id = $2`,
          [fileId, row.id]
        );
        
        console.log(`[ingest] ✅ Fulfilled information request ${row.id} with file ${fileName}`);
      }
    }
  } catch (error) {
    // Non-fatal - log but don't fail ingestion
    console.warn(`[ingest] ⚠️  Error checking request fulfillment: ${error.message}`);
  }
}

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Requirements folder paths
// Script is at: backend/src/scripts/ingest-requirements-comprehensive.js
// Requirements folder is at: backend/EDCAT AIP/Requirements
// So we need: ../.. (up to backend) then EDCAT AIP/Requirements
const REQUIREMENTS_DIR = path.join(__dirname, '../../EDCAT AIP/Requirements');
const STANDARDS_DIR = path.join(REQUIREMENTS_DIR, 'Standards');
const REGULATORY_DIR = path.join(REQUIREMENTS_DIR, 'Regulatory');
const EXAMPLES_DIR = path.join(REQUIREMENTS_DIR, 'Examples');
const CUSTOMER_DIR = path.join(REQUIREMENTS_DIR, 'Customer');

const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.txt', '.pptx', '.ppt'];

// Regulatory authority mappings
const REGULATORY_AUTHORITIES = {
  'CASA': { code: 'CASA', name: 'Civil Aviation Safety Authority', jurisdiction: 'Australia' },
  'EASA': { code: 'EASA', name: 'European Union Aviation Safety Agency', jurisdiction: 'EU' },
  'UK CAA': { code: 'UKCAA', name: 'UK Civil Aviation Authority', jurisdiction: 'UK' },
  'UK_CAA': { code: 'UKCAA', name: 'UK Civil Aviation Authority', jurisdiction: 'UK' },
  'FAA': { code: 'FAA', name: 'Federal Aviation Administration', jurisdiction: 'USA' },
  'CAAC': { code: 'CAAC', name: 'Civil Aviation Administration of China', jurisdiction: 'China' },
  'AFAC': { code: 'AFAC', name: 'Australian Flight Accreditation Council', jurisdiction: 'Australia' }
};

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
      const workbook = xlsx.readFile(filePath);
      const sheetNames = workbook.SheetNames;
      let text = '';
      for (const sheetName of sheetNames) {
        const sheet = workbook.Sheets[sheetName];
        text += xlsx.utils.sheet_to_txt(sheet) + '\n';
      }
      return text;
    } else if (ext === '.txt') {
      return fs.readFileSync(filePath, 'utf8');
    } else if (ext === '.pptx' || ext === '.ppt') {
      // Basic PowerPoint text extraction (limited)
      console.warn(`[ingest] ⚠️  PowerPoint files have limited text extraction: ${path.basename(filePath)}`);
      return ''; // Could add pptx parsing later
    }
    return null;
  } catch (error) {
    console.error(`[ingest] Error extracting text from ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Detect regulatory authority from filename or content
 */
function detectRegulatoryAuthority(fileName, folderPath = '') {
  const combined = `${folderPath} ${fileName}`.toUpperCase();
  
  for (const [key, value] of Object.entries(REGULATORY_AUTHORITIES)) {
    if (combined.includes(key)) {
      return value;
    }
  }
  
  // Check for specific patterns
  if (combined.includes('CASRS')) return REGULATORY_AUTHORITIES['CASA'];
  if (combined.includes('EAR-FOR-CONTINUING-AIRWORTHINESS')) return REGULATORY_AUTHORITIES['EASA'];
  if (combined.includes('UK CAA') || combined.includes('UK_CAA')) return REGULATORY_AUTHORITIES['UK CAA'];
  
  return null;
}

/**
 * Extract standard/regulatory code from filename
 */
function extractStandardCode(fileName, folderPath = '') {
  const combined = `${folderPath} ${fileName}`.toUpperCase();
  
  // CASA CASRS
  if (combined.includes('CASRS')) {
    const volMatch = combined.match(/VOL\s*(\d+)/);
    return { 
      code: volMatch ? `CASA_CASRS_VOL${volMatch[1]}` : 'CASA_CASRS',
      name: volMatch ? `CASA CASRS Volume ${volMatch[1]}` : 'CASA CASRS',
      authority: 'CASA'
    };
  }
  
  // EASA
  if (combined.includes('EASA') || combined.includes('EAR-FOR-CONTINUING-AIRWORTHINESS')) {
    return { 
      code: 'EASA_EAR_1321_2014',
      name: 'EASA Continuing Airworthiness Regulation EU No 1321/2014',
      authority: 'EASA'
    };
  }
  
  // UK CAA
  if (combined.includes('UK CAA') || combined.includes('UK_CAA')) {
    return { 
      code: 'UKCAA_REGULATIONS',
      name: 'UK CAA Regulations',
      authority: 'UKCAA'
    };
  }
  
  // FAA Part 120
  if (combined.includes('PART 120') || combined.includes('PART_120')) {
    return { code: 'FAA_PART_120', name: 'FAA Part 120 Drug and Alcohol Testing', authority: 'FAA' };
  }
  
  // Title 49 Part 40
  if (combined.includes('TITLE 49') && combined.includes('PART 40')) {
    return { code: 'DOT_49CFR40', name: 'Title 49 CFR Part 40', authority: 'DOT' };
  }
  
  // Standard patterns (from existing extractStandardCode)
  if (combined.match(/ISO[\s-]?9001/i)) {
    return { code: 'ISO9001:2015', name: 'ISO 9001:2015 Quality Management System', authority: 'ISO' };
  }
  if (combined.match(/AS9100/i)) {
    return { code: 'AS9100D', name: 'AS9100D Aerospace Quality Management System', authority: 'SAE' };
  }
  if (combined.match(/ISO[\s-]?13485/i)) {
    return { code: 'ISO13485', name: 'ISO 13485 Medical Device Quality Management', authority: 'ISO' };
  }
  if (combined.match(/21[\s-]?CFR[\s-]?PART[\s-]?11/i)) {
    return { code: 'FDA21CFR11', name: 'FDA 21 CFR Part 11 Electronic Records', authority: 'FDA' };
  }
  
  // Default: use filename
  const baseName = path.basename(fileName, path.extname(fileName));
  return { 
    code: baseName.replace(/[\s-]/g, '_').substring(0, 50),
    name: baseName,
    authority: null
  };
}

/**
 * Determine document quality from folder path
 */
function getDocumentQuality(folderPath, fileName) {
  const combined = `${folderPath} ${fileName}`.toUpperCase();
  
  if (combined.includes('BAD') || combined.includes('FAILED')) {
    return 'bad';
  }
  if (combined.includes('APPROVED') || combined.includes('GOOD')) {
    return 'approved';
  }
  return 'unknown';
}

/**
 * Create or get standard/regulatory record
 */
async function createOrGetStandard(code, name, category, authority = null) {
  try {
    // Ensure table exists with proper schema
    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS public.standards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        authority_source VARCHAR(100),
        sector VARCHAR(100),
        description TEXT,
        revision_year INT,
        total_clauses INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        uploaded_at TIMESTAMP
      )
    `);
    
    // Ensure UNIQUE constraint on code exists
    try {
      await queryPostgres(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'standards_code_key' 
            AND conrelid = 'public.standards'::regclass
          ) THEN
            ALTER TABLE public.standards ADD CONSTRAINT standards_code_key UNIQUE (code);
          END IF;
        END $$;
      `);
    } catch (constraintError) {
      // Constraint might already exist, ignore
    }
    
    // Ensure all required columns exist
    try {
      await queryPostgres(`
        ALTER TABLE public.standards 
        ADD COLUMN IF NOT EXISTS authority_source VARCHAR(100),
        ADD COLUMN IF NOT EXISTS sector VARCHAR(100),
        ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP
      `);
    } catch (colError) {
      // Columns might already exist
    }
    
    // Check PostgreSQL first
    const existing = await queryPostgres(
      `SELECT id FROM public.standards WHERE code = $1 LIMIT 1`,
      [code]
    );
    
    if (existing.rows.length > 0) {
      // Update existing standard
      await queryPostgres(
        `UPDATE public.standards 
         SET name = $1, 
             authority_source = COALESCE($2, authority_source),
             sector = COALESCE($3, sector),
             uploaded_at = COALESCE(uploaded_at, NOW()),
             updated_at = NOW()
         WHERE code = $4
         RETURNING id`,
        [name, authority || null, category === 'regulatory' ? 'regulatory' : (category === 'customer' ? 'customer' : 'standard'), code]
      );
      return existing.rows[0].id;
    }
    
    // Create new standard
    const standardId = uuidv4();
    let sector = 'standard';
    let authoritySource = authority;
    
    if (category === 'regulatory') {
      sector = 'regulatory';
      if (!authoritySource) {
        // Try to detect from code
        if (code.includes('CASA')) authoritySource = 'CASA';
        else if (code.includes('EASA')) authoritySource = 'EASA';
        else if (code.includes('UKCAA') || code.includes('UK_CAA')) authoritySource = 'UKCAA';
        else if (code.includes('FAA')) authoritySource = 'FAA';
        else authoritySource = 'Regulatory';
      }
    } else if (category === 'customer') {
      sector = 'customer';
      authoritySource = 'Customer';
    }
    
    // Insert new standard
    const result = await queryPostgres(
      `INSERT INTO public.standards (id, code, name, authority_source, sector, uploaded_at, is_active)
       VALUES ($1, $2, $3, $4, $5, NOW(), TRUE)
       RETURNING id`,
      [standardId, code, name, authoritySource || null, sector || null]
    );
    
    console.log(`[ingest] ✅ Created/updated standard: ${code} (${sector})`);
    return result.rows[0].id;
    
  } catch (error) {
    const errorMsg = error?.message || error?.toString() || JSON.stringify(error);
    const errorCode = error?.code || 'UNKNOWN';
    const errorDetail = error?.detail || '';
    console.error(`[ingest] ❌ Error creating standard "${code}":`);
    console.error(`   Message: ${errorMsg}`);
    console.error(`   Code: ${errorCode}`);
    if (errorDetail) console.error(`   Detail: ${errorDetail}`);
    if (error?.stack) console.error(`   Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
    throw error;
  }
}

/**
 * Store document content for learning
 */
async function storeDocumentContent(fileId, standardId, standardCode, text, category, quality, metadata) {
  try {
    // Ensure table exists
    await queryEdcatAI(`
      CREATE TABLE IF NOT EXISTS edcat.document_content_for_learning (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        file_id UUID NOT NULL,
        standard_id UUID,
        standard_code TEXT,
        category TEXT NOT NULL,
        content_text TEXT NOT NULL,
        is_example BOOLEAN DEFAULT false,
        quality TEXT,
        word_count INT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      
      CREATE INDEX IF NOT EXISTS idx_doc_content_file ON edcat.document_content_for_learning(file_id);
      CREATE INDEX IF NOT EXISTS idx_doc_content_standard ON edcat.document_content_for_learning(standard_code);
      CREATE INDEX IF NOT EXISTS idx_doc_content_quality ON edcat.document_content_for_learning(quality) WHERE quality IS NOT NULL;
    `);
    
    const wordCount = text.split(/\s+/).length;
    const isExample = category === 'example' || quality !== 'unknown';
    
    await queryEdcatAI(
      `INSERT INTO edcat.document_content_for_learning
       (file_id, standard_id, standard_code, category, content_text, is_example, quality, word_count, metadata, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT (file_id) DO UPDATE SET
         content_text = EXCLUDED.content_text,
         standard_id = EXCLUDED.standard_id,
         standard_code = EXCLUDED.standard_code,
         category = EXCLUDED.category,
         is_example = EXCLUDED.is_example,
         quality = EXCLUDED.quality,
         word_count = EXCLUDED.word_count,
         metadata = EXCLUDED.metadata,
         updated_at = NOW()`,
      [
        fileId,
        standardId,
        standardCode,
        category,
        text,
        isExample,
        quality !== 'unknown' ? quality : null,
        wordCount,
        JSON.stringify(metadata)
      ]
    );
    
    // Also store in example_documents if it's an example
    if (isExample) {
      await queryEdcatAI(`
        CREATE TABLE IF NOT EXISTS edcat.example_documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          file_id UUID NOT NULL UNIQUE,
          standard_id UUID,
          file_name TEXT NOT NULL,
          category TEXT NOT NULL,
          standard_code TEXT,
          quality_score DECIMAL(3,2) DEFAULT 1.0,
          metadata JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        
        CREATE INDEX IF NOT EXISTS idx_example_docs_standard ON edcat.example_documents(standard_code);
        CREATE INDEX IF NOT EXISTS idx_example_docs_quality ON edcat.example_documents(quality_score);
      `);
      
      const qualityScore = quality === 'approved' ? 1.0 : (quality === 'bad' ? 0.3 : 0.7);
      
      await queryEdcatAI(
        `INSERT INTO edcat.example_documents
         (file_id, standard_id, file_name, category, standard_code, quality_score, metadata, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (file_id) DO UPDATE SET
           standard_id = EXCLUDED.standard_id,
           file_name = EXCLUDED.file_name,
           category = EXCLUDED.category,
           standard_code = EXCLUDED.standard_code,
           quality_score = EXCLUDED.quality_score,
           metadata = EXCLUDED.metadata,
           updated_at = NOW()`,
        [
          fileId,
          standardId,
          metadata.fileName,
          category,
          standardCode,
          qualityScore,
          JSON.stringify(metadata)
        ]
      );
    }
    
    // Create embedding for semantic search (non-blocking, don't fail ingestion if this fails)
    try {
      const { default: VeraSemanticMemory } = await import('../services/vera/VeraSemanticMemory.js');
      const sourceType = isExample ? 'example' : 'learning_doc';
      await VeraSemanticMemory.storeEmbedding({
        sourceType,
        sourceId: fileId,
        text: text.substring(0, 10000), // Limit for embedding
        metadata: {
          ...metadata,
          standard_code: standardCode,
          quality,
          category,
          word_count: wordCount
        },
        tenantId: '00000000-0000-0000-0000-000000000000'
      });
      console.log(`[ingest] ✅ Created embedding for ${metadata.fileName}`);
    } catch (embedError) {
      // Non-fatal - log but don't fail ingestion
      console.warn(`[ingest] ⚠️  Could not create embedding for ${metadata.fileName}: ${embedError.message}`);
    }
    
  } catch (error) {
    console.error(`[ingest] Error storing document content:`, error.message);
  }
}

/**
 * Process a single file
 */
async function processFile(filePath, category, relativePath = '') {
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();
  
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    return { processed: false, reason: 'unsupported_extension' };
  }
  
  try {
    console.log(`[ingest] 📄 Processing: ${relativePath || fileName}`);
    
    // Extract text
    const text = await extractTextFromFile(filePath);
    if (!text || text.trim().length < 50) {
      console.warn(`[ingest] ⚠️  Skipping ${fileName}: insufficient text`);
      return { processed: false, reason: 'insufficient_text' };
    }
    
    // Detect standard/regulatory code
    const standardInfo = extractStandardCode(fileName, relativePath);
    const quality = getDocumentQuality(relativePath, fileName);
    
    // Detect regulatory authority if applicable
    const regAuthority = detectRegulatoryAuthority(fileName, relativePath);
    if (regAuthority && category === 'regulatory') {
      standardInfo.authority = regAuthority.code;
    }
    
    // Create or get standard
    const standardId = await createOrGetStandard(
      standardInfo.code,
      standardInfo.name,
      category,
      standardInfo.authority || regAuthority?.code
    );
    
    // Generate file ID
    const fileId = uuidv4();
    
    // Store document content
    await storeDocumentContent(
      fileId,
      standardId,
      standardInfo.code,
      text,
      category,
      quality,
      {
        fileName,
        relativePath,
        filePath,
        standardCode: standardInfo.code,
        standardName: standardInfo.name,
        authority: standardInfo.authority || regAuthority?.code,
        quality,
        category,
        wordCount: text.split(/\s+/).length,
        ingestedAt: new Date().toISOString()
      }
    );
    
    console.log(`[ingest] ✅ Indexed: ${fileName} (${standardInfo.code}, quality: ${quality})`);
    
    // Try to fulfill any open information requests for this standard
    try {
      await tryFulfillInformationRequests(
        '00000000-0000-0000-0000-000000000000', // Default tenant
        standardInfo.code,
        fileId,
        {
          path: relativePath,
          fileName,
          quality,
          category
        }
      );
    } catch (fulfillError) {
      // Non-fatal - log but continue
      console.warn(`[ingest] ⚠️  Could not check request fulfillment: ${fulfillError.message}`);
    }
    
    return {
      processed: true,
      fileId,
      standardId,
      standardCode: standardInfo.code,
      quality
    };
    
  } catch (error) {
    const errorMsg = error?.message || error?.toString() || JSON.stringify(error);
    console.error(`[ingest] ❌ Error processing ${fileName}:`);
    console.error(`   ${errorMsg}`);
    if (error?.code) console.error(`   Error code: ${error.code}`);
    return { processed: false, reason: 'error', error: errorMsg };
  }
}

/**
 * Recursively process directory
 */
async function processDirectory(dirPath, category, relativePath = '') {
  if (!fs.existsSync(dirPath)) {
    console.log(`[ingest] ⚠️  Directory does not exist: ${dirPath}`);
    return { processed: 0, errors: [] };
  }
  
  const results = { processed: 0, errors: [], approved: 0, bad: 0 };
  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const item of items) {
    const itemPath = path.join(dirPath, item.name);
    const currentRelativePath = relativePath ? `${relativePath}/${item.name}` : item.name;
    
    if (item.isDirectory()) {
      // Recursively process subdirectories
      const subResults = await processDirectory(itemPath, category, currentRelativePath);
      results.processed += subResults.processed;
      results.approved += subResults.approved;
      results.bad += subResults.bad;
      results.errors.push(...subResults.errors);
    } else if (item.isFile()) {
      const result = await processFile(itemPath, category, currentRelativePath);
      if (result.processed) {
        results.processed++;
        if (result.quality === 'approved') results.approved++;
        if (result.quality === 'bad') results.bad++;
      } else if (result.reason === 'error') {
        results.errors.push({ file: currentRelativePath, error: result.error });
      }
    }
  }
  
  return results;
}

/**
 * Main ingestion function
 */
async function ingestRequirementsComprehensive() {
  console.log('\n📁 Comprehensive Requirements Folder Ingestion\n');
  console.log('='.repeat(70));
  console.log(`[ingest] Requirements directory: ${REQUIREMENTS_DIR}`);
  console.log('');
  
  // Verify database connections first
  console.log('[ingest] 🔌 Verifying database connections...');
  
  if (!process.env.DATABASE_URL) {
    console.error(`[ingest] ❌ DATABASE_URL environment variable not set!`);
    console.error(`[ingest]    Please set DATABASE_URL in your .env file or environment`);
    process.exit(1);
  }
  
  if (!process.env.EDCAT_AI_DATABASE_URL && !process.env.DATABASE_URL) {
    console.error(`[ingest] ❌ EDCAT_AI_DATABASE_URL environment variable not set!`);
    console.error(`[ingest]    Please set EDCAT_AI_DATABASE_URL in your .env file or environment`);
    process.exit(1);
  }
  
  try {
    const pgTest = await queryPostgres('SELECT NOW() as now, current_database() as db');
    console.log(`[ingest] ✅ PostgreSQL connected: ${pgTest.rows[0].db}`);
  } catch (pgError) {
    const errorMsg = pgError?.message || pgError?.toString() || JSON.stringify(pgError);
    console.error(`[ingest] ❌ PostgreSQL connection failed:`);
    console.error(`[ingest]    ${errorMsg}`);
    if (pgError?.code) console.error(`[ingest]    Error code: ${pgError.code}`);
    console.error(`[ingest]    Check DATABASE_URL environment variable`);
    console.error(`[ingest]    Current DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);
    process.exit(1);
  }
  
  try {
    const edcatTest = await queryEdcatAI('SELECT NOW() as now, current_database() as db');
    console.log(`[ingest] ✅ EDCAT AI DB connected: ${edcatTest.rows[0].db}`);
  } catch (edcatError) {
    const errorMsg = edcatError?.message || edcatError?.toString() || JSON.stringify(edcatError);
    console.error(`[ingest] ❌ EDCAT AI DB connection failed:`);
    console.error(`[ingest]    ${errorMsg}`);
    if (edcatError?.code) console.error(`[ingest]    Error code: ${edcatError.code}`);
    console.error(`[ingest]    Check EDCAT_AI_DATABASE_URL environment variable`);
    console.error(`[ingest]    Current EDCAT_AI_DATABASE_URL: ${process.env.EDCAT_AI_DATABASE_URL ? 'SET' : 'NOT SET'}`);
    process.exit(1);
  }
  console.log('');
  
  const results = {
    standards: { processed: 0, approved: 0, bad: 0, errors: [] },
    regulatory: { processed: 0, approved: 0, bad: 0, errors: [] },
    examples: { processed: 0, approved: 0, bad: 0, errors: [] },
    customer: { processed: 0, approved: 0, bad: 0, errors: [] }
  };
  
  // Process Standards folder
  if (fs.existsSync(STANDARDS_DIR)) {
    console.log('\n📚 Processing Standards folder...');
    results.standards = await processDirectory(STANDARDS_DIR, 'standard');
  } else {
    console.log('\n⚠️  Standards folder not found');
  }
  
  // Process Regulatory folder
  if (fs.existsSync(REGULATORY_DIR)) {
    console.log('\n⚖️  Processing Regulatory folder (CASA, EASA, UK CAA, etc.)...');
    results.regulatory = await processDirectory(REGULATORY_DIR, 'regulatory');
  } else {
    console.log('\n⚠️  Regulatory folder not found');
  }
  
  // Process Examples folder (for learning)
  if (fs.existsSync(EXAMPLES_DIR)) {
    console.log('\n⭐ Processing Examples folder (approved and bad examples for learning)...');
    results.examples = await processDirectory(EXAMPLES_DIR, 'example');
  } else {
    console.log('\n⚠️  Examples folder not found');
  }
  
  // Process Customer folder
  if (fs.existsSync(CUSTOMER_DIR)) {
    console.log('\n🏢 Processing Customer folder...');
    results.customer = await processDirectory(CUSTOMER_DIR, 'customer');
  } else {
    console.log('\n⚠️  Customer folder not found');
  }
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 Ingestion Summary:');
  console.log(`   Standards: ${results.standards.processed} processed (${results.standards.approved} approved, ${results.standards.bad} bad)`);
  console.log(`   Regulatory: ${results.regulatory.processed} processed (${results.regulatory.approved} approved, ${results.regulatory.bad} bad)`);
  console.log(`   Examples: ${results.examples.processed} processed (${results.examples.approved} approved, ${results.examples.bad} bad)`);
  console.log(`   Customer: ${results.customer.processed} processed`);
  
  const totalProcessed = results.standards.processed + results.regulatory.processed + 
                         results.examples.processed + results.customer.processed;
  const totalErrors = results.standards.errors.length + results.regulatory.errors.length + 
                      results.examples.errors.length + results.customer.errors.length;
  
  console.log(`\n   Total: ${totalProcessed} files processed, ${totalErrors} errors`);
  
  if (totalErrors > 0) {
    console.log('\n⚠️  Errors:');
    Object.entries(results).forEach(([category, result]) => {
      if (result.errors.length > 0) {
        console.log(`   ${category}:`);
        result.errors.slice(0, 10).forEach(err => {
          console.log(`     - ${err.file}: ${err.error}`);
        });
        if (result.errors.length > 10) {
          console.log(`     ... and ${result.errors.length - 10} more errors`);
        }
      }
    });
  }
  
  console.log('\n✅ Ingestion complete!');
  console.log('\n💡 Next steps:');
  console.log('   1. Documents are now available to VeraCoreEngine');
  console.log('   2. Ask Vera questions about the standards/regulations');
  console.log('   3. Vera can reference approved examples when generating procedures');
  console.log('   4. Bad examples help Vera understand what to avoid');
  
  return results;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || 
    process.argv[1]?.includes('ingest-requirements-comprehensive.js')) {
  ingestRequirementsComprehensive()
    .then(() => {
      console.log('\n✅ Script execution complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Fatal error:', error);
      console.error(error.stack);
      process.exit(1);
    });
}

export { ingestRequirementsComprehensive };

