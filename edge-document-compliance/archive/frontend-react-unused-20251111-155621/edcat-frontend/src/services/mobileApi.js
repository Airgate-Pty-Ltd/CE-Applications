import { handleResponse } from './shared.js';

export async function registerMobileDevice(payload) {
  const res = await fetch('/api/mobile/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse(res);
}

export async function fetchMobileSync() {
  const res = await fetch('/api/mobile/sync');
  return handleResponse(res);
}
