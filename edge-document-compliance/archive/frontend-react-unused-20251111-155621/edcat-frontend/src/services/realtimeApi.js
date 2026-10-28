import { handleResponse } from './shared.js';

export async function fetchRealtimeStatus() {
  const res = await fetch('/api/realtime/status');
  return handleResponse(res);
}
