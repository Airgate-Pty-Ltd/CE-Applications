/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 */

import 'dotenv/config';
import crypto from 'node:crypto';
import { lstat, mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

type ConnectorConfig = {
  root: string;
  statePath: string;
  endpoint: URL;
  token: string;
  intervalMs: number;
  classification: string;
  recordType: 'organizational_data' | 'evidence';
};

type ConnectorState = { version: 1; uploadedHashes: Record<string, { uploadedAt: string; relativePath: string; status: string }> };

function config(): ConnectorConfig {
  const required = ['HF_CONNECTOR_ROOT', 'HF_CONNECTOR_STATE_PATH', 'HF_HOSTED_URL', 'HF_CONNECTOR_TOKEN'] as const;
  for (const name of required) if (!process.env[name]) throw new Error(`${name} is required.`);
  const root = path.resolve(process.env.HF_CONNECTOR_ROOT!);
  const statePath = path.resolve(process.env.HF_CONNECTOR_STATE_PATH!);
  const stateRelative = path.relative(root, statePath);
  if (stateRelative === '' || (!stateRelative.startsWith(`..${path.sep}`) && stateRelative !== '..')) {
    throw new Error('HF_CONNECTOR_STATE_PATH must be outside the watched source folder.');
  }
  const baseUrl = new URL(process.env.HF_HOSTED_URL!);
  if (baseUrl.protocol !== 'https:' && !['localhost', '127.0.0.1', '::1'].includes(baseUrl.hostname)) {
    throw new Error('HF_HOSTED_URL must use HTTPS except for a local test endpoint.');
  }
  const intervalMs = Number(process.env.HF_CONNECTOR_POLL_MS || 15_000);
  if (!Number.isSafeInteger(intervalMs) || intervalMs < 5_000 || intervalMs > 3_600_000) {
    throw new Error('HF_CONNECTOR_POLL_MS must be an integer between 5000 and 3600000.');
  }
  return {
    root,
    statePath,
    endpoint: new URL('/api/connectors/ingest', baseUrl),
    token: process.env.HF_CONNECTOR_TOKEN!,
    intervalMs,
    classification: process.env.HF_CONNECTOR_CLASSIFICATION || 'INTERNAL',
    recordType: process.env.HF_CONNECTOR_RECORD_TYPE === 'evidence' ? 'evidence' : 'organizational_data',
  };
}

async function enumerate(root: string, folder = root, depth = 0): Promise<string[]> {
  if (depth > 10) return [];
  const results: string[] = [];
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name.endsWith('.tmp') || entry.name.endsWith('.partial')) continue;
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

async function loadState(statePath: string): Promise<ConnectorState> {
  try {
    const parsed = JSON.parse(await readFile(statePath, 'utf8')) as ConnectorState;
    if (parsed.version !== 1 || !parsed.uploadedHashes || typeof parsed.uploadedHashes !== 'object') {
      throw new Error('Unsupported connector state format.');
    }
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { version: 1, uploadedHashes: {} };
    throw error;
  }
}

async function saveState(statePath: string, state: ConnectorState): Promise<void> {
  await mkdir(path.dirname(statePath), { recursive: true });
  const temporary = `${statePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(state, null, 2), { flag: 'wx', mode: 0o600 });
  await rename(temporary, statePath);
}

export async function uploadFolderOnce(configuration = config()): Promise<{ uploaded: number; skipped: number }> {
  const rootMetadata = await stat(configuration.root);
  if (!rootMetadata.isDirectory()) throw new Error(`HF_CONNECTOR_ROOT is not a directory: ${configuration.root}`);
  const state = await loadState(configuration.statePath);
  let uploaded = 0;
  let skipped = 0;

  for (const absolute of await enumerate(configuration.root)) {
    const before = await stat(absolute);
    if (before.size <= 0 || Date.now() - before.mtimeMs < 2_000) { skipped += 1; continue; }
    const content = await readFile(absolute);
    const after = await stat(absolute);
    if (before.size !== after.size || before.mtimeMs !== after.mtimeMs) { skipped += 1; continue; }
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    if (state.uploadedHashes[hash]) { skipped += 1; continue; }

    const relativePath = path.relative(configuration.root, absolute).split(path.sep).join('/');
    const form = new FormData();
    form.set('file', new Blob([new Uint8Array(content)]), path.basename(absolute));
    form.set('relativePath', relativePath);
    form.set('sourceFileModifiedAt', before.mtime.toISOString());
    form.set('classification', configuration.classification);
    form.set('recordType', configuration.recordType);
    const response = await fetch(configuration.endpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${configuration.token}` },
      body: form,
    });
    const responseBody = await response.json().catch(() => ({})) as { status?: string; error?: string };
    if (![200, 201, 422].includes(response.status)) {
      throw new Error(`Hosted ingestion failed for ${relativePath}: HTTP ${response.status} ${responseBody.error || ''}`.trim());
    }
    state.uploadedHashes[hash] = {
      uploadedAt: new Date().toISOString(),
      relativePath,
      status: responseBody.status || `HTTP_${response.status}`,
    };
    await saveState(configuration.statePath, state);
    uploaded += 1;
  }
  return { uploaded, skipped };
}

const isMain = process.argv[1] && path.basename(process.argv[1]).toLowerCase() === 'hosted-folder-connector.ts';
async function main(): Promise<void> {
  const configuration = config();
  const once = process.argv.includes('--once');
  let stopping = false;
  process.on('SIGINT', () => { stopping = true; });
  process.on('SIGTERM', () => { stopping = true; });
  do {
    const result = await uploadFolderOnce(configuration);
    console.log(JSON.stringify({ checkedAt: new Date().toISOString(), ...result }));
    if (once || stopping) break;
    await new Promise((resolve) => setTimeout(resolve, configuration.intervalMs));
  } while (!stopping);
}

if (isMain) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
