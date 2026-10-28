import type { Receipt, EscalationInputs, ReceiptDocumentation } from '../schema/receipt';
import type { SamplingTable } from '../schema/sampling';

/**
 * Fixtures are fictional by rule. No real supplier, part number, person, or
 * document identifier appears here — the clean-room gate treats seed data the
 * same as source code, because an acquirer's grep does too.
 */

export const NO_ESCALATIONS: EscalationInputs = {
  firstArticleFromSupplier: false,
  openCorrectiveAction: false,
  qualityEscapeInLookback: false,
  keyOrCriticalCharacteristics: false,
  configurationChangeSinceLastReceipt: false,
};

export const CLEAN_DOCUMENTATION: ReceiptDocumentation = {
  complete: true,
  matchesPhysicalGoods: true,
  releaseDocument: 'faa-8130-3',
};

export const BASE_RECEIPT: Receipt = {
  id: 'RCPT-0001',
  supplierId: 'SUP-ALPHA',
  partNumber: 'PN-1000-A',
  serialNumbers: [],
  quantityReceived: 10,
  articleClass: 'standard',
  supplierStatus: 'approved',
  orderType: 'purchase',
  documentation: CLEAN_DOCUMENTATION,
  escalation: NO_ESCALATIONS,
};

export function makeReceipt(overrides: {
  readonly documentation?: Partial<ReceiptDocumentation>;
  readonly escalation?: Partial<EscalationInputs>;
  readonly quantityReceived?: number;
  readonly supplierStatus?: Receipt['supplierStatus'];
  readonly articleClass?: Receipt['articleClass'];
  readonly orderType?: Receipt['orderType'];
}): Receipt {
  return {
    ...BASE_RECEIPT,
    ...(overrides.quantityReceived === undefined
      ? {}
      : { quantityReceived: overrides.quantityReceived }),
    ...(overrides.supplierStatus === undefined ? {} : { supplierStatus: overrides.supplierStatus }),
    ...(overrides.articleClass === undefined ? {} : { articleClass: overrides.articleClass }),
    ...(overrides.orderType === undefined ? {} : { orderType: overrides.orderType }),
    documentation: { ...CLEAN_DOCUMENTATION, ...overrides.documentation },
    escalation: { ...NO_ESCALATIONS, ...overrides.escalation },
  };
}

/**
 * A configured table used ONLY in tests. The product ships no sample sizes —
 * see DESIGN-NOTES.md §6.1. These values are arbitrary test data and carry no
 * recommendation.
 */
export const TEST_SAMPLING_TABLE: SamplingTable = {
  id: 'TEST-TABLE',
  version: '1',
  configured: true,
  source: 'Fictional test data. Not a recommended sampling scheme.',
  bands: [
    { lotSizeMin: 1, lotSizeMax: 8, sampleSize: 2, acceptNumber: 0 },
    { lotSizeMin: 9, lotSizeMax: 50, sampleSize: 5, acceptNumber: 0 },
    { lotSizeMin: 51, lotSizeMax: null, sampleSize: 20, acceptNumber: 1 },
  ],
};

/** Configured, but with a gap so band lookup can fail. */
export const GAPPED_SAMPLING_TABLE: SamplingTable = {
  id: 'GAPPED-TABLE',
  version: '1',
  configured: true,
  source: 'Fictional test data with a deliberate coverage gap.',
  bands: [{ lotSizeMin: 1, lotSizeMax: 5, sampleSize: 2, acceptNumber: 0 }],
};
