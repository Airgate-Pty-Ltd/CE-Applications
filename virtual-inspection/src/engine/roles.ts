import type { SessionRole } from '../schema/roster.ts'

/**
 * The role model, enforced by capability rather than by label.
 *
 * The presenter's inability to determine conformity is the single structural
 * claim this product makes about itself. It is not a disabled button and not a
 * policy in a manual: there is no capability for the presenter UI to render a
 * determination control from, so the control cannot exist.
 *
 * Everything here is data. `capabilitiesFor` is the only way any surface in the
 * app learns what a role may do, so a capability granted here is granted
 * everywhere and a capability absent here is absent everywhere.
 */

export const CAPABILITIES = [
  // --- determination capabilities -------------------------------------------
  'DETERMINE_CONFORMITY',
  'RAISE_NONCONFORMANCE',
  'DISPOSITION_NONCONFORMING_ARTICLE',
  'SIGN_CONFORMITY_RECORD',
  'GRANT_APPROVAL',
  'WITHHOLD_APPROVAL',
  'SELECT_INTERRUPTION_RECOVERY',
  'OVERRIDE_CONTROL_THRESHOLD',
  'COMPLETE_AUTHORITY_INSPECTION_RECORD',
  // --- conduct-of-session capabilities --------------------------------------
  'START_SESSION',
  'END_SESSION',
  'DIRECT_MANIPULATION',
  'REQUEST_DOCUMENT_ON_SCREEN',
  // --- presentation capabilities --------------------------------------------
  'JOIN_SESSION',
  'POSITION_ARTICLE',
  'MANIPULATE_ARTICLE_UNDER_DIRECTION',
  'PRESENT_DOCUMENT_ON_SCREEN',
  'OPERATE_TEST_EQUIPMENT_UNDER_DIRECTION',
  'FLAG_PROBLEM',
] as const

export type Capability = (typeof CAPABILITIES)[number]

/**
 * The capabilities that constitute a determination.
 *
 * Section 2.3: the inspector is the sole holder of every determination
 * capability, save that a designated representative may complete an authority
 * inspection record where the customer uses one.
 */
export const DETERMINATION_CAPABILITIES: readonly Capability[] = [
  'DETERMINE_CONFORMITY',
  'RAISE_NONCONFORMANCE',
  'DISPOSITION_NONCONFORMING_ARTICLE',
  'SIGN_CONFORMITY_RECORD',
  'GRANT_APPROVAL',
  'WITHHOLD_APPROVAL',
  'SELECT_INTERRUPTION_RECOVERY',
  'OVERRIDE_CONTROL_THRESHOLD',
  'COMPLETE_AUTHORITY_INSPECTION_RECORD',
]

const INSPECTOR: readonly Capability[] = [
  ...DETERMINATION_CAPABILITIES,
  'START_SESSION',
  'END_SESSION',
  'DIRECT_MANIPULATION',
  'REQUEST_DOCUMENT_ON_SCREEN',
  'JOIN_SESSION',
  'FLAG_PROBLEM',
]

/**
 * The presenter positions and manipulates the article, presents documents and
 * test setups, and operates test equipment under direction.
 *
 * Read the list. Nothing in it decides anything.
 */
const PRESENTER: readonly Capability[] = [
  'JOIN_SESSION',
  'POSITION_ARTICLE',
  'MANIPULATE_ARTICLE_UNDER_DIRECTION',
  'PRESENT_DOCUMENT_ON_SCREEN',
  'OPERATE_TEST_EQUIPMENT_UNDER_DIRECTION',
  'FLAG_PROBLEM',
]

const DESIGNATED_REPRESENTATIVE: readonly Capability[] = [
  'JOIN_SESSION',
  'COMPLETE_AUTHORITY_INSPECTION_RECORD',
]

const MATRIX: Readonly<Record<SessionRole, readonly Capability[]>> = {
  INSPECTOR,
  PRESENTER,
  DESIGNATED_REPRESENTATIVE,
}

export function capabilitiesFor(role: SessionRole): ReadonlySet<Capability> {
  return new Set(MATRIX[role])
}

export function can(role: SessionRole, capability: Capability): boolean {
  return MATRIX[role].includes(capability)
}

/** Determination capabilities held by a role. Must be empty for the presenter. */
export function determinationCapabilitiesFor(role: SessionRole): Capability[] {
  return DETERMINATION_CAPABILITIES.filter((c) => MATRIX[role].includes(c))
}

/**
 * Rendered by test-dashboard panel 3, which asserts the presenter row's
 * determination set is provably empty rather than merely observed to be.
 */
export function capabilityMatrix(): Array<{
  role: SessionRole
  capabilities: Capability[]
  determinationCapabilities: Capability[]
}> {
  return (Object.keys(MATRIX) as SessionRole[]).map((role) => ({
    role,
    capabilities: [...MATRIX[role]],
    determinationCapabilities: determinationCapabilitiesFor(role),
  }))
}

/**
 * Thrown rather than returned. A surface asking whether a presenter may sign has
 * already gone wrong; there is no sensible value to hand back.
 */
export class CapabilityError extends Error {
  constructor(role: SessionRole, capability: Capability) {
    super(`role ${role} does not hold capability ${capability}`)
    this.name = 'CapabilityError'
  }
}

export function requireCapability(role: SessionRole, capability: Capability): void {
  if (!can(role, capability)) throw new CapabilityError(role, capability)
}
