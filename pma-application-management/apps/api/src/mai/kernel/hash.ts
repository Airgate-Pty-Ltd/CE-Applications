import { createHash } from 'crypto';

// The SINGLE canonical hash function for the kernel (design law 6).
// Placeholder hashes are prohibited. Every event snapshot_hash, and every
// assessment row_hash, is produced here and nowhere else.

// Canonical JSON: object keys sorted recursively, arrays in order, primitives as
// JSON. This makes the hash invariant to key ordering so the SAME record data
// always yields the SAME hash (idempotency, AT-02, AT-10).
export function canonicalize(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sortValue);
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    out[key] = sortValue(obj[key]);
  }
  return out;
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

// Hash a snapshot's DATA (never capturedAt — that would break idempotency).
export function hashSnapshot(data: unknown): string {
  return sha256Hex(canonicalize(data));
}
