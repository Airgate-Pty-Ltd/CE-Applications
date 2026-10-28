import {
  REGULATORY_BODIES,
  STANDARDS,
  getRegulatorsByIds,
  getStandardsByIds,
  createStandardOptionList,
  createRegulatorOptionList
} from './edcat-library.js';

const regulatorLookup = new Map(REGULATORY_BODIES.map((regulator) => [regulator.id, regulator]));
const standardLookup = new Map(STANDARDS.map((standard) => [standard.id, standard]));

function normaliseDocuments(documents = []) {
  return documents
    .filter(Boolean)
    .map((document, index) => ({
      id: document.id || document.document_id || `doc-${index + 1}`,
      name: document.name || document.document_name || 'Unlabelled Document',
      mime_type: document.type || document.document_type || null,
      source: document.source || 'user-upload',
      metadata: {
        size: document.file_size || null,
        uploaded_at: document.uploaded_at || null
      }
    }));
}

export function buildRequirementModel({
  selectedStandardIds = [],
  selectedRegulatorIds = [],
  sourceDocuments = []
} = {}) {
  const { resolved: resolvedRegulators, unknown: unknownRegulatorIds } = getRegulatorsByIds(selectedRegulatorIds);
  const { resolved: resolvedStandards, unknown: unknownStandardIds } = getStandardsByIds(selectedStandardIds);

  const requirementsFromStandards = resolvedStandards.map((standard) => ({
    id: `${standard.id}::skeleton`,
    sourceType: 'standard',
    reference: standard.code,
    title: standard.name,
    sector: standard.sector,
    status: 'pending_extraction'
  }));

  const requirementsFromRegulators = resolvedRegulators.map((regulator) => ({
    id: `${regulator.id}::skeleton`,
    sourceType: 'regulation',
    reference: regulator.name,
    title: `${regulator.name} Jurisdictional Requirements`,
    sector: regulator.sector,
    status: 'pending_extraction'
  }));

  return {
    generatedAt: new Date().toISOString(),
    regulators: resolvedRegulators,
    standards: resolvedStandards,
    requirements: [...requirementsFromStandards, ...requirementsFromRegulators],
    documents: normaliseDocuments(sourceDocuments),
    meta: {
      unknownRegulatorIds,
      unknownStandardIds,
      totalRegulators: resolvedRegulators.length,
      totalStandards: resolvedStandards.length
    }
  };
}

export function resolveAssessmentContext(regulatorIds = [], standardIds = []) {
  const regulators = regulatorIds
    .map((id) => regulatorLookup.get(id))
    .filter(Boolean);
  const standards = standardIds
    .map((id) => standardLookup.get(id))
    .filter(Boolean);

  return {
    regulators,
    standards,
    regulatorOptions: createRegulatorOptionList(),
    standardOptions: createStandardOptionList()
  };
}

export default {
  buildRequirementModel,
  resolveAssessmentContext
};

