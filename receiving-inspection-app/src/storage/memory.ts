import {
  LockHeldError,
  ObjectNotFoundError,
  VersionConflictError,
  type LockInfo,
  type PutOptions,
  type StorageProvider,
  type StoredObject,
} from './provider';

/**
 * In-memory provider. Backs dev, single-user mode, and the contract suite.
 *
 * Versions are a monotonic counter rather than a hash or a timestamp: the
 * engine and the storage layer must be reproducible under test, and a clock or
 * a random token would make two identical runs differ.
 */
export class MemoryStorageProvider implements StorageProvider {
  readonly name = 'memory';

  private readonly objects = new Map<string, StoredObject[]>();
  private readonly locks = new Map<string, LockInfo>();
  private counter = 0;

  private nextVersion(): string {
    this.counter += 1;
    return `v${this.counter}`;
  }

  async put(key: string, body: string, options: PutOptions): Promise<StoredObject> {
    const revisions = this.objects.get(key);
    const current = revisions?.[revisions.length - 1];

    if (options.expectedVersion === undefined) {
      if (current !== undefined) {
        throw new VersionConflictError(key, undefined, current.version);
      }
    } else if (current === undefined || current.version !== options.expectedVersion) {
      throw new VersionConflictError(key, options.expectedVersion, current?.version);
    }

    const stored: StoredObject = {
      key,
      version: this.nextVersion(),
      contentType: options.contentType,
      body,
      metadata: { ...(options.metadata ?? {}) },
      writtenAt: options.now,
    };

    this.objects.set(key, [...(revisions ?? []), stored]);
    return stored;
  }

  async get(key: string): Promise<StoredObject> {
    const revisions = this.objects.get(key);
    const current = revisions?.[revisions.length - 1];
    if (current === undefined) throw new ObjectNotFoundError(key);
    return current;
  }

  async list(prefix: string): Promise<string[]> {
    return [...this.objects.keys()].filter((k) => k.startsWith(prefix)).sort();
  }

  async lock(key: string, holder: string, ttlMinutes: number, now: string): Promise<LockInfo> {
    const existing = await this.peekLock(key, now);
    if (existing !== null && existing.holder !== holder) {
      throw new LockHeldError(key, existing);
    }

    const lock: LockInfo = {
      key,
      holder,
      acquiredAt: existing?.acquiredAt ?? now,
      expiresAt: addMinutes(now, ttlMinutes),
    };
    this.locks.set(key, lock);
    return lock;
  }

  async unlock(key: string, holder: string, now: string): Promise<void> {
    const existing = await this.peekLock(key, now);
    if (existing === null) return;
    if (existing.holder !== holder) throw new LockHeldError(key, existing);
    this.locks.delete(key);
  }

  async peekLock(key: string, now: string): Promise<LockInfo | null> {
    const lock = this.locks.get(key);
    if (lock === undefined) return null;
    /* Expiry is why a dead tablet cannot block the receiving dock. */
    if (lock.expiresAt <= now) {
      this.locks.delete(key);
      return null;
    }
    return lock;
  }

  async history(key: string): Promise<StoredObject[]> {
    return [...(this.objects.get(key) ?? [])];
  }
}

/** ISO timestamp arithmetic without reading the clock. */
export function addMinutes(isoTimestamp: string, minutes: number): string {
  const base = Date.parse(isoTimestamp);
  if (Number.isNaN(base)) {
    throw new Error(`Invalid ISO timestamp: "${isoTimestamp}"`);
  }
  return new Date(base + minutes * 60_000).toISOString();
}
