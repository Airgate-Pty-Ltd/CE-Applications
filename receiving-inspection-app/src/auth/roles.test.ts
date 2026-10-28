import { describe, it, expect } from 'vitest';
import { resolveRole, capabilitiesFor, EMPTY_ROLE_MAPPING, type RoleMapping } from './roles';

const mapping: RoleMapping = {
  inspector: ['grp-insp'],
  supervisor: ['grp-super'],
  qualityManager: ['grp-qm'],
  readOnly: ['grp-audit'],
};

describe('group to role mapping', () => {
  it.each([
    [['grp-insp'], 'inspector'],
    [['grp-super'], 'supervisor'],
    [['grp-qm'], 'quality-manager'],
    [['grp-audit'], 'read-only'],
  ])('maps %s to %s', (groups, expected) => {
    expect(resolveRole(groups, mapping)).toBe(expected);
  });

  it('grants the highest role when a user is in several groups', () => {
    expect(resolveRole(['grp-insp', 'grp-qm', 'grp-audit'], mapping)).toBe('quality-manager');
    expect(resolveRole(['grp-insp', 'grp-super'], mapping)).toBe('supervisor');
  });

  it('grants nothing to an unmapped user rather than defaulting to read-only', () => {
    /* An unmapped user is a configuration error. Quietly granting a weak role
       hides it, and hidden configuration errors surface during an audit. */
    expect(resolveRole(['grp-unknown'], mapping)).toBeNull();
    expect(resolveRole([], mapping)).toBeNull();
    expect(resolveRole(['grp-insp'], EMPTY_ROLE_MAPPING)).toBeNull();
  });
});

describe('role capabilities', () => {
  it('lets an inspector execute and sign, but not approve a disposition', () => {
    const caps = capabilitiesFor('inspector');
    expect(caps.canExecuteChecks).toBe(true);
    expect(caps.canSignRecord).toBe(true);
    expect(caps.canApproveDisposition).toBe(false);
  });

  it('lets a supervisor approve a disposition', () => {
    expect(capabilitiesFor('supervisor').canApproveDisposition).toBe(true);
    expect(capabilitiesFor('supervisor').canConfigureSampling).toBe(false);
  });

  it('lets a quality manager configure sampling and check packs', () => {
    const caps = capabilitiesFor('quality-manager');
    expect(caps.canConfigureSampling).toBe(true);
    expect(caps.canConfigureCheckPacks).toBe(true);
    expect(caps.canRaiseSupplierAction).toBe(true);
  });

  it('read-only cannot sign — the audit role changes nothing', () => {
    const caps = capabilitiesFor('read-only');
    expect(caps.canSignRecord).toBe(false);
    expect(Object.values(caps).every((v) => v === false)).toBe(true);
  });

  it('an unmapped user has no capabilities at all', () => {
    expect(Object.values(capabilitiesFor(null)).every((v) => v === false)).toBe(true);
  });
});
