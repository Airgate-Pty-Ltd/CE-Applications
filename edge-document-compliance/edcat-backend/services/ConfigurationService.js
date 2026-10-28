import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/connection.js';

class ConfigurationService {
  getDefaultConfig() {
    return {
      edcatAssistant: {
        enabled: true,
        mode: 'ASSIST',
        usageLimits: {
          monthlyBudget: 100,
          requestsPerDay: 50,
          requestsPerMonth: 500,
          usersAllowedToUse: []
        }
      }
    };
  }

  async getTenantConfig(customerId) {
    const res = await query('SELECT config FROM tenant_configurations WHERE customer_id = $1', [customerId]);
    if (!res.rows.length) {
      return this.getDefaultConfig();
    }
    return res.rows[0].config;
  }

  async updateTenantConfig(customerId, config, updatedBy = 'system') {
    const res = await query('SELECT id FROM tenant_configurations WHERE customer_id = $1', [customerId]);
    const payload = {
      ...this.getDefaultConfig(),
      ...config,
      updatedBy,
      updatedAt: new Date().toISOString()
    };
    if (res.rows.length) {
      await query(
        `UPDATE tenant_configurations SET config = $1, updated_at = CURRENT_TIMESTAMP WHERE customer_id = $2`,
        [payload, customerId]
      );
    } else {
      await query(
        `INSERT INTO tenant_configurations (id, customer_id, config)
         VALUES ($1, $2, $3)`,
        [uuidv4(), customerId, payload]
      );
    }
    return payload;
  }
}

export default new ConfigurationService();
