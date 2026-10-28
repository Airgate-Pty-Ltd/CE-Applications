/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

/**
 * Single source of truth for the version + copyright stamp shown in the app UI footer
 * and embedded in every dossier/BOM/report export. Keep in sync with package.json's
 * "version" field manually — Next.js's client bundle cannot read package.json at
 * runtime without a build-time env var, so this is set explicitly rather than imported.
 */
export const APP_VERSION = '1.1.0';
export const COPYRIGHT_HOLDER = 'Conform-Edge Quality Consulting LLC';
export const COPYRIGHT_YEAR = 2026;

export function copyrightLine(): string {
  return `Copyright © ${COPYRIGHT_YEAR} ${COPYRIGHT_HOLDER}. All rights reserved.`;
}

export function versionStamp(): string {
  return `HF-ENGINE v${APP_VERSION} — ${copyrightLine()}`;
}

/**
 * Stamp object for embedding in structured exports (dossier JSON, report metadata, etc.)
 * — machine-readable form of the same information.
 */
export function versionStampMeta(): {
  version: string;
  copyrightHolder: string;
  copyrightYear: number;
  generatedAt: string;
} {
  return {
    version: APP_VERSION,
    copyrightHolder: COPYRIGHT_HOLDER,
    copyrightYear: COPYRIGHT_YEAR,
    generatedAt: new Date().toISOString(),
  };
}
