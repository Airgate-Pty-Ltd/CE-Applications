/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { lstat, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@/lib/db';
import { maximumIngestionBytes, OrganizationFileIngestion } from '@/services/OrganizationFileIngestion';
import { scanFileForMalware } from '@/services/MalwareScanner';

type FolderWorkerConfig = {
  root: string;
  organizationId: string;
  sourceName: string;
  intervalMs: number;
  recordType: 'organizational_data' | 'evidence';
  classification: string;
};

const workerGlobal = globalThis as typeof globalThis & { __hfFolderWorkerStarted?: boolean };

export function folderWorkerConfig(): FolderWorkerConfig {
  if (!process.env.HF_INGEST_ROOT) {
    throw new Error('HF_INGEST_ROOT is required. The worker will never choose a folder implicitly.');
  }
  if (!process.env.HF_INGEST_ORGANIZATION_ID) {
    throw new Error('HF_INGEST_ORGANIZATION_ID is required. The worker will never choose an organization implicitly.');
  }
  const intervalMs = Number(process.env.HF_INGEST_POLL_MS || 15_000);
  if (!Number.isSafeInteger(intervalMs) || intervalMs < 5_000 || intervalMs > 3_600_000) {
    throw new Error('HF_INGEST_POLL_MS must be an integer between 5000 and 3600000.');
  }
  return {
    root: path.resolve(process.env.HF_INGEST_ROOT),
    organizationId: process.env.HF_INGEST_ORGANIZATION_ID,
    sourceName: process.env.HF_INGEST_SOURCE_NAME || 'training-department-folder',
    intervalMs,
    recordType: process.env.HF_INGEST_RECORD_TYPE === 'evidence' ? 'evidence' : 'organizational_data',
    classification: process.env.HF_INGEST_CLASSIFICATION || 'INTERNAL',
  };
}

async function enumerate(root: string, folder: string, depth = 0): Promise<string[]> {
  if (depth > 10) return [];
  const entries = await readdir(folder, { withFileTypes: true });
  const results: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const absolute = path.resolve(folder, entry.name);
    const relative = path.relative(root, absolute);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) continue;
    const metadata = await lstat(absolute);
    if (metadata.isSymbolicLink()) continue;
    if (metadata.isDirectory()) results.push(...await enumerate(root, absolute, depth + 1));
    else if (metadata.isFile()) results.push(absolute);
  }
  return results;
}

export async function scanIngestionFolderOnce(config = folderWorkerConfig()) {
  const rootMetadata = await stat(config.root);
  if (!rootMetadata.isDirectory()) throw new Error(`HF_INGEST_ROOT is not a directory: ${config.root}`);
  const organization = await prisma.organization.findFirst({
    where: { id: config.organizationId, isActive: true },
  });
  if (!organization) throw new Error(`Active organization not found: ${config.organizationId}`);
  const source = await prisma.ingestionSource.upsert({
    where: { organizationId_name: { organizationId: config.organizationId, name: config.sourceName } },
    create: {
      organizationId: config.organizationId,
      name: config.sourceName,
      mode: 'server_folder',
      folderPath: config.root,
    },
    update: { mode: 'server_folder', folderPath: config.root, isEnabled: true },
  });

  for (const absolute of await enumerate(config.root, config.root)) {
    try {
      const before = await stat(absolute);
      if (before.size <= 0 || before.size > maximumIngestionBytes()) continue;
      if (Date.now() - before.mtimeMs < 2_000) continue;
      const scan = await scanFileForMalware(absolute);
      const after = await stat(absolute);
      if (before.size !== after.size || before.mtimeMs !== after.mtimeMs) continue;
      const content = await readFile(absolute);
      const relativePath = path.relative(config.root, absolute).split(path.sep).join('/');
      const result = await new OrganizationFileIngestion(prisma).ingest({
        organizationId: config.organizationId,
        sourceId: source.id,
        relativePath,
        originalName: path.basename(absolute),
        content,
        scan,
        createdBy: 'system:folder-worker',
        recordType: config.recordType,
        classification: config.classification,
        sourceFileModifiedAt: after.mtime,
      });
      console.info(JSON.stringify({ event: 'file_ingested', relativePath, fileId: result.file.id, status: result.file.status, duplicate: result.duplicate }));
    } catch (error) {
      console.error(JSON.stringify({ event: 'file_ingestion_failed', file: path.relative(config.root, absolute), error: error instanceof Error ? error.message : String(error) }));
    }
  }
}

export function startFolderIngestionWorker(): void {
  if (!process.env.HF_INGEST_ROOT || workerGlobal.__hfFolderWorkerStarted) return;
  workerGlobal.__hfFolderWorkerStarted = true;
  const config = folderWorkerConfig();
  const run = async () => {
    try {
      await scanIngestionFolderOnce(config);
    } catch (error) {
      console.error('[folder-ingestion-worker]', error);
    } finally {
      const timer = setTimeout(run, config.intervalMs);
      timer.unref();
    }
  };
  void run();
}
