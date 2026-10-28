/**
 * API Discovery
 * Probes regulator domains for OpenAPI, RSS, and other API surfaces
 */

import fetch from 'node-fetch';
import { query } from '../../database/connection.js';

const CANDIDATE_PATHS = [
  '/.well-known/openapi.json',
  '/openapi.json',
  '/openapi.yaml',
  '/swagger.json',
  '/api-docs',
  '/api/docs',
  '/swagger-ui',
  '/docs',
  '/api'
];

const FEED_PATHS = [
  '/rss.xml',
  '/feed',
  '/feeds',
  '/news/rss',
  '/updates/rss'
];

/**
 * Discover API endpoints for a regulatory source
 */
export async function discoverForSource(sourceId, baseDomain) {
  const results = [];
  const base = `https://${baseDomain}`;
  const ua = 'Conform-Edge-Discovery/1.0';

  // 1) Try OpenAPI-like endpoints
  for (const p of CANDIDATE_PATHS) {
    const url = base + p;
    try {
      const r = await fetch(url, {
        headers: { 'user-agent': ua, accept: 'application/json,*/*' },
        redirect: 'follow',
        timeout: 15000
      });

      if (!r.ok) continue;

      const ct = (r.headers.get('content-type') || '').toLowerCase();
      if (ct.includes('json') || p.endsWith('.json')) {
        const j = await r.json().catch(() => null);
        if (j && (j.openapi || j.swagger || j.paths)) {
          results.push({
            kind: 'openapi',
            baseUrl: base,
            openapiUrl: url,
            openapiJson: j,
            auth: detectAuth(j),
            rateLimit: detectRateLimit(j),
            status: 'usable',
            notes: 'OpenAPI-like document discovered'
          });
          break; // best case found
        }
      } else if (ct.includes('yaml') || p.endsWith('.yaml')) {
        results.push({
          kind: 'openapi',
          baseUrl: base,
          openapiUrl: url,
          status: 'partial',
          notes: 'YAML OpenAPI discovered; add YAML parser to import'
        });
        break;
      }
    } catch (err) {
      // ignore and continue
    }
  }

  // 2) Try common RSS feeds
  for (const p of FEED_PATHS) {
    const url = base + p;
    try {
      const r = await fetch(url, {
        headers: { 'user-agent': ua, accept: 'application/rss+xml,application/atom+xml,*/*' },
        redirect: 'follow',
        timeout: 15000
      });

      if (!r.ok) continue;

      const ct = (r.headers.get('content-type') || '').toLowerCase();
      if (ct.includes('rss') || ct.includes('atom') || ct.includes('xml')) {
        results.push({
          kind: 'rss',
          baseUrl: base,
          status: 'usable',
          notes: `Feed detected at ${url}`
        });
        break;
      }
    } catch (err) {
      // ignore
    }
  }

  // 3) Fallback fingerprint (HTML/PDF)
  results.push({
    kind: 'html',
    baseUrl: base,
    status: 'unknown',
    notes: 'No OpenAPI/RSS discovered; use HTML/PDF adapters'
  });

  // Persist
  for (const res of results) {
    await upsertEndpoint(sourceId, res);
  }

  return results;
}

function detectAuth(openapi) {
  try {
    const sec = openapi.components?.securitySchemes || {};
    const keys = Object.keys(sec);
    if (!keys.length) return 'none';
    const scheme = sec[keys[0]];
    if (!scheme) return 'none';
    if (scheme.type === 'apiKey') return 'apiKey';
    if (scheme.type === 'http' && scheme.scheme === 'basic') return 'basic';
    if (scheme.type === 'oauth2') return 'oauth2';
    return 'unknown';
  } catch (err) {
    return 'unknown';
  }
}

function detectRateLimit(openapi) {
  const x = openapi['x-rateLimit'] || openapi['x-ratelimit-limit'] || openapi['x-throttling'];
  return typeof x === 'string' ? x : undefined;
}

async function upsertEndpoint(sourceId, r) {
  await query(
    `INSERT INTO edcat.reg_api_endpoints(source_id, kind, base_url, openapi_url, openapi_json, auth, rate_limit, status, last_checked, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
     ON CONFLICT (source_id, kind, base_url)
     DO UPDATE SET openapi_url = EXCLUDED.openapi_url,
                   openapi_json = EXCLUDED.openapi_json,
                   auth = EXCLUDED.auth,
                   rate_limit = EXCLUDED.rate_limit,
                   status = EXCLUDED.status,
                   last_checked = NOW(),
                   notes = EXCLUDED.notes`,
    [
      sourceId,
      r.kind,
      r.baseUrl,
      r.openapiUrl || null,
      r.openapiJson ? JSON.stringify(r.openapiJson) : null,
      r.auth || null,
      r.rateLimit || null,
      r.status,
      r.notes || null
    ]
  );
}

