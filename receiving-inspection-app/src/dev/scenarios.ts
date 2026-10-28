import type { Receipt } from '../schema/receipt';
import { makeReceipt } from '../fixtures/receipts';

/**
 * Fictional scenarios for the dashboard scenario runner.
 *
 * Every one is invented. No real supplier, part number, or person appears —
 * fixture data is treated exactly like source by the clean-room gate, because
 * an acquirer's grep does not distinguish them.
 */

export interface Scenario {
  readonly id: string;
  readonly title: string;
  /** What a green result actually proves. */
  readonly proves: string;
  readonly receipt: Receipt;
  readonly expectedPath: string;
}

export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'S01',
    title: '8130-3 release, clean paperwork',
    proves: 'An article released on an 8130-3 goes to 100% inspection with a conformity record.',
    receipt: makeReceipt({ documentation: { releaseDocument: 'faa-8130-3' } }),
    expectedPath: 'FULL_INSPECTION',
  },
  {
    id: 'S02',
    title: 'Certificate of Conformance only',
    proves: 'A CoC-only article samples per the configured table rather than 100%.',
    receipt: makeReceipt({ documentation: { releaseDocument: 'certificate-of-conformance' } }),
    expectedPath: 'SAMPLE_INSPECTION',
  },
  {
    id: 'S03',
    title: 'Documentation does not match the goods',
    proves: 'The documentation gate is a hard stop: inspection never starts.',
    receipt: makeReceipt({ documentation: { matchesPhysicalGoods: false } }),
    expectedPath: 'RETURN_TO_RECEIVING',
  },
  {
    id: 'S04',
    title: 'First article from this supplier',
    proves: 'A first article escalates to 100% even on a CoC.',
    receipt: makeReceipt({
      documentation: { releaseDocument: 'certificate-of-conformance' },
      escalation: { firstArticleFromSupplier: true },
    }),
    expectedPath: 'FULL_INSPECTION',
  },
  {
    id: 'S05',
    title: 'Open corrective action against the part number',
    proves: 'An open CAR escalates to 100% regardless of release document.',
    receipt: makeReceipt({
      documentation: { releaseDocument: 'certificate-of-conformance' },
      escalation: { openCorrectiveAction: true },
    }),
    expectedPath: 'FULL_INSPECTION',
  },
  {
    id: 'S06',
    title: 'FOD failure on a closed assembly',
    proves: 'A failed check produces a nonconformance, not a note.',
    receipt: makeReceipt({ documentation: { releaseDocument: 'faa-8130-3' } }),
    expectedPath: 'FULL_INSPECTION',
  },
  {
    id: 'S07',
    title: 'Label and serial mismatch',
    proves: 'Documentation verification failures route to the NCR chain.',
    receipt: makeReceipt({ documentation: { releaseDocument: 'faa-8130-3' } }),
    expectedPath: 'FULL_INSPECTION',
  },
  {
    id: 'S08',
    title: 'Out-of-calibration tool',
    proves: 'A measurement check is blocked, not warned about.',
    receipt: makeReceipt({
      documentation: { releaseDocument: 'faa-8130-3' },
      escalation: { keyOrCriticalCharacteristics: true },
    }),
    expectedPath: 'FULL_INSPECTION',
  },
  {
    id: 'S09',
    title: 'Use-as-is disposition',
    proves: 'Material review can dispose to stock under a named supervisor approval.',
    receipt: makeReceipt({ documentation: { releaseDocument: 'faa-8130-3' } }),
    expectedPath: 'FULL_INSPECTION',
  },
  {
    id: 'S10',
    title: 'Scrap disposition',
    proves: 'Not usable, no supplier action warranted, scrap under documented approval.',
    receipt: makeReceipt({ documentation: { releaseDocument: 'faa-8130-3' } }),
    expectedPath: 'FULL_INSPECTION',
  },
  {
    id: 'S11',
    title: 'Supplier on probation',
    proves: 'Supplier standing escalates a sample inspection to 100%.',
    receipt: makeReceipt({
      documentation: { releaseDocument: 'certificate-of-conformance' },
      supplierStatus: 'probation',
    }),
    expectedPath: 'FULL_INSPECTION',
  },
  {
    id: 'S12',
    title: 'Sample inspection with no configured table',
    proves: 'The router blocks rather than inventing a sample size.',
    receipt: makeReceipt({ documentation: { releaseDocument: 'certificate-of-conformance' } }),
    expectedPath: 'BLOCKED',
  },
];
