/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import 'dotenv/config';
import { prisma } from '../src/lib/db';
import { folderWorkerConfig, scanIngestionFolderOnce } from '../src/services/FolderIngestionWorker';

const once = process.argv.includes('--once');
const config = folderWorkerConfig();
let stopping = false;
process.on('SIGINT', () => { stopping = true; });
process.on('SIGTERM', () => { stopping = true; });

try {
  do {
    await scanIngestionFolderOnce(config);
    if (once || stopping) break;
    await new Promise((resolve) => setTimeout(resolve, config.intervalMs));
  } while (!stopping);
} finally {
  await prisma.$disconnect();
}
