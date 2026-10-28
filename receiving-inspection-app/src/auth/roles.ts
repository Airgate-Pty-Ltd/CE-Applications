import type { Role } from '../schema/ncr';

/**
 * Group-to-role mapping.
 *
 * The app is NEVER the source of truth for identity. Roles derive from group
 * membership in the customer's directory (Entra ID, or any OIDC provider), and
 * the mapping is configuration. There is no username/password store here and
 * there never will be.
 *
 * Pure so the role a user resolves to is testable and reproducible.
 */

export interface RoleMapping {
  readonly inspector: readonly string[];
  readonly supervisor: readonly string[];
  readonly qualityManager: readonly string[];
  readonly readOnly: readonly string[];
}

export const EMPTY_ROLE_MAPPING: RoleMapping = {
  inspector: [],
  supervisor: [],
  qualityManager: [],
  readOnly: [],
};

/**
 * Resolves the highest role the user's groups grant.
 *
 * Highest wins: a quality manager who is also in the inspector group is a
 * quality manager. Unmapped users get nothing — not read-only. An unmapped
 * user is a configuration error, and silently granting them a role, even a
 * weak one, hides it.
 */
export function resolveRole(groupIds: readonly string[], mapping: RoleMapping): Role | null {
  const groups = new Set(groupIds);
  const has = (configured: readonly string[]) => configured.some((g) => groups.has(g));

  if (has(mapping.qualityManager)) return 'quality-manager';
  if (has(mapping.supervisor)) return 'supervisor';
  if (has(mapping.inspector)) return 'inspector';
  if (has(mapping.readOnly)) return 'read-only';
  return null;
}

/** Capabilities per role, for the dashboard's role capability matrix. */
export interface Capabilities {
  readonly canExecuteChecks: boolean;
  readonly canSignRecord: boolean;
  readonly canApproveDisposition: boolean;
  readonly canRaiseSupplierAction: boolean;
  readonly canConfigureSampling: boolean;
  readonly canConfigureCheckPacks: boolean;
}

const NONE: Capabilities = {
  canExecuteChecks: false,
  canSignRecord: false,
  canApproveDisposition: false,
  canRaiseSupplierAction: false,
  canConfigureSampling: false,
  canConfigureCheckPacks: false,
};

export function capabilitiesFor(role: Role | null): Capabilities {
  switch (role) {
    case 'inspector':
      return { ...NONE, canExecuteChecks: true, canSignRecord: true };
    case 'supervisor':
      return {
        ...NONE,
        canExecuteChecks: true,
        canSignRecord: true,
        canApproveDisposition: true,
      };
    case 'quality-manager':
      return {
        canExecuteChecks: true,
        canSignRecord: true,
        canApproveDisposition: true,
        canRaiseSupplierAction: true,
        canConfigureSampling: true,
        canConfigureCheckPacks: true,
      };
    case 'read-only':
      /* Audit access. Reads everything, changes nothing, signs nothing. */
      return NONE;
    case null:
      return NONE;
  }
}
