/**
 * Storage provider interface.
 *
 * ALL persistence goes through this. Feature code never calls SharePoint, or
 * any other provider, directly. A hardcoded call sells to one customer and
 * makes the asset harder to resell; a seam sells to all of them.
 *
 * The contract test suite in `contract.ts` is the DEFINITION of a valid
 * provider. Anything that passes it is supported — that is what lets a customer
 * bring their own.
 */

export interface StoredObject {
  readonly key: string;
  /** Opaque version token. Changes on every write. Used for conflict checks. */
  readonly version: string;
  readonly contentType: string;
  readonly body: string;
  /** Promoted metadata. On SharePoint these become library columns. */
  readonly metadata: Readonly<Record<string, string>>;
  /** ISO timestamp of the write, supplied by the caller — never a clock read. */
  readonly writtenAt: string;
}

export interface PutOptions {
  readonly contentType: string;
  readonly metadata?: Readonly<Record<string, string>>;
  /**
   * Expected current version. When supplied and the stored version differs, the
   * write fails with a VersionConflictError instead of overwriting.
   * Undefined means "create only" — the write fails if the key already exists.
   */
  readonly expectedVersion?: string | undefined;
  /** ISO timestamp, passed in so writes are reproducible under test. */
  readonly now: string;
}

export interface LockInfo {
  readonly key: string;
  readonly holder: string;
  readonly acquiredAt: string;
  readonly expiresAt: string;
}

export class VersionConflictError extends Error {
  constructor(
    readonly key: string,
    readonly expected: string | undefined,
    readonly actual: string | undefined
  ) {
    super(
      `Version conflict on "${key}": expected ${expected ?? '(new object)'}, found ${actual ?? '(none)'}`
    );
    this.name = 'VersionConflictError';
  }
}

export class LockHeldError extends Error {
  constructor(
    readonly key: string,
    readonly lock: LockInfo
  ) {
    super(`"${key}" is in progress on another device, held by ${lock.holder}`);
    this.name = 'LockHeldError';
  }
}

export class ObjectNotFoundError extends Error {
  constructor(readonly key: string) {
    super(`No object at "${key}"`);
    this.name = 'ObjectNotFoundError';
  }
}

export interface StorageProvider {
  readonly name: string;

  /** Write an object. Enforces expectedVersion. Returns the stored result. */
  put(key: string, body: string, options: PutOptions): Promise<StoredObject>;

  /** Read an object. Throws ObjectNotFoundError when absent. */
  get(key: string): Promise<StoredObject>;

  /** Keys under a prefix, sorted lexicographically for reproducibility. */
  list(prefix: string): Promise<string[]>;

  /**
   * Acquire a lock. Throws LockHeldError when another holder has it and the
   * lock has not expired. Re-acquiring your own lock extends it.
   */
  lock(key: string, holder: string, ttlMinutes: number, now: string): Promise<LockInfo>;

  /** Release a lock. Releasing a lock you do not hold throws LockHeldError. */
  unlock(key: string, holder: string, now: string): Promise<void>;

  /** Current lock, or null when free or expired. */
  peekLock(key: string, now: string): Promise<LockInfo | null>;

  /** Every revision of a key, oldest first. Signed records are immutable, so
   *  this is the revision chain rather than an edit log. */
  history(key: string): Promise<StoredObject[]>;
}
