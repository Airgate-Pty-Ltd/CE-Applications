import { VersionConflictError, type StorageProvider, type StoredObject } from '../storage/provider';

/**
 * Offline sync queue.
 *
 * A receiving dock loses wifi. An inspection started offline must complete
 * offline and commit when the connection returns. A RECORD MUST NEVER BE LOST
 * BECAUSE THE NETWORK DROPPED — that is the failure mode that kills this
 * product, so the queue is durable, ordered, and never silently drops work.
 *
 * Commit is transactional from the user's point of view: an item is either
 * fully upstream or still queued. There is no half-written state.
 */

export interface QueueItem {
  /** Durable id, assigned by the caller. Survives a reload. */
  readonly id: string;
  readonly key: string;
  readonly body: string;
  readonly contentType: string;
  readonly metadata: Readonly<Record<string, string>>;
  readonly expectedVersion: string | undefined;
  readonly enqueuedAt: string;
  readonly attempts: number;
  readonly lastError: string | null;
}

export interface SyncConflict {
  readonly item: QueueItem;
  /** What is upstream now. Null when the key was created by someone else. */
  readonly upstream: StoredObject | null;
  readonly detectedAt: string;
}

export interface FlushResult {
  readonly committed: string[];
  readonly conflicted: string[];
  readonly failed: string[];
  readonly remainingDepth: number;
}

/** Durable store for the queue itself. Memory in tests, IndexedDB in the app. */
export interface QueueStore {
  all(): Promise<QueueItem[]>;
  upsert(item: QueueItem): Promise<void>;
  remove(id: string): Promise<void>;
}

export class MemoryQueueStore implements QueueStore {
  private readonly items = new Map<string, QueueItem>();

  async all(): Promise<QueueItem[]> {
    return [...this.items.values()].sort((a, b) =>
      a.enqueuedAt === b.enqueuedAt
        ? a.id.localeCompare(b.id)
        : a.enqueuedAt < b.enqueuedAt
          ? -1
          : 1
    );
  }
  async upsert(item: QueueItem): Promise<void> {
    this.items.set(item.id, item);
  }
  async remove(id: string): Promise<void> {
    this.items.delete(id);
  }
}

export interface EnqueueInput {
  readonly id: string;
  readonly key: string;
  readonly body: string;
  readonly contentType: string;
  readonly metadata?: Readonly<Record<string, string>>;
  readonly expectedVersion?: string | undefined;
  readonly now: string;
}

export class SyncQueue {
  private readonly conflictLog: SyncConflict[] = [];

  constructor(
    private readonly upstream: StorageProvider,
    private readonly store: QueueStore
  ) {}

  async enqueue(input: EnqueueInput): Promise<QueueItem> {
    const item: QueueItem = {
      id: input.id,
      key: input.key,
      body: input.body,
      contentType: input.contentType,
      metadata: { ...(input.metadata ?? {}) },
      expectedVersion: input.expectedVersion,
      enqueuedAt: input.now,
      attempts: 0,
      lastError: null,
    };
    await this.store.upsert(item);
    return item;
  }

  /** Shown in the UI at all times: an inspector must be able to see at a
   *  glance whether their work is safely upstream. */
  async depth(): Promise<number> {
    return (await this.store.all()).length;
  }

  async pending(): Promise<QueueItem[]> {
    return this.store.all();
  }

  conflicts(): SyncConflict[] {
    return [...this.conflictLog];
  }

  /**
   * Commit queued work in enqueue order.
   *
   * A conflict is never auto-merged: signed records are immutable, so a genuine
   * conflict means two humans disagree about reality and a machine guess would
   * bury that. The item stays queued and both versions are surfaced.
   *
   * A transport failure leaves the item queued with the error recorded, so a
   * flush is safe to retry and nothing is dropped.
   */
  async flush(now: string): Promise<FlushResult> {
    const committed: string[] = [];
    const conflicted: string[] = [];
    const failed: string[] = [];

    for (const item of await this.store.all()) {
      try {
        await this.upstream.put(item.key, item.body, {
          contentType: item.contentType,
          metadata: item.metadata,
          expectedVersion: item.expectedVersion,
          now: item.enqueuedAt,
        });
        await this.store.remove(item.id);
        committed.push(item.id);
      } catch (error) {
        const updated: QueueItem = {
          ...item,
          attempts: item.attempts + 1,
          lastError: error instanceof Error ? error.message : String(error),
        };
        await this.store.upsert(updated);

        if (error instanceof VersionConflictError) {
          const upstream = await this.upstream.get(item.key).catch(() => null);
          this.conflictLog.push({ item: updated, upstream, detectedAt: now });
          conflicted.push(item.id);
        } else {
          failed.push(item.id);
        }
      }
    }

    return {
      committed,
      conflicted,
      failed,
      remainingDepth: (await this.store.all()).length,
    };
  }
}
