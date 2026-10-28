/**
 * Vera Predictive Audit Finding Identification
 * Implements Vera's improvement: "Predictive audit finding identification"
 * Analyzes patterns to predict likely audit findings before audits occur
 */

import { queryPostgres, queryEdcatAI } from '../../config/databases.js';

class VeraPredictiveAuditEngine {
  /**
   * Predict audit findings based on gap analysis and historical patterns
   * @param {string} tenantId - Tenant ID
   * @param {string} standardId - Standard ID
   * @param {Object} options - Prediction options
   * @returns {Promise<Object>} Predicted findings
   */
  async predictAuditFindings(tenantId, standardId, options = {}) {
    const {
      includeHistoricalPatterns = true,
      includeCommonGaps = true,
      includeRiskAreas = true,
      confidenceThreshold = 0.7
    } = options;

    try {
      const predictions = {
        standard_id: standardId,
        tenant_id: tenantId,
        predicted_at: new Date().toISOString(),
        findings: [],
        risk_areas: [],
        confidence_scores: {}
      };

      // 1. Analyze current gaps
      const currentGaps = await this.getCurrentGaps(tenantId, standardId);
      
      // 2. Analyze historical audit findings (if available)
      let historicalPatterns = [];
      if (includeHistoricalPatterns) {
        historicalPatterns = await this.getHistoricalPatterns(tenantId, standardId);
      }

      // 3. Get common audit findings for this standard
      let commonFindings = [];
      if (includeCommonGaps) {
        commonFindings = await this.getCommonAuditFindings(standardId);
      }

      // 4. Identify risk areas
      if (includeRiskAreas) {
        predictions.risk_areas = await this.identifyRiskAreas(
          tenantId,
          standardId,
          currentGaps,
          historicalPatterns
        );
      }

      // 5. Generate predictions
      predictions.findings = this.generatePredictions(
        currentGaps,
        historicalPatterns,
        commonFindings,
        confidenceThreshold
      );

      // 6. Calculate confidence scores
      predictions.confidence_scores = this.calculateConfidence(
        predictions.findings,
        currentGaps.length,
        historicalPatterns.length
      );

      return {
        success: true,
        predictions
      };
    } catch (error) {
      console.error('[VeraPredictiveAuditEngine] Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get current gaps for tenant/standard
   */
  async getCurrentGaps(tenantId, standardId) {
    try {
      const result = await queryPostgres(
        `SELECT ga.id, ga.gap_description, ga.gap_severity, ga.clause_ref,
                ga.compliance_status, ga.created_at
         FROM gap_analyses ga
         WHERE ga.tenant_id = $1
         AND ga.standard_id = $2
         AND ga.status = 'completed'
         ORDER BY ga.created_at DESC
         LIMIT 100`,
        [tenantId, standardId]
      );

      return result.rows;
    } catch (error) {
      console.warn('[VeraPredictiveAuditEngine] Could not get current gaps:', error.message);
      return [];
    }
  }

  /**
   * Get historical audit patterns
   */
  async getHistoricalPatterns(tenantId, standardId) {
    try {
      // Look for historical audit data in gap analyses or compliance events
      const result = await queryPostgres(
        `SELECT ga.gap_description, ga.gap_severity, ga.clause_ref,
                COUNT(*) as occurrence_count,
                MAX(ga.created_at) as last_occurrence
         FROM gap_analyses ga
         WHERE ga.tenant_id = $1
         AND ga.standard_id = $2
         AND ga.gap_severity IN ('critical', 'major')
         GROUP BY ga.gap_description, ga.gap_severity, ga.clause_ref
         HAVING COUNT(*) > 1
         ORDER BY occurrence_count DESC, last_occurrence DESC
         LIMIT 20`,
        [tenantId, standardId]
      );

      return result.rows;
    } catch (error) {
      console.warn('[VeraPredictiveAuditEngine] Could not get historical patterns:', error.message);
      return [];
    }
  }

  /**
   * Get common audit findings for a standard (industry-wide patterns)
   */
  async getCommonAuditFindings(standardId) {
    // Common findings based on standard type
    const commonFindings = {
      'AS9100': [
        { clause: '8.1.1', description: 'Risk management not fully implemented', severity: 'major' },
        { clause: '8.1.2', description: 'Configuration management gaps', severity: 'major' },
        { clause: '8.1.4', description: 'Prevention of counterfeit parts not documented', severity: 'critical' },
        { clause: '8.5.1', description: 'Control of production and service provision incomplete', severity: 'major' },
        { clause: '9.2', description: 'Internal audit program not comprehensive', severity: 'major' }
      ],
      'ISO-9001': [
        { clause: '6.2', description: 'Quality objectives not measurable', severity: 'minor' },
        { clause: '7.1.5', description: 'Monitoring and measurement resources not calibrated', severity: 'major' },
        { clause: '8.5.1', description: 'Production controls not fully documented', severity: 'major' },
        { clause: '9.2', description: 'Internal audit findings not addressed', severity: 'major' },
        { clause: '10.2', description: 'Nonconformity and corrective action process incomplete', severity: 'major' }
      ],
      'ISO-13485': [
        { clause: '4.2.3', description: 'Medical device file incomplete', severity: 'critical' },
        { clause: '7.3', description: 'Design and development controls not validated', severity: 'critical' },
        { clause: '8.2.1', description: 'Feedback and complaint handling inadequate', severity: 'major' },
        { clause: '8.5.2', description: 'Corrective action not effective', severity: 'major' }
      ]
    };

    // Get standard code
    const standardResult = await queryPostgres(
      `SELECT code FROM standards WHERE id = $1`,
      [standardId]
    );

    if (standardResult.rows.length === 0) return [];

    const standardCode = standardResult.rows[0].code.toUpperCase();
    
    // Find matching standard family
    for (const [key, findings] of Object.entries(commonFindings)) {
      if (standardCode.includes(key) || standardCode.startsWith(key)) {
        return findings;
      }
    }

    return [];
  }

  /**
   * Identify high-risk areas
   */
  async identifyRiskAreas(tenantId, standardId, currentGaps, historicalPatterns) {
    const riskAreas = [];

    // Analyze gap severity distribution
    const severityCounts = {
      critical: 0,
      major: 0,
      minor: 0,
      observation: 0
    };

    currentGaps.forEach(gap => {
      const severity = gap.gap_severity?.toLowerCase() || 'minor';
      if (severityCounts[severity] !== undefined) {
        severityCounts[severity]++;
      }
    });

    // Identify high-risk clauses
    const clauseRisk = {};
    currentGaps.forEach(gap => {
      const clause = gap.clause_ref || 'unknown';
      if (!clauseRisk[clause]) {
        clauseRisk[clause] = { count: 0, severities: [] };
      }
      clauseRisk[clause].count++;
      clauseRisk[clause].severities.push(gap.gap_severity);
    });

    // Find recurring issues
    historicalPatterns.forEach(pattern => {
      const clause = pattern.clause_ref;
      if (clauseRisk[clause]) {
        clauseRisk[clause].recurring = true;
        clauseRisk[clause].historical_count = pattern.occurrence_count;
      }
    });

    // Rank risk areas
    for (const [clause, data] of Object.entries(clauseRisk)) {
      if (data.count >= 2 || data.recurring || data.severities.includes('critical')) {
        riskAreas.push({
          clause,
          risk_level: this.calculateRiskLevel(data),
          gap_count: data.count,
          is_recurring: data.recurring || false,
          has_critical: data.severities.includes('critical')
        });
      }
    }

    // Sort by risk level
    riskAreas.sort((a, b) => {
      const riskOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      return (riskOrder[b.risk_level] || 0) - (riskOrder[a.risk_level] || 0);
    });

    return riskAreas.slice(0, 10); // Top 10 risk areas
  }

  /**
   * Calculate risk level
   */
  calculateRiskLevel(data) {
    if (data.severities.includes('critical') || data.recurring) {
      return 'high';
    }
    if (data.count >= 3 || data.severities.includes('major')) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Generate predictions
   */
  generatePredictions(currentGaps, historicalPatterns, commonFindings, confidenceThreshold) {
    const predictions = [];

    // Predict based on current gaps
    currentGaps.forEach(gap => {
      if (gap.gap_severity === 'critical' || gap.gap_severity === 'major') {
        predictions.push({
          type: 'current_gap',
          clause: gap.clause_ref,
          description: gap.gap_description,
          severity: gap.gap_severity,
          confidence: 0.9,
          source: 'current_analysis',
          recommendation: this.getRecommendation(gap.gap_severity, gap.clause_ref)
        });
      }
    });

    // Predict based on historical patterns
    historicalPatterns.forEach(pattern => {
      predictions.push({
        type: 'recurring_issue',
        clause: pattern.clause_ref,
        description: pattern.gap_description,
        severity: pattern.gap_severity,
        confidence: 0.85,
        source: 'historical_pattern',
        occurrence_count: pattern.occurrence_count,
        recommendation: `This issue has occurred ${pattern.occurrence_count} time(s) before. Review root cause and implement systemic fix.`
      });
    });

    // Predict based on common findings
    commonFindings.forEach(finding => {
      // Check if this finding already exists in current gaps
      const exists = currentGaps.some(gap => gap.clause_ref === finding.clause);
      
      if (!exists) {
        predictions.push({
          type: 'common_finding',
          clause: finding.clause,
          description: finding.description,
          severity: finding.severity,
          confidence: 0.7,
          source: 'industry_pattern',
          recommendation: `This is a common audit finding for this standard. Review your implementation of clause ${finding.clause}.`
        });
      }
    });

    // Filter by confidence threshold
    return predictions
      .filter(p => p.confidence >= confidenceThreshold)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get recommendation based on severity and clause
   */
  getRecommendation(severity, clause) {
    if (severity === 'critical') {
      return `Critical gap in clause ${clause}. Address immediately before audit. This will likely result in a major nonconformity.`;
    }
    if (severity === 'major') {
      return `Major gap in clause ${clause}. Should be addressed before audit to avoid nonconformity.`;
    }
    return `Minor gap in clause ${clause}. Consider addressing to improve audit readiness.`;
  }

  /**
   * Calculate confidence scores
   */
  calculateConfidence(findings, gapCount, historicalCount) {
    return {
      overall_confidence: findings.length > 0 ? 
        (findings.reduce((sum, f) => sum + f.confidence, 0) / findings.length).toFixed(2) : 0,
      prediction_count: findings.length,
      based_on_gaps: gapCount,
      based_on_history: historicalCount,
      confidence_level: findings.length >= 5 ? 'high' : findings.length >= 2 ? 'medium' : 'low'
    };
  }

  /**
   * Generate prediction report
   */
  generateReport(predictions) {
    if (!predictions.success) {
      return `Prediction failed: ${predictions.error}`;
    }

    const { findings, risk_areas, confidence_scores } = predictions.predictions;
    let report = `**Predictive Audit Findings Report**\n\n`;

    if (confidence_scores) {
      report += `**Confidence:** ${confidence_scores.overall_confidence} (${confidence_scores.confidence_level})\n`;
      report += `**Based on:** ${confidence_scores.based_on_gaps} current gaps, ${confidence_scores.based_on_history} historical patterns\n\n`;
    }

    if (risk_areas && risk_areas.length > 0) {
      report += `**High-Risk Areas:**\n`;
      risk_areas.slice(0, 5).forEach(area => {
        report += `• Clause ${area.clause}: ${area.risk_level} risk (${area.gap_count} gap(s))`;
        if (area.is_recurring) report += ` [RECURRING]`;
        if (area.has_critical) report += ` [CRITICAL]`;
        report += `\n`;
      });
      report += `\n`;
    }

    if (findings && findings.length > 0) {
      report += `**Predicted Audit Findings:**\n\n`;
      findings.slice(0, 10).forEach((finding, idx) => {
        report += `${idx + 1}. **Clause ${finding.clause}** (${finding.severity.toUpperCase()})\n`;
        report += `   ${finding.description}\n`;
        report += `   Confidence: ${(finding.confidence * 100).toFixed(0)}%\n`;
        report += `   Source: ${finding.source.replace('_', ' ')}\n`;
        if (finding.recommendation) {
          report += `   Recommendation: ${finding.recommendation}\n`;
        }
        report += `\n`;
      });
    } else {
      report += `No high-confidence predictions at this time. Continue monitoring gaps and addressing issues.\n`;
    }

    return report;
  }
}

export default new VeraPredictiveAuditEngine();

