/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { spawnSync } from 'node:child_process';
import { KERNEL_PROVENANCE } from '@/lib/kernelProvenance';
import { validateAuthorityProfile } from '@/services/MaiDecisionAdapter';

describe('verified M-AI Kernel package contract', () => {
  test('loads the public Kernel API from the internal vendor dependency', () => {
    const probe = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '--eval',
        "const kernel = await import('@mai/kernel'); if (typeof kernel.MAIKernel !== 'function' || typeof kernel.hashSnapshot !== 'function' || typeof kernel.evaluate !== 'function' || typeof kernel.validateEntityRef !== 'function') process.exit(2);",
      ],
      { cwd: process.cwd(), encoding: 'utf8' },
    );

    expect(probe.stderr).toBe('');
    expect(probe.status).toBe(0);
  });

  test('reports the pinned source identity', () => {
    expect(KERNEL_PROVENANCE.packageName).toBe('@mai/kernel');
    expect(KERNEL_PROVENANCE.packageVersion).toBe('0.2.0-5f');
    expect(KERNEL_PROVENANCE.sourceGitSha).toBe('ba2a1cf112839c671c8aabc83cf14f19a4c8a08a');
    expect(KERNEL_PROVENANCE.packageTreeSha256).toBe(
      '1DC5EDC4AD451932B88235CCAB835B236DAAFE7218A9CE00611B75B0922FD5F2',
    );
    expect(KERNEL_PROVENANCE.runtimeTreeSha256).toBe(
      'FD2D42A3877B1CB834EA31BC402B89C164260A55830DC91FD095B3CF7B0A5A0A',
    );
  });

  test('validates authority profiles through the HF-owned adapter', () => {
    const errors = validateAuthorityProfile({
      authorityProfileId: 'hf-preparation-v1',
      version: 1,
      effectiveDate: '2026-08-13T00:00:00.000Z',
      approvedBy: 'quality-manager',
      trustedSourceClasses: ['VALIDATED_INTERNAL'],
      permittedBehaviors: ['PREPARE'],
      humanApprovalPerInstance: false,
      constraints: ['human-release-required'],
      escalateWhen: ['authority-conflict'],
    });

    expect(errors).toHaveLength(0);
  });
});
