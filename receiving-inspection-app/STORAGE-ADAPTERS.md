# Storage Adapters

The contract a storage provider must satisfy, and how to add one.

## Why there is a seam at all

All persistence goes through one interface. Feature code never calls SharePoint,
or any other provider, directly.

This is a commercial decision before it is a technical one. A hardcoded
SharePoint call sells to one customer and makes the asset harder to resell. An
adapter interface sells to all of them, and lets a customer keep their records
where their retention policy already lives.

## The contract IS the definition

`src/storage/contract.ts` is not a test *of* a provider — it is the **definition
of** one. Anything that passes it is a valid provider. It returns structured
results rather than using test assertions, so the same suite runs in two places:
Vitest, and dashboard panel 10, which shows pass/fail per operation per adapter.

```ts
const results = await runProviderContract(() => new YourProvider());
```

Twelve operations. All must pass.

---

## The interface

```ts
interface StorageProvider {
  readonly name: string;
  put(key: string, body: string, options: PutOptions): Promise<StoredObject>;
  get(key: string): Promise<StoredObject>;
  list(prefix: string): Promise<string[]>;
  lock(key: string, holder: string, ttlMinutes: number, now: string): Promise<LockInfo>;
  unlock(key: string, holder: string, now: string): Promise<void>;
  peekLock(key: string, now: string): Promise<LockInfo | null>;
  history(key: string): Promise<StoredObject[]>;
}
```

### Rules that are easy to get wrong

**Time is passed in, never read.** Every method that needs a timestamp receives
one. A provider that calls `Date.now()` breaks reproducibility and will fail the
lock-expiry operations in ways that look intermittent.

**`put` enforces `expectedVersion`.**
- `expectedVersion: undefined` means *create only*. If the key exists, throw
  `VersionConflictError` and **do not write**.
- `expectedVersion: "v3"` means *replace only if current version is v3*.
  Otherwise throw `VersionConflictError` and do not write.

A failed write must leave the previous object untouched. The contract checks
this explicitly, because a provider that half-applies a rejected write corrupts
the record store in a way no user will notice until an audit.

**`list` returns sorted keys.** Lexicographic. Reproducibility depends on it.

**`history` returns every revision, oldest first, WITH bodies.** Not just ids.
Being able to show the full chain from receipt to final disposition is a product
claim, and a chain of empty bodies does not support it. *(The SharePoint adapter
initially returned ids only and the contract caught it.)*

**Locks:**
- A second holder is refused with `LockHeldError`, and the error **names the
  current holder** — an inspector needs to know who has the receipt open.
- Re-locking your own key **extends** the expiry and leaves `acquiredAt`
  unchanged.
- An expired lock is reassignable. This is not optional: a tablet that dies
  holding a lock must not block the receiving dock indefinitely.
- `unlock` by a non-holder throws and the lock **survives**.
- `unlock` of a free key is a no-op, not an error.

### Errors

Throw the shared types from `src/storage/provider.ts` — the contract checks the
type, not the message:

| Error | When |
|---|---|
| `VersionConflictError` | `expectedVersion` did not match, or create-only hit an existing key |
| `LockHeldError` | Lock held by someone else, or foreign unlock attempted |
| `ObjectNotFoundError` | `get` on a missing key |

---

## Shipped providers

| Provider | File | State |
|---|---|---|
| Memory | `memory.ts` | Contract-verified in CI. Dev, tests, reference implementation |
| Local (IndexedDB/Dexie) | `local.ts` | Built. **Not contract-run in CI** — jsdom has no IndexedDB; run it in a browser |
| SharePoint (Graph) | `sharepoint.ts` | Contract-verified against a fake Graph client |
| WebDAV | `stubs.ts` | Stub. Throws, naming what is missing |
| S3 | `stubs.ts` | Stub. Throws, naming what is missing |

The stubs throw rather than partially working on purpose. Shipping a
half-working adapter is worse than shipping none: a customer configures it, it
appears to work, and the failure surfaces on a record that matters.

---

## The SharePoint adapter specifically

Graph access is **injected**, not imported:

```ts
new SharePointStorageProvider(graphClient, { driveId, folderTemplate });
```

This keeps token acquisition in the auth layer where it belongs, and makes the
adapter testable without a tenant. `sharepoint.fake.ts` implements the narrow
slice of Graph the adapter uses — item metadata with eTags, content, listItem
fields, children, version history — so the primary provider is genuinely
exercised in CI. It is a test double and is honest about that: **it does not
prove Graph behaves as the fake does.** First-tenant verification is a
deployment step (see DEPLOYMENT.md).

**Versions** map to Graph `eTag`. **Locks** are sidecar objects
(`<key>.lock.json`) rather than SharePoint checkouts — a checkout survives a
dead tablet indefinitely, which is exactly the failure lock expiry exists to
prevent.

**Metadata is promoted to library columns** so views, filters and reports work
without opening files. Write time and content type ride along as `_writtenAt`
and `_contentType`; without them a record read back from the library has lost
when it was written and the library becomes a folder of blobs.

If a column does not exist in the library, the content write **succeeds** and
the column write fails. The adapter reports this explicitly: the record is
upstream, the view is incomplete. It does not fail silently and it does not
pretend the write failed.

---

## Adding a provider

1. Implement `StorageProvider` in `src/storage/<name>.ts`.
2. Add a test that runs `runProviderContract` against it. Passing 12/12 is the
   bar; there is no separate approval.
3. Add it to the adapter list in `src/dev/panels.ts` so panel 10 shows it.
4. Document its configuration in README.md and DEPLOYMENT.md.

If your provider cannot satisfy an operation — say it has no version history —
do not stub the operation to return something plausible. Either implement it or
declare the provider unsupported. The contract exists so that "supported" means
one thing.

---

## What the seam deliberately does not do

- **No connector to any named ERP.** Beyond storage there is one documented
  outbound webhook and CSV import for article master data. The product is
  system-agnostic; a named connector makes it less resellable, not more.
- **No cross-provider migration tool.** Out of scope.
- **No auto-merge on conflict.** Signed records are immutable, so genuine
  conflicts are rare by design. Where one occurs, both versions are surfaced and
  a human decides. See `src/sync/queue.ts`.
