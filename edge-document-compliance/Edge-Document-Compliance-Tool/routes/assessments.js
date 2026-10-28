import express from 'express';
import { query } from '../database/connection.js';
import { AuditAnalytics, Assessment } from '../models/index.js';
import { buildRequirementModel } from '../public/js/edcat-parser.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const result = await query('SELECT * FROM assessments ORDER BY created_at DESC');
    res.json({ success: true, assessments: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      customer_id,
      assessment_name,
      scope,
      status,
      notes,
      purpose_primary,
      purpose_secondary,
      purpose_tags,
      regulatory_ids = [],
      standard_ids = [],
      requirement_model,
      source_documents = [],
      actor
    } = req.body;

    const tagsArray = Array.isArray(purpose_tags)
      ? purpose_tags
      : purpose_tags
      ? [purpose_tags]
      : null;
    const normalisedRegulatoryIds = Array.isArray(regulatory_ids)
      ? regulatory_ids.map((entry) => entry.toString())
      : regulatory_ids
      ? [regulatory_ids.toString()]
      : [];
    const normalisedStandardIds = Array.isArray(standard_ids)
      ? standard_ids.map((entry) => entry.toString())
      : standard_ids
      ? [standard_ids.toString()]
      : [];

    const generatedRequirementModel = buildRequirementModel({
      selectedStandardIds: normalisedStandardIds,
      selectedRegulatorIds: normalisedRegulatoryIds,
      sourceDocuments: Array.isArray(source_documents) ? source_documents : []
    });

    const mergedRequirementModel =
      requirement_model && typeof requirement_model === 'object'
        ? {
            ...generatedRequirementModel,
            ...requirement_model,
            meta: {
              ...generatedRequirementModel.meta,
              ...(requirement_model.meta || {})
            }
          }
        : generatedRequirementModel;

    const assessment = await Assessment.create({
      customer_id,
      assessment_name,
      scope,
      status,
      notes,
      purpose_primary,
      purpose_secondary,
      purpose_tags: tagsArray,
      regulatory_ids: normalisedRegulatoryIds,
      standard_ids: normalisedStandardIds,
      requirement_model: mergedRequirementModel
    });

    await AuditAnalytics.log({
      assessment_id: assessment.id,
      customer_id,
      actor: actor || 'system',
      action: 'assessment_created',
      details: {
        assessment_name,
        scope,
        purpose_primary,
        purpose_secondary,
        purpose_tags: tagsArray,
        regulatory_ids: normalisedRegulatoryIds,
        standard_ids: normalisedStandardIds
      }
    });

    res.status(201).json({ success: true, assessment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM assessments WHERE id = $1', [req.params.id]);
    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: 'Assessment not found' });
    }
    res.json({ success: true, assessment: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const {
      assessment_name,
      scope,
      status,
      notes,
      purpose_primary,
      purpose_secondary,
      purpose_tags,
      regulatory_ids = [],
      standard_ids = [],
      requirement_model,
      source_documents = [],
      actor
    } = req.body;

    const tagsArray = Array.isArray(purpose_tags)
      ? purpose_tags
      : purpose_tags
      ? [purpose_tags]
      : null;
    const normalisedRegulatoryIds = Array.isArray(regulatory_ids)
      ? regulatory_ids.map((entry) => entry.toString())
      : regulatory_ids
      ? [regulatory_ids.toString()]
      : [];
    const normalisedStandardIds = Array.isArray(standard_ids)
      ? standard_ids.map((entry) => entry.toString())
      : standard_ids
      ? [standard_ids.toString()]
      : [];

    const generatedRequirementModel = buildRequirementModel({
      selectedStandardIds: normalisedStandardIds,
      selectedRegulatorIds: normalisedRegulatoryIds,
      sourceDocuments: Array.isArray(source_documents) ? source_documents : []
    });

    const mergedRequirementModel =
      requirement_model && typeof requirement_model === 'object'
        ? {
            ...generatedRequirementModel,
            ...requirement_model,
            meta: {
              ...generatedRequirementModel.meta,
              ...(requirement_model.meta || {})
            }
          }
        : generatedRequirementModel;

    const assessment = await Assessment.update(req.params.id, {
      assessment_name,
      scope,
      status,
      notes,
      purpose_primary,
      purpose_secondary,
      purpose_tags: tagsArray,
      regulatory_ids: normalisedRegulatoryIds,
      standard_ids: normalisedStandardIds,
      requirement_model: mergedRequirementModel
    });

    if (!assessment) {
      return res.status(404).json({ success: false, error: 'Assessment not found' });
    }

    await AuditAnalytics.log({
      assessment_id: req.params.id,
      customer_id: assessment.customer_id,
      actor: actor || 'system',
      action: 'assessment_updated',
      details: {
        assessment_name,
        scope,
        status,
        purpose_primary,
        purpose_secondary,
        purpose_tags: tagsArray,
        regulatory_ids: normalisedRegulatoryIds,
        standard_ids: normalisedStandardIds
      }
    });

    res.json({ success: true, assessment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM assessments WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

