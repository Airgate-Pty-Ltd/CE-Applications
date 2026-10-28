import { describe, expect, it } from 'vitest'
import {
  RosterResolutionError,
  appendLocationRevision,
  appendPersonnelRevision,
  resolveRostersAt,
  resolveRostersFromStamp,
  revisionByNumber,
  revisionInForce,
} from '../../src/engine/rosters.ts'
import { INSPECTOR_ID, makeLocationRoster, makePersonnelRoster } from '../../src/fixtures/factory.ts'

const r1 = { ...makePersonnelRoster(), revision: 1, effectiveFrom: '2026-01-01T00:00:00.000Z' }
const r2 = { ...makePersonnelRoster(), revision: 2, effectiveFrom: '2026-06-01T00:00:00.000Z' }
const r3 = { ...makePersonnelRoster(), revision: 3, effectiveFrom: '2026-09-01T00:00:00.000Z' }

describe('revision in force', () => {
  it('is the latest revision that had taken effect', () => {
    expect(revisionInForce([r1, r2, r3], '2026-07-24T00:00:00.000Z')?.revision).toBe(2)
  })

  it('ignores revisions that had not yet taken effect', () => {
    expect(revisionInForce([r1, r2, r3], '2026-02-01T00:00:00.000Z')?.revision).toBe(1)
  })

  it('takes effect on the instant stated, not after it', () => {
    expect(revisionInForce([r1, r2], '2026-06-01T00:00:00.000Z')?.revision).toBe(2)
  })

  it('returns null before any revision existed', () => {
    expect(revisionInForce([r2, r3], '2025-01-01T00:00:00.000Z')).toBeNull()
  })

  it('does not depend on the order revisions are supplied in', () => {
    expect(revisionInForce([r3, r1, r2], '2026-07-24T00:00:00.000Z')?.revision).toBe(2)
  })
})

describe('resolving a historical record', () => {
  it('resolves to the exact stamped revision, never the latest', () => {
    // This is the whole point of versioning the roster: a record written in
    // June still resolves to June's roster after the roster has moved on.
    const resolved = resolveRostersFromStamp([r1, r2, r3], [makeLocationRoster()], {
      personnelRevision: 1,
      locationsRevision: 2,
    })
    expect(resolved.personnel.revision).toBe(1)
  })

  it('throws rather than guessing when the stamped revision is missing', () => {
    expect(() => revisionByNumber([r1], 9, 'personnel')).toThrow(RosterResolutionError)
  })

  it('produces a stamp from the revisions in force at an instant', () => {
    const { stamp } = resolveRostersAt([r1, r2], [makeLocationRoster()], '2026-07-24T00:00:00.000Z')
    expect(stamp).toEqual({ personnelRevision: 2, locationsRevision: 2 })
  })

  it('refuses to resolve an instant before either roster existed', () => {
    expect(() => resolveRostersAt([r2], [makeLocationRoster()], '2020-01-01T00:00:00.000Z')).toThrow(
      /personnel roster revision/,
    )
    expect(() =>
      resolveRostersAt([r1], [{ ...makeLocationRoster(), effectiveFrom: '2026-06-01T00:00:00.000Z' }], '2026-03-01T00:00:00.000Z'),
    ).toThrow(/locations roster revision/)
  })
})

describe('appending revisions', () => {
  it('increments the revision number and leaves earlier revisions untouched', () => {
    const before = [r1, r2]
    const after = appendPersonnelRevision(
      before,
      r2.entries.filter((e) => e.personId !== INSPECTOR_ID),
      '2026-08-01T00:00:00.000Z',
    )
    expect(after).toHaveLength(3)
    expect(after[2]?.revision).toBe(3)
    expect(before).toHaveLength(2)
    expect(after[0]?.entries).toEqual(r1.entries)
  })

  it('a person removed from the roster still resolves in a record stamped earlier', () => {
    const after = appendPersonnelRevision(
      [r1],
      r1.entries.filter((e) => e.personId !== INSPECTOR_ID),
      '2026-08-01T00:00:00.000Z',
    )
    const historical = revisionByNumber(after, 1, 'personnel')
    expect(historical.entries.some((e) => e.personId === INSPECTOR_ID)).toBe(true)
    expect(revisionByNumber(after, 2, 'personnel').entries.some((e) => e.personId === INSPECTOR_ID)).toBe(false)
  })

  it('starts at revision 1 when there is no history', () => {
    expect(appendLocationRevision([], [], '2026-01-01T00:00:00.000Z')[0]?.revision).toBe(1)
  })
})
