import { z } from 'zod'
import { IsoDate, IsoDateTime, LocationId, PersonId } from './primitives.ts'

/**
 * Authorised personnel and authorised locations are versioned rosters.
 *
 * Revisions are append-only. A session record stores the revision number in
 * force when it started, so a record written years ago still resolves to the
 * roster as it stood that day. Reconstructing who was authorised on the day is
 * precisely what an authority asks for, and it is impossible if the roster is
 * mutated in place.
 */

export const SessionRole = z.enum(['INSPECTOR', 'PRESENTER', 'DESIGNATED_REPRESENTATIVE'])
export type SessionRole = z.infer<typeof SessionRole>

export const PersonnelRosterEntry = z.object({
  personId: PersonId,
  /** Customer-supplied display reference. Never a real name in fixtures or seeds. */
  displayRef: z.string().min(1),
  roles: z.array(SessionRole).min(1),
  /** Inclusive last date on which training currency holds. */
  trainingCurrentUntil: IsoDate,
  /** Whether this person is authorised for articles the customer classes critical. */
  authorisedForCriticalArticles: z.boolean(),
})
export type PersonnelRosterEntry = z.infer<typeof PersonnelRosterEntry>

export const LocationRosterEntry = z.object({
  locationId: LocationId,
  displayRef: z.string().min(1),
  /** Whether the customer's own approval of this location as a remote session site stands. */
  authorised: z.boolean(),
})
export type LocationRosterEntry = z.infer<typeof LocationRosterEntry>

export const PersonnelRosterRevision = z.object({
  kind: z.literal('personnel'),
  revision: z.number().int().positive(),
  effectiveFrom: IsoDateTime,
  entries: z.array(PersonnelRosterEntry),
})
export type PersonnelRosterRevision = z.infer<typeof PersonnelRosterRevision>

export const LocationRosterRevision = z.object({
  kind: z.literal('locations'),
  revision: z.number().int().positive(),
  effectiveFrom: IsoDateTime,
  entries: z.array(LocationRosterEntry),
})
export type LocationRosterRevision = z.infer<typeof LocationRosterRevision>

/** The revision pair pinned onto a session record at start. */
export const RosterStamp = z.object({
  personnelRevision: z.number().int().positive(),
  locationsRevision: z.number().int().positive(),
})
export type RosterStamp = z.infer<typeof RosterStamp>
