/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

/**
 * Deployment Edition Config: Phase 3 WP-5 deployment hardening.
 *
 * Implements the config switch specified in docs/03-architecture/DESIGN-NOTES.md §8:
 * one codebase, `DEPLOYMENT_EDITION=online|onprem` governing database mode, AI provider
 * mode, and auth mode, with startup validation rejecting inconsistent combinations.
 *
 * SQLite and PostgreSQL use generated, parity-checked Prisma schemas and separate migration
 * directories. Runtime packaging selects the appropriate schema during build.
 */

export type DeploymentEdition = 'online' | 'onprem';
export type DatabaseMode = 'sqlite' | 'postgresql';
export type AiProviderMode = 'configured' | 'local' | 'none';
export type AuthMode = 'ldap' | 'local';

export interface DeploymentConfig {
  edition: DeploymentEdition;
  databaseMode: DatabaseMode;
  aiProviderMode: AiProviderMode;
  authMode: AuthMode;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const VALID_EDITIONS: DeploymentEdition[] = ['online', 'onprem'];
const VALID_DB_MODES: DatabaseMode[] = ['sqlite', 'postgresql'];
const VALID_AI_MODES: AiProviderMode[] = ['configured', 'local', 'none'];
const VALID_AUTH_MODES: AuthMode[] = ['ldap', 'local'];

/** Read the deployment config from environment variables, with onprem/sqlite/none/local as the honest current-reality defaults. */
export function readDeploymentConfig(env: Record<string, string | undefined> = process.env): DeploymentConfig {
  return {
    edition: (env.DEPLOYMENT_EDITION as DeploymentEdition) || 'onprem',
    databaseMode: (env.DATABASE_MODE as DatabaseMode) || 'sqlite',
    aiProviderMode: (env.AI_PROVIDER_MODE as AiProviderMode) || 'none',
    authMode: (env.AUTH_MODE as AuthMode) || 'local',
  };
}

/**
 * Validate mode consistency per DESIGN-NOTES.md §8's example rule and this codebase's actual
 * capabilities. Never silently accepts a combination the code can't really deliver.
 */
export function validateDeploymentConfig(config: DeploymentConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!VALID_EDITIONS.includes(config.edition)) {
    errors.push(`DEPLOYMENT_EDITION must be one of ${VALID_EDITIONS.join('|')}, got "${config.edition}"`);
  }
  if (!VALID_DB_MODES.includes(config.databaseMode)) {
    errors.push(`DATABASE_MODE must be one of ${VALID_DB_MODES.join('|')}, got "${config.databaseMode}"`);
  }
  if (!VALID_AI_MODES.includes(config.aiProviderMode)) {
    errors.push(`AI_PROVIDER_MODE must be one of ${VALID_AI_MODES.join('|')}, got "${config.aiProviderMode}"`);
  }
  if (!VALID_AUTH_MODES.includes(config.authMode)) {
    errors.push(`AUTH_MODE must be one of ${VALID_AUTH_MODES.join('|')}, got "${config.authMode}"`);
  }
  if (errors.length > 0) return { valid: false, errors, warnings };

  // DESIGN-NOTES.md §8 rule: onprem requires sqlite + local AI (configured/online-style AI
  // provider access is an online-edition assumption — onprem assumes no internet).
  if (config.edition === 'onprem' && config.databaseMode !== 'sqlite') {
    errors.push('DEPLOYMENT_EDITION=onprem requires DATABASE_MODE=sqlite (onprem has no external DB dependency).');
  }
  if (config.edition === 'onprem' && config.aiProviderMode === 'configured') {
    errors.push('DEPLOYMENT_EDITION=onprem cannot use AI_PROVIDER_MODE=configured (assumes no internet) — use "local" or "none".');
  }
  if (config.edition === 'onprem' && config.authMode === 'ldap') {
    errors.push('DEPLOYMENT_EDITION=onprem cannot use AUTH_MODE=ldap (no directory service assumed) — use "local".');
  }
  if (config.edition === 'online' && config.databaseMode !== 'postgresql') {
    errors.push('DEPLOYMENT_EDITION=online requires DATABASE_MODE=postgresql.');
  }
  if (config.authMode === 'ldap') {
    errors.push('AUTH_MODE=ldap is not implemented. Use local authentication until an identity-provider integration is verified.');
  }
  if (config.aiProviderMode === 'configured') {
    warnings.push('AI_PROVIDER_MODE=configured requires a real provider (API key, endpoint) to be wired in AiAssist — verify AiAssist actually reaches it before relying on this in production.');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/** Human-readable summary line, used by the health screen and startup logging. */
export function describeDeploymentConfig(config: DeploymentConfig): string {
  return `edition=${config.edition} db=${config.databaseMode} ai=${config.aiProviderMode} auth=${config.authMode}`;
}
