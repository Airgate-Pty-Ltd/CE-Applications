/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.HF_INGEST_ROOT) {
    const { startFolderIngestionWorker } = await import('@/services/FolderIngestionWorker');
    startFolderIngestionWorker();
  }
}
