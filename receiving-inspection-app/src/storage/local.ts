import Dexie, { type Table } from 'dexie';
import {
  LockHeldError,
  ObjectNotFoundError,
  VersionConflictError,
  type LockInfo,
  type PutOptions,
  type StorageProvider,
  type StoredObject,
} from './provider';
import { addMinutes } from './memory';

/**
 * IndexedDB provider, via Dexie. Dev and single-user mode, and the durable
 * backing store for the offline sync queue.
 *
 * Same contract as every other provider — run `runProviderContract` against it
 * in a browser to confirm. It is not exercised in the node test run because
 * jsdom has no IndexedDB; the test dashboard covers it where it actually runs.
 */

interface ObjectRow {
  id?: number;
  key: string;
  version: string;
  contentType: string;
  body: string;
  metadata: Record<string, string>;
  writtenAt: string;
  sequence: number;
}

interface LockRow {
  key: string;
  holder: string;
  acquiredAt: string;
  expiresAt: string;
}

class LocalDatabase extends Dexie {
  objects!: Table<ObjectRow, number>;
  locks!: Table<LockRow, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      objects: '++id, key, sequence',
      locks: 'key',
    });
  }
}

export class LocalStorageProvider implements StorageProvider {
  readonly name = 'local';
  private readonly db: LocalDatabase;

  constructor(databaseName = 'receiving-inspection') {
    this.db = new LocalDatabase(databaseName);
  }

  private async currentRow(key: string): Promise<ObjectRow | undefined> {
    const rows = await this.db.objects.where('key').equals(key).sortBy('sequence');
    return rows[rows.length - 1];
  }

  private static toStored(row: ObjectRow): StoredObject {
    return {
      key: row.key,
      version: row.version,
      contentType: row.contentType,
      body: row.body,
      metadata: row.metadata,
      writtenAt: row.writtenAt,
    };
  }

  async put(key: string, body: string, options: PutOptions): Promise<StoredObject> {
    return this.db.transaction('rw', this.db.objects, async () => {
      const current = await this.currentRow(key);

      if (options.expectedVersion === undefined) {
        if (current !== undefined) throw new VersionConflictError(key, undefined, current.version);
      } else if (current === undefined || current.version !== options.expectedVersion) {
        throw new VersionConflictError(key, options.expectedVersion, current?.version);
      }

      const sequence = (current?.sequence ?? 0) + 1;
      const row: ObjectRow = {
        key,
        version: `${key}#${sequence}`,
        contentType: options.contentType,
        body,
        metadata: { ...(options.metadata ?? {}) },
        writtenAt: options.now,
        sequence,
      };
      await this.db.objects.add(row);
      return LocalStorageProvider.toStored(row);
    });
  }

  async get(key: string): Promise<StoredObject> {
    const row = await this.currentRow(key);
    if (row === undefined) throw new ObjectNotFoundError(key);
    return LocalStorageProvider.toStored(row);
  }

  async list(prefix: string): Promise<string[]> {
    const keys = new Set<string>();
    await this.db.objects.each((row) => {
      if (row.key.startsWith(prefix)) keys.add(row.key);
    });
    return [...keys].sort();
  }

  async lock(key: string, holder: string, ttlMinutes: number, now: string): Promise<LockInfo> {
    return this.db.transaction('rw', this.db.locks, async () => {
      const existing = await this.peekLockWithin(key, now);
      if (existing !== null && existing.holder !== holder) throw new LockHeldError(key, existing);

      const lock: LockRow = {
        key,
        holder,
        acquiredAt: existing?.acquiredAt ?? now,
        expiresAt: addMinutes(now, ttlMinutes),
      };
      await this.db.locks.put(lock);
      return lock;
    });
  }

  async unlock(key: string, holder: string, now: string): Promise<void> {
    const existing = await this.peekLock(key, now);
    if (existing === null) return;
    if (existing.holder !== holder) throw new LockHeldError(key, existing);
    await this.db.locks.delete(key);
  }

  async peekLock(key: string, now: string): Promise<LockInfo | null> {
    const lock = await this.peekLockWithin(key, now);
    if (lock === null) await this.db.locks.delete(key).catch(() => undefined);
    return lock;
  }

  private async peekLockWithin(key: string, now: string): Promise<LockInfo | null> {
    const row = await this.db.locks.get(key);
    if (row === undefined) return null;
    return row.expiresAt <= now ? null : row;
  }

  async history(key: string): Promise<StoredObject[]> {
    const rows = await this.db.objects.where('key').equals(key).sortBy('sequence');
    return rows.map(LocalStorageProvider.toStored);
  }
}
