import { z } from 'zod'

/**
 * Organization Profile — filled in once, reused for every plan.
 *
 * This is where every formerly hardcoded value now lives. The logic this product
 * derives from carried one employer's PMA number, addresses, contact people, FAA
 * office assignment and internal procedure numbers as defaults. All of it is now
 * customer-supplied.
 *
 * EVERY DEFAULT HERE IS AN EMPTY STRING, DELIBERATELY. A populated default would
 * be somebody's real data, and a plausible-looking wrong default is worse than a
 * blank — a blank becomes a visible [CONFIRM: …] token in the document, whereas
 * a wrong default silently ships to the FAA. A test asserts these stay empty.
 */
export const organizationProfile = z.object({
  /** Appendix A header — "PAH Name:" */
  pahName: z.string().default(''),
  /** Appendix A header — "Project Number/PC Number:" (also Section 1 item 2) */
  projectOrPcNumber: z.string().default(''),
  /** Appendix A header — "PAH U.S. Address:" */
  pahUsAddress: z.string().default(''),
  /** Appendix A header — "Phone Number:" */
  phoneNumber: z.string().default(''),
  /** Appendix A header — "Project Contact Person:" */
  projectContactPerson: z.string().default(''),

  /** Who signs the transmittal. Not an Appendix A field; used on the cover. */
  signatoryName: z.string().default(''),
  signatoryTitle: z.string().default(''),

  /**
   * AC 21-55 §7: the plan goes to "its FAA managing office". Which office that
   * is depends on the PAH's certificate, so it is asked, never assumed.
   */
  faaManagingOffice: z.string().default(''),
  faaAddressee: z.string().default(''),
  submissionMethod: z.string().default(''),

  /** The PAH's quality manual, cited in Section 4. */
  qmsManualNumber: z.string().default(''),
  qmsManualRevision: z.string().default(''),
  qmsManualDate: z.string().default(''),

  /**
   * Where the source logic named an internal procedure, the product asks which
   * of the customer's procedures governs it and inserts their answer.
   */
  procedureNonconformance: z.string().default(''),
  procedureSubtierControl: z.string().default(''),
  procedureChangeControl: z.string().default(''),
  procedureDesignChange: z.string().default(''),
  procedureQualityFlowdown: z.string().default(''),
  procedureAuditProgramme: z.string().default(''),
  procedureTrainingQualification: z.string().default(''),

  /** AC 21-55 §8.4 — designee policy, including the travel commitment. */
  designeePolicy: z.string().default(''),
})

export type OrganizationProfile = z.infer<typeof organizationProfile>

export function emptyProfile(): OrganizationProfile {
  return organizationProfile.parse({})
}

/**
 * Profile fields that must be present before a plan can be generated.
 * Everything else degrades to a visible CONFIRM token rather than blocking.
 */
export const REQUIRED_PROFILE_FIELDS = [
  'pahName',
  'projectOrPcNumber',
  'pahUsAddress',
  'projectContactPerson',
] as const satisfies readonly (keyof OrganizationProfile)[]
