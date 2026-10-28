import { z } from 'zod';

/**
 * The document under which the article was released. This is the primary
 * branch in the inspection path router: it is not a descriptive attribute, it
 * changes what inspection is required.
 */
export const releaseDocumentType = z.enum([
  /** FAA Form 8130-3, Authorized Release Certificate. */
  'faa-8130-3',
  /** Certificate of Conformance from the supplier, with no airworthiness release. */
  'certificate-of-conformance',
  /** An equivalent authority release the customer has configured. */
  'configured-equivalent',
  /** No release document presented. */
  'none',
]);
export type ReleaseDocumentType = z.infer<typeof releaseDocumentType>;

export const articleClass = z.enum([
  'standard',
  /** Parts Manufacturer Approval article — marking and approval verified. */
  'pma',
  /** Released under a Supplemental Type Certificate. */
  'stc',
  /** Standard hardware, fasteners, consumables. */
  'standard-part',
  /** Shelf-life limited: sealants, adhesives, chemicals. */
  'shelf-life-limited',
]);
export type ArticleClass = z.infer<typeof articleClass>;

export const supplierStatus = z.enum([
  'approved',
  /** On the approved list, but no receipt history at the configured depth. */
  'newly-approved',
  /** Approval restricted pending corrective action. */
  'probation',
  /** Not permitted to supply. */
  'suspended',
]);
export type SupplierStatus = z.infer<typeof supplierStatus>;

export const orderType = z.enum([
  'purchase',
  'customer-supplied',
  'return-from-vendor',
  'consignment',
]);
export type OrderType = z.infer<typeof orderType>;

/**
 * What receiving observed about the paperwork before inspection begins.
 *
 * These two flags drive a hard stop, not a finding: if the documentation is
 * incomplete or does not match the physical goods, inspection does not start.
 */
export const receiptDocumentation = z.object({
  complete: z.boolean(),
  matchesPhysicalGoods: z.boolean(),
  releaseDocument: releaseDocumentType,
  /** Certificate of Conformance number, captured where one is presented. */
  certificateOfConformanceNumber: z.string().min(1).optional(),
  /** FAA Form 8130-3 number, captured where one is presented. */
  releaseCertificateNumber: z.string().min(1).optional(),
  /** Drawing or specification revision stated on the documentation. */
  documentedRevision: z.string().min(1).optional(),
  /** First Article Inspection report reference, where one is required. */
  faiReportReference: z.string().min(1).optional(),
});
export type ReceiptDocumentation = z.infer<typeof receiptDocumentation>;

/**
 * Conditions that escalate an inspection to 100% regardless of the release
 * document type. Modelled as an explicit object rather than loose booleans on
 * the receipt so the router can report exactly which trigger fired — the
 * dashboard requirement is that an escalation is never unexplained.
 */
export const escalationInputs = z.object({
  /** First article from this supplier for this part number. */
  firstArticleFromSupplier: z.boolean(),
  /** Open corrective action against this part number. */
  openCorrectiveAction: z.boolean(),
  /** Quality escape recorded against this part number in the lookback window. */
  qualityEscapeInLookback: z.boolean(),
  /** Article carries key or critical characteristics. */
  keyOrCriticalCharacteristics: z.boolean(),
  /** Drawing revision, MOD status, or process change since the last receipt. */
  configurationChangeSinceLastReceipt: z.boolean(),
});
export type EscalationInputs = z.infer<typeof escalationInputs>;

export const receipt = z.object({
  id: z.string().min(1),
  supplierId: z.string().min(1),
  partNumber: z.string().min(1),
  serialNumbers: z.array(z.string().min(1)).default([]),
  /** Lot size presented for inspection. Drives sample size lookup. */
  quantityReceived: z.number().int().positive(),
  articleClass,
  supplierStatus,
  orderType,
  documentation: receiptDocumentation,
  escalation: escalationInputs,
  /** Approved revision of record, for comparison against the documentation. */
  approvedRevisionOfRecord: z.string().min(1).optional(),
});
export type Receipt = z.infer<typeof receipt>;
