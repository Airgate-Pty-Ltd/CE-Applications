import express from 'express';
import { query } from '../database/connection.js';

const router = express.Router();

// Basic predictions based on similar tenants (sector) historical gaps
router.get('/gaps/:customerId/:standardId', async (req, res) => {
	try {
		const { customerId, standardId } = req.params;
		// sector lookup (if exists)
		const cust = await query(`SELECT sector FROM tenants WHERE id = $1`, [customerId]).catch(() => ({ rows: [] }));
		const sector = cust.rows?.[0]?.sector || null;

		// find similar tenants
		const similar = sector
			? await query(`SELECT id FROM tenants WHERE sector = $1 AND id != $2`, [sector, customerId])
			: { rows: [] };
		const similarIds = similar.rows.map(r => r.id);

		// aggregate gaps over similar tenants (using correlation matrix)
		let predictions = [];
		if (similarIds.length > 0) {
			const agg = await query(
				`SELECT pc.clause_number, COUNT(*) AS gap_count
         FROM clause_correlation_matrix ccm
         JOIN parsed_clauses pc ON ccm.clause_id = pc.id
         WHERE ccm.tenant_id = ANY($1) AND ccm.standard_id = $2 AND ccm.compliance_status IN ('none','partial')
         GROUP BY pc.clause_number
         ORDER BY gap_count DESC
         LIMIT 15`,
				[similarIds, standardId]
			);
			predictions = agg.rows.map(r => ({
				clauseNumber: r.clause_number,
				predictedLikelihood: Math.min(100, Math.round((Number(r.gap_count) / similarIds.length) * 100)),
				reason: `${r.gap_count} of ${similarIds.length} similar orgs had issues`,
				recommendation: 'Review this clause with your team before your audit'
			}));
		}

		// priorities (simple: by likelihood)
		const priorities = predictions
			.map(p => ({
				clauseNumber: p.clauseNumber,
				priority: p.predictedLikelihood > 75 ? 'CRITICAL' : p.predictedLikelihood > 50 ? 'HIGH' : 'MEDIUM',
				score: p.predictedLikelihood,
				whyImportant: p.reason,
				action: 'Strengthen procedure and collect evidence'
			}))
			.sort((a, b) => b.score - a.score);

		res.json({
			success: true,
			predictions,
			priorities: priorities.slice(0, 10),
			message: `Predicted gaps based on ${similarIds.length} similar organizations`
		});
	} catch (e) {
		res.status(500).json({ success: false, error: e.message });
	}
});

export default router;


