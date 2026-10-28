import { handleResponse } from './shared.js';

export async function fetchTenantConfig(customerId) {
  const res = await fetch(`/api/config/tenant/${customerId}`);
  return handleResponse(res);
}

export async function updateTenantConfig(customerId, config) {
  const res = await fetch(`/api/config/tenant/${customerId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  return handleResponse(res);
}
