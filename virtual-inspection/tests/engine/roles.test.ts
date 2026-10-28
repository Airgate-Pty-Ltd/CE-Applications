import { describe, expect, it } from 'vitest'
import {
  CAPABILITIES,
  CapabilityError,
  DETERMINATION_CAPABILITIES,
  can,
  capabilitiesFor,
  capabilityMatrix,
  determinationCapabilitiesFor,
  requireCapability,
} from '../../src/engine/roles.ts'

describe('role capability model', () => {
  it('THE assertion: the presenter holds no determination capability', () => {
    // If this ever fails, the product's strongest structural claim is false and
    // the presenter UI could render a determination control.
    expect(determinationCapabilitiesFor('PRESENTER')).toEqual([])
  })

  it('the presenter cannot sign, approve, withhold, raise, or dispose', () => {
    for (const capability of DETERMINATION_CAPABILITIES) {
      expect(can('PRESENTER', capability), capability).toBe(false)
    }
  })

  it('the inspector holds every determination capability', () => {
    expect(determinationCapabilitiesFor('INSPECTOR').sort()).toEqual([...DETERMINATION_CAPABILITIES].sort())
  })

  it('a designated representative may complete the authority record and nothing else determinative', () => {
    expect(determinationCapabilitiesFor('DESIGNATED_REPRESENTATIVE')).toEqual([
      'COMPLETE_AUTHORITY_INSPECTION_RECORD',
    ])
  })

  it('the presenter can position, manipulate, present, operate and flag', () => {
    for (const capability of [
      'POSITION_ARTICLE',
      'MANIPULATE_ARTICLE_UNDER_DIRECTION',
      'PRESENT_DOCUMENT_ON_SCREEN',
      'OPERATE_TEST_EQUIPMENT_UNDER_DIRECTION',
      'FLAG_PROBLEM',
    ] as const) {
      expect(can('PRESENTER', capability), capability).toBe(true)
    }
  })

  it('only the inspector directs manipulation and starts or ends the session', () => {
    for (const capability of ['DIRECT_MANIPULATION', 'START_SESSION', 'END_SESSION'] as const) {
      expect(can('INSPECTOR', capability)).toBe(true)
      expect(can('PRESENTER', capability)).toBe(false)
      expect(can('DESIGNATED_REPRESENTATIVE', capability)).toBe(false)
    }
  })

  it('every declared capability is granted to at least one role', () => {
    const granted = new Set(capabilityMatrix().flatMap((row) => row.capabilities))
    expect([...CAPABILITIES].filter((c) => !granted.has(c))).toEqual([])
  })

  it('every determination capability is a declared capability', () => {
    for (const capability of DETERMINATION_CAPABILITIES) {
      expect(CAPABILITIES).toContain(capability)
    }
  })

  it('a caller who mutates the returned set cannot widen the matrix', () => {
    // The return type is ReadonlySet, so this is a compile error as well; the
    // cast is here to prove it does not work at runtime either.
    const set = capabilitiesFor('PRESENTER') as Set<'SIGN_CONFORMITY_RECORD'>
    set.add('SIGN_CONFORMITY_RECORD')
    expect(determinationCapabilitiesFor('PRESENTER')).toEqual([])
    expect([...capabilitiesFor('PRESENTER')]).not.toContain('SIGN_CONFORMITY_RECORD')
  })

  it('requireCapability throws rather than returning a value for an impossible question', () => {
    expect(() => requireCapability('PRESENTER', 'SIGN_CONFORMITY_RECORD')).toThrow(CapabilityError)
    expect(() => requireCapability('INSPECTOR', 'SIGN_CONFORMITY_RECORD')).not.toThrow()
  })
})
