const baseHeaders = {
  'Content-Type': 'application/json'
};

async function handleResponse(response) {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Request failed');
  }
  return response.json();
}

export async function fetchReports() {
  const res = await fetch('/api/reports');
  return handleResponse(res);
}

export async function generateReport(assessmentId, reportType) {
  const res = await fetch('/api/reports/generate', {
    method: 'POST',
    headers: baseHeaders,
    body: JSON.stringify({ assessment_id: assessmentId, report_type: reportType })
  });
  const data = await handleResponse(res);
  return data.report;
}

export async function fetchLegalPages() {
  const res = await fetch('/api/legal');
  return handleResponse(res);
}

export async function fetchLegalPage(slug) {
  const res = await fetch(`/api/legal/${slug}`);
  return handleResponse(res);
}
