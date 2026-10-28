import { RETENTION_FLOOR_BASIS, RETENTION_FLOOR_YEARS } from '../schema/config.ts'
import type { IsoDate, IsoDateTime } from '../schema/primitives.ts'

/**
 * Retention.
 *
 * A floor, configurable upward only. A customer with a longer contractual or
 * policy obligation raises it; nobody lowers it, and the function refuses
 * rather than clamping, because silently substituting a value the caller did
 * not ask for is how a retention bug becomes a destroyed record.
 *
 * The basis for the floor is flagged for owner verification - see
 * REGULATORY-SOURCES.md, decision 3. Only the displayed string depends on it.
 */

export class RetentionConfigurationError extends Error {
  constructor(requestedYears: number) {
    super(
      `retention of ${requestedYears} year(s) is below the floor of ${RETENTION_FLOOR_YEARS}; retention is configurable upward only`,
    )
    this.name = 'RetentionConfigurationError'
  }
}

export function assertRetentionYears(years: number): number {
  if (!Number.isInteger(years) || years < RETENTION_FLOOR_YEARS) {
    throw new RetentionConfigurationError(years)
  }
  return years
}

export interface RetentionPosition {
  retainFrom: IsoDate
  retainUntil: IsoDate
  years: number
  basis: string
}

/**
 * Add whole years to a calendar date.
 *
 * 29 February plus one year lands on 28 February. Rolling forward to 1 March
 * would shorten the retained period by a day, and a retention date that is one
 * day early is a record destroyed one day too soon.
 */
export function addYears(date: IsoDate, years: number): IsoDate {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  const targetYear = y + years
  const daysInTargetMonth = new Date(Date.UTC(targetYear, m, 0)).getUTCDate()
  const day = Math.min(d, daysInTargetMonth)
  return `${String(targetYear).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function retentionPosition(completedAt: IsoDateTime, configuredYears: number): RetentionPosition {
  const years = assertRetentionYears(configuredYears)
  const retainFrom = completedAt.slice(0, 10)
  return {
    retainFrom,
    retainUntil: addYears(retainFrom, years),
    years,
    basis:
      years === RETENTION_FLOOR_YEARS
        ? RETENTION_FLOOR_BASIS
        : `Customer-configured retention of ${years} years, above the configured floor of ${RETENTION_FLOOR_YEARS}.`,
  }
}

/** Whether a record is still inside its retained period on a given day. */
export function isWithinRetention(position: RetentionPosition, on: IsoDate): boolean {
  return on <= position.retainUntil
}
