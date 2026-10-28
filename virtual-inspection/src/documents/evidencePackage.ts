import { contentHash } from '../engine/hash.ts'
import { verifyRecordIntegrity, type SessionConformityRecord } from '../engine/record.ts'
import type { CustomerConfig } from '../schema/config.ts'
import { buildAuthorityRecordDocument } from './authorityRecord.ts'
import { buildSessionConformityRecordDocument } from './sessionRecord.ts'
import { renderDocumentText, type RenderedDocument } from './model.ts'

/**
 * The evidence package.
 *
 * Self-contained, and built on the assumption that it will one day be handed to
 * a regulator or a lawyer. Two consequences follow from that assumption and
 * shape everything below:
 *
 *   1. **It must be verifiable without this software.** Every entry carries its
 *      own content hash and the manifest carries a hash over the whole set, so a
 *      recipient with nothing but a hashing tool can check that what they hold
 *      is what was sealed.
 *   2. **It must state its own limits.** The package says what it contains and
 *      what it does not - notably that the recording itself is referenced rather
 *      than embedded, because the recording lives in customer-controlled storage
 *      and may carry export-control obligations of its own.
 */

export interface EvidencePackageEntry {
  path: string
  description: string
  contentHash: string
  /** Text form, so the package is legible without a viewer. */
  text: string
}

export interface EvidencePackageManifest {
  packageVersion: '1.0'
  recordId: string
  recordRevision: number
  sessionId: string
  organisationDisplayName: string
  sealedRecordHash: string
  recordIntegrityVerified: boolean
  entries: Array<{ path: string; description: string; contentHash: string }>
  recordingReference: {
    status: string
    storageTargetRef: string
    artefactRef: string | null
    contentHash: string | null
    note: string
  }
  retention: { retainFrom: string; retainUntil: string; basis: string }
  notes: string[]
  manifestHash: string
}

export interface EvidencePackage {
  manifest: EvidencePackageManifest
  entries: EvidencePackageEntry[]
  documents: RenderedDocument[]
  /** The sealed record verbatim, as structured JSON. */
  recordJson: string
}

export function buildEvidencePackage(
  record: SessionConformityRecord,
  config: CustomerConfig,
): EvidencePackage {
  const sessionDocument = buildSessionConformityRecordDocument(record)
  const authorityDocument = buildAuthorityRecordDocument(record, config)
  const recordJson = JSON.stringify(record, null, 2)

  const entries: EvidencePackageEntry[] = [
    {
      path: '01-session-conformity-record.txt',
      description: 'The executed checklist with per-check results, evidence, manipulations, tools and signature.',
      text: renderDocumentText(sessionDocument),
      contentHash: '',
    },
    {
      path: '02-authority-conformity-inspection-record.txt',
      description: 'The authority conformity inspection record field mapping, populated from the session record.',
      text: renderDocumentText(authorityDocument),
      contentHash: '',
    },
    {
      path: '03-session-record.json',
      description: 'The sealed session record verbatim, as structured JSON.',
      text: recordJson,
      contentHash: '',
    },
  ].map((entry) => ({ ...entry, contentHash: contentHash(entry.text) }))

  const integrity = verifyRecordIntegrity(record)

  const manifestBody: Omit<EvidencePackageManifest, 'manifestHash'> = {
    packageVersion: '1.0',
    recordId: record.recordId,
    recordRevision: record.revision,
    sessionId: record.session.sessionId,
    organisationDisplayName: record.organisationDisplayName,
    sealedRecordHash: record.contentHash,
    recordIntegrityVerified: integrity.intact,
    entries: entries.map(({ path, description, contentHash: hash }) => ({
      path,
      description,
      contentHash: hash,
    })),
    recordingReference: {
      status: record.session.recording.status,
      storageTargetRef: record.session.recording.storageTargetRef,
      artefactRef: record.session.recording.artefactRef ?? null,
      contentHash: record.session.recording.contentHash ?? null,
      note: 'The session recording is referenced, not embedded. It is held in storage the customer controls, and may carry export-control or confidentiality obligations that govern how it is transmitted. The hash above allows the recipient to confirm that the artefact they are given is the one this record was sealed against.',
    },
    retention: {
      retainFrom: record.retention.retainFrom,
      retainUntil: record.retention.retainUntil,
      basis: record.retention.basis,
    },
    notes: [
      'Every entry carries its own content hash. The manifest carries a hash over the entry set. Both can be checked with any SHA-256 tool; this software is not needed to verify them.',
      'A corrected record does not replace this one. Corrections are issued as a new revision naming the record they supersede, and both remain valid evidence of what was recorded at the time.',
      record.defensibility.disclaimer,
      'This package describes what a remote inspection session captured. It does not state, and must not be read as stating, that any arrangement, article, or organisation answers any regulatory obligation.',
    ],
  }

  return {
    manifest: { ...manifestBody, manifestHash: contentHash(manifestBody) },
    entries,
    documents: [sessionDocument, authorityDocument],
    recordJson,
  }
}

/** Re-verify a package end to end, the way a recipient would. */
export function verifyEvidencePackage(pkg: EvidencePackage): {
  manifestIntact: boolean
  entryResults: Array<{ path: string; intact: boolean }>
  allIntact: boolean
} {
  const { manifestHash, ...body } = pkg.manifest
  const manifestIntact = contentHash(body) === manifestHash
  const entryResults = pkg.entries.map((entry) => ({
    path: entry.path,
    intact: contentHash(entry.text) === entry.contentHash,
  }))
  return {
    manifestIntact,
    entryResults,
    allIntact: manifestIntact && entryResults.every((r) => r.intact),
  }
}
