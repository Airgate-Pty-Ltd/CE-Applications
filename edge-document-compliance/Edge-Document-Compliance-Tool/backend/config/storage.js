/**
 * Storage Configuration
 * Handles file persistence strategy for Railway (ephemeral filesystem)
 * 
 * Strategy:
 * - Production (Railway): Store file content as base64 in database
 * - Development: Use local filesystem
 */

import path from 'path';
import fs from 'fs';
import { queryPostgres } from '../src/config/databases.js';

/**
 * Get storage strategy based on environment
 */
export const getStoragePath = () => {
  // CRITICAL: On Railway, filesystem is ephemeral - MUST use database storage
  // Check for Railway environment variables OR production mode
  const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_ENVIRONMENT_NAME;
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Always use database storage on Railway or in production
  if (isRailway || isProduction) {
    return 'database'; // Flag to store file content as base64 in DB
  }
  
  // Development: use local filesystem
  return path.join(process.cwd(), 'uploads');
};

/**
 * Store file using appropriate strategy
 * @param {string} filePath - Original file path (for dev) or identifier
 * @param {Buffer} fileBuffer - File content as buffer
 * @param {string} standardId - Standard UUID
 * @param {string} filename - Original filename (optional, for blob storage)
 * @returns {Promise<string>} - Returns 'database' or actual file path
 */
export const storeFile = async (filePath, fileBuffer, standardId, filename = null) => {
  const strategy = getStoragePath();
  
  if (strategy === 'database') {
    // Store base64 in new table: standard_files_content
    const base64 = fileBuffer.toString('base64');
    
    try {
      // CRITICAL: standard_files_content is in Customer Data DB
      // Ensure table exists (idempotent)
      await queryPostgres(`
        CREATE TABLE IF NOT EXISTS public.standard_files_content (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          standard_id UUID NOT NULL,
          file_content TEXT NOT NULL,
          file_size INT NOT NULL,
          filename VARCHAR(255),
          stored_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(standard_id)
        );
        CREATE INDEX IF NOT EXISTS idx_standard_files_content_standard_id 
          ON public.standard_files_content(standard_id);
      `);
      
      // Add filename column if it doesn't exist (for existing tables)
      await queryPostgres(`
        ALTER TABLE public.standard_files_content ADD COLUMN IF NOT EXISTS filename VARCHAR(255);
      `).catch(() => {
        // Ignore error if column already exists
      });
      
      // Use provided filename or extract from filePath
      const storedFilename = filename || path.basename(filePath) || 'document';
      
      await queryPostgres(
        `INSERT INTO public.standard_files_content (standard_id, file_content, file_size, filename, stored_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (standard_id) DO UPDATE SET
           file_content = EXCLUDED.file_content,
           file_size = EXCLUDED.file_size,
           filename = EXCLUDED.filename,
           updated_at = NOW()`,
        [standardId, base64, fileBuffer.length, storedFilename]
      );
      
      console.log(`[storage] ✅ Stored file content in database for standard ${standardId} (${fileBuffer.length} bytes)`);
      return 'database';
    } catch (error) {
      console.error(`[storage] ❌ Error storing file in database: ${error.message}`);
      throw error;
    }
  } else {
    // Save to local disk for dev
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await fs.promises.writeFile(filePath, fileBuffer);
    console.log(`[storage] ✅ Stored file to local filesystem: ${filePath}`);
    return filePath;
  }
};

/**
 * Retrieve file content using appropriate strategy
 * @param {string} filePath - File path or 'database' flag
 * @param {string} standardId - Standard UUID (required if strategy is 'database')
 * @returns {Promise<Buffer>} - File content as buffer
 */
export const retrieveFile = async (filePath, standardId) => {
  const strategy = getStoragePath();
  
  if (strategy === 'database') {
    if (!standardId) {
      throw new Error('standardId required for database storage retrieval');
    }
    
    // CRITICAL: standard_files_content is in Customer Data DB
    const result = await queryPostgres(
      `SELECT file_content, file_size FROM public.standard_files_content WHERE standard_id = $1`,
      [standardId]
    );
    
    if (result.rows.length === 0) {
      throw new Error(`File content not found for standard ${standardId}`);
    }
    
    const base64 = result.rows[0].file_content;
    const buffer = Buffer.from(base64, 'base64');
    console.log(`[storage] ✅ Retrieved file from database for standard ${standardId} (${buffer.length} bytes)`);
    return buffer;
  } else {
    // Read from local filesystem
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    const buffer = await fs.promises.readFile(filePath);
    console.log(`[storage] ✅ Retrieved file from filesystem: ${filePath} (${buffer.length} bytes)`);
    return buffer;
  }
};

/**
 * Check if file exists using appropriate strategy
 * @param {string} filePath - File path or 'database' flag
 * @param {string} standardId - Standard UUID (required if strategy is 'database')
 * @returns {Promise<boolean>}
 */
export const fileExists = async (filePath, standardId) => {
  const strategy = getStoragePath();
  
  if (strategy === 'database') {
    if (!standardId) {
      return false;
    }
    // CRITICAL: standard_files_content is in Customer Data DB
    const result = await queryPostgres(
      `SELECT 1 FROM public.standard_files_content WHERE standard_id = $1 LIMIT 1`,
      [standardId]
    );
    return result.rows.length > 0;
  } else {
    return fs.existsSync(filePath);
  }
};

