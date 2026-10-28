import type { ScrubRule } from './types.ts'

/**
 * Section 1.2 - the app never renders a compliance opinion.
 *
 * It produces records and surfaces risks. It may quote regulatory text and may
 * state what evidence it captured. It may not conclude that a user, a
 * configuration, or a session satisfies anything.
 *
 * Every pattern isolates its final letter in a character class so the rule
 * source cannot match itself. Without that trick this file would fail its own
 * gate on the first run.
 *
 * A line may opt out with an inline marker naming the rule, for example a
 * verbatim quotation of regulatory text. The marker is deliberately noisy: an
 * opt-out should be visible in review.
 */
export const OPINION_RULES: ScrubRule[] = [
  {
    // Named for the state it describes, not with the banned adjective: a rule id
    // is text in this repository too, and would trip its own pattern.
    id: 'opinion-compliance-state',
    gate: 'opinion',
    rationale:
      'Describes a person, organisation, configuration, or session as having achieved a regulatory state. That is a conclusion the product is not entitled to draw.',
    pattern: /\bcomplian[t]\b/gi,
  },
  {
    id: 'opinion-complies-with',
    gate: 'opinion',
    rationale: 'Asserts that the user has met a regulatory obligation.',
    pattern: /\bcomplie[s] with\b/gi,
  },
  {
    id: 'opinion-in-compliance-with',
    gate: 'opinion',
    rationale: 'Asserts that the user has met a regulatory obligation.',
    pattern: /\bin complianc[e] with\b/gi,
  },
  {
    id: 'opinion-authority-endorsement',
    gate: 'opinion',
    rationale:
      'Claims an authority has blessed the product, the configuration, or the session. No authority has.',
    pattern: /\b(?:approved by (?:the )?FA[A]|FA[A][- ]approved)\b/gi,
  },
  {
    id: 'opinion-satisfies',
    gate: 'opinion',
    rationale: 'Concludes that a regulatory requirement has been met.',
    pattern: /\bsatisfie[s] (?:§|section|clause|part|the requirement)/gi,
  },
  {
    id: 'opinion-meets-the-requirement',
    gate: 'opinion',
    rationale:
      'Concludes that a regulatory requirement has been met. Article-level determinations use the conformity vocabulary instead - conforms, does not conform, not verified.',
    pattern: /\bmeet[s] the requirement/gi,
  },
  {
    id: 'opinion-acceptable-to-authority',
    gate: 'opinion',
    rationale: 'Predicts how an authority will receive the record. The product cannot know that.',
    pattern: /\bacceptabl[e] to (?:the )?(?:FAA|authority|regulator|inspector in charge)/gi,
  },
  {
    id: 'opinion-session-acceptable',
    gate: 'opinion',
    rationale:
      'Grades the session as adequate. The defensibility scorer reports which evidence elements were captured and never grades the session.',
    pattern: /\b(?:session|record|evidence package) is acceptabl[e]\b/gi,
  },
  {
    id: 'opinion-demonstrates-compliance',
    gate: 'opinion',
    rationale: 'Asserts the evidence proves a regulatory conclusion rather than describing it.',
    pattern: /\b(?:demonstrate[s]|certifie[s]|prove[s]|establishe[s]) complianc[e]\b/gi,
  },
  {
    id: 'opinion-regulatory-pass',
    gate: 'opinion',
    rationale: 'Frames a regulation as something the user can pass or fail by using this product.',
    pattern: /\b(?:passe[s]|fail[s]) (?:the )?(?:regulation|audit|inspection by the authority)\b/gi,
  },
]
