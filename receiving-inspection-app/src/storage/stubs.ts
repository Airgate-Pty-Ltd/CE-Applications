import type { LockInfo, PutOptions, StorageProvider, StoredObject } from './provider';

/**
 * Declared-but-unimplemented providers.
 *
 * WebDAV and S3 are stubs on purpose. Shipping a half-working adapter is worse
 * than shipping none: a customer configures it, it appears to work, and the
 * failure surfaces on a record that matters. These throw immediately and name
 * what is missing.
 *
 * The route to implementing one is not guesswork — pass the contract suite in
 * `contract.ts`. Anything that passes it is a valid provider.
 */

export class NotImplementedProvider implements StorageProvider {
  constructor(readonly name: string) {}

  private fail(operation: string): never {
    throw new Error(
      `The "${this.name}" storage adapter is a stub: ${operation} is not implemented. ` +
        'Implement it against the contract suite in src/storage/contract.ts — passing that ' +
        'suite is the definition of a valid provider. See STORAGE-ADAPTERS.md.'
    );
  }

  put(_key: string, _body: string, _options: PutOptions): Promise<StoredObject> {
    this.fail('put');
  }
  get(_key: string): Promise<StoredObject> {
    this.fail('get');
  }
  list(_prefix: string): Promise<string[]> {
    this.fail('list');
  }
  lock(_key: string, _holder: string, _ttlMinutes: number, _now: string): Promise<LockInfo> {
    this.fail('lock');
  }
  unlock(_key: string, _holder: string, _now: string): Promise<void> {
    this.fail('unlock');
  }
  peekLock(_key: string, _now: string): Promise<LockInfo | null> {
    this.fail('peekLock');
  }
  history(_key: string): Promise<StoredObject[]> {
    this.fail('history');
  }
}

/** Network share / generic WebDAV. Stub. */
export class WebDavStorageProvider extends NotImplementedProvider {
  constructor() {
    super('webdav');
  }
}

/** S3-compatible object storage. Stub. */
export class S3StorageProvider extends NotImplementedProvider {
  constructor() {
    super('s3');
  }
}
