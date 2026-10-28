// Shared constants and types for PMA Autopilot.
// Kept deliberately small — the authoritative source of truth for records is the
// Prisma schema; this file holds cross-cutting strings the spec makes non-negotiable.

// ─── Regulatory scope (spec §1) — do not expand without explicit instruction ────
export const REGULATORY_SCOPE = {
  authority: 'FAA',
  parts: ['14 CFR Part 21, Subpart K'],
  advisoryCirculars: ['AC 21.303-4 (3/21/14)'],
} as const;

// ─── Watermark & submission-status language (spec §2, §7, §11) ──────────────────
// Every generated file carries this until a human exports it for their own use.
export const DRAFT_WATERMARK =
  'DRAFT FOR INTERNAL REVIEW ONLY — NOT FOR FAA SUBMISSION';

// The tool never states or implies a package is submission-ready.
export const SUBMISSION_STATUSES = ['DRAFTED', 'DRAFTED_WITH_GAPS', 'BLOCKED'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

// Placeholder convention for missing data — never invent a value (constraint §11).
export const CONFIRM_PLACEHOLDER = (label: string) => `[CONFIRM: ${label}]`;

// ─── M-AI terminology discipline (spec §4a, §11) ────────────────────────────────
// What the UI shows the preparer. NEVER "AI finding", "AI decision", or a numeric score.
export const SYSTEM_DETECTED_CONDITION_LABEL = 'System-Detected Condition';
export const MAI_HEADER_BADGE =
  'M-AI active — advisory only. Human authority controls all decisions.';
export const DATA_CONFIDENCE_LEVELS = ['high', 'medium', 'low'] as const;
export type DataConfidence = (typeof DATA_CONFIDENCE_LEVELS)[number];

// ─── Case lifecycle (mirrors Prisma CaseStatus) ─────────────────────────────────
export const CASE_STATUSES = [
  'INTAKE',
  'GAP_REVIEW',
  'DRAFTING',
  'UNDER_REVIEW',
  'READY_FOR_SIGNATURE',
  'EXPORTED',
  'ARCHIVED',
] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

// ─── Approval basis (mirrors Prisma ApprovalBasis) ──────────────────────────────
export const APPROVAL_BASES = [
  'STC_IDENTICALITY',
  'TC_LICENSED',
  'IDENTICALITY_NO_LICENSE',
  'TEST_AND_COMPUTATION',
  'AMBIGUOUS',
] as const;
export type ApprovalBasis = (typeof APPROVAL_BASES)[number];

export const USER_ROLES = ['PREPARER', 'REVIEWER', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];
