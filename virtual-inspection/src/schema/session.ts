import { z } from 'zod'
import {
  ArticleId,
  CheckId,
  Determination,
  IsoDateTime,
  LocationId,
  PersonId,
  SessionId,
  ToolId,
} from './primitives.ts'

/**
 * Session state.
 *
 * Three of these states are terminal and non-approving. That is not a
 * convention - it is the mechanism by which a degraded session cannot release
 * an article. See src/engine/interruption.ts.
 */
export const SessionState = z.enum([
  'SCHEDULED',
  'PRE_SESSION_CHECKS',
  'ACTIVE',
  'INTERRUPTED',
  'COMPLETED',
  /** Recovery (b): re-perform in full. Terminal, non-approving. */
  'TERMINATED_REPERFORM',
  /** Recovery (c): route the article for physical inspection. Terminal, non-approving. */
  'TERMINATED_PHYSICAL_INSPECTION',
  /** Recovery (d): dispatch a qualified inspector. Terminal, non-approving. */
  'TERMINATED_INSPECTOR_DISPATCH',
  /** Section 1.3: recording failed. Terminal. Cannot stand as sole conformity record. */
  'RECORDING_FAILED',
])
export type SessionState = z.infer<typeof SessionState>

export const ScheduledWindow = z.object({
  opensAt: IsoDateTime,
  closesAt: IsoDateTime,
})
export type ScheduledWindow = z.infer<typeof ScheduledWindow>

/** A check as authored in a content pack. Content is data, never code. */
export const Check = z.object({
  checkId: CheckId,
  title: z.string().min(1),
  /** Rendered to the presenter in large type. One instruction on screen at a time. */
  instruction: z.string().min(1),
  /** Key characteristics require recorded angles and lighting. Section 2.2. */
  keyCharacteristic: z.boolean(),
  requiresDocumentOnScreen: z.boolean(),
  requiresCalibratedTool: z.boolean(),
  /** Free-text citation references shown for context. Never a conclusion. */
  citationRefs: z.array(z.string()).default([]),
})
export type Check = z.infer<typeof Check>

export const CheckPack = z.object({
  packId: z.string().min(1),
  version: z.string().min(1),
  title: z.string().min(1),
  checks: z.array(Check).min(1),
})
export type CheckPack = z.infer<typeof CheckPack>

export const ExecutedCheck = z.object({
  checkId: CheckId,
  determination: Determination,
  /** Always an inspector. Enforced by the capability model, not by convention. */
  determinedByPersonId: PersonId,
  determinedAt: IsoDateTime,
  /** Required when the check is a key characteristic. Section 2.2. */
  anglesUsed: z.array(z.string()).default([]),
  lightingUsed: z.string().optional(),
  toolIdsUsed: z.array(ToolId).default([]),
  documentRefsReviewed: z.array(z.string()).default([]),
  note: z.string().optional(),
  /** Set when an interruption invalidated this check. Cleared only by re-verification. */
  invalidatedByInterruptionId: z.string().optional(),
  reVerifiedAt: IsoDateTime.optional(),
})
export type ExecutedCheck = z.infer<typeof ExecutedCheck>

/**
 * Physical manipulation of the article, directed by the inspector and performed
 * by the presenter. Counting these is one of the strongest available answers to
 * an approval-only characterisation, so they are logged as events rather than
 * summarised in a note.
 */
export const DirectedManipulation = z.object({
  manipulationId: z.string().min(1),
  at: IsoDateTime,
  directedByPersonId: PersonId,
  performedByPersonId: PersonId,
  instruction: z.string().min(1),
  checkId: CheckId.optional(),
})
export type DirectedManipulation = z.infer<typeof DirectedManipulation>

export const DocumentReviewed = z.object({
  documentRef: z.string().min(1),
  title: z.string().min(1),
  reviewedAt: IsoDateTime,
  /** Hash of the captured frame, when the provider supplied one. */
  captureHash: z.string().optional(),
})
export type DocumentReviewed = z.infer<typeof DocumentReviewed>

export const ToolUsage = z.object({
  toolId: ToolId,
  description: z.string().min(1),
  calibrationDueDate: z.string().min(1),
  /** Snapshot taken at session start, so the record does not depend on today's clock. */
  inCalibrationAtSessionStart: z.boolean(),
})
export type ToolUsage = z.infer<typeof ToolUsage>

/** Section 2.2 pre-session controls, captured as attestations on the record. */
export const ControlAttestations = z.object({
  attestedByPersonId: PersonId,
  attestedAt: IsoDateTime,
  audioHeadsetConfirmed: z.boolean(),
  environmentControlledConfirmed: z.boolean(),
  measuredVideoHeightPx: z.number().int().nonnegative(),
  /** Required to proceed below the configured minimum resolution. */
  resolutionJustification: z.string().optional(),
  /** Required to start outside the scheduled window. */
  scheduleOverrideReason: z.string().optional(),
})
export type ControlAttestations = z.infer<typeof ControlAttestations>

export const InterruptionCategory = z.enum([
  'STREAM_FAILURE',
  'EQUIPMENT_FAILURE',
  'DEGRADATION',
  'OTHER',
])
export type InterruptionCategory = z.infer<typeof InterruptionCategory>

export const RecoveryPath = z.enum([
  'RESUME_AND_REVERIFY',
  'REPERFORM_SESSION',
  'ROUTE_FOR_PHYSICAL_INSPECTION',
  'DISPATCH_INSPECTOR',
])
export type RecoveryPath = z.infer<typeof RecoveryPath>

export const Interruption = z.object({
  interruptionId: z.string().min(1),
  detectedAt: IsoDateTime,
  category: InterruptionCategory,
  reason: z.string().min(1),
  /** Checks whose determinations the interruption put in doubt. */
  affectedCheckIds: z.array(CheckId).default([]),
  resolution: z
    .object({
      path: RecoveryPath,
      rationale: z.string().min(1),
      selectedByPersonId: PersonId,
      selectedAt: IsoDateTime,
    })
    .optional(),
})
export type Interruption = z.infer<typeof Interruption>

export const RecordingStatus = z.enum(['NOT_STARTED', 'RECORDING', 'RETAINED', 'FAILED'])
export type RecordingStatus = z.infer<typeof RecordingStatus>

export const RecordingState = z.object({
  status: RecordingStatus,
  /** Durable artefact reference in the customer-controlled storage target. */
  artefactRef: z.string().optional(),
  /** Content hash of the retained artefact, captured onto the record. */
  contentHash: z.string().optional(),
  storageTargetRef: z.string().min(1),
  startedAt: IsoDateTime.optional(),
  endedAt: IsoDateTime.optional(),
  failureReason: z.string().optional(),
})
export type RecordingState = z.infer<typeof RecordingState>

export const Nonconformance = z.object({
  nonconformanceId: z.string().min(1),
  sessionId: SessionId,
  articleId: ArticleId,
  checkId: CheckId.optional(),
  raisedByPersonId: PersonId,
  raisedAt: IsoDateTime,
  description: z.string().min(1),
  containment: z.string().optional(),
})
export type Nonconformance = z.infer<typeof Nonconformance>

/** Everything a live session accumulates before it is signed into a record. */
export const SessionSnapshot = z.object({
  sessionId: SessionId,
  state: SessionState,
  articleId: ArticleId,
  locationId: LocationId,
  inspectorPersonId: PersonId,
  presenterPersonId: PersonId,
  scheduledWindow: ScheduledWindow,
  startedAt: IsoDateTime.optional(),
  endedAt: IsoDateTime.optional(),
  packId: z.string().min(1),
  packVersion: z.string().min(1),
  checks: z.array(Check),
  executedChecks: z.array(ExecutedCheck).default([]),
  directedManipulations: z.array(DirectedManipulation).default([]),
  documentsReviewed: z.array(DocumentReviewed).default([]),
  toolsUsed: z.array(ToolUsage).default([]),
  interruptions: z.array(Interruption).default([]),
  nonconformances: z.array(Nonconformance).default([]),
  attestations: ControlAttestations.optional(),
  recording: RecordingState,
  approvalGranted: z.boolean(),
  approvalWithheldReason: z.string().optional(),
})
export type SessionSnapshot = z.infer<typeof SessionSnapshot>
