/**
 * EDCAT Administrator Server
 * Main Express server for the compliance analysis chat application
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { testConnections } from './database.js';
import { runAnalysis, findGaps } from './analyzer.js';
import { getNextClarification, processClarificationResponse, hasPendingClarifications } from './clarificationEngine.js';
import { recordLearningEvent, processClarificationFeedback } from './learningEngine.js';
import { complianceDB, customerDB } from './database.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Health check
app.get('/health', async (req, res) => {
  try {
    await testConnections();
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

// ============================================================================
// STANDARDS & REQUIREMENTS API
// ============================================================================

// Get all standards
app.get('/api/standards', async (req, res) => {
  try {
    const standards = await complianceDB.getAllStandards();
    res.json(standards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get requirements for a standard
app.get('/api/standards/:standardId/requirements', async (req, res) => {
  try {
    const { standardId } = req.params;
    const requirements = await complianceDB.getRequirementsByStandard(standardId);
    res.json(requirements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// CUSTOMERS & DOCUMENTS API
// ============================================================================

// Get documents for a customer
app.get('/api/customers/:customerId/documents', async (req, res) => {
  try {
    const { customerId } = req.params;
    const documents = await customerDB.getDocumentsByCustomer(customerId);
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get procedures for a customer
app.get('/api/customers/:customerId/procedures', async (req, res) => {
  try {
    const { customerId } = req.params;
    const procedures = await customerDB.getProceduresByCustomer(customerId);
    res.json(procedures);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ANALYSIS API
// ============================================================================

// Start a new analysis
app.post('/api/analysis', async (req, res) => {
  try {
    const { customerId, standardId } = req.body;
    
    if (!customerId || !standardId) {
      return res.status(400).json({ error: 'customerId and standardId are required' });
    }
    
    const result = await runAnalysis(customerId, standardId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get analysis details
app.get('/api/analysis/:analysisId', async (req, res) => {
  try {
    const { analysisId } = req.params;
    const analysis = await customerDB.getAnalysis(analysisId);
    
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }
    
    // Get mappings
    const mappings = await customerDB.getMappingsByAnalysis(analysisId);
    
    // Get clarifications
    const clarifications = await customerDB.getClarificationsByAnalysis(analysisId);
    
    res.json({
      ...analysis,
      mappings,
      clarifications,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get analyses for a customer
app.get('/api/customers/:customerId/analyses', async (req, res) => {
  try {
    const { customerId } = req.params;
    const analyses = await customerDB.getAnalysesByCustomer(customerId);
    res.json(analyses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// CLARIFICATIONS API
// ============================================================================

// Get next clarification question
app.get('/api/analysis/:analysisId/clarification/next', async (req, res) => {
  try {
    const { analysisId } = req.params;
    const clarification = await getNextClarification(analysisId);
    
    if (!clarification) {
      return res.json({ 
        hasMore: false, 
        message: 'All clarifications completed' 
      });
    }
    
    res.json({
      hasMore: true,
      ...clarification,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit clarification response
app.post('/api/clarification/:clarificationId/respond', async (req, res) => {
  try {
    const { clarificationId } = req.params;
    const { response } = req.body;
    
    if (!['yes', 'no', 'not_sure'].includes(response)) {
      return res.status(400).json({ error: 'Invalid response. Must be: yes, no, or not_sure' });
    }
    
    const result = await processClarificationResponse(clarificationId, response);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check if analysis has pending clarifications
app.get('/api/analysis/:analysisId/clarification/pending', async (req, res) => {
  try {
    const { analysisId } = req.params;
    const hasPending = await hasPendingClarifications(analysisId);
    res.json({ hasPending });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// LEARNING & FEEDBACK API
// ============================================================================

// Submit accuracy feedback
app.post('/api/analysis/:analysisId/feedback', async (req, res) => {
  try {
    const { analysisId } = req.params;
    const { rating } = req.body; // 1-5 scale
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    const result = await recordLearningEvent('accuracy_feedback', {
      analysisId,
      rating,
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Process clarification feedback (batch learning)
app.post('/api/analysis/:analysisId/learn', async (req, res) => {
  try {
    const { analysisId } = req.params;
    const result = await processClarificationFeedback(analysisId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// MODEL VERSIONS API
// ============================================================================

// Get current model version
app.get('/api/model/current', async (req, res) => {
  try {
    const model = await complianceDB.getCurrentModelVersion();
    res.json(model);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// FRONTEND ROUTES
// ============================================================================

// Serve main chat interface
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start server
app.listen(PORT, async () => {
  console.log(`\n╔═══════════════════════════════════════════════════════════════╗`);
  console.log(`║  EDCAT Administrator Server                                  ║`);
  console.log(`║  Port: ${PORT}                                                 ║`);
  console.log(`╚═══════════════════════════════════════════════════════════════╝\n`);
  
  try {
    await testConnections();
    console.log('✓ Server ready\n');
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    console.log('  Please check your database configuration\n');
  }
});

export default app;

