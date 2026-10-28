import { handleResponse } from './shared.js';

export async function fetchAnalyticsOverview() {
  const res = await fetch('/api/analytics/overview');
  return handleResponse(res);
}

export async function fetchAnalyticsTrend() {
  const res = await fetch('/api/analytics/trend');
  return handleResponse(res);
}
