/**
 * Learning Engine
 * Processes feedback and updates model confidence
 */

import { complianceDB, customerDB } from './database.js';

/**
 * Record a learning event from clarification feedback
 */
export async function recordLearningEvent(eventType, data) {
  switch (eventType) {
    case 'clarification_feedback':
      return await recordClarificationFeedback(data);
    case 'accuracy_feedback':
      return await recordAccuracyFeedback(data);
    default:
      throw new Error(`Unknown event type: ${eventType}`);
  }
}

/**
 * Record feedback from a clarification response
 */
async function recordClarificationFeedback(data) {
  const { clarificationId, userResponse, confidenceBefore, confidenceAfter } = data;
  
  // Record the learning event
  // This is already handled in clarificationEngine, but we can add additional learning logic here
  
  // Analyze patterns: which keywords/terms led to correct clarifications?
  // TODO: Implement pattern analysis
  
  return {
    eventType: 'clarification_feedback',
    clarificationId,
    improvement: confidenceAfter - confidenceBefore,
  };
}

/**
 * Record accuracy feedback from user rating
 */
export async function recordAccuracyFeedback(data) {
  const { analysisId, rating } = data;
  
  // Update analysis with feedback rating
  await customerDB.updateAnalysis(analysisId, {
    feedback_rating: rating / 5.0, // Convert 1-5 scale to 0-1
  });
  
  // Get analysis details
  const analysis = await customerDB.getAnalysis(analysisId);
  
  // Check if we should create a new model version
  const shouldCreateModel = await shouldCreateNewModelVersion(analysis);
  
  if (shouldCreateModel.should) {
    const newVersion = await createModelVersion(analysis, rating);
    return {
      eventType: 'accuracy_feedback',
      analysisId,
      rating,
      modelVersionCreated: newVersion.version,
      improvement: shouldCreateModel.improvement,
    };
  }
  
  return {
    eventType: 'accuracy_feedback',
    analysisId,
    rating,
    modelVersionCreated: null,
  };
}

/**
 * Process clarification feedback in batch
 * Analyzes patterns from multiple clarifications
 */
export async function processClarificationFeedback(analysisId) {
  const clarifications = await customerDB.getClarificationsByAnalysis(analysisId);
  
  // Filter to only answered clarifications
  const answered = clarifications.filter(c => c.user_response);
  
  if (answered.length === 0) {
    return { patterns: [], improvements: [] };
  }
  
  // Analyze patterns
  const patterns = [];
  const improvements = [];
  
  for (const clarification of answered) {
    if (clarification.ai_confidence_after && clarification.ai_confidence_before) {
      const improvement = clarification.ai_confidence_after - clarification.ai_confidence_before;
      improvements.push(improvement);
      
      // Extract keywords from requirement and procedure
      // TODO: Implement keyword extraction and pattern matching
      patterns.push({
        clarificationId: clarification.clarification_id,
        improvement,
        userResponse: clarification.user_response,
      });
    }
  }
  
  const avgImprovement = improvements.reduce((a, b) => a + b, 0) / improvements.length;
  
  return {
    patterns,
    improvements,
    averageImprovement: avgImprovement,
    totalClarifications: answered.length,
  };
}

/**
 * Determine if a new model version should be created
 */
async function shouldCreateNewModelVersion(analysis) {
  // Get current model version
  const currentModel = await complianceDB.getCurrentModelVersion();
  
  // Get recent analyses with feedback
  const recentAnalyses = await customerDB.getAnalysesByCustomer(analysis.customer_id);
  const withFeedback = recentAnalyses
    .filter(a => a.feedback_rating !== null)
    .slice(0, 10); // Last 10 analyses
  
  if (withFeedback.length < 5) {
    return { should: false, reason: 'Insufficient feedback data' };
  }
  
  // Calculate average accuracy
  const avgAccuracy = withFeedback.reduce((sum, a) => sum + a.feedback_rating, 0) / withFeedback.length;
  
  // Check if improvement is significant
  const improvement = avgAccuracy - currentModel.baseline_accuracy;
  
  if (improvement >= 0.02) { // 2% improvement threshold
    return {
      should: true,
      improvement,
      currentBaseline: currentModel.baseline_accuracy,
      newBaseline: avgAccuracy,
    };
  }
  
  return {
    should: false,
    reason: `Improvement (${(improvement * 100).toFixed(1)}%) below threshold (2%)`,
  };
}

/**
 * Create a new model version
 */
async function createModelVersion(analysis, userRating) {
  const currentModel = await complianceDB.getCurrentModelVersion();
  
  // Calculate new version number
  const versionParts = currentModel.version.split('.');
  const minorVersion = parseInt(versionParts[1]) + 1;
  const newVersion = `${versionParts[0]}.${minorVersion}.0`;
  
  // Calculate new baseline accuracy
  const recentAnalyses = await customerDB.getAnalysesByCustomer(analysis.customer_id);
  const withFeedback = recentAnalyses
    .filter(a => a.feedback_rating !== null)
    .slice(0, 10);
  
  const newBaseline = withFeedback.reduce((sum, a) => sum + a.feedback_rating, 0) / withFeedback.length;
  
  const reason = `Improved accuracy from ${(currentModel.baseline_accuracy * 100).toFixed(1)}% to ${(newBaseline * 100).toFixed(1)}% based on ${withFeedback.length} analyses`;
  
  const newModel = await complianceDB.createModelVersion({
    version: newVersion,
    baseline_accuracy: newBaseline,
    reason_for_update: reason,
  });
  
  return newModel;
}

/**
 * Batch learning: Process all recent clarifications and update confidence scores
 */
export async function batchLearning() {
  // Get all recent analyses with clarifications
  // TODO: Implement batch processing
  
  // Analyze patterns across multiple analyses
  // Update keyword confidence scores
  // Create model version if significant improvement
  
  return {
    processed: 0,
    improvements: [],
    modelVersionCreated: null,
  };
}

/**
 * Get learning statistics
 */
export async function getLearningStats() {
  const currentModel = await complianceDB.getCurrentModelVersion();
  
  // Get all model versions (we'll need to add this method or use a direct query)
  // For now, return basic stats
  const compliancePool = (await import('./database.js')).compliancePool;
  const allModelsResult = await compliancePool.query(
    'SELECT * FROM model_versions ORDER BY created_at'
  );
  const allModels = { rows: allModelsResult.rows };
  
  // Calculate improvement trend
  const improvements = [];
  for (let i = 1; i < allModels.rows.length; i++) {
    const prev = allModels.rows[i - 1];
    const curr = allModels.rows[i];
    improvements.push({
      from: prev.version,
      to: curr.version,
      improvement: curr.baseline_accuracy - prev.baseline_accuracy,
    });
  }
  
  return {
    currentVersion: currentModel.version,
    currentBaseline: currentModel.baseline_accuracy,
    totalVersions: allModels.rows.length,
    improvements,
  };
}

