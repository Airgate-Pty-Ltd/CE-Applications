import { handleResponse } from './shared.js';

export async function fetchMarketplace() {
  const res = await fetch('/api/marketplace');
  return handleResponse(res);
}

export async function installMarketplaceItem(id) {
  const res = await fetch(`/api/marketplace/install/${id}`, {
    method: 'POST'
  });
  return handleResponse(res);
}
