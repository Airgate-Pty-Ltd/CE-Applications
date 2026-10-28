import express from 'express';
import { query } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Start mock audit: create session and seed questions from random clauses
router.post('/mock/start', async (req, res) => {
	try {
		const { customerId, standardId } = req.body;
		if (!customerId || !standardId) {
			return res.status(400).json({ success: false, error: 'customerId and standardId are required' });
		}
		const sessionId = uuidv4();
		await query(
			`INSERT INTO mock_audit_sessions (id, customer_id, standard_id, total_questions)
       VALUES ($1,$2,$3,$4)`,
			[sessionId, customerId, standardId, 10]
		);

		// pick 10 random clauses
		const clauses = await query(
			`SELECT id, clause_number, clause_title, clause_text, requirement_type, common_gaps
       FROM parsed_clauses WHERE standard_id = $1 ORDER BY RANDOM() LIMIT 10`,
			[standardId]
		);

		for (const c of clauses.rows) {
			const qText = `For clause ${c.clause_number} - ${c.clause_title}, provide evidence this is implemented.`;
			await query(
				`INSERT INTO audit_questions (session_id, clause_id, clause_number, clause_title, question, expected_evidence, difficulty, common_failures)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
				[
					sessionId,
					c.id,
					c.clause_number,
					c.clause_title,
					qText,
					JSON.stringify(['Procedure document', 'Records', 'Training', 'Approvals']),
					'Medium',
					c.common_gaps || null
				]
			);
		}

		const first = await query(
			`SELECT id as question_id, clause_number, clause_title, question
       FROM audit_questions WHERE session_id = $1 LIMIT 1`,
			[sessionId]
		);

		res.json({
			success: true,
			auditSessionId: sessionId,
			totalQuestions: clauses.rows.length,
			firstQuestion: first.rows[0] || null,
			message: 'Mock audit started.'
		});
	} catch (e) {
		res.status(500).json({ success: false, error: e.message });
	}
});

// Answer a question: naive scoring
router.post('/mock/answer', async (req, res) => {
	try {
		const { sessionId, questionId, response } = req.body;
		if (!sessionId || !questionId || !response) {
			return res.status(400).json({ success: false, error: 'sessionId, questionId and response are required' });
		}
		const correct = /\b(yes|provided|attached|available|see)\b/i.test(response) ? true : false;
		const score = correct ? 10 : (response.length > 20 ? 5 : 0);
		const feedback = correct
			? 'Good. Evidence appears present. Ensure records are retained.'
			: 'Evidence unclear. Provide document references and recent records.';
		await query(
			`INSERT INTO mock_audit_responses (session_id, question_id, user_response, correct, score, feedback)
       VALUES ($1,$2,$3,$4,$5,$6)`,
			[sessionId, questionId, response, correct, score, feedback]
		);
		res.json({ success: true, scoring: { correct, score, feedback } });
	} catch (e) {
		res.status(500).json({ success: false, error: e.message });
	}
});

// Complete audit and compute report
router.post('/mock/complete', async (req, res) => {
	try {
		const { sessionId } = req.body;
		if (!sessionId) return res.status(400).json({ success: false, error: 'sessionId is required' });
		const resp = await query(`SELECT score, correct FROM mock_audit_responses WHERE session_id = $1`, [sessionId]);
		const totalScore = resp.rows.reduce((sum, r) => sum + (r.score || 0), 0);
		const maxScore = Math.max(resp.rows.length, 1) * 10;
		const percent = Math.round((totalScore / maxScore) * 100);
		const passFail = percent >= 85 ? 'PASS' : 'NEEDS WORK';
		await query(
			`UPDATE mock_audit_sessions SET completed_at = NOW(), final_score = $2 WHERE id = $1`,
			[sessionId, percent]
		);
		await query(
			`INSERT INTO mock_audit_reports (session_id, total_score, pass_fail, generated_at)
       VALUES ($1,$2,$3,NOW())`,
			[sessionId, percent, passFail]
		);
		res.json({
			success: true,
			report: {
				sessionId,
				totalQuestions: resp.rows.length,
				score: `${percent}%`,
				passFail
			}
		});
	} catch (e) {
		res.status(500).json({ success: false, error: e.message });
	}
});

// Audit readiness checklist export
router.get('/prep/:customerId/:standardId', async (req, res) => {
	try {
		const { customerId, standardId } = req.params;
		const AuditPrepExporter = (await import('../services/auditPrepExporter.js')).default;
		const exporter = new AuditPrepExporter();
		const checklist = await exporter.generateAuditReadinessChecklist(customerId, standardId);
		res.download(checklist.filePath, checklist.fileName, (err) => {
			if (err) {
				console.error('[Audit] Download error:', err);
				res.status(500).json({ success: false, error: 'Failed to download checklist' });
			}
		});
	} catch (e) {
		res.status(500).json({ success: false, error: e.message });
	}
});

export default router;


