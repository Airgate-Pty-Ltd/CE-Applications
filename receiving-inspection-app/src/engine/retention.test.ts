import { describe, it, expect } from 'vitest';
import { evaluateRetention, REGULATORY_FLOORS, PRODUCT_DEFAULT_RETENTION_YEARS } from './retention';
import type { OperatingBasis } from '../schema/retention';

describe('retention floor enforcement', () => {
  it('separates the product default from the regulatory floor', () => {
    /* The two are different numbers. Conflating them makes the product refuse
       lawful configurations. See the module header. */
    expect(PRODUCT_DEFAULT_RETENTION_YEARS).toBe(10);
    expect(REGULATORY_FLOORS['faa-part-145'].years).toBeLessThan(PRODUCT_DEFAULT_RETENTION_YEARS);
  });

  it('ships every floor marked unverified', () => {
    for (const floor of Object.values(REGULATORY_FLOORS)) {
      expect(floor.verified).toBe(false);
      expect(floor.citation.length).toBeGreaterThan(0);
    }
  });

  it('accepts the product default against a repair station basis', () => {
    const verdict = evaluateRetention({
      configuredYears: PRODUCT_DEFAULT_RETENTION_YEARS,
      basis: 'faa-part-145',
    });

    expect(verdict.acceptable).toBe(true);
    expect(verdict.floorYears).toBe(2);
    expect(verdict.message).toContain('unverified');
  });

  it('accepts a configuration exactly at the floor', () => {
    const verdict = evaluateRetention({ configuredYears: 2, basis: 'faa-part-145' });

    expect(verdict.acceptable).toBe(true);
  });

  it('rejects a configuration below the floor and says so', () => {
    const verdict = evaluateRetention({ configuredYears: 1, basis: 'faa-part-145' });

    expect(verdict.acceptable).toBe(false);
    expect(verdict.message).toContain('BELOW');
    expect(verdict.message).toContain('never lowered');
  });

  it.each<OperatingBasis>(['faa-part-145', 'faa-part-21', 'as9100', 'as9120', 'customer-defined'])(
    'resolves a floor for every operating basis: %s',
    (basis) => {
      const verdict = evaluateRetention({ configuredYears: 10, basis });

      expect(verdict.basis).toBe(basis);
      expect(verdict.acceptable).toBe(true);
      expect(verdict.floorVerified).toBe(false);
    }
  );

  it('drops the unverified caveat once a floor is confirmed', () => {
    const floors = {
      ...REGULATORY_FLOORS,
      'faa-part-145': { ...REGULATORY_FLOORS['faa-part-145'], verified: true },
    };

    const verdict = evaluateRetention({ configuredYears: 10, basis: 'faa-part-145', floors });

    expect(verdict.floorVerified).toBe(true);
    expect(verdict.message).not.toContain('unverified');
  });

  it('honours an injected floor that is stricter than the shipped one', () => {
    const floors = {
      ...REGULATORY_FLOORS,
      'customer-defined': {
        ...REGULATORY_FLOORS['customer-defined'],
        years: 15,
        verified: true,
      },
    };

    const verdict = evaluateRetention({
      configuredYears: 10,
      basis: 'customer-defined',
      floors,
    });

    expect(verdict.acceptable).toBe(false);
    expect(verdict.floorYears).toBe(15);
  });
});
