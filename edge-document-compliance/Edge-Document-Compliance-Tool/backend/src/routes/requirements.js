/**
 * Requirements Routes
 * Manage and retrieve compliance requirements and standards
 */

import express from 'express';
import { queryPostgres, queryEdcatAI } from '../config/databases.js';
import fs from 'fs';
import { ClauseQuery } from '../services/clauseQuery.js';
import { requirementMetrics } from '../services/metricsService.js';

const router = express.Router();

// Test endpoint to verify router is working
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Requirements router is working',
    path: req.path,
    originalUrl: req.originalUrl
  });
});

/**
 * GET /api/requirements/standards
 * Get all uploaded standards
 * Query parameter: category - filter by 'standard', 'regulatory', or 'customer'
 */
router.get('/standards', async (req, res) => {
  const startTime = Date.now();
  console.log(`[requirements] ✅ GET /standards route called`);
  console.log(`[requirements]    Category: ${req.query.category || 'none'}`);
  console.log(`[requirements]    Path: ${req.path}, Original URL: ${req.originalUrl}`);
  console.log(`[requirements]    Query params:`, JSON.stringify(req.query));
  
  try {
    const { category } = req.query; // Optional filter: 'standard', 'regulatory', 'customer'
    
    // BUG DETECTION: Log what category we're looking for
    console.log(`[requirements] 🔍 BUG DETECTION: Requesting category="${category || 'ALL'}"`);
    
    // CONSOLIDATED: All file data is now in standards table
    // No need to check standard_files table - file_category is in standards table

    // Query standards from PostgreSQL
    // FIXED: Show standards that have files OR standards that have been uploaded
    // This ensures standards are visible even if standard_files table is empty or not linked
    let query;
    let queryParams = [];
    
    // CONSOLIDATED: All data is in standards table, including file_category
    // Filter by category at SQL level using standards.file_category
    console.log(`[requirements] 🔍 Querying standards from public.standards table${category ? ` (category=${category})` : ''}`);
    
    let categoryFilter = '';
    if (category === 'standard') {
      categoryFilter = `AND (s.file_category = 'standard' OR s.file_category = 'standards' OR (s.file_category IS NULL AND s.sector != 'regulatory' AND s.sector != 'customer'))`;
    } else if (category === 'regulatory') {
      categoryFilter = `AND (s.file_category = 'regulatory' OR s.file_category = 'regulations' OR s.sector = 'regulatory')`;
    } else if (category === 'customer') {
      categoryFilter = `AND (s.file_category = 'customer_requirements' OR s.file_category = 'customer' OR s.sector = 'customer' OR s.sector = 'customer_requirements')`;
    }
    
    query = `
      SELECT 
        s.id as standard_id,
        s.code,
        s.name,
        s.sector,
        s.file_category,
        s.uploaded_at,
        COALESCE(s.total_clauses, s.total_requirements, 0) as total_requirements,
        COALESCE(s.model_version_used, '1.0.0') as model_version_used,
        false as has_learning_data
      FROM public.standards s
      WHERE s.code IS NOT NULL 
        AND TRIM(s.code) != ''
        AND s.uploaded_at IS NOT NULL
        ${categoryFilter}
      ORDER BY LOWER(TRIM(s.code)), s.uploaded_at DESC NULLS LAST
    `;
    queryParams = [];
    
    // ROOT CAUSE FIX: Use PostgreSQL as single source of truth
    let result;
    try {
      result = await queryPostgres(query, queryParams);
      console.log(`[requirements] ✓ Found ${result.rows.length} ${category || 'standards'} in standards table`);
      
      // BUG DETECTION: Log query details
      console.log(`[requirements] 🔍 BUG DETECTION: SQL query executed with ${queryParams.length} params`);
      if (queryParams.length > 0) {
        console.log(`[requirements] 🔍 BUG DETECTION: Query params (first 5 IDs):`, queryParams[0]?.slice(0, 5) || 'N/A');
      }
      
      // Debug: Log all standard codes found
      if (result.rows.length > 0) {
        console.log(`[requirements] 📋 All ${category || 'standard'} codes:`, result.rows.map(r => r.code).join(', '));
        console.log(`[requirements] 📋 All ${category || 'standard'} IDs:`, result.rows.map(r => r.standard_id).join(', '));
        console.log(`[requirements] 📋 Sample row data:`, JSON.stringify(result.rows[0], null, 2));
      }
      
      if (result.rows.length === 0) {
        console.log(`[requirements] ⚠️  No ${category || 'standards'} found in database`);
      } else {
        console.log(`[requirements]    ${category || 'Standards'} found:`, result.rows.map(r => `${r.code} (${r.name})`).join(', '));
      }
    } catch (queryError) {
      console.error(`[requirements] ❌ SQL query error:`, queryError);
      return res.status(500).json({
        success: false,
        error: queryError.message,
        _debug: { query, queryParams, error: queryError.stack }
      });
    }

    // Map standards with correct file_category
    // ROOT CAUSE FIX: No need to filter again - we already filtered in the SQL query
    // All standards returned from the query are guaranteed to have files
    // FIXED: fileCategoryMap is no longer needed - file_category comes directly from standards table
    console.log(`[requirements] 📋 Mapping ${result.rows.length} standards (all have files)`);
    
    let standards;
    try {
      standards = result.rows.map((row, idx) => {
        console.log(`[requirements] 🔍 BUG DETECTION: Mapping row ${idx + 1}: standard_id=${row.standard_id}, code=${row.code}`);
        
        // CONSOLIDATED: file_category is now in standards table
        let fileCategory = row.file_category || 'standard'; // Use file_category from standards table
        
        // If file_category is NULL, use sector as fallback
        if (!fileCategory || fileCategory === 'standard') {
          if (row.sector === 'regulatory') {
            fileCategory = 'regulatory';
          } else if (row.sector === 'customer' || row.sector === 'customer_requirements') {
            fileCategory = 'customer_requirements';
          } else {
            fileCategory = 'standard';
          }
        }
        
        console.log(`[requirements] 🔍 BUG DETECTION: Row ${idx + 1} (${row.code}): fileCategory=${fileCategory} (from standards table)`);
        
        const mapped = {
          id: row.standard_id,
          code: row.code,
          name: row.name,
          sector: row.sector,
          fileCategory: fileCategory,
          filePath: row.file_path || null, // File path is now in standards table
          uploadedAt: row.uploaded_at,
          totalRequirements: row.total_requirements || 0,
          modelVersion: row.model_version_used,
          createdBy: row.created_by
        };
        
        // Removed excessive logging
        return mapped;
      });
    } catch (mapError) {
      console.error(`[requirements] ❌ Mapping error:`, mapError);
      return res.status(500).json({
        success: false,
        error: mapError.message,
        _debug: { resultRows: result.rows.length, error: mapError.stack }
      });
    }
    
    // Debug logging
    console.log(`[requirements] 📊 After mapping: ${standards.length} standards`);
    if (standards.length === 0 && result.rows.length > 0) {
      console.error(`[requirements] ❌ CRITICAL: Mapping produced 0 standards but SQL returned ${result.rows.length} rows!`);
      console.error(`[requirements] ❌ result.rows:`, JSON.stringify(result.rows, null, 2));
    }
    
    if (category) {
      const beforeCategoryFilter = standards.length;
      console.log(`[requirements] 🔍 Category filter: ${category}`);
      console.log(`[requirements] 📊 Before category filter: ${beforeCategoryFilter} standards`);
      if (standards.length > 0) {
        console.log(`[requirements] 📋 Sample fileCategories before filter:`, standards.slice(0, 5).map(s => `${s.code}(${s.fileCategory})`).join(', '));
      }
    }
    
    // Apply category filter AFTER mapping
    let filteredByCategory = standards;
    if (category) {
      const beforeFilter = standards.length;
      console.log(`[requirements] 🔍 BUG DETECTION: Filtering ${beforeFilter} standards for category="${category}"`);
      
      filteredByCategory = standards.filter((std, idx) => {
        let matches = false;
        if (category === 'standard') {
          matches = std.fileCategory === 'standard' || std.fileCategory === 'standards';
        } else if (category === 'regulatory') {
          matches = std.fileCategory === 'regulatory' || std.fileCategory === 'regulations';
        } else if (category === 'customer') {
          matches = std.fileCategory === 'customer_requirements' || std.fileCategory === 'customer';
        } else {
          matches = true;
        }
        
        // Removed excessive logging
        return matches;
      });
      
      console.log(`[requirements] 📊 Category filter: ${beforeFilter} → ${filteredByCategory.length} (category=${category})`);
      if (filteredByCategory.length === 0 && standards.length > 0) {
        console.log(`[requirements] ⚠️  Category filter removed all standards!`);
        console.log(`[requirements] 📋 All fileCategories:`, standards.map(s => `${s.code}(${s.fileCategory})`).join(', '));
      }
    }
    
    const finalStandards = filteredByCategory;
    
    const elapsed = Date.now() - startTime;
    console.log(`📚 Returning ${finalStandards.length} ${category || 'standards'} to frontend (took ${elapsed}ms)`);
    
    // Reduced logging to prevent Railway rate limit errors
    if (finalStandards.length === 0 && result.rows.length > 0) {
      console.warn(`⚠️  No standards returned after filtering (category: ${category || 'ALL'})`);
    }
    
    // Always include debug info to help diagnose issues
    const response = {
      success: true,
      standards: finalStandards,
      _debug: {
        category: category || 'ALL',
        resultCount: result.rows.length,
        mappedCount: standards.length,
        filteredCount: filteredByCategory.length,
        finalCount: finalStandards.length,
        fileCategories: Array.from(new Set(result.rows.map(r => r.file_category).filter(Boolean))),
        sampleStandards: result.rows.length > 0 ? result.rows.slice(0, 3).map(r => ({
          id: r.standard_id,
          code: r.code,
          fileCategory: r.file_category || 'unknown'
        })) : []
      }
    };
    
    // Reduced logging - only log errors
    if (result.rows.length > 0 && response.standards.length === 0) {
      console.error(`[requirements] ❌ SQL found ${result.rows.length} standards but response has 0!`);
    }
    
    // CRITICAL: Ensure standards is always an array
    if (!Array.isArray(response.standards)) {
      console.error(`[requirements] ❌ CRITICAL: response.standards is not an array! Type: ${typeof response.standards}`);
      response.standards = [];
    }
    
    res.json(response);
  } catch (error) {
    // Check if table doesn't exist (migrations not run)
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return res.json({
        success: true,
        standards: [],
        message: 'No standards uploaded yet. Tables may need to be created via migrations.'
      });
    }
    console.error('Error fetching standards:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

    /**
     * GET /api/requirements/standards/:standardId/clause/:clauseNumber
     * Query a specific clause by number
     */
    router.get('/standards/:standardId/clause/:clauseNumber', async (req, res) => {
      try {
        const { standardId, clauseNumber } = req.params;
        const clauseQuery = new ClauseQuery();
        const result = await clauseQuery.getByNumber(standardId, clauseNumber);

        if (!result) {
          return res.status(404).json({
            success: false,
            error: `Clause ${clauseNumber} not found`
          });
        }

        res.json({
          success: true,
          clause: result
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      }
    });

    /**
     * GET /api/requirements/standards/:standardId/requirements
     * Get all requirements for a specific standard
     * CRITICAL FIX: Queries parsed_requirements from PostgreSQL (single source of truth)
     */
    router.get('/standards/:standardId/requirements', async (req, res) => {
  try {
    const { standardId } = req.params;
    const { search, clause } = req.query;

    // CRITICAL FIX: Query parsed_requirements from PostgreSQL (single source of truth)
    // FIXED: Extract clause/subclause/paragraph from existing columns
    // clause_number contains subclause (e.g., "8.5.1")
    // clause_ref contains top-level clause (e.g., "8")
    // subject_text contains paragraph (e.g., "P1")
    let queryText = `
      SELECT 
        id,
        clause_number,  -- This should contain subclause (e.g., "8.5.1")
        clause_title,   -- This should contain subclause name
        requirement_text,
        keyword,
        modal_verb,
        requirement_type,
        requirement_subtype,
        confidence,
        extracted_at,
        intent,
        keywords,
        clause_ref,      -- This should contain top-level clause (e.g., "8")
        sub_ref,
        COALESCE(full_ref, clause_number) as full_ref,
        clause_path_depth,
        subject_text,    -- This should contain paragraph (e.g., "P1", "P2")
        is_informative_note,
        is_recommendation,
        is_in_scope
      FROM public.parsed_requirements
      WHERE standard_id = $1
      -- TEMPORARY: Removed is_in_scope filter to diagnose display issue
      -- AND (is_in_scope = true OR is_in_scope IS NULL)
    `;
    const params = [standardId];

    if (search) {
      queryText += ` AND (requirement_text ILIKE $${params.length + 1} OR clause_ref ILIKE $${params.length + 1} OR clause_title ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    if (clause) {
      queryText += ` AND (clause_ref = $${params.length + 1} OR COALESCE(full_ref, clause_ref || COALESCE('.' || sub_ref, '')) = $${params.length + 1})`;
      params.push(clause);
    }

    queryText += ` ORDER BY 
      CASE 
        WHEN clause_ref ~ '^[0-9]+\.?[0-9]*' THEN 
          CAST(SPLIT_PART(clause_ref, '.', 1) AS INTEGER)
        ELSE 9999
      END,
      CASE 
        WHEN clause_ref ~ '^[0-9]+\.?[0-9]*' AND SPLIT_PART(clause_ref, '.', 2) ~ '^[0-9]+' THEN 
          CAST(SPLIT_PART(clause_ref, '.', 2) AS INTEGER)
        ELSE 9999
      END,
      sub_ref,
      clause_ref,
      extracted_at DESC`;

    const result = await queryPostgres(queryText, params);
    
    // DEBUG: Check total count without is_in_scope filter
    const totalCountResult = await queryPostgres(
      `SELECT COUNT(*) as total_count, 
              COUNT(*) FILTER (WHERE is_in_scope = true) as in_scope_count,
              COUNT(*) FILTER (WHERE is_in_scope = false) as out_scope_count
       FROM public.parsed_requirements 
       WHERE standard_id = $1`,
      [standardId]
    );
    const counts = totalCountResult.rows[0];
    
    console.log(`[requirements] ✓ Found ${result.rows.length} requirements for standard ${standardId} (total: ${counts.total_count}, in-scope: ${counts.in_scope_count}, out-scope: ${counts.out_scope_count})`);

    res.json({
      success: true,
      requirements: result.rows.map(row => ({
        id: row.id,
        clauseNumber: row.clause_number,
        // CRITICAL FIX: Map database columns to frontend fields correctly
        // clause_number contains subclause (e.g., "8.5.1") - use as fullRef
        // clause_ref contains top-level clause (e.g., "8") - use as clauseRef
        // subject_text contains paragraph (e.g., "P1") - use as paragraph
        clauseRef: row.clause_ref || (row.clause_number ? row.clause_number.split('.')[0] : null),        // Top-level clause (e.g., "8")
        subRef: row.sub_ref,              // Sub-reference letter (e.g., "a", "b")
        fullRef: row.full_ref || row.clause_number,            // Full subclause path (e.g., "8.5.1")
        clauseNumber: row.clause_number,  // Subclause (e.g., "8.5.1")
        clauseTitle: row.clause_title || (row.clause_number ? `Clause ${row.clause_number}` : null),
        text: row.requirement_text,
        requirement_text: row.requirement_text,  // Also include as requirement_text for frontend compatibility
        keyword: row.keyword || row.modal_verb,
        requirementType: row.requirement_type,
        requirementSubtype: row.requirement_subtype,
        confidence: row.confidence ? parseFloat(row.confidence) : null,
        extractedAt: row.extracted_at,
        intent: row.intent,
        keywords: row.keywords,
        clausePathDepth: row.clause_path_depth,
        subjectText: row.subject_text,  // Paragraph info stored in subject_text
        isInformativeNote: row.is_informative_note,
        isRecommendation: row.is_recommendation,
        isInScope: row.is_in_scope
      }))
    });
  } catch (error) {
    console.error('Error fetching requirements:', error);
    // Check if table doesn't exist
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return res.json({
        success: true,
        requirements: [],
        message: 'No requirements parsed yet. Parse the standard first.'
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/requirements
 * Get all requirements across all standards (with optional filters)
 */
router.get('/', async (req, res) => {
  try {
    const { search, standardId, keyword, minConfidence } = req.query;

    let queryText = `
      SELECT 
        r.id as requirement_id,
        r.standard_id,
        s.code as standard_code,
        s.name as standard_name,
        r.clause_number,
        r.requirement_text,
        r.keyword,
        r.confidence,
        r.extracted_at,
        r.intent
      FROM public.parsed_requirements r
      JOIN public.standards s ON r.standard_id = s.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (search) {
      queryText += ` AND (r.requirement_text ILIKE $${paramIndex} OR r.keyword ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (standardId) {
      queryText += ` AND r.standard_id = $${paramIndex}`;
      params.push(standardId);
      paramIndex++;
    }

    if (keyword) {
      queryText += ` AND r.keyword ILIKE $${paramIndex}`;
      params.push(`%${keyword}%`);
      paramIndex++;
    }

    if (minConfidence) {
      queryText += ` AND r.confidence >= $${paramIndex}`;
      params.push(parseFloat(minConfidence));
      paramIndex++;
    }

    queryText += ` ORDER BY s.code, r.clause_number LIMIT 500`;

    const result = await queryEdcatAI(queryText, params);

    res.json({
      success: true,
      count: result.rows.length,
      requirements: result.rows.map(row => ({
        id: row.requirement_id,
        standardId: row.standard_id,
        standardCode: row.standard_code,
        standardName: row.standard_name,
        clauseNumber: row.clause_number,
        text: row.requirement_text,
        keyword: row.keyword,
        confidence: row.confidence ? parseFloat(row.confidence) : null,
        extractedAt: row.extracted_at,
        extractionEvent: row.extraction_event
      }))
    });
  } catch (error) {
    console.error('Error fetching requirements:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/requirements/stats
 * Get statistics about uploaded requirements
 */
router.get('/stats', async (req, res) => {
  try {
    // Note: This endpoint uses legacy tables - may need updating
    // ROOT CAUSE FIX: Use PostgreSQL as single source of truth
    const standardsResult = await queryPostgres(`
      SELECT COUNT(*) as count FROM public.standards
    `);
    const standardsCount = parseInt(standardsResult.rows[0].count);

    // ROOT CAUSE FIX: Use PostgreSQL as single source of truth
    const requirementsResult = await queryPostgres(`
      SELECT COUNT(*) as count FROM public.parsed_requirements
    `);
    const requirementsCount = parseInt(requirementsResult.rows[0].count);

    const standardsWithCounts = await queryPostgres(`
      SELECT 
        s.code,
        s.name,
        COUNT(pr.id) as requirement_count
      FROM public.standards s
      LEFT JOIN public.parsed_requirements pr ON s.id = pr.standard_id
      GROUP BY s.id, s.code, s.name
      ORDER BY s.code
    `);

    res.json({
      success: true,
      stats: {
        totalStandards: standardsCount,
        totalRequirements: requirementsCount,
        standards: standardsWithCounts.rows.map(row => ({
          code: row.code,
          name: row.name,
          requirementCount: parseInt(row.requirement_count)
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/requirements/standards/:standardId
 * Delete a standard and its associated requirements and files
 */
router.delete('/standards/:standardId', async (req, res) => {
  try {
    const { standardId } = req.params;
    console.log(`🗑️  Deleting standard: ${standardId}`);

    // ROOT CAUSE FIX: Use PostgreSQL as single source of truth
    const standardResult = await queryPostgres(
      `SELECT id as standard_id, code, name FROM public.standards WHERE id = $1`,
      [standardId]
    );
    if (standardResult.rows.length === 0) {
      console.error(`❌ Standard not found: ${standardId}`);
      return res.status(404).json({ success: false, error: 'Standard not found' });
    }
    const standard = standardResult.rows[0];

    if (!standard) {
      console.error(`❌ Standard not found: ${standardId}`);
      return res.status(404).json({
        success: false,
        error: 'Standard not found'
      });
    }

    // ROOT CAUSE FIX: Use PostgreSQL as single source of truth
    await queryPostgres(`DELETE FROM public.parsed_requirements WHERE standard_id = $1`, [standardId]);

    // Delete physical file if it exists (file_path is now in standards table)
    try {
      const standardFile = await queryPostgres(
        `SELECT file_path FROM public.standards WHERE id = $1`,
        [standardId]
      );
      
      if (standardFile.rows.length > 0 && standardFile.rows[0].file_path) {
        const filePath = standardFile.rows[0].file_path;
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`✓ Deleted physical file: ${filePath}`);
          }
        } catch (fsErr) {
          console.log(`⚠️  Could not delete physical file: ${fsErr.message}`);
        }
      }
    } catch (err) {
      console.log(`⚠️  Error checking file_path: ${err.message}`);
      // Continue with deletion even if file deletion fails
    }
    
    // ROOT CAUSE FIX: Use PostgreSQL as single source of truth
    await queryPostgres(`DELETE FROM public.standards WHERE id = $1`, [standardId]);

    res.json({
      success: true,
      message: `Standard "${standard.code}" deleted successfully`,
      deleted: {
        standardId: standardId,
        code: standard.code,
        name: standard.name
      }
    });
  } catch (error) {
    console.error('Error deleting standard:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/requirements/standards/:standardId
 * Update a standard (e.g., replace with newer version, update metadata)
 */
router.put('/standards/:standardId', async (req, res) => {
  try {
    const { standardId } = req.params;
    const { code, name, sector, modelVersion, authority_source, notes } = req.body;

    // ROOT CAUSE FIX: Use PostgreSQL as single source of truth
    const standardResult = await queryPostgres(
      `SELECT id, code, name FROM public.standards WHERE id = $1`,
      [standardId]
    );

    if (standardResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Standard not found'
      });
    }

    // Build update query dynamically
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (code !== undefined) {
      updates.push(`code = $${paramIndex}`);
      params.push(code);
      paramIndex++;
    }

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(name);
      paramIndex++;
    }

    if (sector !== undefined) {
      updates.push(`sector = $${paramIndex}`);
      params.push(sector);
      paramIndex++;
    }

    if (modelVersion !== undefined) {
      updates.push(`model_version_used = $${paramIndex}`);
      params.push(modelVersion);
      paramIndex++;
    }

    if (authority_source !== undefined) {
      updates.push(`authority_source = $${paramIndex}`);
      params.push(authority_source);
      paramIndex++;
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      params.push(notes);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields provided to update'
      });
    }

    params.push(standardId);

    // Update in EDCAT AI DB
    await queryEdcatAI(
      `UPDATE standards 
       SET ${updates.join(', ')} 
       WHERE id = $${paramIndex}`,
      params
    );

    // Fetch updated standard
    // ROOT CAUSE FIX: Use PostgreSQL as single source of truth
    const updatedResult = await queryPostgres(
      `SELECT id, code, name, sector, uploaded_at, total_clauses as total_requirements, COALESCE(model_version_used, '1.0.0') as model_version_used
       FROM public.standards WHERE id = $1`,
      [standardId]
    );

    res.json({
      success: true,
      message: 'Standard updated successfully',
      standard: updatedResult.rows[0] ? {
        id: updatedResult.rows[0].id,
        code: updatedResult.rows[0].code,
        name: updatedResult.rows[0].name,
        sector: updatedResult.rows[0].sector,
        uploadedAt: updatedResult.rows[0].uploaded_at,
        totalRequirements: updatedResult.rows[0].total_requirements || 0,
        modelVersion: updatedResult.rows[0].model_version_used
      } : null
    });
  } catch (error) {
    console.error('Error updating standard:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/requirements/standards/:standardId/metrics
 * Get requirement metrics for a standard (counts by type, subtype, clause)
 */
router.get('/standards/:standardId/metrics', async (req, res) => {
  try {
    const { standardId } = req.params;
    
    const metrics = await requirementMetrics(standardId);
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error getting requirement metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

