import { handleResponse } from './shared.js';

export async function fetchExecutiveDashboard(customerId) {
  const res = await fetch(`/api/executive/dashboard?customerId=${encodeURIComponent(customerId || '')}`);
  return handleResponse(res);
}

export async function fetchBoardReport(customerId) {
  const res = await fetch(`/api/executive/board-report?customerId=${encodeURIComponent(customerId || '')}`);
  return handleResponse(res);
}
