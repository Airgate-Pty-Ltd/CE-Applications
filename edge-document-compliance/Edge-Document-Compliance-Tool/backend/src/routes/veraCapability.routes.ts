/**
 * Vera Capability Routes
 * 
 * Endpoints for viewing Vera's capability profile and growth metrics
 */

import express from 'express';
import { calculateCapabilityProfile, getCapabilitySummary } from '../services/vera/VeraCapabilityProfileService.js';

const router = express.Router();

/**
 * GET /api/vera/capability/summary
 * Get brief capability summary
 */
router.get('/summary', async (req, res) => {
  try {
    const tenantId = req.query.tenantId as string || '00000000-0000-0000-0000-000000000000';

    const summary = await getCapabilitySummary({ tenantId });

    res.json({
      success: true,
      summary
    });

  } catch (error: any) {
    console.error('[VeraCapability] Error getting summary:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/vera/capability/by-standard
 * Get capability metrics by standard
 */
router.get('/by-standard', async (req, res) => {
  try {
    const tenantId = req.query.tenantId as string || '00000000-0000-0000-0000-000000000000';

    const profile = await calculateCapabilityProfile({ tenantId });

    res.json({
      success: true,
      byStandard: profile.byStandard
    });

  } catch (error: any) {
    console.error('[VeraCapability] Error getting by-standard:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/vera/capability/by-intent
 * Get capability metrics by intent
 */
router.get('/by-intent', async (req, res) => {
  try {
    const tenantId = req.query.tenantId as string || '00000000-0000-0000-0000-000000000000';

    const profile = await calculateCapabilityProfile({ tenantId });

    res.json({
      success: true,
      byIntent: profile.byIntent
    });

  } catch (error: any) {
    console.error('[VeraCapability] Error getting by-intent:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/vera/capability/full
 * Get full capability profile
 */
router.get('/full', async (req, res) => {
  try {
    const tenantId = req.query.tenantId as string || '00000000-0000-0000-0000-000000000000';

    const profile = await calculateCapabilityProfile({ tenantId });

    res.json({
      success: true,
      profile
    });

  } catch (error: any) {
    console.error('[VeraCapability] Error getting full profile:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

