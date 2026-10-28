/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import {
  createGovernedDecision as createKernelGovernedDecision,
  validateAuthorityProfile as validateKernelAuthorityProfile,
  type AuthorityProfile,
  type GovernedDecision,
} from '@mai/kernel/decision';

export type { AuthorityProfile, GovernedDecision };

/**
 * HF-owned compatibility boundary around the immutable Kernel package.
 * Host persistence, tenant resolution, and workflow policy remain outside the Kernel.
 */
export function validateAuthorityProfile(profile: AuthorityProfile): readonly string[] {
  return validateKernelAuthorityProfile(profile);
}

export function createGovernedDecision(decision: GovernedDecision): GovernedDecision {
  return createKernelGovernedDecision(decision);
}
