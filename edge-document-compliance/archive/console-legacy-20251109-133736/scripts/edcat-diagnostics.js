#!/usr/bin/env node
/**
 * EDCAT Diagnostics Script
 *
 * Runs a suite of API checks against the deployed environment to surface
 * broken endpoints, missing tenant context, and failing dependencies.
 *
 * Usage:
 *   node scripts/edcat-diagnostics.js [baseUrl] [tenantId]
 *
 * Defaults:
 *   baseUrl  = process.env.EDCAT_BASE_URL || 'http://localhost:3000'
 *   tenantId = process.env.EDCAT_TENANT_ID || 'faa-nw'
 */

const fs = require('fs');
const path = require('path');

const BASE_URL =
  process.argv[2] ||
  process.env.EDCAT_BASE_URL ||
  'http://localhost:3000';

const TENANT_ID =
  process.argv[3] ||
  process.env.EDCAT_TENANT_ID ||
  'faa-nw';

const HEADERS = {
  'x-tenant-id': TENANT_ID
};

const apiChecks = [
  { label: 'Tenants List', method: 'GET', path: '/api/edcat/tenants-list' },
  { label: 'Tenant Detail', method: 'GET', path: `/api/edcat/tenants/${TENANT_ID}` },
  { label: 'Profiles', method: 'GET', path: '/api/tenants/profiles' },
  { label: 'Standards', method: 'GET', path: '/api/standards' },
  { label: 'Assessments', method: 'GET', path: '/api/assessments' },
  { label: 'Library Sets', method: 'GET', path: '/api/library/sets' },
  { label: 'Analytics Accuracy', method: 'GET', path: '/api/analytics/accuracy' },
  { label: 'Command Center', method: 'GET', path: '/api/command-center/summary' },
  { label: 'Regulatory Sync', method: 'POST', path: '/api/regulatory/sync', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenant_id: TENANT_ID }) }
];

function logHeading(title) {
  console.log('\n=== ' + title + ' ===');
}

async function request(method, url, { headers = {}, body } = {}) {
  const response = await fetch(url, { method, headers, body });
  const text = await response.text();
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch (error) {
    payload = text;
  }

  return { response, payload };
}

async function runApiCheck(check) {
  const url = `${BASE_URL}${check.path}`;
  const headers = { ...check.headers, ...HEADERS };

  try {
    const { response, payload } = await request(check.method, url, { headers, body: check.body });

    const result = {
      label: check.label,
      method: check.method,
      path: check.path,
      status: response.status,
      ok: response.ok,
      error: null,
      payload
    };

    if (!response.ok) {
      result.error = payload?.error || response.statusText;
    }

    return result;
  } catch (error) {
    return {
      label: check.label,
      method: check.method,
      path: check.path,
      status: null,
      ok: false,
      error: error.message,
      payload: null
    };
  }
}

async function runStaticChecks() {
  const url = `${BASE_URL}/Modules/edcat/ui/edcat.html?tenant_id=${TENANT_ID}`;
  const { response, payload } = await request('GET', url, {});

  return {
    label: 'Runtime HTML',
    status: response.status,
    ok: response.ok,
    error: response.ok ? null : `Failed to fetch runtime HTML (${response.status})`,
    payloadSummary: response.ok ? `HTML length: ${typeof payload === 'string' ? payload.length : 0}` : null
  };
}

async function main() {
  logHeading('EDCAT Diagnostics');
  console.log(`Base URL : ${BASE_URL}`);
  console.log(`Tenant ID: ${TENANT_ID}`);

  logHeading('API Checks');
  const apiResults = [];
  for (const check of apiChecks) {
    /* eslint-disable no-await-in-loop */
    const result = await runApiCheck(check);
    apiResults.push(result);
    const statusLabel = result.ok ? 'PASS' : 'FAIL';
    console.log(
      `${statusLabel.padEnd(5)} ${result.method.padEnd(6)} ${check.path} -> ${
        result.status !== null ? result.status : 'error'
      } ${result.error ? '- ' + result.error : ''}`
    );
  }

  logHeading('Static Asset Check');
  const staticResult = await runStaticChecks();
  console.log(
    `${staticResult.ok ? 'PASS' : 'FAIL'} Runtime HTML (${staticResult.status}) ${
      staticResult.error || staticResult.payloadSummary || ''
    }`
  );

  const summary = {
    baseUrl: BASE_URL,
    tenantId: TENANT_ID,
    timestamp: new Date().toISOString(),
    results: {
      api: apiResults,
      runtime: staticResult
    }
  };

  const outputPath = path.join(process.cwd(), 'diagnostics-report.json');
  fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));
  logHeading('Summary');
  console.log(`Report written to ${outputPath}`);

  const failing = apiResults.filter((result) => !result.ok);
  if (!staticResult.ok) {
    failing.push(staticResult);
  }

  if (failing.length) {
    console.log('\nFailures Detected:');
    failing.forEach((item) => {
      console.log(`- ${item.label}: ${item.error || 'See report for details'}`);
    });
    process.exitCode = 1;
  } else {
    console.log('\nAll checks passed.');
  }
}

main().catch((error) => {
  console.error('Diagnostics script crashed:', error);
  process.exitCode = 1;
});

