import fs from 'fs';
import path from 'path';

// Loads the golden (organization-agnostic) templates and a tenant profile, and
// resolves {{tokens}}. Golden templates contain no organization data; every
// {{tenant.*}} value comes from the profile, every {{case.*}} from the case.

const ROOT = path.resolve(__dirname, '..', '..', '..', '..', 'templates');

export type Ctx = Record<string, unknown>;

export function loadGolden<T = any>(name: string): T {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'golden', `${name}.json`), 'utf8')) as T;
}

export function loadTenant<T = any>(slug: string): T {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'tenants', `${slug}.json`), 'utf8')) as T;
}

export function listTenants(): string[] {
  const dir = path.join(ROOT, 'tenants');
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')) : [];
}

function dig(ctx: Ctx, dotted: string): unknown {
  return dotted.split('.').reduce<unknown>((acc, k) => (acc == null ? acc : (acc as Ctx)[k]), ctx);
}

// Replace {{a.b.c}} from the context. An unresolved token is NOT silently blanked —
// it renders as [CONFIRM: a.b.c] so a missing value is visible in the draft rather
// than quietly producing an empty field.
export function render(text: string, ctx: Ctx): string {
  return text.replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, (_m, key: string) => {
    const v = dig(ctx, key);
    if (v == null || v === '') return `[CONFIRM: ${key}]`;
    return Array.isArray(v) ? v.join(', ') : String(v);
  });
}

export function renderLines(lines: string[] | string, ctx: Ctx): string[] {
  if (typeof lines === 'string') {
    const v = dig(ctx, lines.replace(/[{}]/g, ''));
    if (Array.isArray(v)) return v.map(String);
    return [render(lines, ctx)];
  }
  return lines.map((l) => render(l, ctx));
}

// Variant key for the application letter: Source x Count.
export function letterVariantKey(source: 'TC_HOLDER' | 'STC', count: 'SINGLE' | 'MULTIPLE'): string {
  return `${source}__${count}`;
}
