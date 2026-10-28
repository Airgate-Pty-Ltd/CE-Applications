import { describe, expect, it } from 'vitest'
import {
  RetentionConfigurationError,
  addYears,
  assertRetentionYears,
  isWithinRetention,
  retentionPosition,
} from '../../src/engine/retention.ts'
import { RETENTION_FLOOR_YEARS } from '../../src/schema/config.ts'

describe('retention floor', () => {
  it('accepts the floor and anything above it', () => {
    expect(assertRetentionYears(RETENTION_FLOOR_YEARS)).toBe(RETENTION_FLOOR_YEARS)
    expect(assertRetentionYears(25)).toBe(25)
  })

  it('refuses anything below the floor rather than clamping to it', () => {
    // Silently substituting a value the caller did not ask for is how a
    // retention bug becomes a destroyed record.
    expect(() => assertRetentionYears(RETENTION_FLOOR_YEARS - 1)).toThrow(RetentionConfigurationError)
    expect(() => assertRetentionYears(0)).toThrow(RetentionConfigurationError)
    expect(() => assertRetentionYears(-5)).toThrow(RetentionConfigurationError)
  })

  it('refuses a non-integer year count', () => {
    expect(() => assertRetentionYears(10.5)).toThrow(RetentionConfigurationError)
  })
})

describe('adding years to a date', () => {
  it('adds whole years', () => {
    expect(addYears('2026-07-24', 10)).toBe('2036-07-24')
  })

  it('lands 29 February on 28 February rather than rolling into March', () => {
    // Rolling forward would shorten the retained period by a day, and a
    // retention date one day early is a record destroyed one day too soon.
    expect(addYears('2024-02-29', 1)).toBe('2025-02-28')
    expect(addYears('2024-02-29', 4)).toBe('2028-02-29')
  })

  it('handles month ends that are not February', () => {
    expect(addYears('2026-01-31', 10)).toBe('2036-01-31')
    expect(addYears('2026-12-31', 10)).toBe('2036-12-31')
  })
})

describe('retention position', () => {
  it('runs from the completion date to the floor by default', () => {
    const position = retentionPosition('2026-07-24T15:00:00.000Z', 10)
    expect(position.retainFrom).toBe('2026-07-24')
    expect(position.retainUntil).toBe('2036-07-24')
    expect(position.years).toBe(10)
    expect(position.basis).toContain('pending owner verification')
  })

  it('describes a longer configured period as customer-configured', () => {
    const position = retentionPosition('2026-07-24T15:00:00.000Z', 15)
    expect(position.retainUntil).toBe('2041-07-24')
    expect(position.basis).toContain('above the configured floor')
  })

  it('refuses a configuration below the floor', () => {
    expect(() => retentionPosition('2026-07-24T15:00:00.000Z', 2)).toThrow(RetentionConfigurationError)
  })

  it('treats the last retained day as still inside the period', () => {
    const position = retentionPosition('2026-07-24T15:00:00.000Z', 10)
    expect(isWithinRetention(position, '2036-07-24')).toBe(true)
    expect(isWithinRetention(position, '2036-07-25')).toBe(false)
  })
})
