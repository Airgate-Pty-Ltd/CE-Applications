import { describe, it, expect } from 'vitest';
import { runProviderContract, CONTRACT_OPERATION_COUNT } from './contract';
import {
  SharePointStorageProvider,
  resolveFolder,
  readRetentionLabelYears,
  DEFAULT_FOLDER_TEMPLATE,
} from './sharepoint';
import { FakeGraphClient } from './sharepoint.fake';

describe('storage adapter contract — SharePoint provider', () => {
  it('passes every operation in the contract', async () => {
    const results = await runProviderContract(
      () =>
        new SharePointStorageProvider(new FakeGraphClient(), {
          driveId: 'drive-1',
          folderTemplate: DEFAULT_FOLDER_TEMPLATE,
        })
    );

    const failed = results.filter((r) => !r.passed);
    expect(failed.map((f) => `${f.operation}: ${f.detail}`)).toEqual([]);
    expect(results).toHaveLength(CONTRACT_OPERATION_COUNT);
  });
});

describe('folder convention', () => {
  it('resolves the default convention', () => {
    expect(
      resolveFolder(DEFAULT_FOLDER_TEMPLATE, {
        year: '2026',
        supplier: 'SUP-ALPHA',
        'receipt-id': 'RCPT-1',
      })
    ).toBe('/2026/SUP-ALPHA/RCPT-1/');
  });

  it('leaves an unknown token visible rather than dropping it silently', () => {
    /* A wrong path is easy to spot; a silently missing path segment collapses
       records into the wrong folder and is found months later. */
    expect(resolveFolder('/{year}/{unknown}/', { year: '2026' })).toBe('/2026/{unknown}/');
  });

  it('accepts a customer-defined convention', () => {
    expect(resolveFolder('/receipts/{receipt-id}', { 'receipt-id': 'R-9' })).toBe('/receipts/R-9');
  });
});

describe('library retention label', () => {
  it('returns null when the library carries no label', async () => {
    const graph = new FakeGraphClient();
    expect(await readRetentionLabelYears(graph, 'drive-1')).toBeNull();
  });

  it('reads a labelled library and converts the duration to years', async () => {
    const graph = new FakeGraphClient();
    graph.retentionLabel = { name: 'Maintenance records', retentionDuration: { days: 3650 } };

    expect(await readRetentionLabelYears(graph, 'drive-1')).toEqual({
      label: 'Maintenance records',
      years: 10,
    });
  });

  it('reports a label with no duration as unknown rather than zero', async () => {
    const graph = new FakeGraphClient();
    graph.retentionLabel = { name: 'Indefinite' };

    expect(await readRetentionLabelYears(graph, 'drive-1')).toEqual({
      label: 'Indefinite',
      years: null,
    });
  });
});
