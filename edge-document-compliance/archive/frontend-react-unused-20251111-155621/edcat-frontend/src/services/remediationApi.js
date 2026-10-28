import { handleResponse } from './shared.js';

export async function suggestFromText(text) {
  const res = await fetch('/api/remediation/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  return handleResponse(res);
}
