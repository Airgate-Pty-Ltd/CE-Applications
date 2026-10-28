/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 */

import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, mkdir, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { uploadFolderOnce } from '../../../scripts/hosted-folder-connector';

describe('hosted folder connector agent', () => {
  let temporaryRoot: string;
  let incoming: string;
  let sourcePath: string;
  let statePath: string;
  let server: http.Server;
  let endpoint: URL;
  let received = 0;
  let authorization = '';

  beforeAll(async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'hf-hosted-connector-test-'));
    incoming = path.join(temporaryRoot, 'incoming');
    statePath = path.join(temporaryRoot, 'state', 'ledger.json');
    await mkdir(incoming);
    sourcePath = path.join(incoming, 'training.csv');
    await writeFile(sourcePath, 'employee_id,role\nEMP-1,technician\n');
    const stableTime = new Date(Date.now() - 10_000);
    await utimes(sourcePath, stableTime, stableTime);
    server = http.createServer((request, response) => {
      received += 1;
      authorization = request.headers.authorization || '';
      request.resume();
      request.on('end', () => {
        response.writeHead(201, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ status: 'ACCEPTED' }));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server did not bind.');
    endpoint = new URL(`http://127.0.0.1:${address.port}/api/connectors/ingest`);
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await rm(temporaryRoot, { recursive: true, force: true });
  });

  test('uploads once, writes its ledger outside the source, and never modifies the source file', async () => {
    const before = await stat(sourcePath);
    const configuration = {
      root: incoming,
      statePath,
      endpoint,
      token: 'hfc_test-only-connector-token-with-enough-length-123',
      intervalMs: 5_000,
      classification: 'INTERNAL',
      recordType: 'organizational_data' as const,
    };
    expect(await uploadFolderOnce(configuration)).toEqual({ uploaded: 1, skipped: 0 });
    expect(await uploadFolderOnce(configuration)).toEqual({ uploaded: 0, skipped: 1 });
    expect(received).toBe(1);
    expect(authorization).toBe(`Bearer ${configuration.token}`);
    expect(await readFile(sourcePath, 'utf8')).toContain('EMP-1');
    const after = await stat(sourcePath);
    expect(after.mtimeMs).toBe(before.mtimeMs);
    expect(path.relative(incoming, statePath).startsWith('..')).toBe(true);
    expect(JSON.parse(await readFile(statePath, 'utf8')).version).toBe(1);
  });
});
