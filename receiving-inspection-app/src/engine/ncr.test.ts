import { describe, it, expect } from 'vitest';
import { nextNcrAction, canPerform } from './ncr';
import type { NonconformanceRecord, Role } from '../schema/ncr';

const ncr = (overrides: Partial<NonconformanceRecord> = {}): NonconformanceRecord => ({
  id: 'NCR-0001',
  inspectionRecordId: 'IR-0001',
  receiptId: 'RCPT-0001',
  failedCheckIds: ['CHK-FOD'],
  stage: 'RAISED',
  quarantine: null,
  useAsIs: null,
  supplierActionWarranted: null,
  disposition: null,
  approvals: [],
  supplierCorrectiveActionRef: null,
  returnMaterialAuthorisationRef: null,
  ...overrides,
});

const QUARANTINED = {
  location: 'HOLD-A',
  recordedBy: 'user-1',
  recordedAt: '2026-07-24T10:00:00.000Z',
};

describe('nonconformance disposition routing', () => {
  it('requires quarantine first — a nonconforming article does not stay available', () => {
    const action = nextNcrAction(ncr());

    expect(action.code).toBe('QUARANTINE_ARTICLE');
    expect(action.requiredRole).toBe('inspector');
    expect(action.terminal).toBe(false);
  });

  it('requires material review once quarantined', () => {
    const action = nextNcrAction(ncr({ quarantine: QUARANTINED }));

    expect(action.code).toBe('PERFORM_MATERIAL_REVIEW');
    expect(action.requiredRole).toBe('supervisor');
    expect(action.trace.join(' ')).toContain('HOLD-A');
  });

  it('routes use-as-is to a supervisor-approved disposition', () => {
    const action = nextNcrAction(ncr({ quarantine: QUARANTINED, useAsIs: true }));

    expect(action.code).toBe('RECORD_USE_AS_IS_APPROVAL');
    expect(action.requiredRole).toBe('supervisor');
  });

  it('asks whether supplier action is warranted when not usable as-is', () => {
    const action = nextNcrAction(ncr({ quarantine: QUARANTINED, useAsIs: false }));

    expect(action.code).toBe('DECIDE_SUPPLIER_ACTION');
  });

  it('routes a warranted supplier action to an 8D and return to vendor', () => {
    const action = nextNcrAction(
      ncr({ quarantine: QUARANTINED, useAsIs: false, supplierActionWarranted: true })
    );

    expect(action.code).toBe('RAISE_SUPPLIER_CORRECTIVE_ACTION');
    expect(action.requiredRole).toBe('quality-manager');
    expect(action.description).toContain('8D');
  });

  it('routes an unwarranted supplier action to scrap under approval', () => {
    const action = nextNcrAction(
      ncr({ quarantine: QUARANTINED, useAsIs: false, supplierActionWarranted: false })
    );

    expect(action.code).toBe('RECORD_SCRAP_APPROVAL');
    expect(action.requiredRole).toBe('supervisor');
  });

  it('terminates once a disposition is recorded', () => {
    const action = nextNcrAction(
      ncr({ quarantine: QUARANTINED, useAsIs: true, disposition: 'USE_AS_IS' })
    );

    expect(action.code).toBe('NONE');
    expect(action.terminal).toBe(true);
    expect(action.requiredRole).toBeNull();
  });

  it('walks the full scrap branch and shows the chain at every step', () => {
    const steps: string[] = [];
    let record = ncr();

    steps.push(nextNcrAction(record).code);
    record = { ...record, quarantine: QUARANTINED };
    steps.push(nextNcrAction(record).code);
    record = { ...record, useAsIs: false };
    steps.push(nextNcrAction(record).code);
    record = { ...record, supplierActionWarranted: false };
    steps.push(nextNcrAction(record).code);
    record = { ...record, disposition: 'SCRAP' };
    steps.push(nextNcrAction(record).code);

    expect(steps).toEqual([
      'QUARANTINE_ARTICLE',
      'PERFORM_MATERIAL_REVIEW',
      'DECIDE_SUPPLIER_ACTION',
      'RECORD_SCRAP_APPROVAL',
      'NONE',
    ]);
  });
});

describe('role capability', () => {
  it('lets a supervisor approve a disposition requiring a supervisor', () => {
    expect(canPerform('supervisor', 'supervisor')).toBe(true);
  });

  it('refuses an inspector a disposition requiring a supervisor', () => {
    expect(canPerform('inspector', 'supervisor')).toBe(false);
  });

  it('lets a quality manager act where a supervisor is required', () => {
    expect(canPerform('quality-manager', 'supervisor')).toBe(true);
  });

  it('refuses a supervisor an action reserved to a quality manager', () => {
    expect(canPerform('supervisor', 'quality-manager')).toBe(false);
  });

  it.each<Role>(['inspector', 'supervisor', 'quality-manager', 'read-only'])(
    'refuses read-only everything, and refuses everyone a null requirement: %s',
    (role) => {
      expect(canPerform('read-only', 'inspector')).toBe(false);
      expect(canPerform(role, null)).toBe(false);
    }
  );
});
