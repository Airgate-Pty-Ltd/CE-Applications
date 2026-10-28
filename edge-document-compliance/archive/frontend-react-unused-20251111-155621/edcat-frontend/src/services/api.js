const baseHeaders = {
  'Content-Type': 'application/json'
};

async function handleResponse(response) {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Request failed');
  }
  return response.json();
}

export async function fetchCustomers() {
  const res = await fetch('/api/customers');
  return handleResponse(res);
}

export async function fetchAssessments() {
  const res = await fetch('/api/assessments');
  return handleResponse(res);
}

export async function fetchDocuments() {
  const res = await fetch('/api/documents');
  return handleResponse(res);
}

export async function uploadDocument(formData) {
  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  });
  return handleResponse(res);
}

export async function triggerParsePending() {
  const res = await fetch('/api/documents/parse-pending', {
    method: 'POST',
    headers: baseHeaders
  });
  return handleResponse(res);
}
