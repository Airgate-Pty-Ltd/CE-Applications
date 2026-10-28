/**
 * Industry Modules Routes
 */

import express from 'express';
import IndustryModuleFactory from '../services/industryModules/industryFactory.js';

const router = express.Router();
const factory = new IndustryModuleFactory();

/**
 * GET /api/industry/modules
 * List all available industry modules
 */
router.get('/modules', async (req, res) => {
  try {
    const modules = factory.getAllModules();
    res.json({
      success: true,
      modules: modules
    });
  } catch (error) {
    console.error('[Industry] Error getting modules:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/industry/switch-module
 * Activate an industry module for a tenant
 */
router.post('/switch-module', async (req, res) => {
  try {
    const { tenantId, moduleCode, configuration } = req.body;

    if (!tenantId || !moduleCode) {
      return res.status(400).json({
        success: false,
        error: 'tenantId and moduleCode are required'
      });
    }

    const result = await factory.activateModuleForTenant(tenantId, moduleCode, configuration || {});
    res.json(result);
  } catch (error) {
    console.error('[Industry] Error switching module:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/industry/switch-module/:moduleCode
 * Deactivate an industry module for a tenant
 */
router.delete('/switch-module/:moduleCode', async (req, res) => {
  try {
    const { moduleCode } = req.params;
    const { tenantId } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId is required in request body'
      });
    }

    const result = await factory.deactivateModuleForTenant(tenantId, moduleCode);
    res.json(result);
  } catch (error) {
    console.error('[Industry] Error deactivating module:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/industry/tenant/:tenantId/active
 * Get active modules for a tenant
 */
router.get('/tenant/:tenantId/active', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const modules = await factory.getActiveModulesForTenant(tenantId);
    res.json({
      success: true,
      modules: modules
    });
  } catch (error) {
    console.error('[Industry] Error getting tenant modules:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

