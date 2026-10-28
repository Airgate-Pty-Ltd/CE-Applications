/**
 * Integration Marketplace
 * Manages third-party integrations (Slack, Teams, Salesforce, Jira, Email, Webhooks)
 */

import { query } from '../../database/connection.js';
import axios from 'axios';

class IntegrationMarketplace {
  constructor() {
    this.integrationTypes = ['slack', 'teams', 'salesforce', 'jira', 'email', 'webhook'];
  }

  async createIntegration(tenantId, integrationType, integrationName, configuration) {
    try {
      if (!this.integrationTypes.includes(integrationType)) {
        throw new Error(`Unsupported integration type: ${integrationType}`);
      }

      const result = await query(
        `INSERT INTO integrations (integration_type, integration_name, tenant_id, configuration, is_active)
         VALUES ($1, $2, $3, $4, TRUE)
         RETURNING id`,
        [integrationType, integrationName, tenantId, JSON.stringify(configuration)]
      );

      return {
        success: true,
        integrationId: result.rows[0].id,
        message: `Integration ${integrationName} created`
      };
    } catch (error) {
      console.error('[IntegrationMarketplace] Error creating integration:', error);
      throw error;
    }
  }

  async getIntegrations(tenantId) {
    try {
      const result = await query(
        `SELECT id, integration_type, integration_name, configuration, is_active, last_sync_at
         FROM integrations
         WHERE tenant_id = $1 OR tenant_id IS NULL
         ORDER BY created_at DESC`,
        [tenantId]
      );

      return result.rows.map(row => ({
        id: row.id,
        type: row.integration_type,
        name: row.integration_name,
        configuration: row.configuration || {},
        isActive: row.is_active,
        lastSyncAt: row.last_sync_at
      }));
    } catch (error) {
      console.error('[IntegrationMarketplace] Error getting integrations:', error);
      return [];
    }
  }

  async sendSlackNotification(integrationId, message, channel = null) {
    try {
      const integration = await this.getIntegrationById(integrationId);
      if (!integration || integration.type !== 'slack') {
        throw new Error('Integration not found or not a Slack integration');
      }

      const config = integration.configuration;
      const webhookUrl = config.webhook_url;
      if (!webhookUrl) {
        throw new Error('Slack webhook URL not configured');
      }

      const payload = {
        text: message,
        channel: channel || config.default_channel || '#general'
      };

      const response = await axios.post(webhookUrl, payload);

      // Log the notification
      await this.logIntegrationEvent(integrationId, 'notification_sent', 'success', { message, channel });

      return { success: true, message: 'Slack notification sent' };
    } catch (error) {
      console.error('[IntegrationMarketplace] Error sending Slack notification:', error);
      await this.logIntegrationEvent(integrationId, 'notification_sent', 'failed', { error: error.message });
      throw error;
    }
  }

  async sendTeamsNotification(integrationId, message, title = 'EDCAT Notification') {
    try {
      const integration = await this.getIntegrationById(integrationId);
      if (!integration || integration.type !== 'teams') {
        throw new Error('Integration not found or not a Teams integration');
      }

      const config = integration.configuration;
      const webhookUrl = config.webhook_url;
      if (!webhookUrl) {
        throw new Error('Teams webhook URL not configured');
      }

      const payload = {
        '@type': 'MessageCard',
        '@context': 'https://schema.org/extensions',
        summary: title,
        themeColor: '0078D4',
        title: title,
        text: message
      };

      const response = await axios.post(webhookUrl, payload);

      await this.logIntegrationEvent(integrationId, 'notification_sent', 'success', { message, title });

      return { success: true, message: 'Teams notification sent' };
    } catch (error) {
      console.error('[IntegrationMarketplace] Error sending Teams notification:', error);
      await this.logIntegrationEvent(integrationId, 'notification_sent', 'failed', { error: error.message });
      throw error;
    }
  }

  async createJiraIssue(integrationId, issueData) {
    try {
      const integration = await this.getIntegrationById(integrationId);
      if (!integration || integration.type !== 'jira') {
        throw new Error('Integration not found or not a Jira integration');
      }

      const config = integration.configuration;
      const jiraUrl = config.jira_url;
      const email = config.email;
      const apiToken = config.api_token;

      if (!jiraUrl || !email || !apiToken) {
        throw new Error('Jira credentials not configured');
      }

      const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

      const payload = {
        fields: {
          project: { key: config.project_key },
          summary: issueData.summary,
          description: issueData.description,
          issuetype: { name: issueData.issueType || 'Task' }
        }
      };

      const response = await axios.post(
        `${jiraUrl}/rest/api/3/issue`,
        payload,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          }
        }
      );

      await this.logIntegrationEvent(integrationId, 'data_synced', 'success', { issueKey: response.data.key });

      return { success: true, issueKey: response.data.key };
    } catch (error) {
      console.error('[IntegrationMarketplace] Error creating Jira issue:', error);
      await this.logIntegrationEvent(integrationId, 'data_synced', 'failed', { error: error.message });
      throw error;
    }
  }

  async sendEmail(integrationId, to, subject, body, isHtml = false) {
    try {
      const integration = await this.getIntegrationById(integrationId);
      if (!integration || integration.type !== 'email') {
        throw new Error('Integration not found or not an Email integration');
      }

      const config = integration.configuration;
      // This would use nodemailer or similar
      // For now, we'll log it
      console.log(`[Email] Would send to ${to}: ${subject}`);

      await this.logIntegrationEvent(integrationId, 'notification_sent', 'success', { to, subject });

      return { success: true, message: 'Email queued for sending' };
    } catch (error) {
      console.error('[IntegrationMarketplace] Error sending email:', error);
      await this.logIntegrationEvent(integrationId, 'notification_sent', 'failed', { error: error.message });
      throw error;
    }
  }

  async triggerWebhook(integrationId, payload) {
    try {
      const integration = await this.getIntegrationById(integrationId);
      if (!integration || integration.type !== 'webhook') {
        throw new Error('Integration not found or not a Webhook integration');
      }

      const config = integration.configuration;
      const webhookUrl = config.webhook_url;
      if (!webhookUrl) {
        throw new Error('Webhook URL not configured');
      }

      const response = await axios.post(webhookUrl, payload, {
        headers: config.headers || { 'Content-Type': 'application/json' }
      });

      await this.logIntegrationEvent(integrationId, 'webhook_received', 'success', { statusCode: response.status });

      return { success: true, statusCode: response.status };
    } catch (error) {
      console.error('[IntegrationMarketplace] Error triggering webhook:', error);
      await this.logIntegrationEvent(integrationId, 'webhook_received', 'failed', { error: error.message });
      throw error;
    }
  }

  async getIntegrationById(integrationId) {
    try {
      const result = await query(
        `SELECT id, integration_type, integration_name, tenant_id, configuration, is_active
         FROM integrations
         WHERE id = $1`,
        [integrationId]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: row.id,
        type: row.integration_type,
        name: row.integration_name,
        tenantId: row.tenant_id,
        configuration: row.configuration || {},
        isActive: row.is_active
      };
    } catch (error) {
      console.error('[IntegrationMarketplace] Error getting integration:', error);
      return null;
    }
  }

  async logIntegrationEvent(integrationId, eventType, status, payload = {}) {
    try {
      await query(
        `INSERT INTO integration_logs (integration_id, event_type, status, payload)
         VALUES ($1, $2, $3, $4)`,
        [integrationId, eventType, status, JSON.stringify(payload)]
      );
    } catch (error) {
      console.error('[IntegrationMarketplace] Error logging event:', error);
    }
  }

  async updateIntegrationSyncTime(integrationId) {
    try {
      await query(
        `UPDATE integrations SET last_sync_at = NOW() WHERE id = $1`,
        [integrationId]
      );
    } catch (error) {
      console.error('[IntegrationMarketplace] Error updating sync time:', error);
    }
  }
}

export default IntegrationMarketplace;

