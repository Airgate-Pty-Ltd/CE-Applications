import express from 'express';
import { query } from '../database/connection.js';

const router = express.Router();

router.get('/overview', async (_req, res) => {
  try {
    const [customerCount, assessmentCount, documentCount, reportCount] = await Promise.all([
      query('SELECT COUNT(*) FROM customers'),
      query('SELECT COUNT(*) FROM assessments'),
      query('SELECT COUNT(*) FROM documents WHERE parse_status = $1', ['complete']),
      query('SELECT COUNT(*) FROM reports')
    ]);

    res.json({
      success: true,
      data: {
        customers: Number(customerCount.rows[0].count),
        assessments: Number(assessmentCount.rows[0].count),
        parsedDocuments: Number(documentCount.rows[0].count),
        reports: Number(reportCount.rows[0].count)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GAP Analysis Admin Endpoints

router.get('/gap-analysis/standards', async (_req, res) => {
  try {
    // Check if standards table exists
    const tableExists = await query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'standards'`
    );
    
    if (tableExists.rowCount === 0) {
      return res.json({ success: true, standards: [] });
    }
    
    // Check which columns exist
    const columnsCheck = await query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = 'standards' 
       AND column_name IN ('code', 'description')`
    );
    
    const hasCode = columnsCheck.rows.some(r => r.column_name === 'code');
    const hasDescription = columnsCheck.rows.some(r => r.column_name === 'description');
    
    // Build SELECT clause dynamically based on available columns
    const selectColumns = ['id', 'name', 'version', 'source_type', 'is_active', 'created_at', 'updated_at'];
    if (hasCode) selectColumns.splice(2, 0, 'code'); // Insert after 'name'
    if (hasDescription) selectColumns.push('description');
    
    // Build ORDER BY clause
    const orderBy = hasCode ? 'code, version' : 'name, version';
    
    const result = await query(
      `SELECT ${selectColumns.join(', ')}
       FROM standards
       ORDER BY ${orderBy}`
    );
    
    res.json({ success: true, standards: result.rows });
  } catch (error) {
    console.error('Error loading GAP standards:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/gap-analysis/standards/:id/clauses', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT c.id, c.clause_ref, c.title, c.requirement_text, c.is_mandatory, c.category,
              COUNT(gp.id) as gap_profile_count
       FROM clauses c
       LEFT JOIN gap_profiles gp ON gp.clause_id = c.id AND gp.is_active = TRUE
       WHERE c.standard_id = $1
       GROUP BY c.id, c.clause_ref, c.title, c.requirement_text, c.is_mandatory, c.category
       ORDER BY c.clause_ref`,
      [id]
    );
    res.json({ success: true, clauses: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/gap-analysis/clauses/:id/gap-profiles', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT id, interpretation, expected_evidence, expected_documents, audit_questions,
              common_pitfalls, risk_level, criticality_notes, tags, version_label, is_active,
              created_at, updated_at
       FROM gap_profiles
       WHERE clause_id = $1
       ORDER BY version_label DESC`,
      [id]
    );
    res.json({ success: true, gapProfiles: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/gap-analysis/tenant-standards', async (req, res) => {
  try {
    const result = await query(
      `SELECT ts.id, ts.tenant_id, ts.standard_id, ts.is_enabled, ts.created_at,
              t.name as tenant_name, t.code as tenant_code,
              s.name as standard_name, s.code as standard_code
       FROM tenant_standards ts
       JOIN tenants t ON t.id = ts.tenant_id
       JOIN standards s ON s.id = ts.standard_id
       ORDER BY t.name, s.code`
    );
    res.json({ success: true, tenantStandards: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/gap-analysis/logs', async (req, res) => {
  try {
    const { limit = 50, tenant_id } = req.query;
    
    let queryText = `
      SELECT id, tenant_id, user_id, standard_code, target_docs, 
             requested_clauses, created_at
      FROM gap_analysis_logs
      WHERE 1=1
    `;
    const params = [];
    
    if (tenant_id) {
      queryText += ` AND tenant_id = $${params.length + 1}`;
      params.push(tenant_id);
    }
    
    queryText += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));
    
    const result = await query(queryText, params);
    
    res.json({
      success: true,
      logs: result.rows
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
