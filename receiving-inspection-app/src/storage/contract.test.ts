import { describe, it, expect } from 'vitest';
import { runProviderContract, CONTRACT_OPERATION_COUNT } from './contract';
import { MemoryStorageProvider, addMinutes } from './memory';

describe('storage adapter contract — memory provider', () => {
  it('passes every operation in the contract', async () => {
    const results = await runProviderContract(() => new MemoryStorageProvider());

    const failed = results.filter((r) => !r.passed);
    expect(failed.map((f) => `${f.operation}: ${f.detail}`)).toEqual([]);
    expect(results).toHaveLength(CONTRACT_OPERATION_COUNT);
  });
});

describe('timestamp arithmetic', () => {
  it('adds minutes without reading the clock', () => {
    expect(addMinutes('2026-01-01T00:00:00.000Z', 30)).toBe('2026-01-01T00:30:00.000Z');
  });

  it('rejects an unparseable timestamp rather than producing a silent NaN date', () => {
    expect(() => addMinutes('not-a-date', 30)).toThrow('Invalid ISO timestamp');
  });
});
