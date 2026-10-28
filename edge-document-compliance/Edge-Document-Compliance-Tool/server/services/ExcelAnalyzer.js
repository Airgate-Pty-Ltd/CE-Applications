export function analyzeExcel(parsedJson, filename, created_at) {
  // Very basic KPI extraction by sheet names or column headers.
  // You can expand with smarter detection.
  const summary = [];
  const kpis = {};

  for (const sheetName of Object.keys(parsedJson)) {
    const rows = parsedJson[sheetName];
    if (!Array.isArray(rows) || rows.length < 2) continue;
    const headers = rows[1] || rows[0] || [];
    const lower = (headers || []).map((h) => String(h || '').toLowerCase());

    // Examples:
    if (lower.some((h) => /training|competence/.test(h))) {
      kpis.trainingRows = (kpis.trainingRows || 0) + (rows.length - 1);
      summary.push(`Detected Training/Competence data in sheet "${sheetName}".`);
    }
    if (lower.some((h) => /calibration|gauge|instrument/.test(h))) {
      kpis.calibrationRows = (kpis.calibrationRows || 0) + (rows.length - 1);
      summary.push(`Detected Calibration/Instrument data in sheet "${sheetName}".`);
    }
    if (lower.some((h) => /\bcar\b|corrective|nonconformance|ncr/.test(h))) {
      kpis.carRows = (kpis.carRows || 0) + (rows.length - 1);
      summary.push(`Detected CAR/NCR-like data in sheet "${sheetName}".`);
    }
  }

  return {
    success: true,
    file: { filename, created_at },
    kpis,
    summary: summary.length ? summary.join(" ") : "No recognizable KPI sheets detected. Provide column headers for training, calibration, or CAR/NCR to enable analytics."
  };
}

