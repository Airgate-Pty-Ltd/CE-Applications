import crypto from 'node:crypto';
import fetch from 'node-fetch';
import {
  WebhookModel,
  WebhookDeliveryLogModel,
  AuditAnalytics
} from '../models/index.js';

const DEFAULT_TIMEOUT = 5000;

class IntegrationService {
  async registerWebhook({ event_type, callback_url, secret }) {
    if (!event_type || !callback_url) {
      throw new Error('event_type and callback_url required');
    }
    const webhook = await WebhookModel.register({ event_type, callback_url, secret });
    await AuditAnalytics.log({
      action: 'webhook_registered',
      details: { event_type, webhook_id: webhook.id }
    });
    return webhook;
  }

  async listWebhooks() {
    return WebhookModel.listActive();
  }

  async dispatchEvent(event_type, payload) {
    const webhooks = await WebhookModel.listActive(event_type);
    await Promise.all(
      webhooks.map(async (hook) => {
        try {
          const body = JSON.stringify({ event_type, payload, timestamp: new Date().toISOString() });
          const headers = { 'Content-Type': 'application/json' };
          if (hook.secret) {
            const signature = crypto.createHmac('sha256', hook.secret).update(body).digest('hex');
            headers['X-EDCAT-Signature'] = signature;
          }
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
          const response = await fetch(hook.callback_url, {
            method: 'POST',
            headers,
            body,
            signal: controller.signal
          }).finally(() => clearTimeout(timeout));
          const responseBody = await response.text();
          await WebhookDeliveryLogModel.record({
            webhook_id: hook.id,
            event_payload: payload,
            response_code: response.status,
            response_body: responseBody
          });
        } catch (error) {
          await WebhookDeliveryLogModel.record({
            webhook_id: hook.id,
            event_payload: payload,
            response_code: null,
            response_body: error.message
          });
        }
      })
    );
  }
}

export default new IntegrationService();
