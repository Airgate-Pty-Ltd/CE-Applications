const express = require('express');
const router = express.Router();
const path = require('path');
const { query, transaction } = require('../database/db');
const { uploadStandard, handleUploadError } = require('../middleware/upload');
const { requireTenantContext } = require('../middleware/tenantContext');
const { parsePDFWithStructure } = require('../services/pdfParser');
const { parseDOCXWithStructure } = require('../services/docxParser');
const { extractRequirements } = require('../services/requirementExtractor');
const requirementLearning = require('../services/requirementLearning');

const SUPPORTED_EXTENSIONS = ['.pdf', '.doc', '.docx'];

router.use(requireTenantContext);

router.get('/', async (_req, res) => {
  try {
    const { tenant } = _req.tenantContext;

    const result = await query(
      `SELECT s.*, rs.label AS requirement_set_label, rs.source_type AS requirement_set_type, rs.metadata
       FROM standards s
       LEFT JOIN requirement_sets rs ON s.requirement_set_id = rs.id
       WHERE s.tenant_id = $1
       ORDER BY s.upload_date DESC`,
      [tenant.tenant_id]
    );

    res.json({ success: true, standards: result.rows });
  } catch (error) {
    console.error('Error fetching standards:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/upload', uploadStandard, handleUploadError, async (req, res) => {
  try {
    const { tenant } = req.tenantContext;
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const { name, title, version, issuing_body, category, profile_id } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Standard name is required' });
    }

    const extension = path.extname(req.file.originalname).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(extension)) {
      return res.status(400).json({ success: false, error: `Unsupported file format: ${extension}` });
    }

    const sourceType = category === 'Customer Requirement' ? 'customer' : 'standard';
    const metadata = {
      category: category || null,
      issuing_body: issuing_body || null,
      version: version || null,
      original_filename: req.file.originalname,
      tenant_id: tenant.tenant_id,
      associated_profiles: profile_id ? [profile_id] : []
    };

    const requirementSetResult = await query(
      `INSERT INTO requirement_sets (label, source_type, metadata, tenant_id)
       VALUES ($1, $2, $3::jsonb, $4)
       RETURNING *`,
      [name, sourceType, JSON.stringify(metadata), tenant.tenant_id]
    );

    const requirementSet = requirementSetResult.rows[0];

    const standardResult = await query(
      `INSERT INTO standards (name, title, version, issuing_body, category, source_type, file_path, file_size, status, requirement_set_id, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'uploaded', $9, $10)
       RETURNING *`,
      [
        name,
        title,
        version,
        issuing_body,
        category,
        sourceType,
        req.file.path,
        req.file.size,
        requirementSet.id,
        tenant.tenant_id
      ]
    );

    const standard = standardResult.rows[0];

    parseStandardAsync({
      tenantId: tenant.tenant_id,
      standardId: standard.id,
      requirementSetId: requirementSet.id,
      filePath: req.file.path,
      fileExtension: extension,
      sourceName: name,
      sourceType
    });

    res.json({
      success: true,
      standard,
      requirement_set: requirementSet,
      message: 'Standard uploaded successfully. Parsing requirements in background.'
    });
  } catch (error) {
    console.error('Error uploading standard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

async function parseStandardAsync({ tenantId, standardId, requirementSetId, filePath, fileExtension, sourceName, sourceType }) {
  try {
    await query(`UPDATE standards SET status = 'parsing' WHERE id = $1`, [standardId]);

    let parsedContent;
    if (fileExtension === '.pdf') {
      parsedContent = await parsePDFWithStructure(filePath);
    } else {
      parsedContent = await parseDOCXWithStructure(filePath);
    }

    const requirements = extractRequirements(parsedContent, sourceName).map((req) => ({
      requirement_id: req.requirement_id,
      clause: req.clause,
      requirement_text: req.requirement_text,
      category: req.category,
      keywords: req.keywords || [],
      source_name: sourceName,
      source_type: sourceType
    }));

    const learnedPatterns = await requirementLearning.getLearnedPatternSet();

    await transaction(async (client) => {
      for (const requirement of requirements) {
        const normalizedText = requirementLearning.normalise(requirement.requirement_text);
        const autoVerified = learnedPatterns.has(normalizedText);
        await client.query(
          `INSERT INTO requirements
             (requirement_set_id, requirement_id, clause, requirement_text, source_name, source_type, category, keywords, human_verified)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            requirementSetId,
            requirement.requirement_id,
            requirement.clause,
            requirement.requirement_text,
            requirement.source_name,
            requirement.source_type,
            requirement.category,
            requirement.keywords,
            autoVerified
          ]
        );
      }
    });

    await query(
      `UPDATE standards SET status = 'parsed', parsed_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [standardId]
    );

    await query(
      `UPDATE requirement_sets
         SET metadata = metadata || jsonb_build_object('tenant_id', $2),
             updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [requirementSetId, tenantId]
    );
  } catch (error) {
    console.error(`Error parsing standard ${standardId}:`, error);
    await query(`UPDATE standards SET status = 'error' WHERE id = $1`, [standardId]);
  }
}

router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT s.*, rs.label AS requirement_set_label, rs.id AS requirement_set_id, rs.source_type
       FROM standards s
       LEFT JOIN requirement_sets rs ON s.requirement_set_id = rs.id
       WHERE s.id = $1`,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: 'Standard not found' });
    }

    const standard = result.rows[0];
    const requirements = standard.requirement_set_id
      ? (await query(
          'SELECT * FROM requirements WHERE requirement_set_id = $1 ORDER BY clause NULLS LAST, requirement_id NULLS LAST',
          [standard.requirement_set_id]
        )).rows
      : [];

    res.json({ success: true, standard, requirements });
  } catch (error) {
    console.error('Error fetching standard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id/requirements', async (req, res) => {
  try {
    const standard = await query('SELECT requirement_set_id FROM standards WHERE id = $1', [req.params.id]);

    if (!standard.rows.length || !standard.rows[0].requirement_set_id) {
      return res.json({ success: true, requirements: [] });
    }

    const result = await query(
      'SELECT * FROM requirements WHERE requirement_set_id = $1 ORDER BY clause NULLS LAST, requirement_id NULLS LAST',
      [standard.rows[0].requirement_set_id]
    );

    res.json({ success: true, requirements: result.rows });
  } catch (error) {
    console.error('Error fetching requirements:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/requirements/review', async (req, res) => {
  try {
    const { tenant } = req.tenantContext;
    const { updates } = req.body;

    if (!Array.isArray(updates) || !updates.length) {
      return res.status(400).json({ success: false, error: 'updates array is required' });
    }

    const standardResult = await query('SELECT requirement_set_id, tenant_id FROM standards WHERE id = $1', [req.params.id]);
    if (!standardResult.rows.length) {
      return res.status(404).json({ success: false, error: 'Standard not found' });
    }

    const standard = standardResult.rows[0];
    if (standard.tenant_id !== tenant.tenant_id) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const requirementTextsResult = await query(
      'SELECT id, requirement_text FROM requirements WHERE requirement_set_id = $1',
      [standard.requirement_set_id]
    );
    const requirementTextMap = new Map(requirementTextsResult.rows.map((row) => [row.id, row.requirement_text]));

    for (const update of updates) {
      if (!update.requirement_id) {
        continue;
      }

      await query(
        `UPDATE requirements
           SET human_verified = $1,
               review_notes = $2,
               last_reviewed_at = CURRENT_TIMESTAMP
         WHERE id = $3 AND requirement_set_id = $4`,
        [Boolean(update.human_verified), update.review_notes || null, update.requirement_id, standard.requirement_set_id]
      );

      const requirementText = requirementTextMap.get(update.requirement_id);
      if (requirementText) {
        await requirementLearning.recordFeedback(requirementText, Boolean(update.human_verified));
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving requirement review:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
