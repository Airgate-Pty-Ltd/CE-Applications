import { describe, it, expect } from 'vitest';
import { SyncQueue, MemoryQueueStore } from './queue';
import { MemoryStorageProvider } from '../storage/memory';
import type { StorageProvider } from '../storage/provider';

const T0 = '2026-01-01T00:00:00.000Z';
const T1 = '2026-01-01T00:05:00.000Z';

function harness() {
  const upstream = new MemoryStorageProvider();
  const queue = new SyncQueue(upstream, new MemoryQueueStore());
  return { upstream, queue };
}

/**
 * Wraps a provider, replacing `put`. Delegates explicitly rather than
 * spreading: spreading a class instance drops its prototype methods, producing
 * an object that satisfies no interface and fails only once something calls a
 * method the test happened not to exercise.
 */
function withPut(inner: StorageProvider, put: StorageProvider['put']): StorageProvider {
  return {
    name: `${inner.name}-wrapped`,
    put,
    get: (key) => inner.get(key),
    list: (prefix) => inner.list(prefix),
    lock: (key, holder, ttl, now) => inner.lock(key, holder, ttl, now),
    unlock: (key, holder, now) => inner.unlock(key, holder, now),
    peekLock: (key, now) => inner.peekLock(key, now),
    history: (key) => inner.history(key),
  };
}

describe('offline sync queue', () => {
  it('commits queued work upstream and empties the queue', async () => {
    const { upstream, queue } = harness();
    await queue.enqueue({
      id: 'q1',
      key: 'records/IR-1.json',
      body: '{"signed":true}',
      contentType: 'application/json',
      now: T0,
    });
    expect(await queue.depth()).toBe(1);

    const result = await queue.flush(T1);

    expect(result.committed).toEqual(['q1']);
    expect(result.remainingDepth).toBe(0);
    expect((await upstream.get('records/IR-1.json')).body).toBe('{"signed":true}');
  });

  it('commits in enqueue order', async () => {
    const { upstream, queue } = harness();
    await queue.enqueue({ id: 'b', key: 'k/2', body: '2', contentType: 'text/plain', now: T0 });
    await queue.enqueue({ id: 'a', key: 'k/1', body: '1', contentType: 'text/plain', now: T1 });

    const result = await queue.flush(T1);

    expect(result.committed).toEqual(['b', 'a']);
    expect(await upstream.list('k/')).toEqual(['k/1', 'k/2']);
  });

  it('NEVER drops a record when the transport fails — it stays queued with the error', async () => {
    const { queue } = harness();
    const failing = new SyncQueue(
      withPut(new MemoryStorageProvider(), async () => {
        throw new Error('network down');
      }),
      new MemoryQueueStore()
    );
    await failing.enqueue({ id: 'q1', key: 'k/1', body: 'x', contentType: 'text/plain', now: T0 });

    const result = await failing.flush(T1);

    expect(result.failed).toEqual(['q1']);
    expect(result.committed).toEqual([]);
    expect(result.remainingDepth).toBe(1);
    const [pending] = await failing.pending();
    expect(pending?.lastError).toContain('network down');
    expect(pending?.attempts).toBe(1);
    expect(await queue.depth()).toBe(0);
  });

  it('is safe to retry — a failed flush commits on the next attempt', async () => {
    const upstream = new MemoryStorageProvider();
    let failNext = true;
    const flaky = new SyncQueue(
      withPut(upstream, async (key, body, options) => {
        if (failNext) {
          failNext = false;
          throw new Error('network down');
        }
        return upstream.put(key, body, options);
      }),
      new MemoryQueueStore()
    );
    await flaky.enqueue({ id: 'q1', key: 'k/1', body: 'x', contentType: 'text/plain', now: T0 });

    expect((await flaky.flush(T1)).failed).toEqual(['q1']);
    const second = await flaky.flush(T1);

    expect(second.committed).toEqual(['q1']);
    expect(second.remainingDepth).toBe(0);
    expect((await upstream.get('k/1')).body).toBe('x');
  });

  it('surfaces a conflict rather than auto-merging, and keeps the item queued', async () => {
    const { upstream, queue } = harness();
    /* Another device already wrote this key while we were offline. */
    await upstream.put('k/1', 'theirs', { contentType: 'text/plain', now: T0 });
    await queue.enqueue({ id: 'q1', key: 'k/1', body: 'ours', contentType: 'text/plain', now: T0 });

    const result = await queue.flush(T1);

    expect(result.conflicted).toEqual(['q1']);
    expect(result.remainingDepth).toBe(1);
    expect((await upstream.get('k/1')).body).toBe('theirs');

    const [conflict] = queue.conflicts();
    expect(conflict?.item.body).toBe('ours');
    expect(conflict?.upstream?.body).toBe('theirs');
    expect(conflict?.detectedAt).toBe(T1);
  });

  it('reports depth so the inspector can see whether work is safely upstream', async () => {
    const { queue } = harness();
    expect(await queue.depth()).toBe(0);
    await queue.enqueue({ id: 'q1', key: 'k/1', body: 'x', contentType: 'text/plain', now: T0 });
    await queue.enqueue({ id: 'q2', key: 'k/2', body: 'y', contentType: 'text/plain', now: T0 });
    expect(await queue.depth()).toBe(2);
  });
});
