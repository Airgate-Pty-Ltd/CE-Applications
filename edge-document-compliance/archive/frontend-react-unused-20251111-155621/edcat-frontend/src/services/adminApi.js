import { handleResponse } from './shared.js';

export async function fetchAdminOverview() {
  const res = await fetch('/api/admin/overview');
  return handleResponse(res);
}

export async function sendTestEmail(recipient) {
  const res = await fetch('/api/notifications/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient,
      subject: 'EDCAT Test Email',
      body: '<p>This is a test email from EDCAT.</p>'
    })
  });
  return handleResponse(res);
}

export async function processEmailQueue() {
  const res = await fetch('/api/notifications/process', { method: 'POST' });
  return handleResponse(res);
}
