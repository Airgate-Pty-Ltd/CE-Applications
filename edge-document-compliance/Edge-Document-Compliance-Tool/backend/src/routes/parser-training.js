/**
 * Parser Training Routes
 * Endpoints for teaching and improving the requirement parser
 */

import express from 'express';
import { queryPostgres } from '../config/databases.js';
import { RequirementExtractor, LEARNING_DB, saveLearningData, loadLearningData } from '../services/requirementParser.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * POST /api/parser/extract
 * Extract requirements from text (for training/testing)
 */
router.post('/extract', async (req, res) => {
  try {
    const { documentText, standardCode, version } = req.body;

    if (!documentText || !standardCode) {
      return res.status(400).json({ 
        success: false,
        error: 'Document text and standard code required' 
      });
    }

    const extractor = new RequirementExtractor(standardCode, version || '1.0.0');
    const requirements = extractor.extractRequirements(documentText);
    const validation = extractor.validateCompleteness();

    // Record parsing event for learning
    extractor.recordParsingEvent(documentText.length);

    res.json({
      success: true,
      status: 'extracted',
      summary: {
        totalExtracted: requirements.length,
        avgConfidence: Math.round(extractor.metadata.confidence * 100) / 100,
        validationStatus: validation
      },
      requirements: requirements.slice(0, 100), // Return first 100 for preview
      validation: validation,
      metadata: extractor.metadata
    });
  } catch (error) {
    console.error('Extract error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * POST /api/parser/validate
 * Validate and improve extraction with user feedback
 */
router.post('/validate', async (req, res) => {
  try {
    const { requirements, standardCode, feedback } = req.body;

    if (!requirements || !standardCode) {
      return res.status(400).json({ 
        success: false,
        error: 'Requirements and standard code required' 
      });
    }

    // Process corrections/feedback
    const corrections = {
      id: uuidv4(),
      standardCode,
      originalCount: requirements.length,
      corrections: feedback || [],
      timestamp: new Date(),
      status: 'processed'
    };

    LEARNING_DB.corrections.push(corrections);

    // Learn from corrections
    if (feedback && feedback.length > 0) {
      if (!LEARNING_DB.learned_patterns[standardCode]) {
        LEARNING_DB.learned_patterns[standardCode] = {
          keywords: [],
          patterns: []
        };
      }

      // Extract patterns from corrections
      feedback.forEach(correction => {
        if (correction.type === 'missed') {
          // Learn: this text was missed, add keywords
          const text = correction.text.toLowerCase();
          const words = text.split(/\s+/).filter(w => w.length > 5);
          LEARNING_DB.learned_patterns[standardCode].keywords.push(...words);
        } else if (correction.type === 'incorrect') {
          // Learn: this was incorrectly identified as requirement
          LEARNING_DB.learned_patterns[standardCode].patterns.push({
            text: correction.text,
            type: 'exclude'
          });
        } else if (correction.type === 'correct') {
          // Learn: this was correct, boost confidence for similar patterns
          const text = correction.text.toLowerCase();
          const words = text.split(/\s+/).filter(w => w.length > 5);
          LEARNING_DB.learned_patterns[standardCode].keywords.push(...words);
        }
      });

      // Remove duplicates
      if (LEARNING_DB.learned_patterns[standardCode].keywords) {
        LEARNING_DB.learned_patterns[standardCode].keywords = 
          [...new Set(LEARNING_DB.learned_patterns[standardCode].keywords)];
      }
    }

    // Calculate accuracy
    if (!LEARNING_DB.accuracy_metrics[standardCode]) {
      LEARNING_DB.accuracy_metrics[standardCode] = {
        extractedTotal: 0,
        correctedTotal: 0,
        accuracy: 0
      };
    }

    const metrics = LEARNING_DB.accuracy_metrics[standardCode];
    metrics.extractedTotal += requirements.length;
    
    // Count corrections by type
    const incorrectCount = feedback.filter(f => f.type === 'incorrect').length;
    const missedCount = feedback.filter(f => f.type === 'missed').length;
    metrics.correctedTotal += incorrectCount + missedCount;
    
    metrics.accuracy = metrics.extractedTotal > 0
      ? Math.round(((metrics.extractedTotal - metrics.correctedTotal) / metrics.extractedTotal) * 100)
      : 100;

    saveLearningData();

    res.json({
      success: true,
      status: 'validated',
      corrections: corrections,
      learningUpdate: {
        patternsLearned: LEARNING_DB.learned_patterns[standardCode].keywords.length,
        accuracy: metrics.accuracy + '%',
        improvements: {
          keywordsAdded: feedback.filter(f => f.type === 'missed' || f.type === 'correct').length,
          patternsExcluded: feedback.filter(f => f.type === 'incorrect').length
        }
      },
      nextSteps: 'Reparse document with improved patterns'
    });
  } catch (error) {
    console.error('Validate error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * POST /api/parser/train
 * Manually train parser with labeled examples
 */
router.post('/train', async (req, res) => {
  try {
    const { standardCode, examples } = req.body;

    if (!standardCode || !examples || examples.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Standard code and examples required' 
      });
    }

    if (!LEARNING_DB.learned_patterns[standardCode]) {
      LEARNING_DB.learned_patterns[standardCode] = {
        keywords: [],
        patterns: []
      };
    }

    // Process training examples
    examples.forEach(example => {
      if (example.type === 'requirement' && example.keywords) {
        LEARNING_DB.learned_patterns[standardCode].keywords.push(...example.keywords);
      }
      if (example.type === 'pattern') {
        LEARNING_DB.learned_patterns[standardCode].patterns.push(example.pattern);
      }
    });

    // Remove duplicates
    LEARNING_DB.learned_patterns[standardCode].keywords = 
      [...new Set(LEARNING_DB.learned_patterns[standardCode].keywords)];

    saveLearningData();

    res.json({
      success: true,
      status: 'trained',
      standardCode,
      examplesTrained: examples.length,
      totalKeywords: LEARNING_DB.learned_patterns[standardCode].keywords.length,
      totalPatterns: LEARNING_DB.learned_patterns[standardCode].patterns.length
    });
  } catch (error) {
    console.error('Train error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * GET /api/parser/accuracy/:standardCode
 * Get parsing accuracy metrics for a standard
 */
router.get('/accuracy/:standardCode', async (req, res) => {
  try {
    const { standardCode } = req.params;
    const metrics = LEARNING_DB.accuracy_metrics[standardCode] || {
      extractedTotal: 0,
      correctedTotal: 0,
      accuracy: 0
    };

    const parsingEvents = LEARNING_DB.parsing_events.filter(
      e => e.standardCode === standardCode
    );

    const avgConfidence = parsingEvents.length > 0
      ? Math.round(
          parsingEvents.reduce((sum, e) => sum + (e.avgConfidence || 0), 0) / 
          parsingEvents.length * 100
        ) / 100
      : 0;

    res.json({
      success: true,
      standardCode,
      parsingMetrics: metrics,
      avgConfidence: avgConfidence,
      totalParsingEvents: parsingEvents.length,
      patternsLearned: LEARNING_DB.learned_patterns[standardCode]?.keywords?.length || 0,
      recentEvents: parsingEvents.slice(-5).map(e => ({
        timestamp: e.timestamp,
        requirementsExtracted: e.requirementsExtracted,
        avgConfidence: e.avgConfidence
      }))
    });
  } catch (error) {
    console.error('Accuracy error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * GET /api/parser/learning-status
 * Get overall learning status
 */
router.get('/learning-status', async (req, res) => {
  try {
    const summary = {
      totalParsingEvents: LEARNING_DB.parsing_events.length,
      totalCorrections: LEARNING_DB.corrections.length,
      standardsCovered: Object.keys(LEARNING_DB.accuracy_metrics).length,
      accuracyByStandard: LEARNING_DB.accuracy_metrics,
      patternsLearned: Object.entries(LEARNING_DB.learned_patterns).map(([code, data]) => ({
        standard: code,
        keywords: data.keywords.length,
        patterns: data.patterns.length
      }))
    };

    res.json({
      success: true,
      status: 'learning_active',
      summary: summary
    });
  } catch (error) {
    console.error('Learning status error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * POST /api/parser/correct-requirement/:requirementId
 * Submit correction for a specific requirement
 */
router.post('/correct-requirement/:requirementId', async (req, res) => {
  try {
    const { requirementId } = req.params;
    const { standardCode, correctionType, originalText, correctedText, reason } = req.body;

    if (!standardCode || !correctionType) {
      return res.status(400).json({
        success: false,
        error: 'Standard code and correction type required'
      });
    }

    // Get the requirement from database
    let requirement;
    try {
      const result = await queryPostgres(
        `SELECT id as requirement_id, requirement_text, clause_ref as clause_number, standard_id 
         FROM public.parsed_requirements 
         WHERE id = $1`,
        [requirementId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Requirement not found'
        });
      }
      requirement = result.rows[0];
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: 'Database error: ' + err.message
      });
    }

    // Record correction
    const correction = {
      id: uuidv4(),
      requirementId,
      standardCode,
      correctionType, // 'incorrect', 'missed', 'needs_review', 'correct'
      originalText: requirement.requirement_text,
      correctedText: correctedText || requirement.requirement_text,
      reason: reason || '',
      timestamp: new Date()
    };

    LEARNING_DB.corrections.push(correction);

    // Learn from correction
    if (!LEARNING_DB.learned_patterns[standardCode]) {
      LEARNING_DB.learned_patterns[standardCode] = {
        keywords: [],
        patterns: []
      };
    }

    if (correctionType === 'incorrect') {
      // Learn to exclude this pattern
      LEARNING_DB.learned_patterns[standardCode].patterns.push({
        text: requirement.requirement_text,
        type: 'exclude'
      });
    } else if (correctionType === 'missed' && correctedText) {
      // Learn keywords from missed requirement
      const text = correctedText.toLowerCase();
      const words = text.split(/\s+/).filter(w => w.length > 5);
      LEARNING_DB.learned_patterns[standardCode].keywords.push(...words);
    }

    // Remove duplicates
    LEARNING_DB.learned_patterns[standardCode].keywords = 
      [...new Set(LEARNING_DB.learned_patterns[standardCode].keywords)];

    saveLearningData();

    res.json({
      success: true,
      message: 'Correction recorded and learned',
      correction: correction,
      learningUpdate: {
        keywordsCount: LEARNING_DB.learned_patterns[standardCode].keywords.length,
        patternsCount: LEARNING_DB.learned_patterns[standardCode].patterns.length
      }
    });
  } catch (error) {
    console.error('Correct requirement error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

