/**
 * Vera Logger
 * 
 * Structured logging wrapper for Vera's reasoning paths and critical operations.
 * Provides traceability and observability without logging sensitive data.
 * 
 * PURPOSE:
 * - Log reasoning start/end for debugging and performance monitoring
 * - Track gap classification summaries for quality metrics
 * - Record risk profiles for audit trail
 * - Ensure no PII or sensitive procedure text is logged
 * 
 * EXTENSION POINTS:
 * - Add log aggregation endpoint
 * - Integrate with external logging systems
 * - Add performance metrics tracking
 */

/**
 * Log reasoning start with context
 * 
 * @param {Object} context - Reasoning context (IDs, counts, types only - no sensitive text)
 */
export function logReasoningStart(context) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event: 'reasoning_start',
    context: {
      analysisId: context.analysisId || null,
      requirementCount: context.requirementCount || 0,
      procedureCount: context.procedureCount || 0,
      standardCode: context.standardCode || null,
      documentId: context.documentId || null
    }
  };

  console.log('[VeraLogger]', JSON.stringify(logEntry));
  return logEntry;
}

/**
 * Log reasoning end with results summary
 * 
 * @param {Object} context - Original context from start
 * @param {Object} result - Reasoning result summary (metrics only)
 */
export function logReasoningEnd(context, result) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event: 'reasoning_end',
    context: {
      analysisId: context.analysisId || null
    },
    result: {
      totalRequirementsAnalyzed: result.totalRequirements || 0,
      gapsFound: result.gapsFound || 0,
      coveredFound: result.coveredFound || 0,
      averageConfidence: result.averageConfidence || 0,
      durationMs: result.durationMs || 0
    }
  };

  console.log('[VeraLogger]', JSON.stringify(logEntry));
  return logEntry;
}

/**
 * Log gap classification summary
 * 
 * @param {Object} summary - Gap classification summary
 */
export function logGapClassificationSummary(summary) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event: 'gap_classification_summary',
    summary: {
      totalGaps: summary.totalGaps || 0,
      criticalGaps: summary.criticalGaps || 0,
      majorGaps: summary.majorGaps || 0,
      minorGaps: summary.minorGaps || 0,
      gapTypes: summary.gapTypes || {},
      coveragePercentage: summary.coveragePercentage || 0
    }
  };

  console.log('[VeraLogger]', JSON.stringify(logEntry));
  return logEntry;
}

/**
 * Log risk profile for an analysis
 * 
 * @param {Object} profile - Risk profile (types and counts only)
 */
export function logRiskProfile(profile) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event: 'risk_profile',
    profile: {
      highRiskCount: profile.highRiskCount || 0,
      mediumRiskCount: profile.mediumRiskCount || 0,
      lowRiskCount: profile.lowRiskCount || 0,
      riskDistribution: profile.riskDistribution || {}
    }
  };

  console.log('[VeraLogger]', JSON.stringify(logEntry));
  return logEntry;
}

export default {
  logReasoningStart,
  logReasoningEnd,
  logGapClassificationSummary,
  logRiskProfile
};

