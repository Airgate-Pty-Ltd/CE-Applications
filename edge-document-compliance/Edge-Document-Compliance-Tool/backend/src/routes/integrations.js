/**
 * Integration Marketplace Routes
 */

import express from 'express';
import IntegrationMarketplace from '../services/integrations/integrationMarketplace.js';

const router = express.Router();
const marketplace = new IntegrationMarketplace();

/**
 * POST /api/integrations/enable
 * Create/enable an integration
 */
router.post('/enable', async (req, res) => {
  try {
    const { tenantId, integrationType, integrationName, configuration } = req.body;

    if (!tenantId || !integrationType || !integrationName || !configuration) {
      return res.status(400).json({
        success: false,
        error: 'tenantId, integrationType, integrationName, and configuration are required'
      });
    }

    const result = await marketplace.createIntegration(
      tenantId, integrationType, integrationName, configuration
    );
    res.json(result);
  } catch (error) {
    console.error('[Integrations] Error enabling integration:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/integrations
 * Get all integrations for a tenant
 */
router.get('/', async (req, res) => {
  try {
    const { tenantId } = req.query;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId is required'
      });
    }

    const integrations = await marketplace.getIntegrations(tenantId);
    res.json({
      success: true,
      integrations: integrations
    });
  } catch (error) {
    console.error('[Integrations] Error getting integrations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/integrations/slack/notify
 * Send Slack notification
 */
router.post('/slack/notify', async (req, res) => {
  try {
    const { integrationId, message, channel } = req.body;

    if (!integrationId || !message) {
      return res.status(400).json({
        success: false,
        error: 'integrationId and message are required'
      });
    }

    const result = await marketplace.sendSlackNotification(integrationId, message, channel);
    res.json(result);
  } catch (error) {
    console.error('[Integrations] Error sending Slack notification:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/integrations/teams/notify
 * Send Teams notification
 */
router.post('/teams/notify', async (req, res) => {
  try {
    const { integrationId, message, title } = req.body;

    if (!integrationId || !message) {
      return res.status(400).json({
        success: false,
        error: 'integrationId and message are required'
      });
    }

    const result = await marketplace.sendTeamsNotification(integrationId, message, title);
    res.json(result);
  } catch (error) {
    console.error('[Integrations] Error sending Teams notification:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/integrations/jira/create-issue
 * Create Jira issue
 */
router.post('/jira/create-issue', async (req, res) => {
  try {
    const { integrationId, issueData } = req.body;

    if (!integrationId || !issueData) {
      return res.status(400).json({
        success: false,
        error: 'integrationId and issueData are required'
      });
    }

    const result = await marketplace.createJiraIssue(integrationId, issueData);
    res.json(result);
  } catch (error) {
    console.error('[Integrations] Error creating Jira issue:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/integrations/email/send
 * Send email
 */
router.post('/email/send', async (req, res) => {
  try {
    const { integrationId, to, subject, body, isHtml } = req.body;

    if (!integrationId || !to || !subject || !body) {
      return res.status(400).json({
        success: false,
        error: 'integrationId, to, subject, and body are required'
      });
    }

    const result = await marketplace.sendEmail(integrationId, to, subject, body, isHtml);
    res.json(result);
  } catch (error) {
    console.error('[Integrations] Error sending email:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/integrations/webhook/trigger
 * Trigger webhook
 */
router.post('/webhook/trigger', async (req, res) => {
  try {
    const { integrationId, payload } = req.body;

    if (!integrationId || !payload) {
      return res.status(400).json({
        success: false,
        error: 'integrationId and payload are required'
      });
    }

    const result = await marketplace.triggerWebhook(integrationId, payload);
    res.json(result);
  } catch (error) {
    console.error('[Integrations] Error triggering webhook:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

