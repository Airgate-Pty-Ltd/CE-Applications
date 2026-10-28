/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import rawProvenance from '../../vendor/m-ai-kernel/ba2a1cf-f81fbf10/PROVENANCE.json';

export interface KernelProvenance {
  schemaVersion: number;
  packageName: string;
  packageVersion: string;
  sourceRepository: string;
  sourcePath: string;
  sourceBranch: string;
  sourceGitSha: string;
  sourceMasterFileManifestSha256: string;
  packageTreeSha256: string;
  packageFileCount: number;
  runtimeTreeSha256: string;
  runtimeFileCount: number;
  runtimeBuild: string;
  runtimePackaging: string;
  runtimeVerification: string;
  copiedAt: string;
  copiedFrom: string;
  copyVerificationDifferenceCount: number;
  mutationPolicy: string;
}

export const KERNEL_PROVENANCE = Object.freeze(rawProvenance as KernelProvenance);
