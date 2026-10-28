import {
  LockHeldError,
  ObjectNotFoundError,
  VersionConflictError,
  type StorageProvider,
} from './provider';

/**
 * The storage adapter contract suite.
 *
 * This is the DEFINITION of a valid provider, not a test of one. It returns
 * structured results rather than using test assertions so the same suite runs
 * in two places: vitest, and the test dashboard panel that shows pass/fail per
 * operation per adapter. A customer bringing their own provider runs this.
 */

export interface ContractResult {
  readonly operation: string;
  readonly passed: boolean;
  readonly detail: string;
}

const T0 = '2026-01-01T00:00:00.000Z';
const T1 = '2026-01-01T00:05:00.000Z';
const T2 = '2026-01-01T01:00:00.000Z';

async function check(operation: string, fn: () => Promise<string>): Promise<ContractResult> {
  try {
    return { operation, passed: true, detail: await fn() };
  } catch (error) {
    return {
      operation,
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

/** Runs the full contract against a freshly constructed provider. */
export async function runProviderContract(
  factory: () => StorageProvider
): Promise<ContractResult[]> {
  const results: ContractResult[] = [];

  results.push(
    await check('put + get round trip', async () => {
      const p = factory();
      const stored = await p.put('a/1.json', '{"x":1}', {
        contentType: 'application/json',
        metadata: { partNumber: 'PN-1' },
        now: T0,
      });
      const read = await p.get('a/1.json');
      assert(read.body === '{"x":1}', 'body did not round trip');
      assert(read.version === stored.version, 'version did not round trip');
      assert(read.metadata['partNumber'] === 'PN-1', 'metadata did not round trip');
      assert(read.writtenAt === T0, 'writtenAt must be the supplied timestamp');
      return `stored and read back at version ${read.version}`;
    })
  );

  results.push(
    await check('get of a missing key throws ObjectNotFoundError', async () => {
      const p = factory();
      try {
        await p.get('nope');
      } catch (error) {
        assert(error instanceof ObjectNotFoundError, `wrong error type: ${String(error)}`);
        return 'threw ObjectNotFoundError';
      }
      throw new Error('did not throw');
    })
  );

  results.push(
    await check('create-only put refuses to overwrite', async () => {
      const p = factory();
      await p.put('a/1.json', 'first', { contentType: 'text/plain', now: T0 });
      try {
        await p.put('a/1.json', 'second', { contentType: 'text/plain', now: T1 });
      } catch (error) {
        assert(error instanceof VersionConflictError, `wrong error type: ${String(error)}`);
        const after = await p.get('a/1.json');
        assert(after.body === 'first', 'the failed write must not have taken effect');
        return 'threw VersionConflictError and left the original intact';
      }
      throw new Error('overwrote an existing object');
    })
  );

  results.push(
    await check('put with a stale expectedVersion is rejected', async () => {
      const p = factory();
      const first = await p.put('a/1.json', 'first', { contentType: 'text/plain', now: T0 });
      await p.put('a/1.json', 'second', {
        contentType: 'text/plain',
        expectedVersion: first.version,
        now: T1,
      });
      try {
        await p.put('a/1.json', 'third', {
          contentType: 'text/plain',
          expectedVersion: first.version,
          now: T2,
        });
      } catch (error) {
        assert(error instanceof VersionConflictError, `wrong error type: ${String(error)}`);
        return 'stale write rejected — no silent overwrite';
      }
      throw new Error('accepted a stale write');
    })
  );

  results.push(
    await check('list returns matching keys, sorted', async () => {
      const p = factory();
      await p.put('b/2', 'x', { contentType: 'text/plain', now: T0 });
      await p.put('a/1', 'x', { contentType: 'text/plain', now: T0 });
      await p.put('a/2', 'x', { contentType: 'text/plain', now: T0 });
      const listed = await p.list('a/');
      assert(JSON.stringify(listed) === JSON.stringify(['a/1', 'a/2']), `got ${listed.join()}`);
      return 'prefix filtered and sorted';
    })
  );

  results.push(
    await check('history returns every revision, oldest first', async () => {
      const p = factory();
      const first = await p.put('a/1', 'one', { contentType: 'text/plain', now: T0 });
      await p.put('a/1', 'two', {
        contentType: 'text/plain',
        expectedVersion: first.version,
        now: T1,
      });
      const chain = await p.history('a/1');
      assert(chain.length === 2, `expected 2 revisions, got ${chain.length}`);
      assert(chain[0]?.body === 'one' && chain[1]?.body === 'two', 'wrong order');
      return 'revision chain intact';
    })
  );

  results.push(
    await check('lock blocks a second holder', async () => {
      const p = factory();
      await p.lock('RCPT-1', 'device-a', 30, T0);
      try {
        await p.lock('RCPT-1', 'device-b', 30, T1);
      } catch (error) {
        assert(error instanceof LockHeldError, `wrong error type: ${String(error)}`);
        assert(
          (error as LockHeldError).lock.holder === 'device-a',
          'the error must name the holder'
        );
        return 'second device blocked, holder named';
      }
      throw new Error('two devices held the same lock');
    })
  );

  results.push(
    await check('lock expiry releases a dead device', async () => {
      const p = factory();
      await p.lock('RCPT-1', 'device-a', 30, T0);
      /* T2 is an hour later: a tablet that died holding the lock must not
         block the receiving dock indefinitely. */
      const lock = await p.lock('RCPT-1', 'device-b', 30, T2);
      assert(lock.holder === 'device-b', 'expired lock was not reassigned');
      return 'expired lock reassigned';
    })
  );

  results.push(
    await check('re-locking your own key extends rather than fails', async () => {
      const p = factory();
      const first = await p.lock('RCPT-1', 'device-a', 30, T0);
      const extended = await p.lock('RCPT-1', 'device-a', 30, T1);
      assert(extended.expiresAt > first.expiresAt, 'expiry was not extended');
      assert(extended.acquiredAt === first.acquiredAt, 'acquisition time must not move');
      return 'lock extended in place';
    })
  );

  results.push(
    await check('unlock by a non-holder is refused', async () => {
      const p = factory();
      await p.lock('RCPT-1', 'device-a', 30, T0);
      try {
        await p.unlock('RCPT-1', 'device-b', T1);
      } catch (error) {
        assert(error instanceof LockHeldError, `wrong error type: ${String(error)}`);
        const still = await p.peekLock('RCPT-1', T1);
        assert(still?.holder === 'device-a', 'the lock must survive a foreign unlock');
        return 'foreign unlock refused';
      }
      throw new Error('a non-holder released the lock');
    })
  );

  results.push(
    await check('unlock then relock succeeds; peekLock reports free', async () => {
      const p = factory();
      await p.lock('RCPT-1', 'device-a', 30, T0);
      await p.unlock('RCPT-1', 'device-a', T1);
      assert((await p.peekLock('RCPT-1', T1)) === null, 'lock still reported after release');
      const relocked = await p.lock('RCPT-1', 'device-b', 30, T1);
      assert(relocked.holder === 'device-b', 'relock failed');
      return 'released and reacquired';
    })
  );

  results.push(
    await check('unlock of a free key is a no-op, not an error', async () => {
      const p = factory();
      await p.unlock('RCPT-1', 'device-a', T0);
      return 'no-op';
    })
  );

  return results;
}

export const CONTRACT_OPERATION_COUNT = 12;
