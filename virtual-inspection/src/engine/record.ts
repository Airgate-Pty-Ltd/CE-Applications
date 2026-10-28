import { contentHash } from './hash.ts'
import type { EligibilityResult } from './eligibility.ts'
import type { PreSessionControlResult } from './controls.ts'
import type { DefensibilityReport } from './defensibility.ts'
import type { RetentionPosition } from './retention.ts'
import type { RosterStamp } from '../schema/roster.ts'
import type { SessionSnapshot } from '../schema/session.ts'
import type { IsoDateTime } from '../schema/primitives.ts'

/**
 * The session conformity record.
 *
 * Once signed it is immutable. A correction does not edit it - a correction
 * creates a new revision that names the record it supersedes, and both survive.
 * That is the difference between a record and a document: a record can be wrong,
 * and the fact that it was wrong is itself part of the evidence.
 *
 * Immutability is enforced two ways, deliberately:
 *   - the object graph is deep-frozen, so a write throws in strict mode;
 *   - a content hash over the canonical form detects a record that was
 *     reconstructed or tampered with rather than mutated in place.
 */

export const RECORD_SCHEMA_VERSION = '1.0'

/**
 * The words the inspector signs. Deliberately narrow: it attests to what was
 * done and determined, and asserts nothing about any regulation.
 */
export const DEFAULT_SIGNATURE_STATEMENT =
  'I directed this inspection, I made the determinations recorded above, and this record reflects what was observed during the session.'

export interface RecordSignature {
  personId: string
  signedAt: IsoDateTime
  statement: string
}

export interface ApprovalDecision {
  granted: boolean
  /** Required whenever approval was not granted. Feeds the withheld-approval register. */
  withheldReason: string | null
}

export interface SessionConformityRecord {
  schemaVersion: typeof RECORD_SCHEMA_VERSION
  recordId: string
  sessionId: string
  revision: number
  /** recordId of the revision this one corrects, or null for the original. */
  supersedes: string | null
  supersededReason: string | null
  organisationDisplayName: string
  rosterStamp: RosterStamp
  session: SessionSnapshot
  eligibility: EligibilityResult
  preSessionControls: PreSessionControlResult
  defensibility: DefensibilityReport
  approval: ApprovalDecision
  retention: RetentionPosition
  signature: RecordSignature
  /** SHA-256 over the canonical form of every field above. */
  contentHash: string
}

export type UnsealedRecord = Omit<SessionConformityRecord, 'contentHash'>

export class RecordIntegrityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RecordIntegrityError'
  }
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  for (const key of Object.getOwnPropertyNames(value)) {
    deepFreeze((value as Record<string, unknown>)[key])
  }
  return Object.freeze(value)
}

/** Compute the hash of a record's content, ignoring any hash already on it. */
export function computeRecordHash(record: UnsealedRecord): string {
  return contentHash(record)
}

/**
 * Seal a record: hash it, freeze it, hand it back.
 *
 * Approval that was not granted must carry a reason. A withheld approval with no
 * stated reason is worse than useless in the withheld-approval register - it
 * looks like an omission rather than a decision.
 */
export function sealRecord(record: UnsealedRecord): SessionConformityRecord {
  if (!record.approval.granted && !record.approval.withheldReason?.trim()) {
    throw new RecordIntegrityError('approval was withheld without a recorded reason')
  }
  if (!record.signature.statement.trim()) {
    throw new RecordIntegrityError('a record cannot be sealed without a signature statement')
  }
  return deepFreeze({ ...record, contentHash: computeRecordHash(record) })
}

export interface IntegrityCheck {
  intact: boolean
  storedHash: string
  recomputedHash: string
}

export function verifyRecordIntegrity(record: SessionConformityRecord): IntegrityCheck {
  const { contentHash: storedHash, ...rest } = record
  const recomputedHash = computeRecordHash(rest)
  return { intact: storedHash === recomputedHash, storedHash, recomputedHash }
}

export interface RevisionInput {
  /** Fields the correction changes. The revision chain fields are set here, not by the caller. */
  changes: Partial<Omit<UnsealedRecord, 'recordId' | 'revision' | 'supersedes' | 'supersededReason' | 'sessionId'>>
  recordId: string
  reason: string
  signature: RecordSignature
}

/**
 * Correct a signed record by superseding it.
 *
 * The prior record is untouched and remains valid evidence of what was recorded
 * at the time. Anyone reading the chain sees the correction and the thing it
 * corrected, which is the point.
 */
export function reviseRecord(
  prior: SessionConformityRecord,
  input: RevisionInput,
): SessionConformityRecord {
  if (!input.reason.trim()) {
    throw new RecordIntegrityError('a revision cannot be created without a stated reason')
  }
  const integrity = verifyRecordIntegrity(prior)
  if (!integrity.intact) {
    throw new RecordIntegrityError(
      `cannot revise a record whose content hash does not verify (stored ${integrity.storedHash}, recomputed ${integrity.recomputedHash})`,
    )
  }

  const { contentHash: _priorHash, ...priorBody } = prior
  return sealRecord({
    ...priorBody,
    ...input.changes,
    recordId: input.recordId,
    revision: prior.revision + 1,
    supersedes: prior.recordId,
    supersededReason: input.reason,
    signature: input.signature,
  })
}

/** Order a set of revisions of one session oldest-first, following the chain. */
export function revisionChain(records: SessionConformityRecord[]): SessionConformityRecord[] {
  return [...records].sort((a, b) => a.revision - b.revision)
}

/** The revision that no other revision supersedes. */
export function currentRevision(records: SessionConformityRecord[]): SessionConformityRecord | null {
  const chain = revisionChain(records)
  return chain.length === 0 ? null : (chain[chain.length - 1] ?? null)
}
