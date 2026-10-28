/**
 * The status banner printed on every page of a generated document.
 *
 * This is the single definition. The CI claim gate re-exports it rather than
 * keeping a second copy, because two lists of "the allowed banners" would drift
 * and the drift would not be visible until an FAA reader saw the wrong one.
 *
 * There is deliberately no fourth value. Any string implying the package is
 * acceptable to the FAA is blocked by the claim gate — the FAA managing office
 * makes that determination, not this software.
 */
export const ALLOWED_STATUS_BANNERS = [
  'DRAFT — INTERNAL REVIEW ONLY',
  'DRAFTED WITH GAPS',
  'BLOCKED',
] as const

export type StatusBanner = (typeof ALLOWED_STATUS_BANNERS)[number]

export function isAllowedBanner(value: string): value is StatusBanner {
  return (ALLOWED_STATUS_BANNERS as readonly string[]).includes(value)
}
