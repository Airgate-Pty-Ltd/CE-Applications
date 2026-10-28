const express = require('express');
const router = express.Router();
const { query } = require('../database/db');
const { requireTenantContext } = require('../middleware/tenantContext');

router.use(requireTenantContext);

function normaliseSetIds(rawIds) {
  if (!rawIds) {
    return [];
  }

  const ids = Array.isArray(rawIds)
    ? rawIds
    : String(rawIds)
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

  // Basic UUID v4 format validation to avoid SQL errors
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  return ids.filter((id) => uuidRegex.test(id));
}

async function loadAccessibleRequirementSets(tenantId, allowedCatalogIds) {
  const result = await query(
    `SELECT
         rs.id,
         rs.label,
         rs.source_type,
         rs.metadata,
         rs.updated_at,
         COALESCE(s.status, 'available') AS status,
         COALESCE(s.upload_date, rs.created_at) AS uploaded_at,
         s.parsed_at,
         (SELECT COUNT(*) FROM requirements WHERE requirement_set_id = rs.id) AS requirement_count
       FROM requirement_sets rs
       LEFT JOIN standards s ON s.requirement_set_id = rs.id
       WHERE rs.tenant_id = $1
          OR (rs.metadata ->> 'catalog_id') = ANY($2::text[])
       ORDER BY rs.label`,
    [tenantId, allowedCatalogIds]
  );

  return result.rows;
}

router.get('/sets', async (req, res) => {
  try {
    const { tenant, profile } = req.tenantContext;
    const allowedCatalogIds = Array.isArray(profile.enabled_reg_packs) ? profile.enabled_reg_packs : [];
    const sets = await loadAccessibleRequirementSets(tenant.tenant_id, allowedCatalogIds);
    res.json({ success: true, sets });
  } catch (error) {
    console.error('Error loading requirement sets:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/matrix', async (req, res) => {
  try {
    const { tenant, profile } = req.tenantContext;
    const allowedCatalogIds = Array.isArray(profile.enabled_reg_packs) ? profile.enabled_reg_packs : [];
    const accessibleSets = await loadAccessibleRequirementSets(tenant.tenant_id, allowedCatalogIds);
    const allowedSetIds = new Set(accessibleSets.map((set) => set.id));

    const { sourceType, setIds: rawSetIds, assessmentId, limit } = req.query;
    const values = [];
    const conditions = [];

    if (sourceType) {
      conditions.push(`rs.source_type = $${values.length + 1}`);
      values.push(sourceType);
    }

    let filteredSetIds = normaliseSetIds(rawSetIds);

    if (assessmentId) {
      const assessmentResult = await query(
        `SELECT standard_set_ids, regulation_set_ids, customer_set_ids
         FROM assessments
         WHERE id = $1`,
        [assessmentId]
      );

      if (assessmentResult.rows.length) {
        const {
          standard_set_ids: standardIds,
          regulation_set_ids: regulationIds,
          customer_set_ids: customerIds
        } = assessmentResult.rows[0];

        const assessmentSets = [standardIds, regulationIds, customerIds]
          .filter(Array.isArray)
          .flat()
          .map((value) => value && value.trim())
          .filter(Boolean);

        if (assessmentSets.length) {
          filteredSetIds = [...new Set([...filteredSetIds, ...assessmentSets])];
        }
      }
    }

    if (filteredSetIds.length) {
      const tenantFilteredIds = filteredSetIds.filter((id) => allowedSetIds.has(id));
      if (!tenantFilteredIds.length) {
        return res.json({ success: true, items: [] });
      }
      conditions.push(`rs.id = ANY($${values.length + 1}::uuid[])`);
      values.push(tenantFilteredIds);
    } else {
      const accessibleIdList = Array.from(allowedSetIds);
      if (!accessibleIdList.length) {
        return res.json({ success: true, items: [] });
      }
      conditions.push(`rs.id = ANY($${values.length + 1}::uuid[])`);
      values.push(accessibleIdList);
    }

    let queryText = `
      SELECT
        r.id,
        r.requirement_id,
        r.requirement_text,
        r.clause,
        r.source_name,
        r.source_type,
        rs.label AS authority,
        rs.source_type AS requirement_set_type
      FROM requirements r
      JOIN requirement_sets rs ON r.requirement_set_id = rs.id
    `;

    if (conditions.length) {
      queryText += ` WHERE ${conditions.join(' AND ')}`;
    }

    queryText += `
      ORDER BY rs.label, r.clause NULLS LAST, r.requirement_id NULLS LAST
    `;

    if (limit && Number.isFinite(Number(limit))) {
      values.push(Number(limit));
      queryText += ` LIMIT $${values.length}`;
    }

    const result = await query(queryText, values);

    const items = result.rows.map((row) => ({
      requirement_id: row.requirement_id || row.id,
      requirement_text: row.requirement_text,
      clause: row.clause,
      authority: row.authority,
      source_type: row.source_type || row.requirement_set_type,
      status: 'UNASSESSED',
      coverage: 0,
      aligned_documents: [],
      ai_insights: null
    }));

    res.json({ success: true, items });
  } catch (error) {
    console.error('Error loading library matrix:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
