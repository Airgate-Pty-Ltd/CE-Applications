import express from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { RegulatorySource, RegulatorySourceDocument } from '../models/index.js';
import RegulatoryIngestService from '../services/regulatoryIngest.js';

const router = express.Router();

const standardsUploadDir = path.join(process.cwd(), 'edcat-backend', 'uploads', 'standards');
if (!fs.existsSync(standardsUploadDir)) {
  fs.mkdirSync(standardsUploadDir, { recursive: true });
}

const customerRequirementsUploadDir = path.join(process.cwd(), 'edcat-backend', 'uploads', 'customer-requirements');
if (!fs.existsSync(customerRequirementsUploadDir)) {
  fs.mkdirSync(customerRequirementsUploadDir, { recursive: true });
}

const standardsStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, standardsUploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`)
});

const standardsUpload = multer({ storage: standardsStorage, limits: { fileSize: 25 * 1024 * 1024 } });
const customerRequirementStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, customerRequirementsUploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`)
});
const customerRequirementUpload = multer({
  storage: customerRequirementStorage,
  limits: { fileSize: 25 * 1024 * 1024 }
});
const ingestionUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const validate = (validations) => async (req, res, next) => {
  await Promise.all(validations.map((validation) => validation.run(req)));
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

router.get('/regulators', async (_req, res) => {
  try {
    const regulators = await RegulatorySource.listByType(['regulator', 'regulatory']);
    res.json({ success: true, regulators });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/standards', async (_req, res) => {
  try {
    const standards = await RegulatorySource.listByType(['standard']);
    const enriched = await Promise.all(
      standards.map(async (standard) => {
        const documents = await RegulatorySourceDocument.listBySource(standard.id);
        return {
          ...standard,
          documents
        };
      })
    );
    res.json({ success: true, standards: enriched });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/customer-requirements', async (_req, res) => {
  try {
    const customerRequirements = await RegulatorySource.listByType(['customer_requirement']);
    const enriched = await Promise.all(
      customerRequirements.map(async (requirement) => {
        const documents = await RegulatorySourceDocument.listBySource(requirement.id);
        return {
          ...requirement,
          documents
        };
      })
    );
    res.json({ success: true, customerRequirements: enriched });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post(
  '/regulators',
  validate([
    body('name').isString().notEmpty(),
    body('region').optional().isString(),
    body('description').optional().isString()
  ]),
  async (req, res) => {
    try {
      const regulator = await RegulatorySource.create({
        ...req.body,
        source_type: 'regulator'
      });
      res.status(201).json({ success: true, regulator });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.post(
  '/standards',
  validate([
    body('name').isString().notEmpty(),
    body('region').optional().isString(),
    body('version_label').optional().isString(),
    body('revision_date').optional().isISO8601().toDate(),
    body('description').optional().isString()
  ]),
  async (req, res) => {
    try {
      const standard = await RegulatorySource.create({
        ...req.body,
        source_type: 'standard'
      });
      res.status(201).json({ success: true, standard });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.post(
  '/customer-requirements',
  validate([
    body('name').isString().notEmpty(),
    body('description').optional().isString()
  ]),
  async (req, res) => {
    try {
      const customerRequirement = await RegulatorySource.create({
        ...req.body,
        source_type: 'customer_requirement'
      });
      res.status(201).json({ success: true, customerRequirement });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.post(
  '/standards/:id/upload',
  standardsUpload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'file payload required' });
      }

      const { id } = req.params;
      const relativePath = `/uploads/standards/${req.file.filename}`;

      await RegulatorySourceDocument.create({
        regulatory_source_id: id,
        document_name: req.file.originalname,
        file_path: relativePath,
        file_size: req.file.size,
        uploaded_by: req.body.uploaded_by || 'system'
      });

      const documents = await RegulatorySourceDocument.listBySource(id);
      res.status(201).json({ success: true, documents });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.post(
  '/customer-requirements/:id/upload',
  customerRequirementUpload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'file payload required' });
      }

      const { id } = req.params;
      const relativePath = `/uploads/customer-requirements/${req.file.filename}`;

      await RegulatorySourceDocument.create({
        regulatory_source_id: id,
        document_name: req.file.originalname,
        file_path: relativePath,
        file_size: req.file.size,
        uploaded_by: req.body.uploaded_by || 'system'
      });

      const documents = await RegulatorySourceDocument.listBySource(id);
      res.status(201).json({ success: true, documents });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.post('/:id/ingest', ingestionUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'File required for ingestion.' });
    }

    const { id } = req.params;
    const result = await RegulatoryIngestService.ingestRegulatoryDocument({
      regulatorySourceId: id,
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      uploadedBy: req.body.uploaded_by || 'system'
    });

    res.status(201).json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id/ingestions', async (req, res) => {
  try {
    const { id } = req.params;
    const ingestions = await RegulatoryIngestService.listIngestions(id);
    res.json({ success: true, ingestions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

