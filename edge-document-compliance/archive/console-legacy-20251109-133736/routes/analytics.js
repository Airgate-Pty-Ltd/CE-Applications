const express = require('express');
const router = express.Router();
const { query } = require('../database/db');
const { requireTenantContext } = require('../middleware/tenantContext');

router.use(requireTenantContext);

router.get('/accuracy', async (req, res) => {
  try {
    const { tenant } = req.tenantContext;

    const standardMetricsResult = await query(
      `SELECT
         s.id AS standard_id,
         s.name AS standard_name,
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE r.auto_verified) AS auto_verified,
         COUNT(*) FILTER (WHERE r.human_verified) AS human_verified,
         COUNT(*) FILTER (WHERE r.human_verified AND NOT r.auto_verified) AS manual_verified,
         COUNT(*) FILTER (WHERE NOT r.human_verified) AS pending_review
       FROM requirements r
       JOIN standards s ON r.requirement_set_id = s.requirement_set_id
       WHERE s.tenant_id = $1
       GROUP BY s.id, s.name
       ORDER BY s.name`,
      [tenant.tenant_id]
    );

    const profileMetricsResult = await query(
      `SELECT
         COALESCE(profile.profile_id, 'UNASSIGNED') AS profile_id,
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE r.auto_verified) AS auto_verified,
         COUNT(*) FILTER (WHERE r.human_verified) AS human_verified,
         COUNT(*) FILTER (WHERE r.human_verified AND NOT r.auto_verified) AS manual_verified,
         COUNT(*) FILTER (WHERE NOT r.human_verified) AS pending_review
       FROM requirements r
       JOIN requirement_sets rs ON r.requirement_set_id = rs.id
       JOIN standards s ON s.requirement_set_id = rs.id
       LEFT JOIN LATERAL jsonb_array_elements_text(rs.metadata -> 'associated_profiles') profile(profile_id) ON TRUE
       WHERE s.tenant_id = $1
       GROUP BY profile.profile_id
       ORDER BY profile.profile_id`,
      [tenant.tenant_id]
    );

    const standardMetrics = standardMetricsResult.rows;
    const profileMetrics = profileMetricsResult.rows;

    const totals = standardMetrics.reduce(
      (acc, row) => {
        const total = Number(row.total) || 0;
        const auto = Number(row.auto_verified) || 0;
        const human = Number(row.human_verified) || 0;
        const manual = Number(row.manual_verified) || 0;
        const pending = Number(row.pending_review) || 0;
        acc.total += total;
        acc.auto_verified += auto;
        acc.human_verified += human;
        acc.manual_verified += manual;
        acc.pending_review += pending;
        return acc;
      },
      { total: 0, auto_verified: 0, human_verified: 0, manual_verified: 0, pending_review: 0 }
    );

    const accuracy = totals.total ? (totals.human_verified / totals.total) * 100 : 0;
    const autoAccuracy = totals.total ? (totals.auto_verified / totals.total) * 100 : 0;

    res.json({
      success: true,
      overall: {
        ...totals,
        accuracy: Number(accuracy.toFixed(2)),
        auto_accuracy: Number(autoAccuracy.toFixed(2))
      },
      byStandard: standardMetrics.map((row) => ({
        standard_id: row.standard_id,
        standard_name: row.standard_name,
        total: Number(row.total) || 0,
        auto_verified: Number(row.auto_verified) || 0,
        human_verified: Number(row.human_verified) || 0,
        manual_verified: Number(row.manual_verified) || 0,
        pending_review: Number(row.pending_review) || 0,
        accuracy: (Number(row.human_verified) || 0) && (Number(row.total) || 0)
          ? Number(((Number(row.human_verified) / Number(row.total)) * 100).toFixed(2))
          : 0
      })),
      byProfile: profileMetrics.map((row) => ({
        profile_id: row.profile_id,
        total: Number(row.total) || 0,
        auto_verified: Number(row.auto_verified) || 0,
        human_verified: Number(row.human_verified) || 0,
        manual_verified: Number(row.manual_verified) || 0,
        pending_review: Number(row.pending_review) || 0,
        accuracy: (Number(row.human_verified) || 0) && (Number(row.total) || 0)
          ? Number(((Number(row.human_verified) / Number(row.total)) * 100).toFixed(2))
          : 0
      }))
    });
  } catch (error) {
    console.error('Failed to build accuracy analytics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

