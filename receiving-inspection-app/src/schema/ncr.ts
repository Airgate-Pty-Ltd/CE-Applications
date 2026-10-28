import { z } from 'zod';

export const role = z.enum(['inspector', 'supervisor', 'quality-manager', 'read-only']);
export type Role = z.infer<typeof role>;

/**
 * An approval is a named person, a role, a reason, and a time. No silent
 * dispositions: every branch of the disposition chain requires all four.
 */
export const approval = z.object({
  approverId: z.string().min(1),
  approverRole: role,
  reason: z.string().min(1),
  approvedAt: z.string().datetime(),
});
export type Approval = z.infer<typeof approval>;

export const ncrStage = z.enum([
  'RAISED',
  'QUARANTINED',
  'MATERIAL_REVIEW',
  'SUPPLIER_ACTION_REVIEW',
  'CLOSED',
]);
export type NcrStage = z.infer<typeof ncrStage>;

export const disposition = z.enum(['USE_AS_IS', 'RETURN_TO_VENDOR', 'SCRAP']);
export type Disposition = z.infer<typeof disposition>;

export const quarantine = z.object({
  /** Controlled hold location. Nonconforming articles do not stay on the dock. */
  location: z.string().min(1),
  recordedBy: z.string().min(1),
  recordedAt: z.string().datetime(),
});
export type Quarantine = z.infer<typeof quarantine>;

export const nonconformanceRecord = z.object({
  id: z.string().min(1),
  /** The inspection record that produced this nonconformance. */
  inspectionRecordId: z.string().min(1),
  receiptId: z.string().min(1),
  /** Check ids that failed. An NCR always traces to specific failures. */
  failedCheckIds: z.array(z.string().min(1)).min(1),
  stage: ncrStage,
  quarantine: quarantine.nullable(),
  /** Can the material be used as it is? Null until material review answers. */
  useAsIs: z.boolean().nullable(),
  /** Is supplier corrective action warranted? Only asked when useAsIs is false. */
  supplierActionWarranted: z.boolean().nullable(),
  disposition: disposition.nullable(),
  approvals: z.array(approval),
  /** Raised when the router calls for supplier corrective action. */
  supplierCorrectiveActionRef: z.string().min(1).nullable(),
  returnMaterialAuthorisationRef: z.string().min(1).nullable(),
});
export type NonconformanceRecord = z.infer<typeof nonconformanceRecord>;

export const ncrActionCode = z.enum([
  'QUARANTINE_ARTICLE',
  'PERFORM_MATERIAL_REVIEW',
  'DECIDE_SUPPLIER_ACTION',
  'RECORD_USE_AS_IS_APPROVAL',
  'RAISE_SUPPLIER_CORRECTIVE_ACTION',
  'RECORD_SCRAP_APPROVAL',
  'NONE',
]);
export type NcrActionCode = z.infer<typeof ncrActionCode>;

/**
 * What the nonconformance router says must happen next. Deterministic: the
 * same NCR state always yields the same required action.
 */
export const ncrNextAction = z.object({
  code: ncrActionCode,
  description: z.string().min(1),
  /** The minimum role that may perform it. An inspector cannot approve a
   *  disposition that requires a supervisor. */
  requiredRole: role.nullable(),
  terminal: z.boolean(),
  trace: z.array(z.string().min(1)),
});
export type NcrNextAction = z.infer<typeof ncrNextAction>;
