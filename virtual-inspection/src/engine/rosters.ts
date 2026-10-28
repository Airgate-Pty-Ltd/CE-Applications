import type {
  LocationRosterRevision,
  PersonnelRosterRevision,
  RosterStamp,
} from '../schema/roster.ts'
import type { IsoDateTime } from '../schema/primitives.ts'

/**
 * Roster resolution.
 *
 * Revisions are append-only and each carries the instant it took effect. A
 * session record stores the revision numbers in force when it started, so the
 * record still resolves correctly years later - after the person has left, after
 * the location has been withdrawn, after the roster has moved on twenty times.
 *
 * Reconstructing who was authorised on the day is precisely what an authority
 * asks for, and it is impossible if the roster is mutated in place.
 */

export class RosterResolutionError extends Error {
  constructor(kind: string, revision: number) {
    super(`no ${kind} roster revision ${revision} exists`)
    this.name = 'RosterResolutionError'
  }
}

interface Revisioned {
  revision: number
  effectiveFrom: IsoDateTime
}

/** The revision in force at an instant: the latest one that had taken effect. */
export function revisionInForce<T extends Revisioned>(revisions: T[], at: IsoDateTime): T | null {
  const eligible = revisions.filter((r) => r.effectiveFrom <= at)
  if (eligible.length === 0) return null
  return eligible.reduce((latest, r) => (r.revision > latest.revision ? r : latest))
}

/** The exact revision a historical record was stamped with. Never the latest. */
export function revisionByNumber<T extends Revisioned>(
  revisions: T[],
  revision: number,
  kind: string,
): T {
  const found = revisions.find((r) => r.revision === revision)
  if (!found) throw new RosterResolutionError(kind, revision)
  return found
}

export interface RosterResolution {
  personnel: PersonnelRosterRevision
  locations: LocationRosterRevision
  stamp: RosterStamp
}

/** Resolve both rosters at an instant, and produce the stamp for the record. */
export function resolveRostersAt(
  personnelRevisions: PersonnelRosterRevision[],
  locationRevisions: LocationRosterRevision[],
  at: IsoDateTime,
): RosterResolution {
  const personnel = revisionInForce(personnelRevisions, at)
  const locations = revisionInForce(locationRevisions, at)
  if (!personnel) throw new Error(`no personnel roster revision was in force at ${at}`)
  if (!locations) throw new Error(`no locations roster revision was in force at ${at}`)
  return {
    personnel,
    locations,
    stamp: { personnelRevision: personnel.revision, locationsRevision: locations.revision },
  }
}

/** Resolve a historical record's rosters from its stamp. */
export function resolveRostersFromStamp(
  personnelRevisions: PersonnelRosterRevision[],
  locationRevisions: LocationRosterRevision[],
  stamp: RosterStamp,
): { personnel: PersonnelRosterRevision; locations: LocationRosterRevision } {
  return {
    personnel: revisionByNumber(personnelRevisions, stamp.personnelRevision, 'personnel'),
    locations: revisionByNumber(locationRevisions, stamp.locationsRevision, 'locations'),
  }
}

/**
 * Append a new revision. The caller supplies entries; the revision number and
 * ordering are decided here so two callers cannot invent the same number.
 */
export function appendPersonnelRevision(
  revisions: PersonnelRosterRevision[],
  entries: PersonnelRosterRevision['entries'],
  effectiveFrom: IsoDateTime,
): PersonnelRosterRevision[] {
  const next = revisions.reduce((max, r) => Math.max(max, r.revision), 0) + 1
  return [...revisions, { kind: 'personnel', revision: next, effectiveFrom, entries }]
}

export function appendLocationRevision(
  revisions: LocationRosterRevision[],
  entries: LocationRosterRevision['entries'],
  effectiveFrom: IsoDateTime,
): LocationRosterRevision[] {
  const next = revisions.reduce((max, r) => Math.max(max, r.revision), 0) + 1
  return [...revisions, { kind: 'locations', revision: next, effectiveFrom, entries }]
}
