import { z } from 'zod'
import { ArticleId, IsoDate, ToolId } from './primitives.ts'

/**
 * Article classification.
 *
 * 14 CFR 145.3(b) defines an article as an aircraft, airframe, aircraft engine,
 * propeller, appliance, or component part. 14 CFR 21.1 defines a product as an
 * aircraft, aircraft engine, or propeller.
 *
 * The distinction is the pivot of the eligibility gate: the contract-maintenance
 * restriction the gate mirrors attaches to a complete type-certificated
 * **product**, and component articles sit outside it. The user classifies the
 * article; the app does not infer the classification and does not second-guess
 * it. See REGULATORY-SOURCES.md for the two interpretation decisions taken here.
 */
export const ArticleClassification = z.enum([
  'COMPONENT_PART',
  'APPLIANCE',
  'AIRFRAME',
  'COMPLETE_AIRCRAFT',
  'COMPLETE_AIRCRAFT_ENGINE',
  'COMPLETE_PROPELLER',
])
export type ArticleClassification = z.infer<typeof ArticleClassification>

export const ArticleCriticality = z.enum(['CRITICAL', 'NON_CRITICAL'])
export type ArticleCriticality = z.infer<typeof ArticleCriticality>

export const Article = z.object({
  articleId: ArticleId,
  /** Customer-supplied designation. Part numbers are customer data, never constants. */
  designation: z.string().min(1),
  serialOrLotRef: z.string().min(1),
  classification: ArticleClassification,
  criticality: ArticleCriticality,
  /**
   * Opaque configuration marker. Any change to it - drawing revision, build
   * standard, effectivity - raises the "configuration changed since last
   * session" warning.
   */
  configurationVersion: z.string().min(1),
})
export type Article = z.infer<typeof Article>

export const CalibratedTool = z.object({
  toolId: ToolId,
  description: z.string().min(1),
  /** Inclusive last date on which calibration holds. */
  calibrationDueDate: IsoDate,
})
export type CalibratedTool = z.infer<typeof CalibratedTool>

/**
 * Who performed the maintenance, and how far the inspecting organisation's
 * involvement extends. Drives the approval-only warning, which is the single
 * most commercially important thing the eligibility gate says.
 */
export const MaintenanceProvenance = z.object({
  performedBySeparateCertificateHolder: z.boolean(),
  inspectingOrganisationInvolvement: z.enum(['RELEASE_ONLY', 'PERFORMED_OR_DIRECTED_WORK']),
})
export type MaintenanceProvenance = z.infer<typeof MaintenanceProvenance>
