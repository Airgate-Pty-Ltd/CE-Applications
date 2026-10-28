import type { SessionConformityRecord } from '../engine/record.ts'
import type { CustomerConfig } from '../schema/config.ts'
import type { RenderedDocument } from './model.ts'

/**
 * The authority conformity inspection record.
 *
 * Laid out as a field mapping onto FAA Form 8100-1, or onto a customer-
 * configured equivalent. The mapping is data the customer can see and check,
 * rather than a picture of a form with values dropped into it, for two reasons:
 * form layouts change, and a mapping can be reviewed by a quality manager who
 * will notice if a field is fed from the wrong place.
 *
 * **The field numbering below must be verified against the current revision of
 * the form before use.** That verification is an owner action and is recorded as
 * outstanding in REGULATORY-SOURCES.md.
 */

export interface AuthorityRecordField {
  /** Block reference on the target form. Verify before use. */
  block: string
  label: string
  value: string
  /** Where the value came from, so the mapping can be audited. */
  sourcePath: string
}

export function mapAuthorityRecordFields(record: SessionConformityRecord): AuthorityRecordField[] {
  const { session } = record
  const conformsCount = session.executedChecks.filter((e) => e.determination === 'CONFORMS').length
  const notConformsCount = session.executedChecks.filter((e) => e.determination === 'DOES_NOT_CONFORM').length
  const notVerifiedCount = session.executedChecks.filter((e) => e.determination === 'NOT_VERIFIED').length

  return [
    {
      block: '1',
      label: 'Organisation conducting the inspection',
      value: record.organisationDisplayName,
      sourcePath: 'record.organisationDisplayName',
    },
    {
      block: '2',
      label: 'Article designation',
      value: session.articleId,
      sourcePath: 'record.session.articleId',
    },
    {
      block: '3',
      label: 'Inspection performed at',
      value: session.locationId,
      sourcePath: 'record.session.locationId',
    },
    {
      block: '4',
      label: 'Means of inspection',
      value: 'Remote technology — live directed inspection, recorded',
      sourcePath: 'constant',
    },
    {
      block: '5',
      label: 'Inspection specification',
      value: `${session.packId} version ${session.packVersion}`,
      sourcePath: 'record.session.packId + packVersion',
    },
    {
      block: '6',
      label: 'Inspection period',
      value: `${session.startedAt ?? '(not started)'} to ${session.endedAt ?? '(not ended)'}`,
      sourcePath: 'record.session.startedAt / endedAt',
    },
    {
      block: '7',
      label: 'Result of inspection',
      value: `${conformsCount} conform, ${notConformsCount} do not conform, ${notVerifiedCount} not verified, of ${session.checks.length} checks in the pack`,
      sourcePath: 'record.session.executedChecks',
    },
    {
      block: '8',
      label: 'Nonconformances raised',
      value:
        session.nonconformances.length === 0
          ? 'None'
          : session.nonconformances.map((n) => n.nonconformanceId).join(', '),
      sourcePath: 'record.session.nonconformances',
    },
    {
      block: '9',
      label: 'Approval granted',
      value: record.approval.granted ? 'Yes' : `No — ${record.approval.withheldReason ?? ''}`,
      sourcePath: 'record.approval',
    },
    {
      block: '10',
      label: 'Inspector',
      value: session.inspectorPersonId,
      sourcePath: 'record.session.inspectorPersonId',
    },
    {
      block: '11',
      label: 'Date of signature',
      value: record.signature.signedAt,
      sourcePath: 'record.signature.signedAt',
    },
    {
      block: '12',
      label: 'Supporting record reference',
      value: `${record.recordId} revision ${record.revision}, content hash ${record.contentHash}`,
      sourcePath: 'record.recordId + revision + contentHash',
    },
  ]
}

export function buildAuthorityRecordDocument(
  record: SessionConformityRecord,
  config: CustomerConfig,
): RenderedDocument {
  const formName =
    config.authorityRecordForm === 'FAA_FORM_8100_1'
      ? 'FAA Form 8100-1 layout'
      : `Configured equivalent${config.authorityRecordFormRef ? ` (${config.authorityRecordFormRef})` : ''}`

  return {
    documentType: 'authority-conformity-inspection-record',
    title: 'Authority conformity inspection record',
    subtitle: `${formName} — populated from session ${record.session.sessionId}`,
    sections: [
      {
        heading: 'Field mapping',
        note: 'Block references must be verified against the current revision of the target form before use. Each value shows the field of the session record it was taken from.',
        table: {
          columns: ['Block', 'Field', 'Value', 'Source'],
          rows: mapAuthorityRecordFields(record).map((f) => [f.block, f.label, f.value, f.sourcePath]),
        },
      },
      {
        heading: 'Basis of the entries',
        paragraphs: [
          'Every value above is taken directly from the sealed session conformity record and is not re-derived, re-summarised, or edited in transit. If the session record is corrected, a new revision is produced and this document is regenerated from it.',
          record.defensibility.disclaimer,
        ],
      },
    ],
    footer:
      'Populated from a sealed session record. The organisation named above is responsible for the entries and for whether this form is the correct one to use.',
  }
}
