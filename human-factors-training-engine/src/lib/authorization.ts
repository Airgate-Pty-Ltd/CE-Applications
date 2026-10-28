/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

export const TRAINING_MANAGEMENT_ROLES = ['admin', 'trainer', 'qm'] as const;
export const OVERSIGHT_ROLES = ['admin', 'qm', 'supervisor'] as const;

export function hasAnyRole(role: string, allowed: readonly string[]): boolean {
  return allowed.includes(role);
}
