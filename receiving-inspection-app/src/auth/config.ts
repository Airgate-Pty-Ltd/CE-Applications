import type { RoleMapping } from './roles';

/**
 * Identity configuration.
 *
 * Supplied by the CUSTOMER at runtime, not baked into a build. Entra ID via
 * MSAL for SharePoint tenants, generic OIDC for everyone else. There is no
 * username/password store in this product and there must never be one.
 */

export type AuthProvider = 'entra' | 'oidc';

export interface AuthConfig {
  readonly provider: AuthProvider;
  /** Entra: tenant id. OIDC: issuer URL. */
  readonly authority: string;
  readonly clientId: string;
  readonly redirectUri: string;
  /** Graph scopes for the document library. Least privilege by default. */
  readonly scopes: readonly string[];
  readonly roleMapping: RoleMapping;
}

export const DEFAULT_GRAPH_SCOPES = ['Files.ReadWrite.All', 'Sites.ReadWrite.All'] as const;

export interface SignedInUser {
  readonly id: string;
  readonly displayName: string;
  readonly groupIds: readonly string[];
}

/**
 * Reads auth configuration, returning the reasons it is unusable rather than a
 * half-populated object. A misconfigured tenant should fail at startup with a
 * list, not at the moment an inspector tries to sign a record.
 */
export function validateAuthConfig(
  config: Partial<AuthConfig> | null
): { ok: true; config: AuthConfig } | { ok: false; missing: string[] } {
  const missing: string[] = [];
  if (config === null) return { ok: false, missing: ['no identity configuration supplied'] };

  if (config.provider === undefined) missing.push('provider (entra | oidc)');
  if (config.authority === undefined || config.authority === '') missing.push('authority');
  if (config.clientId === undefined || config.clientId === '') missing.push('clientId');
  if (config.redirectUri === undefined || config.redirectUri === '') missing.push('redirectUri');
  if (config.roleMapping === undefined) missing.push('roleMapping');

  if (missing.length > 0) return { ok: false, missing };

  return {
    ok: true,
    config: {
      provider: config.provider as AuthProvider,
      authority: config.authority as string,
      clientId: config.clientId as string,
      redirectUri: config.redirectUri as string,
      scopes: config.scopes ?? DEFAULT_GRAPH_SCOPES,
      roleMapping: config.roleMapping as RoleMapping,
    },
  };
}
