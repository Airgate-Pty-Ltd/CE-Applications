const TenantStore = require('../src/server/tenant-store');
const { provisionTenantDatabase } = require('../src/server/tenant-provisioner');

async function main() {
  const tenants = await TenantStore.listTenants();
  const tenant = tenants.find((item) => item.tenant_id === process.argv[2]) || tenants[0];
  if (!tenant) {
    console.log(JSON.stringify({ ok: false, error: 'No tenants available for provisioning' }));
    return;
  }

  const result = await provisionTenantDatabase(tenant);
  console.log(JSON.stringify({ tenant: result.tenant_id, provisioned: result.provisioned }, null, 2));
}

main().catch((error) => {
  console.error('Provision script failed:', error.message);
  process.exitCode = 1;
});

