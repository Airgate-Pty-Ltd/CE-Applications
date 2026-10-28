/**
 * ComplianceGap API Routes
 * Express route definitions for ComplianceGap module
 */

import express from 'express';
import * as controller from '../controllers/analysisController.js';

const router = express.Router();

// Analysis endpoints
router.post('/analyze', controller.startAnalysis);
router.get('/analysis/:analysisId', controller.getAnalysis);
router.get('/analyses', controller.listAnalyses);

// Standards endpoints
router.get('/standards', controller.listStandards);
router.post('/standards', controller.createStandard);

// Clarifications endpoints
router.get('/analysis/:analysisId/clarifications', controller.getClarifications);
router.post('/analysis/:analysisId/clarifications', controller.addClarification);
router.post('/clarifications/:clarificationId/answer', controller.answerClarification);

export default router;

