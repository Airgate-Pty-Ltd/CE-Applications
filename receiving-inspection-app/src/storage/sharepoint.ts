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
 * SharePoint provider, via Microsoft Graph.
 *
 * The customer's document library, on their tenant, under their retention
 * policy, is the system of record. This app is a client. That is a deliberate
 * commercial position: the customer is not asked to migrate, and their records
 * are never held hostage by the vendor.
 *
 * Records are written as the structured JSON alongside a rendered PDF sibling,
 * so the library is searchable AND the data stays machine-readable. Inspection
 * metadata is promoted to library columns so a quality manager can filter,
 * report, and build views without opening a single file.
 *
 * Graph access is injected rather than imported so the adapter is testable
 * without a tenant, and so token acquisition stays in the auth layer where it
 * belongs.
 */

export interface GraphResponse {
  readonly status: number;
  readonly body: unknown;
}

/** Minimal Graph surface. Implemented over fetch + MSAL in the app. */
export interface GraphClient {
  request(
    method: 'GET' | 'PUT' | 'PATCH' | 'POST' | 'DELETE',
    path: string,
    body?: unknown
  ): Promise<GraphResponse>;
}

export interface SharePointConfig {
  /** Graph drive id of the customer-nominated document library. */
  readonly driveId: string;
  /** Folder convention. Default: /{year}/{supplier}/{receipt-id}/ */
  readonly folderTemplate: string;
}

export const DEFAULT_FOLDER_TEMPLATE = '/{year}/{supplier}/{receipt-id}/';

/** Resolves the folder convention. Unknown tokens are left visible, not
 *  silently dropped — a wrong path is easier to spot than a missing one. */
export function resolveFolder(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{([a-z-]+)\}/g, (match, token: string) => values[token] ?? match);
}

interface DriveItem {
  readonly eTag?: string;
  readonly id?: string;
}

export class SharePointStorageProvider implements StorageProvider {
  readonly name = 'sharepoint';

  constructor(
    private readonly graph: GraphClient,
    private readonly config: SharePointConfig
  ) {}

  private itemPath(key: string): string {
    return `/drives/${this.config.driveId}/root:/${key}`;
  }

  async put(key: string, body: string, options: PutOptions): Promise<StoredObject> {
    const current = await this.tryGet(key);

    if (options.expectedVersion === undefined) {
      if (current !== null) throw new VersionConflictError(key, undefined, current.version);
    } else if (current === null || current.version !== options.expectedVersion) {
      throw new VersionConflictError(key, options.expectedVersion, current?.version);
    }

    const uploaded = await this.graph.request('PUT', `${this.itemPath(key)}:/content`, body);
    if (uploaded.status >= 400) {
      throw new Error(`SharePoint rejected the write to "${key}" (${uploaded.status})`);
    }

    const item = uploaded.body as DriveItem;

    /* Promote metadata to library columns so the customer's views, filters and
       reports work without opening files. The write time and content type ride
       along as columns too — otherwise a record read back from the library has
       lost when it was written, and the library becomes a folder of blobs. */
    {
      const fields = await this.graph.request('PATCH', `${this.itemPath(key)}:/listItem/fields`, {
        ...(options.metadata ?? {}),
        _writtenAt: options.now,
        _contentType: options.contentType,
      });
      if (fields.status >= 400) {
        throw new Error(
          `Wrote "${key}" but could not set library columns (${fields.status}). ` +
            'The record is upstream; the library view will be incomplete until the ' +
            'columns exist. Check the library schema against STORAGE-ADAPTERS.md.'
        );
      }
    }

    return {
      key,
      version: item.eTag ?? '',
      contentType: options.contentType,
      body,
      metadata: { ...(options.metadata ?? {}) },
      writtenAt: options.now,
    };
  }

  private async tryGet(key: string): Promise<StoredObject | null> {
    const meta = await this.graph.request('GET', this.itemPath(key));
    if (meta.status === 404) return null;
    if (meta.status >= 400) {
      throw new Error(`SharePoint read failed for "${key}" (${meta.status})`);
    }

    const item = meta.body as DriveItem;
    const content = await this.graph.request('GET', `${this.itemPath(key)}:/content`);
    const fieldsResponse = await this.graph.request(
      'GET',
      `${this.itemPath(key)}:/listItem/fields`
    );

    const fields =
      fieldsResponse.status >= 400 ? {} : ((fieldsResponse.body ?? {}) as Record<string, string>);
    const { _writtenAt, _contentType, ...metadata } = fields;

    return {
      key,
      version: item.eTag ?? '',
      contentType: _contentType ?? 'application/json',
      body: typeof content.body === 'string' ? content.body : JSON.stringify(content.body),
      metadata,
      writtenAt: _writtenAt ?? '',
    };
  }

  async get(key: string): Promise<StoredObject> {
    const found = await this.tryGet(key);
    if (found === null) throw new ObjectNotFoundError(key);
    return found;
  }

  async list(prefix: string): Promise<string[]> {
    const response = await this.graph.request('GET', `${this.itemPath(prefix)}:/children`);
    if (response.status === 404) return [];
    if (response.status >= 400) {
      throw new Error(`SharePoint list failed for "${prefix}" (${response.status})`);
    }
    const value = (response.body as { value?: { name?: string }[] }).value ?? [];
    return value
      .map((entry) => `${prefix}${entry.name ?? ''}`)
      .filter((k) => k !== prefix)
      .sort();
  }

  /**
   * Locks are held as sidecar objects in the library rather than as SharePoint
   * checkouts: a checkout survives a dead tablet indefinitely, which is exactly
   * the failure the expiry rule exists to prevent.
   */
  private lockKey(key: string): string {
    return `${key}.lock.json`;
  }

  async lock(key: string, holder: string, ttlMinutes: number, now: string): Promise<LockInfo> {
    const existing = await this.peekLock(key, now);
    if (existing !== null && existing.holder !== holder) throw new LockHeldError(key, existing);

    const lock: LockInfo = {
      key,
      holder,
      acquiredAt: existing?.acquiredAt ?? now,
      expiresAt: addMinutes(now, ttlMinutes),
    };
    const response = await this.graph.request(
      'PUT',
      `${this.itemPath(this.lockKey(key))}:/content`,
      JSON.stringify(lock)
    );
    if (response.status >= 400) {
      throw new Error(`Could not acquire the lock on "${key}" (${response.status})`);
    }
    return lock;
  }

  async unlock(key: string, holder: string, now: string): Promise<void> {
    const existing = await this.peekLock(key, now);
    if (existing === null) return;
    if (existing.holder !== holder) throw new LockHeldError(key, existing);
    await this.graph.request('DELETE', this.itemPath(this.lockKey(key)));
  }

  async peekLock(key: string, now: string): Promise<LockInfo | null> {
    const response = await this.graph.request(
      'GET',
      `${this.itemPath(this.lockKey(key))}:/content`
    );
    if (response.status === 404) return null;
    if (response.status >= 400) {
      throw new Error(`Could not read the lock on "${key}" (${response.status})`);
    }

    const raw = typeof response.body === 'string' ? response.body : JSON.stringify(response.body);
    const lock = JSON.parse(raw) as LockInfo;
    if (lock.expiresAt <= now) return null;
    return lock;
  }

  async history(key: string): Promise<StoredObject[]> {
    const response = await this.graph.request('GET', `${this.itemPath(key)}:/versions`);
    if (response.status === 404) return [];
    if (response.status >= 400) {
      throw new Error(`SharePoint version history failed for "${key}" (${response.status})`);
    }
    const value =
      (response.body as { value?: { id?: string; lastModifiedDateTime?: string }[] }).value ?? [];

    /* Each revision's content is fetched, not just its id. Being able to show
       the full chain from receipt to final disposition is a product claim, and
       a chain of empty bodies does not support it. */
    return Promise.all(
      value.map(async (version) => {
        const id = version.id ?? '';
        const content = await this.graph.request(
          'GET',
          `${this.itemPath(key)}:/versions/${id}/content`
        );
        return {
          key,
          version: id,
          contentType: 'application/json',
          body:
            content.status >= 400
              ? ''
              : typeof content.body === 'string'
                ? content.body
                : JSON.stringify(content.body),
          metadata: {},
          writtenAt: version.lastModifiedDateTime ?? '',
        };
      })
    );
  }
}

/**
 * Reads the library's retention label so the app can check it against the
 * regulatory floor. Returns null when the library carries no label — which is
 * itself worth surfacing, not swallowing.
 */
export async function readRetentionLabelYears(
  graph: GraphClient,
  driveId: string
): Promise<{ label: string; years: number | null } | null> {
  const response = await graph.request('GET', `/drives/${driveId}/root/retentionLabel`);
  if (response.status === 404 || response.status === 204) return null;
  if (response.status >= 400) {
    throw new Error(`Could not read the library retention label (${response.status})`);
  }

  const body = response.body as { name?: string; retentionDuration?: { days?: number } };
  if (body.name === undefined) return null;

  const days = body.retentionDuration?.days;
  return {
    label: body.name,
    years: days === undefined ? null : Math.floor(days / 365),
  };
}
