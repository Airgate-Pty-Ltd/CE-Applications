"""Controlled vocabularies for capture records.

Shared by the engine (pa_canonical, pa_capture, pa_ledger) and the capture rules in
prototype/capture-rules.js. tests/test_capture_parity.py checks that the two sides hold the same values.

The consent and sampling values were confirmed by the owner. Changing them changes what the engine
accepts, so change them here and in capture-rules.js together, and get owner approval first.
"""

# Consent for an interview. A recording needs CONSENT_RECORDED (see pa_canonical.validate_interview).
CONSENT_STATES = ("NOTIFIED", "CONSENT_RECORDED", "CONSENT_DECLINED")

# Sampling result. NONCONFORMING requires an expansion decision.
SAMPLING_RESULTS = ("CONFORMING", "NONCONFORMING")

# Evidence records. Photos are captured by the photo record, not here.
EVIDENCE_RECORD_TYPES = ("document_review", "record_review", "interview", "observation")

INTERVIEW_CLASSES = ("direct_statement", "corroborated_statement", "uncorroborated_statement")

# Record types that the capture ledger accepts, with the prefix used in record IDs.
RECORD_TYPE_PREFIX = {"car": "CAR", "interview": "INT", "sampling": "SMP", "photo": "PHO", "evidence": "EVD",
                      "qsa_publication": "QSP", "qsa_assessment": "QAS", "qsa_finding": "QFN",
                      "qsa_finding_classification": "QCL", "audit_setup": "SET", "audit_status": "STA",
                      "qm_manual": "QMM", "qm_exclusion": "QEX", "qm_exclusion_review": "QER", "qm_review_complete": "QMC"}
