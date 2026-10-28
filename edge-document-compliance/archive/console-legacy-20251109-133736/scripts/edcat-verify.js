const TenantStore = require('../src/server/tenant-store');
const { verifyTenantDatabase } = require('../src/server/tenant-provisioner');

async function main() {
  const tenants = await TenantStore.listTenants();
  if (!tenants.length) {
    console.log(JSON.stringify({ ok: false, error: 'No tenants available for verification' }));
    return;
  }
  const tenantId = process.argv[2] || tenants[0].tenant_id;
  const tenant = tenants.find((item) => item.tenant_id === tenantId) || tenants[0];
  const result = await verifyTenantDatabase(tenant);
  console.log(JSON.stringify({ tenant: tenant.tenant_id, result }, null, 2));
}

main().catch((error) => {
  console.error('Verification script failed:', error.message);
  process.exitCode = 1;
});

