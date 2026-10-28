// backend/src/routes/upload.js

// ═══════════════════════════════════════════════════════════════════════
// UPLOAD ROUTE - Handles standards, documents, regulatory files
// Fixed: Foreign key constraint issue - create standard FIRST, then file
// ═══════════════════════════════════════════════════════════════════════

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import xlsx from 'xlsx';
import { queryPostgres, queryEdcatAI } from '../config/databases.js';
import { storeFile } from '../../config/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════
// MULTER CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════

const uploadDir = path.join(__dirname, '../../../uploads/documents');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/\s+/g, '_');
    cb(null, `${timestamp}_${originalName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: (req, file, cb) => {
    const allowed = /\.(pdf|doc|docx|xls|xlsx|txt)$/i;
    if (allowed.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════
// HELPER: Extract text from uploaded file
// ═══════════════════════════════════════════════════════════════════════

async function extractTextFromFile(filePath, fileName) {
  const ext = path.extname(fileName).toLowerCase();

  console.log(`[upload] 📖 Extracting text from ${ext} file: ${fileName}`);

  try {
    if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      console.log(`[upload] ✅ Extracted ${data.numpages} pages from PDF`);
      return data.text;
    }

    if (ext === '.docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      console.log(`[upload] ✅ Extracted text from DOCX`);
      return result.value;
    }

    if (ext === '.doc') {
      // For .doc files, try reading as text if possible
      console.log(`[upload] ⚠️  .DOC files limited support, try converting to DOCX`);
      return '';
    }

    if (ext === '.xlsx' || ext === '.xls') {
      const workbook = xlsx.readFile(filePath);
      let text = '';
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        text += xlsx.utils.sheet_to_txt(sheet) + '\n';
      }
      console.log(`[upload] ✅ Extracted text from Excel`);
      return text;
    }

    if (ext === '.txt') {
      const text = fs.readFileSync(filePath, 'utf8');
      console.log(`[upload] ✅ Read text file`);
      return text;
    }

    return '';
  } catch (error) {
    console.error(`[upload] ❌ Error extracting text: ${error.message}`);
    return '';
  }
}

// ═══════════════════════════════════════════════════════════════════════
// HELPER: Create or get standard record in database
// ═══════════════════════════════════════════════════════════════════════

async function createOrGetStandard(code, name, sector = 'general') {
  try {
    // ROOT CAUSE FIX: Use PostgreSQL as single source of truth
    let existing;
    try {
      existing = await queryPostgres(
        `SELECT id FROM public.standards WHERE code = $1`,
        [code]
      );
      
      if (existing.rows.length > 0) {
        const existingId = existing.rows[0].id;
        console.log(`[upload] ℹ️  Standard ${code} already exists: ${existingId}`);
        // Ensure uploaded_at is set (in case it was NULL)
        await queryPostgres(
          `UPDATE public.standards SET uploaded_at = COALESCE(uploaded_at, NOW()) WHERE id = $1`,
          [existingId]
        );
        return existingId;
      }

      // Create new standard in PostgreSQL
      // Use ON CONFLICT to handle duplicates gracefully (code has UNIQUE constraint)
      const standardId = uuidv4();
      try {
        // First, try to insert with ON CONFLICT if unique constraint exists
        // If that fails, we'll handle it in the catch block
        let insertResult;
        try {
          insertResult = await queryPostgres(
            `INSERT INTO public.standards (id, code, name, sector, uploaded_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (code) DO UPDATE SET
               name = EXCLUDED.name,
               sector = EXCLUDED.sector,
               uploaded_at = COALESCE(public.standards.uploaded_at, EXCLUDED.uploaded_at)
             RETURNING id`,
            [standardId, code, name, sector]
          );
        } catch (uniqueError) {
          // If ON CONFLICT fails (no unique constraint), check if standard exists
          const conflictCheck = await queryPostgres(
            `SELECT id FROM public.standards WHERE code = $1 LIMIT 1`,
            [code]
          );
          if (conflictCheck.rows.length > 0) {
            const existingId = conflictCheck.rows[0].id;
            // Update uploaded_at if NULL
            await queryPostgres(
              `UPDATE public.standards SET uploaded_at = COALESCE(uploaded_at, NOW()) WHERE id = $1`,
              [existingId]
            );
            return existingId;
          }
          // If no conflict, re-throw the error
          throw uniqueError;
        }
        
        insertResult = insertResult || { rows: [] };
        
        // Get the ID (either new or existing)
        const finalId = insertResult.rows[0]?.id;
        if (finalId) {
          console.log(`[upload] ✅ Standard ${code} created/updated in PostgreSQL: ${finalId}`);
          return finalId;
        }
      } catch (conflictError) {
        // If ON CONFLICT doesn't work (no unique constraint), try to get existing
        const existingCheck = await queryPostgres(
          `SELECT id FROM public.standards WHERE code = $1 LIMIT 1`,
          [code]
        );
        if (existingCheck.rows.length > 0) {
          console.log(`[upload] ℹ️  Standard ${code} already exists (handled conflict): ${existingCheck.rows[0].id}`);
          return existingCheck.rows[0].id;
        }
        throw conflictError;
      }

      // Fallback: query again to get the ID
      const finalCheck = await queryPostgres(
        `SELECT id FROM public.standards WHERE code = $1 LIMIT 1`,
        [code]
      );
      if (finalCheck.rows.length > 0) {
        return finalCheck.rows[0].id;
      }
      
      throw new Error(`Failed to create or retrieve standard ${code}`);
    } catch (innerError) {
      // Re-throw inner errors to outer catch
      throw innerError;
    }
  } catch (error) {
    console.error(`[upload] ❌ Error creating/getting standard:`, error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// HELPER: Save file metadata to database
// ═══════════════════════════════════════════════════════════════════════

async function saveFileMetadata(filePath, fileName, fileType, standardId, category) {
  try {
    const fileStats = fs.statSync(filePath);
    const fileSize = fileStats.size;

    // ═══════════════════════════════════════════════════════════════════
    // CONSOLIDATED: Save file info directly to standards table
    // No more standard_files table - everything is in standards
    // ═══════════════════════════════════════════════════════════════════
    await queryPostgres(
      `UPDATE public.standards 
       SET file_path = $1,
           file_name = $2,
           file_size = $3,
           file_type = $4,
           file_category = $5,
           uploaded_at = COALESCE(uploaded_at, NOW()),
           updated_at = NOW()
       WHERE id = $6`,
      [filePath, fileName, fileSize, fileType, category, standardId]
    );
    
    console.log(`[upload] ✅ Saved file metadata to public.standards: ${standardId}`);
    return {
      id: standardId,
      documentId: standardId,
      originalName: fileName,
      size: fileSize,
      uploadedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error(`[upload] ❌ Error saving file metadata:`, error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// POST /api/upload - Main upload handler
// ═══════════════════════════════════════════════════════════════════════

router.post('/', upload.array('files'), async (req, res) => {
  try {
    const fileType = req.body.type || 'documents'; // standards, regulatory, customer, documents
    const customerId = req.body.customerId || req.headers['x-customer-id'];

    console.log(`[upload] POST request received: {
  filesCount: ${req.files?.length || 0},
  fileType: '${fileType}',
  hasFiles: ${!!req.files?.length},
  customerId: '${customerId || 'none'}'
}`);

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files provided'
      });
    }

    const uploadedFiles = [];
    const errors = [];

    // ═══════════════════════════════════════════════════════════════════
    // PROCESS EACH FILE
    // ═══════════════════════════════════════════════════════════════════

    for (const file of req.files) {
      try {
        console.log(`[upload] 📤 Processing file: ${file.originalname}`);

        // Determine standard code and name from filename or use generic
        let code = file.originalname.split('.')[0];
        let name = code;

        // For standards files, extract proper code and name
        if (fileType === 'standards') {
          // Example: "ISO9001-2015.pdf" → code="ISO9001-2015", name="ISO 9001:2015"
          if (code.match(/ISO\d+/i)) {
            code = code.toUpperCase();
            name = code.replace(/(\d+)(\d{4})/, '$1:$2'); // ISO9001 → ISO 9001:2015
          } else if (code.match(/AS9100/i)) {
            code = 'AS9100D';
            name = 'AS9100D Rev D';
          }
        }

        // ✅ STEP 1: Create/get standard record FIRST
        let standardId;
        // Map fileType to proper sector for standards table
        // NOTE: sector is used for display/organization, file_category in standards table is the source of truth
        let sector = 'general';
        if (fileType === 'standards') {
          sector = 'standard';  // This is just for organization - file_category will be 'standard'
        } else if (fileType === 'regulatory') {
          sector = 'regulatory';  // This is just for organization - file_category will be 'regulatory'
        } else if (fileType === 'customer') {
          sector = 'customer_requirements';  // This is just for organization - file_category will be 'customer_requirements'
        } else {
          sector = 'document';
        }
        
        if (fileType === 'standards' || fileType === 'regulatory' || fileType === 'customer') {
          standardId = await createOrGetStandard(code, name, sector);
        } else {
          // For documents, create a generic holder
          standardId = await createOrGetStandard(`DOC_${code}`, name, sector);
        }

        // ✅ STEP 2: Store file using appropriate strategy (database blob or filesystem)
        // CRITICAL: On Railway, files MUST be stored in database (standard_files_content table)
        // The filesystem is ephemeral and files are lost on redeploy
        const fileBuffer = fs.readFileSync(file.path);
        // Pass original filename to storeFile so it can be saved in blob table
        const storageResult = await storeFile(file.path, fileBuffer, standardId, file.originalname);
        
        console.log(`[upload] 📦 Storage result: ${storageResult} (${storageResult === 'database' ? 'database blob' : 'filesystem'})`);
        
        // ✅ STEP 2.5: Save file metadata to database
        // Map fileType to proper category
        let category = 'document';
        if (fileType === 'standards') {
          category = 'standard';
        } else if (fileType === 'regulatory') {
          category = 'regulatory';
        } else if (fileType === 'customer') {
          category = 'customer_requirements';
        }
        
        // CRITICAL: Always use 'database' flag if file was stored in standard_files_content table
        // This ensures the parser knows to look in the database, not filesystem
        const filePathForMetadata = storageResult === 'database' ? 'database' : file.path;
        
        const fileMetadata = await saveFileMetadata(
          filePathForMetadata, // Use 'database' flag if stored in DB
          file.originalname,
          file.mimetype,
          standardId,
          category
        );
        
        // ✅ STEP 2.6: ALWAYS verify file was stored in database (critical for Railway)
        // Railway filesystem is ephemeral - files MUST be in database
        if (storageResult !== 'database') {
          const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_ENVIRONMENT_NAME;
          if (isRailway || process.env.NODE_ENV === 'production') {
            console.error(`[upload] ❌ CRITICAL ERROR: File stored to filesystem on Railway/production!`);
            console.error(`[upload]    This file will be LOST on redeploy. Storage strategy must be 'database'.`);
            console.error(`[upload]    Check backend/config/storage.js getStoragePath() function.`);
          }
        } else {
          // Verify it's actually in the database
          const verifyResult = await queryPostgres(
            `SELECT id, file_size, filename FROM public.standard_files_content WHERE standard_id = $1`,
            [standardId]
          );
          if (verifyResult.rows.length > 0) {
            console.log(`[upload] ✅ Verified: File stored in standard_files_content table`);
            console.log(`[upload]    Standard ID: ${standardId}`);
            console.log(`[upload]    File size: ${verifyResult.rows[0].file_size} bytes`);
            console.log(`[upload]    Filename: ${verifyResult.rows[0].filename || 'N/A'}`);
          } else {
            console.error(`[upload] ❌ ERROR: File storage reported success but not found in database!`);
            console.error(`[upload]    Standard ID: ${standardId}`);
            console.error(`[upload]    This is a critical bug - file will not be parseable.`);
          }
        }

        // ✅ STEP 2.6: File info is stored directly in standards table
        // The standards table is the source of truth for file locations

        uploadedFiles.push(fileMetadata);

        // ✅ STEP 3: Extract text for later processing (optional, async)
        if (fileType === 'standards') {
          extractTextFromFile(file.path, file.originalname)
            .then(text => {
              console.log(`[upload] 📄 Extracted ${text.length} characters from ${file.originalname}`);
            })
            .catch(err => console.error(`[upload] ⚠️  Text extraction failed: ${err.message}`));
        }

      } catch (fileError) {
        console.error(`[upload] ❌ Error processing file ${file.originalname}:`, fileError);
        errors.push({
          file: file.originalname,
          error: fileError.message
        });

        // Clean up uploaded file on error
        try {
          fs.unlinkSync(file.path);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // SEND RESPONSE
    // ═══════════════════════════════════════════════════════════════════

    console.log(`[upload] ✅ Uploaded ${uploadedFiles.length} file(s), ${errors.length} error(s)`);

    res.json({
      success: uploadedFiles.length > 0,
      files: uploadedFiles,
      errors: errors.length > 0 ? errors : undefined,
      message: uploadedFiles.length > 0
        ? `Successfully uploaded ${uploadedFiles.length} file(s)`
        : 'No files were uploaded successfully'
    });

  } catch (error) {
    console.error('[upload] ❌ CRITICAL ERROR:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      detail: 'Upload processing failed'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// GET /api/upload - Retrieve uploaded files
// ═══════════════════════════════════════════════════════════════════════

router.get('/', async (req, res) => {
  try {
    const fileType = req.query.type || 'documents';
    const customerId = req.headers['x-customer-id'];

    console.log(`[upload] GET request: type='${fileType}', customerId='${customerId || 'none'}'`);

    // CONSOLIDATED: Query standards table directly (no more standard_files table)
    let categoryFilter = '';
    if (fileType === 'standards') {
      categoryFilter = `AND (file_category = 'standard' OR file_category = 'standards' OR (file_category IS NULL AND sector != 'regulatory' AND sector != 'customer'))`;
    } else if (fileType === 'customer') {
      categoryFilter = `AND (file_category = 'customer' OR file_category = 'customer_requirements' OR sector = 'customer' OR sector = 'customer_requirements')`;
    } else if (fileType === 'regulatory') {
      categoryFilter = `AND (file_category = 'regulatory' OR file_category = 'regulations' OR sector = 'regulatory')`;
    } else {
      categoryFilter = `AND (file_category IS NULL OR file_category = 'document' OR file_category = 'documents')`;
    }
    
    const result = await queryPostgres(`
      SELECT id, file_path as "originalName", COALESCE(file_size, 0) as size, 
             uploaded_at as "uploadedAt", file_path, file_category as category
      FROM public.standards
      WHERE file_path IS NOT NULL
        ${categoryFilter}
      ORDER BY uploaded_at DESC
      LIMIT 500
    `);
    const rows = result.rows;

    console.log(`[upload] ✓ Retrieved ${rows.length} file(s) for type: ${fileType}`);

    res.json({
      success: true,
      files: rows,
      count: rows.length
    });

  } catch (error) {
    console.error('[upload] ❌ Error retrieving files:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// DELETE /api/upload/:fileId - Delete uploaded file
// ═══════════════════════════════════════════════════════════════════════

router.delete('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;

    console.log(`[upload] DELETE request: fileId=${fileId}`);

    // CRITICAL: standard_files is in Customer Data DB
    const fileResult = await queryPostgres(
      'SELECT file_path FROM public.standard_files WHERE id = $1',
      [fileId]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    const filePath = fileResult.rows[0].file_path;

    // Delete from database (Customer Data DB)
    await queryPostgres('DELETE FROM public.standard_files WHERE id = $1', [fileId]);

    // Delete physical file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[upload] ✅ Deleted file: ${filePath}`);
    }

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('[upload] ❌ Error deleting file:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════════

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error('[upload] Multer error:', error);
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
  
  if (error) {
    console.error('[upload] Middleware error:', error);
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }

  next();
});

export default router;
