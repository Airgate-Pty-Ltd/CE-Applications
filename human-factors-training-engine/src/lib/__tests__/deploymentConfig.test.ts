/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { readDeploymentConfig, validateDeploymentConfig, describeDeploymentConfig, DeploymentConfig } from '../deploymentConfig';

describe('deploymentConfig — WP-5.1 DEPLOYMENT_EDITION config switch (DESIGN-NOTES.md §8)', () => {
  test('readDeploymentConfig() defaults to onprem/sqlite/none/local when env is empty (honest current-reality default)', () => {
    const config = readDeploymentConfig({});
    expect(config).toEqual({ edition: 'onprem', databaseMode: 'sqlite', aiProviderMode: 'none', authMode: 'local' });
  });

  test('readDeploymentConfig() reads real env values', () => {
    const config = readDeploymentConfig({ DEPLOYMENT_EDITION: 'online', DATABASE_MODE: 'postgresql', AI_PROVIDER_MODE: 'configured', AUTH_MODE: 'ldap' });
    expect(config).toEqual({ edition: 'online', databaseMode: 'postgresql', aiProviderMode: 'configured', authMode: 'ldap' });
  });

  test('a valid onprem config (sqlite + local/none AI + local auth) passes with no errors', () => {
    const config: DeploymentConfig = { edition: 'onprem', databaseMode: 'sqlite', aiProviderMode: 'local', authMode: 'local' };
    const result = validateDeploymentConfig(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test('onprem + postgresql is rejected (onprem requires sqlite, no external DB dependency)', () => {
    const config: DeploymentConfig = { edition: 'onprem', databaseMode: 'postgresql', aiProviderMode: 'none', authMode: 'local' };
    const result = validateDeploymentConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('sqlite'))).toBe(true);
  });

  test('onprem + AI_PROVIDER_MODE=configured is rejected (onprem assumes no internet)', () => {
    const config: DeploymentConfig = { edition: 'onprem', databaseMode: 'sqlite', aiProviderMode: 'configured', authMode: 'local' };
    const result = validateDeploymentConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('AI_PROVIDER_MODE'))).toBe(true);
  });

  test('onprem + AUTH_MODE=ldap is rejected (no directory service assumed onprem)', () => {
    const config: DeploymentConfig = { edition: 'onprem', databaseMode: 'sqlite', aiProviderMode: 'none', authMode: 'ldap' };
    const result = validateDeploymentConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('AUTH_MODE'))).toBe(true);
  });

  test('invalid enum values are rejected with a specific error, not silently coerced', () => {
    const config = { edition: 'invalid-edition', databaseMode: 'sqlite', aiProviderMode: 'none', authMode: 'local' } as unknown as DeploymentConfig;
    const result = validateDeploymentConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('DEPLOYMENT_EDITION');
  });

  test('online + postgresql + local auth is a valid hosted configuration', () => {
    const config: DeploymentConfig = { edition: 'online', databaseMode: 'postgresql', aiProviderMode: 'none', authMode: 'local' };
    const result = validateDeploymentConfig(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test('online requires PostgreSQL and rejects the unimplemented LDAP mode', () => {
    const sqlite = validateDeploymentConfig({ edition: 'online', databaseMode: 'sqlite', aiProviderMode: 'none', authMode: 'local' });
    const ldap = validateDeploymentConfig({ edition: 'online', databaseMode: 'postgresql', aiProviderMode: 'none', authMode: 'ldap' });
    expect(sqlite.valid).toBe(false);
    expect(sqlite.errors.some((error) => error.includes('postgresql'))).toBe(true);
    expect(ldap.valid).toBe(false);
    expect(ldap.errors.some((error) => error.includes('not implemented'))).toBe(true);
  });

  test('describeDeploymentConfig() produces a stable, greppable summary line', () => {
    const config: DeploymentConfig = { edition: 'onprem', databaseMode: 'sqlite', aiProviderMode: 'none', authMode: 'local' };
    expect(describeDeploymentConfig(config)).toBe('edition=onprem db=sqlite ai=none auth=local');
  });
});
