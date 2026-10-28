import type { Article, CalibratedTool, MaintenanceProvenance } from '../schema/article.ts'
import type { CustomerConfig } from '../schema/config.ts'
import type { LocationRosterRevision, PersonnelRosterRevision } from '../schema/roster.ts'
import type {
  ControlAttestations,
  ExecutedCheck,
  RecordingState,
  SessionSnapshot,
  ToolUsage,
} from '../schema/session.ts'
import { PRODUCTION_CONFORMITY_PACK } from '../content/packs.ts'
import type { EligibilityInput } from '../engine/eligibility.ts'

/**
 * Fictional fixtures.
 *
 * Every value here is a coded placeholder rather than a name. That is not
 * squeamishness - a fixture is the easiest place for a real identifier to enter
 * a repository and the hardest place to notice one, so this file uses shapes
 * that could not be mistaken for anything real even if the clean-room gate were
 * removed tomorrow.
 */

export const NOW = '2026-07-24T15:00:00.000Z'
export const WINDOW_OPENS = '2026-07-24T14:00:00.000Z'
export const WINDOW_CLOSES = '2026-07-24T18:00:00.000Z'

export const INSPECTOR_ID = 'PER-0001'
export const PRESENTER_ID = 'PER-0002'
export const SECOND_PRESENTER_ID = 'PER-0003'
export const LOCATION_ID = 'SITE-A'

export function makeConfig(overrides: Partial<CustomerConfig> = {}): CustomerConfig {
  return {
    organisationDisplayName: 'Example Inspecting Organisation',
    productDisplayName: 'Remote Inspection',
    minimumVideoHeightPx: 720,
    retentionYears: 10,
    criticalArticleAuthorityConcurrence: { recorded: false },
    authorityRecordForm: 'FAA_FORM_8100_1',
    designatedRepresentativeEnabled: false,
    recordingStorageTargetRef: 'customer-store://sessions',
    auditSampleSize: 5,
    defensibilityReviewThreshold: 7,
    ...overrides,
  }
}

export function makePersonnelRoster(
  overrides: Partial<PersonnelRosterRevision> = {},
): PersonnelRosterRevision {
  return {
    kind: 'personnel',
    revision: 3,
    effectiveFrom: '2026-01-01T00:00:00.000Z',
    entries: [
      {
        personId: INSPECTOR_ID,
        displayRef: 'Inspector 0001',
        roles: ['INSPECTOR'],
        trainingCurrentUntil: '2027-01-31',
        authorisedForCriticalArticles: true,
      },
      {
        personId: PRESENTER_ID,
        displayRef: 'Presenter 0002',
        roles: ['PRESENTER'],
        trainingCurrentUntil: '2027-01-31',
        authorisedForCriticalArticles: false,
      },
      {
        personId: SECOND_PRESENTER_ID,
        displayRef: 'Presenter 0003',
        roles: ['PRESENTER'],
        trainingCurrentUntil: '2027-01-31',
        authorisedForCriticalArticles: false,
      },
    ],
    ...overrides,
  }
}

export function makeLocationRoster(
  overrides: Partial<LocationRosterRevision> = {},
): LocationRosterRevision {
  return {
    kind: 'locations',
    revision: 2,
    effectiveFrom: '2026-01-01T00:00:00.000Z',
    entries: [
      { locationId: LOCATION_ID, displayRef: 'Site A', authorised: true },
      { locationId: 'SITE-B', displayRef: 'Site B', authorised: false },
    ],
    ...overrides,
  }
}

export function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    articleId: 'ART-0001',
    designation: 'ASSY-1000-01',
    serialOrLotRef: 'SN-000123',
    classification: 'COMPONENT_PART',
    criticality: 'NON_CRITICAL',
    configurationVersion: 'CFG-A',
    ...overrides,
  }
}

export function makeTools(overrides: Partial<CalibratedTool>[] = []): CalibratedTool[] {
  const base: CalibratedTool[] = [
    { toolId: 'TOOL-0001', description: 'Calibrated measuring instrument', calibrationDueDate: '2027-03-31' },
  ]
  return overrides.length === 0 ? base : overrides.map((o, i) => ({ ...base[0]!, toolId: `TOOL-000${i + 1}`, ...o }))
}

export function makeProvenance(overrides: Partial<MaintenanceProvenance> = {}): MaintenanceProvenance {
  return {
    performedBySeparateCertificateHolder: false,
    inspectingOrganisationInvolvement: 'PERFORMED_OR_DIRECTED_WORK',
    ...overrides,
  }
}

export function makeEligibilityInput(overrides: Partial<EligibilityInput> = {}): EligibilityInput {
  return {
    now: NOW,
    article: makeArticle(),
    provenance: makeProvenance(),
    inspectorPersonId: INSPECTOR_ID,
    presenterPersonId: PRESENTER_ID,
    locationId: LOCATION_ID,
    personnelRoster: makePersonnelRoster(),
    locationRoster: makeLocationRoster(),
    tools: makeTools(),
    config: makeConfig(),
    history: {
      priorCompletedSessionsAtLocation: 12,
      priorCompletedSessionsWithPresenter: 8,
      articleConfigurationVersionAtLastSession: 'CFG-A',
    },
    ...overrides,
  }
}

export function makeAttestations(overrides: Partial<ControlAttestations> = {}): ControlAttestations {
  return {
    attestedByPersonId: INSPECTOR_ID,
    attestedAt: NOW,
    audioHeadsetConfirmed: true,
    environmentControlledConfirmed: true,
    measuredVideoHeightPx: 1080,
    ...overrides,
  }
}

export function makeRecording(overrides: Partial<RecordingState> = {}): RecordingState {
  return {
    status: 'RETAINED',
    artefactRef: 'customer-store://sessions/SESS-0001.mkv',
    contentHash: 'a'.repeat(64),
    storageTargetRef: 'customer-store://sessions',
    startedAt: NOW,
    endedAt: '2026-07-24T16:00:00.000Z',
    ...overrides,
  }
}

export function makeToolUsage(overrides: Partial<ToolUsage> = {}): ToolUsage {
  return {
    toolId: 'TOOL-0001',
    description: 'Calibrated measuring instrument',
    calibrationDueDate: '2027-03-31',
    inCalibrationAtSessionStart: true,
    ...overrides,
  }
}

/** A fully executed check, conforming, with every control satisfied. */
export function makeExecutedCheck(checkId: string, overrides: Partial<ExecutedCheck> = {}): ExecutedCheck {
  const check = PRODUCTION_CONFORMITY_PACK.checks.find((c) => c.checkId === checkId)
  return {
    checkId,
    determination: 'CONFORMS',
    determinedByPersonId: INSPECTOR_ID,
    determinedAt: NOW,
    anglesUsed: check?.keyCharacteristic ? ['front', 'side', 'rear'] : [],
    ...(check?.keyCharacteristic ? { lightingUsed: 'Supplementary task light, oblique' } : {}),
    toolIdsUsed: check?.requiresCalibratedTool ? ['TOOL-0001'] : [],
    documentRefsReviewed: check?.requiresDocumentOnScreen ? ['DOC-0001'] : [],
    ...overrides,
  }
}

/** A complete, clean session: every check executed and every control satisfied. */
export function makeSession(overrides: Partial<SessionSnapshot> = {}): SessionSnapshot {
  const pack = PRODUCTION_CONFORMITY_PACK
  return {
    sessionId: 'SESS-0001',
    state: 'COMPLETED',
    articleId: 'ART-0001',
    locationId: LOCATION_ID,
    inspectorPersonId: INSPECTOR_ID,
    presenterPersonId: PRESENTER_ID,
    scheduledWindow: { opensAt: WINDOW_OPENS, closesAt: WINDOW_CLOSES },
    startedAt: NOW,
    endedAt: '2026-07-24T16:00:00.000Z',
    packId: pack.packId,
    packVersion: pack.version,
    checks: pack.checks,
    executedChecks: pack.checks.map((c) => makeExecutedCheck(c.checkId)),
    directedManipulations: [
      {
        manipulationId: 'MAN-0001',
        at: NOW,
        directedByPersonId: INSPECTOR_ID,
        performedByPersonId: PRESENTER_ID,
        instruction: 'Rotate the article 90 degrees clockwise and hold.',
        checkId: 'pc-part-marking',
      },
      {
        manipulationId: 'MAN-0002',
        at: NOW,
        directedByPersonId: INSPECTOR_ID,
        performedByPersonId: PRESENTER_ID,
        instruction: 'Place the instrument on the feature and hold the reading in frame.',
        checkId: 'pc-dimensional',
      },
    ],
    documentsReviewed: [
      { documentRef: 'DOC-0001', title: 'Configuration document', reviewedAt: NOW, captureHash: 'b'.repeat(64) },
    ],
    toolsUsed: [makeToolUsage()],
    interruptions: [],
    nonconformances: [],
    attestations: makeAttestations(),
    recording: makeRecording(),
    approvalGranted: true,
    ...overrides,
  }
}
