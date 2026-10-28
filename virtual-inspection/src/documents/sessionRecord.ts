import type { SessionConformityRecord } from '../engine/record.ts'
import type { RenderedDocument } from './model.ts'

/**
 * The session conformity record.
 *
 * The executed checklist with per-check results, evidence, directed
 * manipulations, tools, roster version and signature. Everything the record
 * holds is shown; nothing is summarised away, because a summary is what a
 * reviewer cannot cross-examine.
 */

const NO_DETERMINATION = '(not executed)'

export function buildSessionConformityRecordDocument(record: SessionConformityRecord): RenderedDocument {
  const { session } = record
  const executedById = new Map(session.executedChecks.map((e) => [e.checkId, e]))

  return {
    documentType: 'session-conformity-record',
    title: 'Session conformity record',
    subtitle: `${record.organisationDisplayName} — session ${session.sessionId} — record ${record.recordId} revision ${record.revision}`,
    sections: [
      {
        heading: 'Identification',
        fields: [
          { label: 'Record', value: `${record.recordId} (revision ${record.revision})`, mono: true },
          { label: 'Supersedes', value: record.supersedes ?? 'none — original record', mono: true },
          ...(record.supersededReason ? [{ label: 'Reason for revision', value: record.supersededReason }] : []),
          { label: 'Session', value: session.sessionId, mono: true },
          { label: 'Article', value: session.articleId, mono: true },
          { label: 'Location', value: session.locationId, mono: true },
          { label: 'Check pack', value: `${session.packId} version ${session.packVersion}`, mono: true },
          { label: 'Session state', value: session.state },
        ],
      },
      {
        heading: 'Personnel and roster version',
        note: 'Rosters are versioned. This record resolves to the revisions in force when the session started, not to the current roster.',
        fields: [
          { label: 'Inspector', value: session.inspectorPersonId, mono: true },
          { label: 'Presenter', value: session.presenterPersonId, mono: true },
          { label: 'Personnel roster revision', value: String(record.rosterStamp.personnelRevision) },
          { label: 'Locations roster revision', value: String(record.rosterStamp.locationsRevision) },
        ],
      },
      {
        heading: 'Eligibility evaluation',
        note: 'Every rule evaluated before scheduling, whether or not it fired.',
        fields: [{ label: 'Decision', value: record.eligibility.decision }],
        table: {
          columns: ['Rule', 'Severity', 'Fired', 'Observed'],
          rows: record.eligibility.evaluated.map((rule) => [
            rule.title,
            rule.severity,
            rule.fired ? 'yes' : 'no',
            rule.detail,
          ]),
        },
      },
      ...(record.eligibility.warnings.length > 0
        ? [
            {
              heading: 'Risks recorded before the session',
              note: 'Warnings do not stop a session. They are carried onto the record so a later reviewer sees what was known at the time.',
              paragraphs: record.eligibility.warnings.map((w) => `${w.title}\n\n${w.rationale}`),
            },
          ]
        : []),
      {
        heading: 'Session controls',
        table: {
          columns: ['Control', 'Enforcement', 'Status', 'Detail', 'Override reason'],
          rows: record.preSessionControls.controls.map((control) => [
            control.title,
            control.enforcement,
            control.status,
            control.detail,
            control.overrideReason ?? '',
          ]),
        },
      },
      {
        heading: 'Executed checks',
        table: {
          columns: ['Check', 'Key characteristic', 'Determination', 'Angles', 'Lighting', 'Tools', 'Documents', 'Determined by', 'At', 'Re-verified'],
          rows: session.checks.map((check) => {
            const executed = executedById.get(check.checkId)
            return [
              check.title,
              check.keyCharacteristic ? 'yes' : 'no',
              executed?.determination ?? NO_DETERMINATION,
              executed?.anglesUsed.join(', ') ?? '',
              executed?.lightingUsed ?? '',
              executed?.toolIdsUsed.join(', ') ?? '',
              executed?.documentRefsReviewed.join(', ') ?? '',
              executed?.determinedByPersonId ?? '',
              executed?.determinedAt ?? '',
              executed?.reVerifiedAt ?? '',
            ]
          }),
        },
      },
      {
        heading: 'Physical manipulation directed by the inspector',
        note: 'Each entry is an instruction given by the inspector and carried out by the presenter under that direction.',
        table: {
          columns: ['At', 'Directed by', 'Performed by', 'Check', 'Instruction'],
          rows: session.directedManipulations.map((m) => [
            m.at,
            m.directedByPersonId,
            m.performedByPersonId,
            m.checkId ?? '',
            m.instruction,
          ]),
        },
      },
      {
        heading: 'Documents reviewed on screen',
        table: {
          columns: ['Reference', 'Title', 'Reviewed at', 'Capture hash'],
          rows: session.documentsReviewed.map((d) => [d.documentRef, d.title, d.reviewedAt, d.captureHash ?? '']),
        },
      },
      {
        heading: 'Tools used',
        table: {
          columns: ['Tool', 'Description', 'Calibration due', 'In calibration at session start'],
          rows: session.toolsUsed.map((t) => [
            t.toolId,
            t.description,
            t.calibrationDueDate,
            t.inCalibrationAtSessionStart ? 'yes' : 'no',
          ]),
        },
      },
      {
        heading: 'Interruptions',
        note:
          session.interruptions.length === 0
            ? 'None recorded.'
            : 'An interruption blocks approval from the moment it is detected. Only resume-and-re-verify can restore it, and only once every affected check has been re-verified.',
        table: {
          columns: ['Detected', 'Category', 'Reason', 'Affected checks', 'Recovery', 'Rationale', 'Selected by'],
          rows: session.interruptions.map((i) => [
            i.detectedAt,
            i.category,
            i.reason,
            i.affectedCheckIds.join(', '),
            i.resolution?.path ?? '(unresolved)',
            i.resolution?.rationale ?? '',
            i.resolution?.selectedByPersonId ?? '',
          ]),
        },
      },
      {
        heading: 'Nonconformances raised',
        table: {
          columns: ['Reference', 'Check', 'Raised by', 'At', 'Description', 'Containment'],
          rows: session.nonconformances.map((n) => [
            n.nonconformanceId,
            n.checkId ?? '',
            n.raisedByPersonId,
            n.raisedAt,
            n.description,
            n.containment ?? '',
          ]),
        },
      },
      {
        heading: 'Session recording',
        note: 'Recording is mandatory. A session whose recording failed cannot stand as the sole conformity record.',
        fields: [
          { label: 'Status', value: session.recording.status },
          { label: 'Storage target', value: session.recording.storageTargetRef, mono: true },
          { label: 'Artefact', value: session.recording.artefactRef ?? '(none)', mono: true },
          { label: 'Content hash', value: session.recording.contentHash ?? '(none)', mono: true },
          ...(session.recording.failureReason
            ? [{ label: 'Failure reason', value: session.recording.failureReason }]
            : []),
        ],
      },
      {
        heading: 'Approval',
        fields: [
          { label: 'Approval granted', value: record.approval.granted ? 'yes' : 'no' },
          ...(record.approval.withheldReason
            ? [{ label: 'Reason approval was withheld', value: record.approval.withheldReason }]
            : []),
        ],
      },
      {
        heading: 'Evidence elements captured',
        note: record.defensibility.disclaimer,
        fields: [{ label: 'Summary', value: record.defensibility.statement }],
        table: {
          columns: ['Element', 'Status', 'Detail'],
          rows: record.defensibility.elements.map((e) => [e.title, e.status, e.detail]),
        },
      },
      {
        heading: 'Retention',
        fields: [
          { label: 'Retain from', value: record.retention.retainFrom },
          { label: 'Retain until', value: record.retention.retainUntil },
          { label: 'Basis', value: record.retention.basis },
        ],
      },
      {
        heading: 'Signature',
        fields: [
          { label: 'Signed by', value: record.signature.personId, mono: true },
          { label: 'Signed at', value: record.signature.signedAt },
          { label: 'Statement', value: record.signature.statement },
          { label: 'Record content hash', value: record.contentHash, mono: true },
        ],
      },
    ],
    footer:
      'This record describes what was observed and determined during a remote inspection session. It does not state, and must not be read as stating, that any arrangement, article, or organisation answers any regulatory obligation.',
  }
}
