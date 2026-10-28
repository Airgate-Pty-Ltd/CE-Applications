const express = require('express');
const router = express.Router();
const { query } = require('../database/db');
const { ensureRegulationSets } = require('../services/regulationFetcher');
const { requireTenantContext } = require('../middleware/tenantContext');

const formatUuidArray = (values = []) => {
  if (!values.length) return '{}';
  return `{${values.join(',')}}`;
};

const toUuidArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value
      .replace(/[{}]/g, '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
};

function isRequirementSetAccessible(set, tenantId, allowedCatalogIds) {
  if (!set) return false;

  if (set.tenant_id && set.tenant_id === tenantId) {
    return true;
  }

  const catalogId = set.metadata?.catalog_id;
  if (catalogId && allowedCatalogIds.includes(catalogId)) {
    return true;
  }

  return false;
}

async function getRequirementSetsByIds(ids = [], tenantContext) {
  if (!ids.length) return [];
  const result = await query('SELECT * FROM requirement_sets WHERE id = ANY($1::uuid[])', [ids]);

  if (!tenantContext) {
    return result.rows;
  }

  const { tenant, profile } = tenantContext;
  const allowedCatalogIds = Array.isArray(profile.enabled_reg_packs) ? profile.enabled_reg_packs : [];

  return result.rows.filter((set) => isRequirementSetAccessible(set, tenant.tenant_id, allowedCatalogIds));
}

router.use(requireTenantContext);

router.get('/', async (req, res) => {
  try {
    const { tenant, profile } = req.tenantContext;
    const allowedCatalogIds = Array.isArray(profile.enabled_reg_packs) ? profile.enabled_reg_packs : [];

    const assessmentsResult = await query(
      `SELECT id, name, owner, customer, status, progress, fulfilled_requirements, partial_requirements, gap_count,
              standard_set_ids, regulation_set_ids, customer_set_ids, started_at
       FROM assessments
       WHERE tenant_id = $1
       ORDER BY started_at DESC`,
      [tenant.tenant_id]
    );

    const assessments = assessmentsResult.rows;
    const allSetIds = new Set();
    assessments.forEach((assessment) => {
      const standardIds = toUuidArray(assessment.standard_set_ids);
      const regulationIds = toUuidArray(assessment.regulation_set_ids);
      const customerIds = toUuidArray(assessment.customer_set_ids);
      [...standardIds, ...regulationIds, ...customerIds]
        .filter(Boolean)
        .forEach((id) => allSetIds.add(id));
      assessment.standard_set_ids = standardIds;
      assessment.regulation_set_ids = regulationIds;
      assessment.customer_set_ids = customerIds;
    });

    const setLookup = new Map();
    if (allSetIds.size) {
      const setResult = await query('SELECT * FROM requirement_sets WHERE id = ANY($1::uuid[])', [Array.from(allSetIds)]);
      setResult.rows.forEach((row) => {
        if (isRequirementSetAccessible(row, tenant.tenant_id, allowedCatalogIds)) {
          setLookup.set(row.id, row);
        }
      });
    }

    const enriched = assessments.map((assessment) => ({
      ...assessment,
      requirement_sets: {
        standards: assessment.standard_set_ids.map((id) => setLookup.get(id)).filter(Boolean),
        regulations: assessment.regulation_set_ids.map((id) => setLookup.get(id)).filter(Boolean),
        customers: assessment.customer_set_ids.map((id) => setLookup.get(id)).filter(Boolean)
      }
    }));

    res.json({ success: true, assessments: enriched });
  } catch (error) {
    console.error('Error fetching assessments:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { tenant, profile } = req.tenantContext;
    const allowedCatalogIds = Array.isArray(profile.enabled_reg_packs) ? profile.enabled_reg_packs : [];

    const {
      name,
      owner,
      customer,
      notes,
      standard_ids: standardIds = [],
      regulation_ids: regulationCatalogIds = [],
      customer_set_ids: customerSetIds = []
    } = req.body;

    if (!name || !owner) {
      return res.status(400).json({ success: false, error: 'Assessment name and owner are required.' });
    }

    if (!Array.isArray(standardIds) || !Array.isArray(regulationCatalogIds) || !Array.isArray(customerSetIds)) {
      return res.status(400).json({ success: false, error: 'standard_ids, regulation_ids, and customer_set_ids must be arrays.' });
    }

    const standardSets = await getRequirementSetsByIds(standardIds, req.tenantContext);
    if (standardIds.length !== standardSets.length) {
      return res.status(400).json({ success: false, error: 'One or more standard requirement sets could not be found.' });
    }

    const customerRequirementSets = await getRequirementSetsByIds(customerSetIds, req.tenantContext);
    if (customerSetIds.length !== customerRequirementSets.length) {
      return res.status(400).json({ success: false, error: 'One or more customer requirement sets could not be found.' });
    }

    const regulationSets = await ensureRegulationSets(regulationCatalogIds);
    const filteredRegulationSets = regulationSets.filter((set) => {
      const requirementSet = set.requirementSet || set;
      return isRequirementSetAccessible(requirementSet, tenant.tenant_id, allowedCatalogIds);
    });

    if (filteredRegulationSets.length !== regulationSets.length) {
      return res.status(400).json({ success: false, error: 'Requested regulation pack is not available to this tenant.' });
    }

    const regulationSetIds = filteredRegulationSets.map((set) => (set.id ? set.id : set.requirementSet.id));

    const assessmentResult = await query(
      `INSERT INTO assessments (name, owner, customer, notes, status, standard_set_ids, regulation_set_ids, customer_set_ids, tenant_id)
       VALUES ($1, $2, $3, $4, 'IN_PROGRESS', $5::uuid[], $6::uuid[], $7::uuid[], $8)
       RETURNING *`,
      [
        name,
        owner,
        customer || null,
        notes || null,
        formatUuidArray(standardSets.map((set) => set.id)),
        formatUuidArray(regulationSetIds),
        formatUuidArray(customerRequirementSets.map((set) => set.id)),
        tenant.tenant_id
      ]
    );

    const assessment = assessmentResult.rows[0];

    res.json({
      success: true,
      assessment: {
        ...assessment,
        requirement_sets: {
          standards: standardSets,
          regulations: filteredRegulationSets.map((set) => (set.requirementSet ? set.requirementSet : set)),
          customers: customerRequirementSets
        }
      }
    });
  } catch (error) {
    console.error('Error creating assessment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { tenant, profile } = req.tenantContext;
    const allowedCatalogIds = Array.isArray(profile.enabled_reg_packs) ? profile.enabled_reg_packs : [];

    const assessmentResult = await query('SELECT * FROM assessments WHERE id = $1 AND tenant_id = $2', [req.params.id, tenant.tenant_id]);
    if (!assessmentResult.rows.length) {
      return res.status(404).json({ success: false, error: 'Assessment not found' });
    }

    const assessment = assessmentResult.rows[0];
    const standardIds = toUuidArray(assessment.standard_set_ids);
    const regulationIds = toUuidArray(assessment.regulation_set_ids);
    const customerIds = toUuidArray(assessment.customer_set_ids);

    assessment.standard_set_ids = standardIds;
    assessment.regulation_set_ids = regulationIds;
    assessment.customer_set_ids = customerIds;

    const allSetIds = [...standardIds, ...regulationIds, ...customerIds].filter(Boolean);

    const requirementSets = await getRequirementSetsByIds(allSetIds, req.tenantContext);

    const gapsResult = await query(
      `SELECT g.*, r.requirement_id, r.clause, r.requirement_text
       FROM gaps g
       JOIN requirements r ON g.requirement_id = r.id
       WHERE g.assessment_id = $1
       ORDER BY g.updated_at DESC`,
      [assessment.id]
    );

    res.json({
      success: true,
      assessment,
      requirement_sets: requirementSets,
      gaps: gapsResult.rows
    });
  } catch (error) {
    console.error('Error fetching assessment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id/rtm', async (req, res) => {
  try {
    const assessmentResult = await query('SELECT * FROM assessments WHERE id = $1', [req.params.id]);
    if (!assessmentResult.rows.length) {
      return res.status(404).json({ success: false, error: 'Assessment not found' });
    }

    const assessment = assessmentResult.rows[0];
    const standardIds = toUuidArray(assessment.standard_set_ids);
    const regulationIds = toUuidArray(assessment.regulation_set_ids);
    const customerIds = toUuidArray(assessment.customer_set_ids);
    const setIds = [...standardIds, ...regulationIds, ...customerIds].filter(Boolean);

    if (!setIds.length) {
      return res.json({ success: true, rtm: [] });
    }

    const requirementsResult = await query(
      `SELECT r.*, rs.label AS authority, rs.source_type
       FROM requirements r
       JOIN requirement_sets rs ON r.requirement_set_id = rs.id
       WHERE r.requirement_set_id = ANY($1::uuid[])
       ORDER BY rs.label, r.clause NULLS LAST, r.requirement_id NULLS LAST`,
      [setIds]
    );

    const rtm = requirementsResult.rows.map((row) => ({
      requirement_id: row.requirement_id || row.id,
      clause: row.clause,
      requirement_text: row.requirement_text,
      authority: row.authority,
      source_type: row.source_type,
      status: 'UNASSESSED',
      coverage: 0,
      aligned_documents: [],
      ai_insights: null
    }));

    res.json({ success: true, rtm });
  } catch (error) {
    console.error('Error generating RTM:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
