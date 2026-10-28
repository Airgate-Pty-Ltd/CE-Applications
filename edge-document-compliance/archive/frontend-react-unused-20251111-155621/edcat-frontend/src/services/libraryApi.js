import { handleResponse } from './shared.js';

export async function searchDocuments(term) {
  const res = await fetch(`/api/library/documents?q=${encodeURIComponent(term)}`);
  return handleResponse(res);
}

export async function searchRequirements(term) {
  const res = await fetch(`/api/library/requirements?q=${encodeURIComponent(term)}`);
  return handleResponse(res);
}
