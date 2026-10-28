// Capture rules for the prototype capture screens. These mirror engine/pa_capture.py, engine/pa_canonical.py,
// engine/pa_governance.py (CAR review and flags) and engine/pa_vocab.py (controlled values).
// tests/test_capture_parity.py runs these functions with Node and compares every result with the Python engine.
// The engine re-validates every record when it is saved (engine/pa_ledger.py), so these rules give quick
// feedback only. Pure functions: no DOM, no storage, no network. Messages are identical to the Python messages.
(function (root) {
  const CONSENT_STATES = ["NOTIFIED", "CONSENT_RECORDED", "CONSENT_DECLINED"];
  const SAMPLING_RESULTS = ["CONFORMING", "NONCONFORMING"];
  const EVIDENCE_RECORD_TYPES = ["document_review", "record_review", "interview", "observation"];
  const INTERVIEW_REQUIRED = ["interviewee_role", "interviewer", "date_time", "location", "method",
    "consent_state", "notes", "evidence_class"];
  const INTERVIEW_CLASSES = ["direct_statement", "corroborated_statement", "uncorroborated_statement"];
  const SAMPLING_REQUIRED = ["population_basis", "selection_method", "sample_identity", "period", "result",
    "evidence_refs", "expanded"];
  const EVIDENCE_REQUIRED = ["evidence_type", "description", "timestamp", "location", "auditor", "source_ref"];
  const PHOTO_REQUIRED = ["caption", "what_it_proves", "area_or_location", "auditor", "timestamp", "requirement_id"];
  const PHOTO_RECORD_REQUIRED = PHOTO_REQUIRED.concat(["file_name", "sha256"]);
  const CAR_REQUIRED = ["car_id", "source_system", "linked_requirement", "problem_statement", "owner", "due_date", "status"];
  const CAR_REVIEW_RESULTS = ["effective", "partially_effective", "ineffective", "recurring", "not_available", "not_applicable"];

  // ISO 8601 date, or date and time with a T or space separator.
  function isIsoDateTime(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,6})?)?)?$/.exec(String(s));
    if (!m) return false;
    const y = +m[1], mo = +m[2], d = +m[3];
    const hh = m[4] === undefined ? 0 : +m[4], mi = m[5] === undefined ? 0 : +m[5], ss = m[6] === undefined ? 0 : +m[6];
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return false;
    return hh < 24 && mi < 60 && ss < 60;
  }

  function isSha256Hex(s) { return /^[0-9a-f]{64}$/.test(String(s)); }

  function missing(rec, keys) {
    return keys.filter(k => !rec[k]).map(k => `missing field: ${k}`);
  }

  function validateInterview(rec) {
    const errs = missing(rec, INTERVIEW_REQUIRED);
    if (rec.evidence_class && !INTERVIEW_CLASSES.includes(rec.evidence_class)) errs.push("evidence_class not recognised");
    if (rec.consent_state && !CONSENT_STATES.includes(rec.consent_state)) errs.push("consent_state not recognised");
    if (rec.date_time && !isIsoDateTime(rec.date_time)) errs.push("date_time is not ISO 8601");
    if (rec.recording && rec.consent_state !== "CONSENT_RECORDED") errs.push("audio recording requires CONSENT_RECORDED");
    if (rec.transcript && !rec.transcript_reviewed_by) errs.push("transcript is not authoritative until reviewed by the auditor");
    return errs;
  }

  function validateSampling(rec) {
    const errs = SAMPLING_REQUIRED.filter(k => rec[k] === null || rec[k] === undefined || rec[k] === "")
      .map(k => `missing field: ${k}`);
    if (rec.result && !SAMPLING_RESULTS.includes(rec.result)) errs.push("result not recognised");
    if (rec.result === "NONCONFORMING" && (rec.expanded === null || rec.expanded === undefined)) {
      errs.push("nonconforming sample requires an expansion decision");
    }
    if (rec.expanded === false && !rec.expansion_reason) errs.push("no expansion requires a documented reason");
    return errs;
  }

  function validateEvidence(rec) {
    const errs = missing(rec, EVIDENCE_REQUIRED);
    if (rec.evidence_type && !EVIDENCE_RECORD_TYPES.includes(rec.evidence_type)) errs.push("evidence_type not recognised");
    if (rec.timestamp && !isIsoDateTime(rec.timestamp)) errs.push("timestamp is not ISO 8601");
    if ("file_path" in rec) errs.push("evidence records do not take a file path; files are captured as photo records");
    return errs;
  }

  // The browser reads the file and computes its SHA-256 with crypto.subtle. The file is not uploaded.
  // The page checks that a file was chosen; this rule checks the record.
  function validatePhoto(rec) {
    const errs = missing(rec, PHOTO_RECORD_REQUIRED);
    if (rec.timestamp && !isIsoDateTime(rec.timestamp)) errs.push("timestamp is not ISO 8601");
    if (rec.sha256 && !isSha256Hex(rec.sha256)) errs.push("sha256 is not a SHA-256 hex digest");
    return errs;
  }

  function validateCar(car) {
    const errs = missing(car, CAR_REQUIRED);
    if (car.auditor_result && !CAR_REVIEW_RESULTS.includes(car.auditor_result)) errs.push("auditor_result not recognised");
    if (car.due_date && car.review_date && car.created) {
      if (!isIsoDateTime(car.review_date) || !isIsoDateTime(car.created)) errs.push("bad date format");
      else if (car.review_date < car.created) errs.push("review_date precedes created");
    }
    return errs;
  }

  // today: 'YYYY-MM-DD'. Closure in another system is never treated as effective.
  function carFlags(car, today) {
    const flags = [];
    if (car.status === "closed" && !car.effectiveness_evidence) {
      flags.push("CLOSED WITHOUT EFFECTIVENESS EVIDENCE: do not assume effective");
    }
    if (car.due_date && car.status !== "closed" && car.due_date.slice(0, 10) < today) flags.push("OVERDUE");
    if (car.recurrence || car.auditor_result === "recurring" || car.auditor_result === "ineffective") {
      flags.push("RECURRING OR INEFFECTIVE: raise item risk and sampling");
    }
    if (car.status === "closed" && !car.auditor_result) flags.push("NO AUDITOR EFFECTIVENESS REVIEW RECORDED");
    return flags;
  }

  // Runs one case by kind. Used by the parity test; the capture page calls the validators directly.
  function runCase(kind, rec, today) {
    if (kind === "interview") return { errors: validateInterview(rec) };
    if (kind === "sampling") return { errors: validateSampling(rec) };
    if (kind === "evidence") return { errors: validateEvidence(rec) };
    if (kind === "photo") return { errors: validatePhoto(rec) };
    if (kind === "car") return { errors: validateCar(rec) };
    if (kind === "car_flags") return { flags: carFlags(rec, today) };
    if (kind === "sha256") return { sha256_ok: isSha256Hex(rec.sha256) };
    throw new Error("unknown kind: " + kind);
  }

  const api = {
    constants: { CONSENT_STATES, SAMPLING_RESULTS, EVIDENCE_RECORD_TYPES, INTERVIEW_REQUIRED, INTERVIEW_CLASSES,
      SAMPLING_REQUIRED, EVIDENCE_REQUIRED, PHOTO_REQUIRED, PHOTO_RECORD_REQUIRED, CAR_REQUIRED, CAR_REVIEW_RESULTS },
    isIsoDateTime, isSha256Hex, validateInterview, validateSampling, validateEvidence, validatePhoto, validateCar,
    carFlags, runCase,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CaptureRules = api;
})(typeof window !== "undefined" ? window : globalThis);
