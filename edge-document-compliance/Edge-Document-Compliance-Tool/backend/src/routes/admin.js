/**
 * Admin Routes
 * Admin interface for reviewing learning proposals
 */

import express from 'express';
import { queryPostgres } from '../config/databases.js';

const router = express.Router();

/**
 * GET /api/admin/learning/proposals
 * Get all proposed tunings for admin review
 */
router.get('/learning/proposals', async (req, res) => {
  try {
    // Note: gap_tuning table doesn't exist in public schema yet
    // Return empty for now
    const result = { rows: [] };

    res.json({
      success: true,
      proposals: result.rows.map(row => ({
        id: row.id,
        tenant_id: row.tenant_id,
        standard_code: row.standard_code,
        clause_ref: row.clause_ref,
        version: row.version,
        semantic_full: row.semantic_full,
        semantic_partial: row.semantic_partial,
        boosts: row.boosts,
        penalties: row.penalties,
        synonyms: row.synonyms,
        approved: row.approved,
        rationale: row.rationale,
        created_at: row.created_at,
        trace_count: parseInt(row.trace_count || 0)
      }))
    });
  } catch (error) {
    console.error('Get proposals error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/admin/learning/stats
 * Get learning statistics
 */
router.get('/learning/stats', async (req, res) => {
  try {
    // Note: gap_tuning table doesn't exist in public schema yet
    const proposalsResult = { rows: [{ total: 0, approved: 0, pending: 0 }] };

    // Use audit_trail for feedback count
    const feedbackResult = await queryPostgres(
      `SELECT COUNT(*) as count FROM public.audit_trail
       WHERE action = 'feedback'
       AND created_at >= NOW() - INTERVAL '7 days'`
    ).catch(() => ({ rows: [{ count: 0 }] }));

    const tracesResult = await queryPostgres(
      `SELECT COUNT(*) as count FROM public.gap_analyses
       WHERE created_at >= NOW() - INTERVAL '7 days'`
    ).catch(() => ({ rows: [{ count: 0 }] }));

    res.json({
      success: true,
      stats: {
        tunings_last_7_days: {
          total: parseInt(proposalsResult.rows[0].total || 0),
          approved: parseInt(proposalsResult.rows[0].approved || 0),
          pending: parseInt(proposalsResult.rows[0].pending || 0)
        },
        feedback_last_7_days: parseInt(feedbackResult.rows[0].count || 0),
        traces_last_7_days: parseInt(tracesResult.rows[0].count || 0)
      }
    });
  } catch (error) {
    console.error('Get learning stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/create-parsed-requirements-table
 * Create parsed_requirements table immediately (admin only)
 * Fixes parsing functionality
 */
router.post('/create-parsed-requirements-table', async (req, res) => {
  try {
    console.log('[admin] Creating parsed_requirements table triggered via API...');
    
    const createParsedRequirementsTableNow = (await import('../scripts/create-parsed-requirements-table-now.js')).default;
    await createParsedRequirementsTableNow();
    
    // Verify table was created
    const verify = await queryPostgres(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'parsed_requirements'
    `);
    
    res.json({
      success: true,
      message: 'parsed_requirements table created successfully',
      tableExists: verify.rows[0].count > 0
    });
  } catch (error) {
    console.error('[admin] Create table error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/admin/cleanup-orphaned-tables
 * Trigger cleanup to remove orphaned tables (admin only)
 * Removes all tables with no code connections
 */
router.post('/cleanup-orphaned-tables', async (req, res) => {
  try {
    console.log('[admin] Cleanup orphaned tables triggered via API...');
    
    // Use direct cleanup script (more reliable)
    const executeDirectCleanup = (await import('../scripts/execute-direct-cleanup.js')).default;
    
    // Run cleanup
    const result = await executeDirectCleanup();
    
    res.json({
      success: true,
      message: 'Cleanup completed successfully',
      ...result
    });
  } catch (error) {
    console.error('[admin] Cleanup error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/admin/process-requirements
 * Trigger processing of Requirements folder (admin only)
 * Processes all documents from Standards, Regulatory, and Customer folders
 */
router.post('/process-requirements', async (req, res) => {
  try {
    console.log('[admin] Processing Requirements folder triggered via API...');
    console.log('[admin] DATABASE_URL:', process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ':****@') || 'NOT SET');
    console.log('[admin] EDCAT_AI_DATABASE_URL:', process.env.EDCAT_AI_DATABASE_URL?.replace(/:([^:@]+)@/, ':****@') || 'NOT SET (using DATABASE_URL)');
    
    // Verify database connection first
    const { queryPostgres } = await import('../config/databases.js');
    try {
      const dbCheck = await queryPostgres('SELECT current_database() as db, COUNT(*) as count FROM public.standards');
      console.log(`[admin] ✅ Connected to database: ${dbCheck.rows[0].db}`);
      console.log(`[admin] 📊 Current row count in public.standards: ${dbCheck.rows[0].count}`);
    } catch (dbErr) {
      console.error('[admin] ❌ Database connection check failed:', dbErr.message);
      return res.status(500).json({
        success: false,
        error: `Database connection failed: ${dbErr.message}`
      });
    }
    
    // Import and run the processing function
    const { processRequirementsFolder } = await import('../scripts/process-requirements-folder.js');
    
    // Run in background - return immediately
    processRequirementsFolder()
      .then(async () => {
        console.log('[admin] ✅ Requirements folder processing completed');
        // Verify final count
        try {
          const finalCheck = await queryPostgres('SELECT COUNT(*) as count FROM public.standards');
          console.log(`[admin] 📊 Final row count in public.standards: ${finalCheck.rows[0].count}`);
        } catch (err) {
          console.error('[admin] Could not verify final count:', err.message);
        }
      })
      .catch((err) => {
        console.error('[admin] ❌ Requirements folder processing error:', err.message);
        console.error('[admin] Error stack:', err.stack);
      });
    
    res.json({
      success: true,
      message: 'Requirements folder processing started in background. Check logs for progress.',
      note: 'This may take several minutes depending on the number of documents.',
      database: process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ':****@') || 'NOT SET'
    });
  } catch (error) {
    console.error('[admin] Process requirements error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

