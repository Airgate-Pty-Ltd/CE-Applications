/**
 * Whitelist Crawler API Routes
 * 
 * Admin-only endpoints for managing whitelisted crawler sources
 * and triggering crawls.
 * 
 * © 2025 Conform-Edge Quality Consulting. All rights reserved. CEQC-OQCQMS
 */

import express from 'express';
import { query } from '../database/connection.js';
import whitelistCrawler from '../services/whitelistCrawler.js';
import tenantIsolationMiddleware from '../middleware/tenantIsolation.js';
import auditLoggingMiddleware from '../middleware/auditLogging.js';

const router = express.Router();

// Apply middleware (admin routes may have different auth requirements)
router.use(tenantIsolationMiddleware);
router.use(auditLoggingMiddleware);

/**
 * GET /api/crawler/configuration
 * Get whitelist configuration (admin only)
 */
router.get('/configuration', async (req, res) => {
  try {
    // TODO: Add admin role check
    const config = whitelistCrawler.loadWhitelistConfig();
    
    // Also get configured sources from database
    const sourcesResult = await query(
      `SELECT id, domain, path_pattern, update_frequency, document_type, 
              source_reference, enabled, created_at
       FROM crawler_sources
       WHERE tenant_id IS NULL OR tenant_id = $1
       ORDER BY domain`,
      [req.tenantId]
    );
    
    res.json({
      success: true,
      config,
      sources: sourcesResult.rows
    });
  } catch (error) {
    console.error('[Crawler] Configuration error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/crawler/whitelist/add
 * Add new whitelisted domain (admin only)
 */
router.post('/whitelist/add', async (req, res) => {
  try {
    // TODO: Add admin role check
    const { domain, path_pattern, update_frequency, document_type, source_reference } = req.body;
    
    if (!domain) {
      return res.status(400).json({
        success: false,
        error: 'domain is required'
      });
    }
    
    const sourceId = uuidv4();
    await query(
      `INSERT INTO crawler_sources 
       (id, tenant_id, domain, path_pattern, update_frequency, document_type, source_reference, enabled)
       VALUES ($1, NULL, $2, $3, $4, $5, $6, TRUE)
       ON CONFLICT (COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), domain, path_pattern)
       DO UPDATE SET 
         update_frequency = $4,
         document_type = $5,
         source_reference = $6,
         enabled = TRUE,
         updated_at = NOW()`,
      [
        sourceId,
        domain,
        path_pattern || null,
        update_frequency || 'weekly',
        document_type || 'regulation',
        source_reference || domain
      ]
    );
    
    res.json({
      success: true,
      sourceId
    });
  } catch (error) {
    console.error('[Crawler] Add whitelist error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/crawler/jobs
 * Get crawl job history
 */
router.get('/jobs', async (req, res) => {
  try {
    const history = await whitelistCrawler.getCrawlHistory(req.tenantId, 50);
    
    res.json({
      success: true,
      jobs: history
    });
  } catch (error) {
    console.error('[Crawler] Jobs error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/crawler/sync/:sourceId
 * Trigger manual sync for a whitelisted source
 */
router.post('/sync/:sourceId', async (req, res) => {
  try {
    const { sourceId } = req.params;
    
    // Get source configuration
    const sourceResult = await query(
      `SELECT domain, path_pattern, start_urls FROM crawler_sources WHERE id = $1 AND enabled = TRUE`,
      [sourceId]
    );
    
    if (sourceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Source not found or disabled'
      });
    }
    
    const source = sourceResult.rows[0];
    const startUrls = source.start_urls || [`https://${source.domain}${source.path_pattern || '/'}`];
    
    // Trigger crawl
    const result = await whitelistCrawler.crawlWhitelistedSources(req.tenantId, {
      startUrls,
      maxDepth: 2
    });
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[Crawler] Sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/crawler/crawl
 * Trigger crawl for all enabled sources (admin only)
 */
router.post('/crawl', async (req, res) => {
  try {
    // TODO: Add admin role check
    const { startUrls } = req.body;
    
    const result = await whitelistCrawler.crawlWhitelistedSources(req.tenantId, {
      startUrls,
      maxDepth: 3
    });
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[Crawler] Crawl error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

