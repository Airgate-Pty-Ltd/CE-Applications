// Maps a canonical Data_Field key (snake_case, matching the DIM snapshot keys) to
// its column on "PmaCase" and its value kind. This is the single place that knows
// how an intake field lands on the case record.

export type FieldKind = 'text' | 'boolean' | 'string_array';

export interface FieldSpec {
  fieldKey: string;
  column: string; // PmaCase column (camelCase)
  kind: FieldKind;
  label: string;
}

export const FIELD_REGISTRY: Record<string, FieldSpec> = {
  stc_number: { fieldKey: 'stc_number', column: 'stcNumber', kind: 'text', label: 'STC number' },
  tc_number: { fieldKey: 'tc_number', column: 'tcNumber', kind: 'text', label: 'TC number' },
  tc_holder: { fieldKey: 'tc_holder', column: 'tcHolder', kind: 'text', label: 'TC holder' },
  license_agreement_present: { fieldKey: 'license_agreement_present', column: 'licenseAgreementPresent', kind: 'boolean', label: 'License/assist letter present' },
  compliance_data_present: { fieldKey: 'compliance_data_present', column: 'complianceDataPresent', kind: 'boolean', label: 'Compliance/identicality data present' },
  applicant_legal_name: { fieldKey: 'applicant_legal_name', column: 'applicantLegalName', kind: 'text', label: 'Applicant legal name' },
  manufacturing_address: { fieldKey: 'manufacturing_address', column: 'manufacturingAddress', kind: 'text', label: 'Manufacturing facility address' },
  faa_submission_office: { fieldKey: 'faa_submission_office', column: 'faaSubmissionOffice', kind: 'text', label: 'FAA submission office' },
  qms_manual_number: { fieldKey: 'qms_manual_number', column: 'qmsManualNumber', kind: 'text', label: 'QMS manual number' },
  qms_manual_revision: { fieldKey: 'qms_manual_revision', column: 'qmsManualRevision', kind: 'text', label: 'QMS manual revision' },
  qms_manual_date: { fieldKey: 'qms_manual_date', column: 'qmsManualDate', kind: 'text', label: 'QMS manual date' },
  marking_scheme_ref: { fieldKey: 'marking_scheme_ref', column: 'markingSchemeRef', kind: 'text', label: 'Marking scheme reference' },
  ica_disposition_stated: { fieldKey: 'ica_disposition_stated', column: 'icaDispositionStated', kind: 'boolean', label: 'ICA disposition stated' },
  ad_impact_addressed: { fieldKey: 'ad_impact_addressed', column: 'adImpactAddressed', kind: 'boolean', label: 'AD impact addressed' },
  signatory_name: { fieldKey: 'signatory_name', column: 'signatoryName', kind: 'text', label: 'Signatory name' },
  signatory_title: { fieldKey: 'signatory_title', column: 'signatoryTitle', kind: 'text', label: 'Signatory title' },
  pma_part_numbers: { fieldKey: 'pma_part_numbers', column: 'pmaPartNumbers', kind: 'string_array', label: 'PMA part numbers' },
  oem_part_numbers: { fieldKey: 'oem_part_numbers', column: 'oemPartNumbers', kind: 'string_array', label: 'OEM part numbers' },
  letter_stc_number: { fieldKey: 'letter_stc_number', column: 'letterStcNumber', kind: 'text', label: 'STC number (letter)' },
  supplement_stc_number: { fieldKey: 'supplement_stc_number', column: 'supplementStcNumber', kind: 'text', label: 'STC number (supplement)' },
  letter_model_eligibility: { fieldKey: 'letter_model_eligibility', column: 'letterModelEligibility', kind: 'text', label: 'Model eligibility (letter)' },
  supplement_model_eligibility: { fieldKey: 'supplement_model_eligibility', column: 'supplementModelEligibility', kind: 'text', label: 'Model eligibility (supplement)' },
};

// Which fields each uploaded document type is expected to yield (guided intake).
export const DOC_TYPE_FIELDS: Record<string, string[]> = {
  STC: ['stc_number', 'tc_holder', 'letter_model_eligibility'],
  ASSIST_LETTER: ['stc_number', 'tc_holder', 'license_agreement_present'],
  TC_HOLDER_LETTER: ['tc_number', 'tc_holder', 'license_agreement_present'],
  MASTER_DRAWING_LIST: ['pma_part_numbers', 'oem_part_numbers'],
  DRAWING: ['marking_scheme_ref', 'pma_part_numbers'],
  TEST_REPORT: ['compliance_data_present'],
  QMS_MANUAL_EXCERPT: ['qms_manual_number', 'qms_manual_revision', 'qms_manual_date'],
  OTHER: [],
};

export function coerce(kind: FieldKind, raw: unknown): unknown {
  if (kind === 'boolean') {
    if (typeof raw === 'boolean') return raw;
    if (typeof raw === 'string') return ['true', 'yes', 'y', '1', 'on'].includes(raw.trim().toLowerCase());
    return Boolean(raw);
  }
  if (kind === 'string_array') {
    if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean);
    if (typeof raw === 'string') return raw.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
    return [];
  }
  return raw == null ? null : String(raw);
}
