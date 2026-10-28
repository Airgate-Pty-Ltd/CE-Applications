/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { deriveEventStructure } from '../eventStructuring';

describe('deriveEventStructure() — WP-4.1 structured HF event intake', () => {
  test('inherits evidence themes when no override is given', () => {
    const result = deriveEventStructure({ themes: ['fatigue', 'procedural_compliance'] }, {});
    expect(result.themes).toEqual(['fatigue', 'procedural_compliance']);
    expect(result.rolesExposed).toEqual([]);
    expect(result.sitesExposed).toEqual([]);
  });

  test('QM-supplied themes override evidence themes entirely (not merged)', () => {
    const result = deriveEventStructure({ themes: ['fatigue'] }, { themes: ['procedural_compliance', 'communication'] });
    expect(result.themes).toEqual(['procedural_compliance', 'communication']);
  });

  test('an explicit empty-array override clears themes rather than falling back to evidence', () => {
    const result = deriveEventStructure({ themes: ['fatigue'] }, { themes: [] });
    expect(result.themes).toEqual([]);
  });

  test('rolesExposed and sitesExposed pass through when supplied', () => {
    const result = deriveEventStructure({ themes: [] }, { rolesExposed: ['night_shift_mechanic'], sitesExposed: ['brisbane'] });
    expect(result.rolesExposed).toEqual(['night_shift_mechanic']);
    expect(result.sitesExposed).toEqual(['brisbane']);
  });

  test('sanitizes: trims whitespace and drops blank entries, never fabricates a value', () => {
    const result = deriveEventStructure({ themes: [] }, { themes: ['  fatigue  ', '', '   '], rolesExposed: ['mechanic', ''] });
    expect(result.themes).toEqual(['fatigue']);
    expect(result.rolesExposed).toEqual(['mechanic']);
  });

  test('non-array input is treated as absent, never throws', () => {
    const result = deriveEventStructure({ themes: 'not-an-array' as unknown as string[] }, {});
    expect(result.themes).toEqual([]);
  });
});
