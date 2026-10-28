import type { GraphClient, GraphResponse } from './sharepoint';

/**
 * In-memory stand-in for Microsoft Graph.
 *
 * Exists so the SharePoint adapter — the primary provider — can be run against
 * the storage contract suite without a tenant, in CI and in the test dashboard.
 * An adapter that has never been executed against the contract is an adapter
 * nobody has verified.
 *
 * It emulates the narrow slice of Graph the adapter uses: drive item metadata
 * with eTags, content, listItem fields, children, and version history. It is a
 * test double, not a SharePoint implementation, and it is honest about that.
 */

interface FakeItem {
  content: string;
  eTagCounter: number;
  fields: Record<string, string>;
  versions: { id: string; lastModifiedDateTime: string; content: string }[];
}

const ROOT = /^\/drives\/[^/]+\/root:\/(.*)$/;

export class FakeGraphClient implements GraphClient {
  private readonly items = new Map<string, FakeItem>();
  private counter = 0;

  /** Retention label the fake library reports. Null means unlabelled. */
  retentionLabel: { name: string; retentionDuration?: { days?: number } } | null = null;

  private static parse(path: string): { key: string; suffix: string } | null {
    const match = ROOT.exec(path);
    if (match === null) return null;
    const rest = match[1] ?? '';
    const marker = rest.indexOf(':/');
    return marker === -1
      ? { key: rest, suffix: '' }
      : { key: rest.slice(0, marker), suffix: rest.slice(marker + 2) };
  }

  async request(
    method: 'GET' | 'PUT' | 'PATCH' | 'POST' | 'DELETE',
    path: string,
    body?: unknown
  ): Promise<GraphResponse> {
    if (path.endsWith('/retentionLabel')) {
      return this.retentionLabel === null
        ? { status: 404, body: null }
        : { status: 200, body: this.retentionLabel };
    }

    const parsed = FakeGraphClient.parse(path);
    if (parsed === null) return { status: 400, body: { error: 'unrecognised path' } };
    const { key, suffix } = parsed;

    if (method === 'PUT' && suffix === 'content') {
      this.counter += 1;
      const existing = this.items.get(key);
      const item: FakeItem = existing ?? {
        content: '',
        eTagCounter: 0,
        fields: {},
        versions: [],
      };
      item.content = String(body ?? '');
      item.eTagCounter = this.counter;
      item.versions.push({
        id: `${this.counter}`,
        lastModifiedDateTime: item.fields['_writtenAt'] ?? '',
        content: item.content,
      });
      this.items.set(key, item);
      return { status: 200, body: { eTag: `"${this.counter}"`, id: key } };
    }

    if (method === 'PATCH' && suffix === 'listItem/fields') {
      const item = this.items.get(key);
      if (item === undefined) return { status: 404, body: null };
      item.fields = { ...item.fields, ...(body as Record<string, string>) };
      const last = item.versions[item.versions.length - 1];
      if (last !== undefined) last.lastModifiedDateTime = item.fields['_writtenAt'] ?? '';
      return { status: 200, body: item.fields };
    }

    if (method === 'GET') {
      if (suffix === 'children') {
        const children = [...this.items.keys()]
          .filter((k) => k.startsWith(key) && k !== key)
          .map((k) => ({ name: k.slice(key.length) }));
        return { status: 200, body: { value: children } };
      }

      const item = this.items.get(key);
      if (item === undefined) return { status: 404, body: null };

      const versionContent = /^versions\/(.+)\/content$/.exec(suffix);
      if (versionContent !== null) {
        const revision = item.versions.find((v) => v.id === versionContent[1]);
        return revision === undefined
          ? { status: 404, body: null }
          : { status: 200, body: revision.content };
      }

      if (suffix === 'content') return { status: 200, body: item.content };
      if (suffix === 'listItem/fields') return { status: 200, body: item.fields };
      if (suffix === 'versions') return { status: 200, body: { value: item.versions } };
      if (suffix === '') return { status: 200, body: { eTag: `"${item.eTagCounter}"`, id: key } };
    }

    if (method === 'DELETE') {
      this.items.delete(key);
      return { status: 204, body: null };
    }

    return { status: 404, body: null };
  }
}
