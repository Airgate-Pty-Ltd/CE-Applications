import http from 'http';
import path from 'path';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import type { AddressInfo } from 'net';
import { MaiService } from '../mai/service';
import { createApp } from '../http/app';

// Shared test infrastructure. Everything runs against the REAL Postgres test DB
// provisioned by scripts/setup-test-db.sh, through the real HTTP routes — never
// against kernel memory (acceptance-tests.md requirement).

const HOST_URL =
  process.env.HOST_DATABASE_URL ??
  'postgresql://pma_app:pma_app_pw@127.0.0.1:5432/pma_mai_test';
const KERNEL_URL =
  process.env.MAI_KERNEL_DATABASE_URL ??
  'postgresql://mai_kernel:mai_kernel_pw@127.0.0.1:5432/pma_mai_test';

export const MAIN_DIMS_DIR = path.resolve(__dirname, '..', '..', 'dims');
export const BAD_DIMS_DIR = path.resolve(__dirname, 'fixtures', 'bad-dim-lib');
export const FAULTY_DIMS_DIR = path.resolve(__dirname, 'fixtures', 'faulty-op-lib');

export function makePools() {
  const hostPool = new Pool({ connectionString: HOST_URL });
  const kernelPool = new Pool({ connectionString: KERNEL_URL });
  return { hostPool, kernelPool };
}

export interface RunningApp {
  baseUrl: string;
  service: MaiService;
  close: () => Promise<void>;
}

export async function startApp(opts: {
  hostPool: Pool;
  kernelPool: Pool;
  dimsDir?: string;
  registry?: { fetcher?: any; resolver?: any };
}): Promise<RunningApp> {
  const service = await MaiService.build({
    hostPool: opts.hostPool,
    kernelPool: opts.kernelPool,
    dimsDir: opts.dimsDir ?? MAIN_DIMS_DIR,
  });
  const app = createApp({ service, pool: opts.hostPool, registry: opts.registry });
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    service,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      ),
  };
}

export function newTenant(label: string): string {
  return `tenant-${label}-${randomUUID().slice(0, 8)}`;
}

// Minimal typed fetch helpers carrying tenant/user context headers.
export interface ApiClient {
  post: (path: string, body?: unknown) => Promise<{ status: number; json: any }>;
  patch: (path: string, body?: unknown) => Promise<{ status: number; json: any }>;
  get: (path: string) => Promise<{ status: number; json: any }>;
}

export function client(
  baseUrl: string,
  tenantId: string,
  userId = 'u-test',
  role: 'PREPARER' | 'REVIEWER' | 'ADMIN' = 'ADMIN',
): ApiClient {
  const headers = {
    'content-type': 'application/json',
    'x-tenant-id': tenantId,
    'x-user-id': userId,
    'x-user-role': role,
  };
  const call = async (method: string, p: string, body?: unknown) => {
    const res = await fetch(baseUrl + p, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, json: text ? JSON.parse(text) : null };
  };
  return {
    post: (p, b) => call('POST', p, b),
    patch: (p, b) => call('PATCH', p, b),
    get: (p) => call('GET', p),
  };
}

// Anonymous / bearer-token client for auth-flow tests.
export function bearer(baseUrl: string, token?: string): ApiClient {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const call = async (method: string, p: string, body?: unknown) => {
    const res = await fetch(baseUrl + p, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, json: text ? JSON.parse(text) : null };
  };
  return {
    post: (p, b) => call('POST', p, b),
    patch: (p, b) => call('PATCH', p, b),
    get: (p) => call('GET', p),
  };
}
