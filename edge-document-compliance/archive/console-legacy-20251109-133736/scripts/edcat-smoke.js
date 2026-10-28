const path = require('path');
const TenantStore = require('../src/server/tenant-store');

async function runSmokeTest(label, overrides = {}) {
  const payload = {
    tenant_name: `${label} Tenant`,
    tenant_type: 'enterprise',
    country: 'United States',
    allowed_profiles: ['PROFILE_ENTERPRISE_AEROSPACE_FULL'],
    profile_id: 'PROFILE_ENTERPRISE_AEROSPACE_FULL',
    branding: {
      display_name: `${label} Display`
    },
    ...overrides
  };

  const saved = await TenantStore.upsertTenant(payload);
  const tenants = await TenantStore.listTenants();

  return {
    savedTenant: saved.tenant_id,
    totalTenants: tenants.length
  };
}

async function main() {
  const label = process.argv[2] || 'QA';
  const result = await runSmokeTest(label);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error('Smoke test failed:', error);
  process.exitCode = 1;
});

