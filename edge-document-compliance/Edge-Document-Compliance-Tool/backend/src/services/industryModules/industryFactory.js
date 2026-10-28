/**
 * Industry Module Factory
 * Manages multi-industry module switching and configuration
 */

import { query } from '../../database/connection.js';

class IndustryModuleFactory {
  constructor() {
    this.modules = new Map();
    this.loadModules();
  }

  async loadModules() {
    try {
      // Check if table exists first
      const tableCheck = await query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'industry_modules'
        )`
      );

      if (!tableCheck.rows[0].exists) {
        console.log('[IndustryFactory] industry_modules table does not exist yet. Using default modules.');
        // Return early - modules will be empty, which is fine
        return;
      }

      const result = await query(
        `SELECT id, module_code, module_name, industry_sector, description, 
                standards, configuration, is_active
         FROM industry_modules
         WHERE is_active = TRUE`
      );

      for (const row of result.rows) {
        this.modules.set(row.module_code, {
          id: row.id,
          code: row.module_code,
          name: row.module_name,
          sector: row.industry_sector,
          description: row.description,
          standards: row.standards || [],
          configuration: row.configuration || {},
          isActive: row.is_active
        });
      }

      console.log(`[IndustryFactory] Loaded ${this.modules.size} industry modules`);
    } catch (error) {
      // Handle gracefully - table might not exist yet (Phase 5 migration pending)
      if (error.code === '42P01') {
        console.log('[IndustryFactory] industry_modules table does not exist yet. This is expected if Phase 5 migrations have not been run.');
      } else {
        console.error('[IndustryFactory] Error loading modules:', error.message);
      }
    }
  }

  getModule(moduleCode) {
    return this.modules.get(moduleCode) || null;
  }

  getAllModules() {
    return Array.from(this.modules.values());
  }

  async activateModuleForTenant(tenantId, moduleCode, configuration = {}) {
    try {
      const module = this.getModule(moduleCode);
      if (!module) {
        throw new Error(`Module ${moduleCode} not found`);
      }

      // Check if already activated
      const existing = await query(
        `SELECT id FROM tenant_industry_modules 
         WHERE tenant_id = $1 AND module_id = $2`,
        [tenantId, module.id]
      );

      if (existing.rows.length > 0) {
        // Update configuration
        await query(
          `UPDATE tenant_industry_modules 
           SET configuration = $1, activated_at = NOW()
           WHERE tenant_id = $2 AND module_id = $3`,
          [JSON.stringify(configuration), tenantId, module.id]
        );
        return { success: true, message: 'Module configuration updated' };
      }

      // Activate new module
      await query(
        `INSERT INTO tenant_industry_modules (tenant_id, module_id, configuration)
         VALUES ($1, $2, $3)`,
        [tenantId, module.id, JSON.stringify(configuration)]
      );

      return {
        success: true,
        message: `Module ${module.name} activated for tenant`,
        module: module
      };
    } catch (error) {
      console.error('[IndustryFactory] Error activating module:', error);
      throw error;
    }
  }

  async deactivateModuleForTenant(tenantId, moduleCode) {
    try {
      const module = this.getModule(moduleCode);
      if (!module) {
        throw new Error(`Module ${moduleCode} not found`);
      }

      await query(
        `DELETE FROM tenant_industry_modules 
         WHERE tenant_id = $1 AND module_id = $2`,
        [tenantId, module.id]
      );

      return { success: true, message: `Module ${module.name} deactivated` };
    } catch (error) {
      console.error('[IndustryFactory] Error deactivating module:', error);
      throw error;
    }
  }

  async getActiveModulesForTenant(tenantId) {
    try {
      const result = await query(
        `SELECT im.module_code, im.module_name, im.industry_sector, 
                im.standards, tim.configuration, tim.activated_at
         FROM tenant_industry_modules tim
         JOIN industry_modules im ON tim.module_id = im.id
         WHERE tim.tenant_id = $1 AND im.is_active = TRUE
         ORDER BY tim.activated_at DESC`,
        [tenantId]
      );

      return result.rows.map(row => ({
        code: row.module_code,
        name: row.module_name,
        sector: row.industry_sector,
        standards: row.standards || [],
        configuration: row.configuration || {},
        activatedAt: row.activated_at
      }));
    } catch (error) {
      console.error('[IndustryFactory] Error getting tenant modules:', error);
      return [];
    }
  }

  getModuleInstance(moduleCode) {
    // Dynamically import the specific module
    const moduleMap = {
      'iso13485': () => import('./iso13485Module.js'),
      'iatf16949': () => import('./iatf16949Module.js'),
      'iso27001': () => import('./iso27001Module.js'),
      'iso45001': () => import('./iso45001Module.js'),
      'hipaa': () => import('./hipaaModule.js')
    };

    const loader = moduleMap[moduleCode];
    if (!loader) {
      throw new Error(`Module ${moduleCode} not implemented`);
    }

    return loader();
  }
}

export default IndustryModuleFactory;

