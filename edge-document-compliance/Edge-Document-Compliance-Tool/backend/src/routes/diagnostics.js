/**
 * Diagnostics Routes
 * Help diagnose file and database issues
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { queryPostgres, queryEdcatAI } from '../config/databases.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * GET /api/diagnostics/files
 * Check file system status and list files
 */
router.get('/files', async (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, '../../../uploads');
    const uploadsExists = fs.existsSync(uploadsDir);
    
    const result = {
      uploadsDirectory: {
        path: uploadsDir,
        exists: uploadsExists,
        contents: []
      },
      subdirectories: {}
    };
    
    if (uploadsExists) {
      const contents = fs.readdirSync(uploadsDir);
      result.uploadsDirectory.contents = contents;
      
      // Check each subdirectory
      for (const item of contents) {
        const itemPath = path.join(uploadsDir, item);
        if (fs.statSync(itemPath).isDirectory()) {
          const files = fs.readdirSync(itemPath);
          result.subdirectories[item] = {
            path: itemPath,
            fileCount: files.length,
            files: files.slice(0, 20) // First 20 files
          };
        }
      }
    }
    
    res.json({
      success: true,
      filesystem: result,
      note: 'Railway uses ephemeral filesystem - files are lost on redeploy'
    });
  } catch (error) {
    console.error('Diagnostics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/diagnostics/connection
 * Comprehensive connection diagnosis
 */
router.get('/connection', async (req, res) => {
  try {
    const results = {
      connections: {},
      tables: {},
      counts: {},
      linkage: [],
      orphanedFiles: [],
      apiSimulation: {},
      recommendations: []
    };

    // Test connections
    try {
      const pgTest = await queryPostgres('SELECT NOW() as time');
      results.connections.postgresql = { status: 'connected', time: pgTest.rows[0].time };
    } catch (e) {
      results.connections.postgresql = { status: 'failed', error: e.message };
    }

    try {
      const edcatTest = await queryEdcatAI('SELECT NOW() as time');
      results.connections.edcatAI = { status: 'connected', time: edcatTest.rows[0].time };
    } catch (e) {
      results.connections.edcatAI = { status: 'failed', error: e.message };
    }

    // Check table existence
    const tableNames = ['standards', 'standard_files', 'parsed_requirements'];
    for (const tableName of tableNames) {
      try {
        const exists = await queryPostgres(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          ) as exists
        `, [tableName]);
        results.tables[tableName] = exists.rows[0].exists;
      } catch (e) {
        results.tables[tableName] = false;
      }
    }

    // Count records
    try {
      const standardsCount = await queryPostgres('SELECT COUNT(*) as count FROM public.standards');
      results.counts.standards = parseInt(standardsCount.rows[0].count);
    } catch (e) {
      results.counts.standards = 0;
    }

    try {
      const filesCount = await queryPostgres('SELECT COUNT(*) as count FROM public.standard_files');
      results.counts.files = parseInt(filesCount.rows[0].count);
    } catch (e) {
      results.counts.files = 0;
    }

    // Check file categories breakdown
    try {
      const categoryBreakdown = await queryPostgres(`
        SELECT 
          file_category,
          COUNT(*) as count,
          COUNT(DISTINCT standard_id) as unique_standards
        FROM public.standard_files
        WHERE standard_id IS NOT NULL
        GROUP BY file_category
        ORDER BY count DESC
      `);
      results.counts.fileCategories = categoryBreakdown.rows;
    } catch (e) {
      results.counts.fileCategories = [];
    }

    // Check linkage
    try {
      const linkage = await queryPostgres(`
        SELECT 
          s.id as standard_id,
          s.code,
          s.name,
          s.uploaded_at,
          COUNT(sf.id) as file_count,
          STRING_AGG(DISTINCT sf.file_category, ', ') as file_categories
        FROM public.standards s
        LEFT JOIN public.standard_files sf ON s.id = sf.standard_id
        GROUP BY s.id, s.code, s.name, s.uploaded_at
        ORDER BY s.uploaded_at DESC NULLS LAST
        LIMIT 10
      `);
      results.linkage = linkage.rows;
    } catch (e) {
      results.linkage = [];
    }

    // Check orphaned files
    try {
      const orphaned = await queryPostgres(`
        SELECT 
          sf.id,
          sf.file_name,
          sf.standard_id,
          sf.file_category
        FROM public.standard_files sf
        LEFT JOIN public.standards s ON sf.standard_id = s.id
        WHERE sf.standard_id IS NOT NULL
          AND s.id IS NULL
        LIMIT 10
      `);
      results.orphanedFiles = orphaned.rows;
    } catch (e) {
      results.orphanedFiles = [];
    }

    // Simulate API queries for each category
    const categories = ['standard', 'regulatory', 'customer'];
    results.apiSimulation = {};
    
    for (const category of categories) {
      try {
        // Get files for this category
        let categoryFilter = '';
        if (category === 'standard') {
          categoryFilter = `AND (file_category = 'standard' OR file_category = 'standards')`;
        } else if (category === 'regulatory') {
          categoryFilter = `AND (file_category = 'regulatory' OR file_category = 'regulations')`;
        } else if (category === 'customer') {
          categoryFilter = `AND (file_category = 'customer_requirements' OR file_category = 'customer')`;
        }
        
        const filesResult = await queryPostgres(`
          SELECT DISTINCT ON (standard_id)
            standard_id,
            file_category
          FROM public.standard_files
          WHERE standard_id IS NOT NULL
            ${categoryFilter}
          ORDER BY standard_id, uploaded_at DESC NULLS LAST
        `);
        
        const standardIdsArray = Array.from(new Set(filesResult.rows.map(r => r.standard_id).filter(Boolean)));
        
        if (standardIdsArray.length > 0) {
          const apiQuery = await queryPostgres(`
            SELECT 
              s.id as standard_id,
              s.code,
              s.name,
              s.sector,
              s.uploaded_at
            FROM public.standards s
            WHERE s.id = ANY($1)
              AND s.code IS NOT NULL 
              AND TRIM(s.code) != ''
              AND (s.uploaded_at IS NOT NULL OR EXISTS (SELECT 1 FROM public.standard_files WHERE standard_id = s.id))
            ORDER BY LOWER(TRIM(s.code)), s.uploaded_at DESC NULLS LAST
          `, [standardIdsArray]);
          
          results.apiSimulation[category] = {
            filesFound: filesResult.rows.length,
            uniqueStandards: standardIdsArray.length,
            standardsReturned: apiQuery.rows.length,
            standards: apiQuery.rows.map(row => ({
              id: row.standard_id,
              code: row.code,
              name: row.name,
              fileCategory: filesResult.rows.find(f => f.standard_id === row.standard_id)?.file_category
            }))
          };
        } else {
          results.apiSimulation[category] = {
            filesFound: 0,
            uniqueStandards: 0,
            standardsReturned: 0,
            standards: []
          };
        }
      } catch (e) {
        results.apiSimulation[category] = { error: e.message };
      }
    }

    // Generate recommendations
    if (results.counts.standards === 0) {
      results.recommendations.push('No standards in database - upload a file to create standards');
    }
    if (results.counts.files === 0) {
      results.recommendations.push('No files in standard_files table - files may not be saving correctly');
    }
    if (results.orphanedFiles.length > 0) {
      results.recommendations.push(`${results.orphanedFiles.length} files have standard_id that don't exist in standards table`);
    }
    
    // Check each category
    for (const category of categories) {
      const sim = results.apiSimulation[category];
      if (sim.filesFound > 0 && sim.standardsReturned === 0) {
        results.recommendations.push(`${category}: ${sim.filesFound} files found but 0 standards returned - check ID mismatch`);
      } else if (sim.filesFound === 0) {
        results.recommendations.push(`${category}: No files found with file_category matching '${category}' - check upload category`);
      }
    }

    res.json({
      success: true,
      diagnosis: results
    });
  } catch (error) {
    console.error('Diagnosis error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/diagnostics/standards
 * Check standards and their file associations
 */
router.get('/standards', async (req, res) => {
  try {
    // Get all standards from public schema
    let standardsResult;
    try {
      standardsResult = await queryPostgres(
        `SELECT id as standard_id, code, name, COALESCE(total_clauses, total_requirements, 0) as total_requirements, uploaded_at 
         FROM public.standards 
         ORDER BY uploaded_at DESC`
      );
    } catch (err) {
      console.error('Error fetching standards:', err);
      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
    
    // Get file associations
    const standardsWithFiles = await Promise.all(
      standardsResult.rows.map(async (standard) => {
        let fileResult;
        try {
          fileResult = await queryPostgres(
            `SELECT id as file_id, file_name, file_path, file_category, uploaded_at 
             FROM public.standard_files 
             WHERE standard_id = $1
             ORDER BY uploaded_at DESC 
             LIMIT 1`,
            [standard.standard_id]
          );
        } catch (err) {
          fileResult = { rows: [] };
        }
        
        const file = fileResult.rows[0] || null;
        const fileExists = file && file.file_path && file.file_path !== 'database' ? fs.existsSync(file.file_path) : file ? true : false;
        
        return {
          standard: {
            id: standard.standard_id,
            code: standard.code,
            name: standard.name,
            requirementsCount: standard.total_requirements,
            uploadedAt: standard.uploaded_at
          },
          file: file ? {
            id: file.file_id,
            name: file.file_name,
            path: file.file_path,
            category: file.file_category,
            exists: fileExists,
            uploadedAt: file.uploaded_at
          } : null,
          status: fileExists ? 'ok' : (file ? 'file_missing' : 'no_file_record')
        };
      })
    );
    
    res.json({
      success: true,
      standards: standardsWithFiles,
      summary: {
        total: standardsWithFiles.length,
        ok: standardsWithFiles.filter(s => s.status === 'ok').length,
        fileMissing: standardsWithFiles.filter(s => s.status === 'file_missing').length,
        noFileRecord: standardsWithFiles.filter(s => s.status === 'no_file_record').length
      }
    });
  } catch (error) {
    console.error('Standards diagnostics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
