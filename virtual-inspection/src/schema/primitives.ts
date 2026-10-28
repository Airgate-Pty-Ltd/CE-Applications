import { z } from 'zod'

/**
 * Shared primitives.
 *
 * Every identifier in this product is a value the customer supplies. Nothing
 * here carries a default that names a real organisation, person, document or
 * office - see the clean-room gate in tools/scrub.
 */

export const IsoDateTime = z.string().datetime({ offset: true })
export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD')

/** Opaque, customer-scoped identifiers. */
export const PersonId = z.string().min(1)
export const LocationId = z.string().min(1)
export const ArticleId = z.string().min(1)
export const SessionId = z.string().min(1)
export const ToolId = z.string().min(1)
export const CheckId = z.string().min(1)

/**
 * The conformity vocabulary.
 *
 * Deliberately not "pass"/"fail" and deliberately not "meets requirement".
 * An inspector determines whether an article conforms to a defined
 * characteristic. They do not adjudicate a regulation, and the product does not
 * let its vocabulary suggest otherwise. See DESIGN-NOTES.md, gate 2.
 */
export const Determination = z.enum(['CONFORMS', 'DOES_NOT_CONFORM', 'NOT_VERIFIED'])
export type Determination = z.infer<typeof Determination>

export const Severity = z.enum(['BLOCK', 'WARN'])
export type Severity = z.infer<typeof Severity>

export type IsoDateTime = z.infer<typeof IsoDateTime>
export type IsoDate = z.infer<typeof IsoDate>
