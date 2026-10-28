/**
 * ComplianceGap Framework Loader
 * Loads and provides access to confidence framework, severity classification,
 * sector intelligence, contradiction resolution, and clarification protocols
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to seed directory
const SEED_DIR = path.join(__dirname, '../../EDCAT AIP/seed');

class ComplianceGapFrameworkLoader {
  constructor() {
    this.frameworks = {
      confidence: null,
      severity: null,
      sector: null,
      contradiction: null,
      clarification: null,
      feedback: null
    };
    this.loaded = false;
  }

  /**
   * Load all frameworks from seed files
   */
  async load() {
    if (this.loaded) {
      return this.frameworks;
    }

    try {
      // Load confidence framework
      const confidencePath = path.join(SEED_DIR, 'confidence_framework.json');
      if (fs.existsSync(confidencePath)) {
        this.frameworks.confidence = JSON.parse(fs.readFileSync(confidencePath, 'utf8'));
      }

      // Load gap playbooks (severity)
      const playbooksPath = path.join(SEED_DIR, 'gap_playbooks.json');
      if (fs.existsSync(playbooksPath)) {
        const playbooks = JSON.parse(fs.readFileSync(playbooksPath, 'utf8'));
        this.frameworks.severity = playbooks.playbooks?.find(p => p.name === 'gap.severity.classify') || null;
      }

      // Load sector intelligence
      const sectorPath = path.join(SEED_DIR, 'sector_intelligence.json');
      if (fs.existsSync(sectorPath)) {
        this.frameworks.sector = JSON.parse(fs.readFileSync(sectorPath, 'utf8'));
      }

      // Load contradiction resolution
      const contradictionPath = path.join(SEED_DIR, 'contradiction_resolution.json');
      if (fs.existsSync(contradictionPath)) {
        this.frameworks.contradiction = JSON.parse(fs.readFileSync(contradictionPath, 'utf8'));
      }

      // Load clarification protocols
      const clarificationPath = path.join(SEED_DIR, 'clarification_protocols.json');
      if (fs.existsSync(clarificationPath)) {
        this.frameworks.clarification = JSON.parse(fs.readFileSync(clarificationPath, 'utf8'));
      }

      // Load feedback protocols
      const feedbackPath = path.join(SEED_DIR, 'feedback_protocols.json');
      if (fs.existsSync(feedbackPath)) {
        this.frameworks.feedback = JSON.parse(fs.readFileSync(feedbackPath, 'utf8'));
      }

      this.loaded = true;
      console.log('✓ ComplianceGap frameworks loaded');
      return this.frameworks;
    } catch (error) {
      console.error('Error loading ComplianceGap frameworks:', error);
      throw error;
    }
  }

  /**
   * Get confidence signal for a given confidence score
   * @param {number} confidence - Confidence score (0.0-1.0)
   * @returns {Object} Confidence signal with level, indicator, vera_language, action
   */
  getConfidenceSignal(confidence) {
    if (!this.frameworks.confidence) {
      return this.getDefaultConfidenceSignal(confidence);
    }

    const signals = this.frameworks.confidence.confidence_framework?.signals || [];
    
    // Find matching signal (highest threshold that confidence meets)
    let matchedSignal = signals[signals.length - 1]; // Default to lowest
    
    for (const signal of signals) {
      if (confidence >= signal.threshold) {
        matchedSignal = signal;
        break;
      }
    }

    return {
      level: matchedSignal.level,
      threshold: matchedSignal.threshold,
      indicator: matchedSignal.indicator,
      vera_language: matchedSignal.vera_language,
      action: matchedSignal.action,
      user_query: matchedSignal.user_query
    };
  }

  /**
   * Get default confidence signal (fallback)
   */
  getDefaultConfidenceSignal(confidence) {
    if (confidence >= 0.85) {
      return {
        level: 'HIGH',
        indicator: '🟢',
        vera_language: "I'm confident this satisfies the requirement.",
        action: null
      };
    } else if (confidence >= 0.55) {
      return {
        level: 'MEDIUM',
        indicator: '🟡',
        vera_language: "This partially addresses the requirement, but needs clarification.",
        action: 'CLARIFICATION_NEEDED'
      };
    } else {
      return {
        level: 'LOW',
        indicator: '🔴',
        vera_language: "I cannot find evidence of compliance.",
        action: 'FLAG_AS_GAP'
      };
    }
  }

  /**
   * Classify gap severity
   * @param {Object} gap - Gap object with requirement, evidence, etc.
   * @param {string} sector - Sector code (e.g., 'aerospace', 'medical')
   * @param {string} regulator - Regulator code (e.g., 'faa', 'easa', 'iso')
   * @returns {Object} Severity classification with indicator and vera_response
   */
  classifyGapSeverity(gap, sector = null, regulator = null) {
    if (!this.frameworks.severity) {
      return this.getDefaultSeverity(gap);
    }

    const severityMatrix = this.frameworks.severity.severity_matrix || [];
    const riskFactors = this.frameworks.severity.risk_factors || {};

    // Assess gap against criteria
    let bestMatch = severityMatrix[severityMatrix.length - 1]; // Default to LOW
    let bestScore = 0;

    for (const severity of severityMatrix) {
      let score = 0;
      const criteria = severity.criteria || [];

      // Check if gap matches criteria
      const gapText = (gap.requirementText || gap.requirement_text || '').toLowerCase();
      const hasEvidence = gap.hasEvidence !== false;
      const isRegulatory = gap.isRegulatory || gapText.includes('faa') || gapText.includes('part');

      for (const criterion of criteria) {
        const criterionLower = criterion.toLowerCase();
        if (criterionLower.includes('regulator') && isRegulatory) score += 2;
        if (criterionLower.includes('no documented evidence') && !hasEvidence) score += 3;
        if (criterionLower.includes('safety-critical')) score += 2;
        if (criterionLower.includes('inconsistent') && gap.isInconsistent) score += 1.5;
        if (criterionLower.includes('incomplete') && gap.isIncomplete) score += 1.5;
        if (criterionLower.includes('core processes')) score += 1;
      }

      // Apply risk factors
      if (sector && riskFactors.sector?.[sector]) {
        score *= riskFactors.sector[sector];
      }
      if (regulator && riskFactors.regulator?.[regulator]) {
        score *= riskFactors.regulator[regulator];
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = severity;
      }
    }

    return {
      severity: bestMatch.severity,
      description: bestMatch.description,
      indicator: this.getSeverityIndicator(bestMatch.severity),
      vera_response: bestMatch.vera_response,
      score: bestScore
    };
  }

  /**
   * Get severity indicator emoji
   */
  getSeverityIndicator(severity) {
    const indicators = {
      'CRITICAL': '🔴',
      'HIGH': '🟠',
      'MEDIUM': '🟡',
      'LOW': '🟢'
    };
    return indicators[severity] || '⚪';
  }

  /**
   * Get default severity (fallback)
   */
  getDefaultSeverity(gap) {
    const text = (gap.requirementText || gap.requirement_text || '').toLowerCase();
    if (text.includes('shall') || text.includes('must') || text.includes('required')) {
      return {
        severity: 'HIGH',
        indicator: '🟠',
        vera_response: "**HIGH PRIORITY** — Likely audit finding. Develop containment + correction plan."
      };
    }
    return {
      severity: 'MEDIUM',
      indicator: '🟡',
      vera_response: "**MEDIUM** — Improvement opportunity. Can address in next review cycle."
    };
  }

  /**
   * Get sector-specific context
   * @param {string} sectorCode - Sector code (e.g., 'aerospace', 'medical')
   * @returns {Object} Sector profile with criticality factors and common pitfalls
   */
  getSectorContext(sectorCode) {
    if (!this.frameworks.sector || !sectorCode) {
      return null;
    }

    const profiles = this.frameworks.sector.sector_profiles || [];
    return profiles.find(p => p.code === sectorCode) || null;
  }

  /**
   * Get sector risk multiplier for a gap type
   * @param {string} sectorCode - Sector code
   * @param {string} gapType - Gap type (e.g., 'traceability', 'configuration_control')
   * @returns {number} Risk multiplier (default 1.0)
   */
  getSectorRiskMultiplier(sectorCode, gapType) {
    const sector = this.getSectorContext(sectorCode);
    if (!sector || !sector.criticality_factors) {
      return 1.0;
    }
    return sector.criticality_factors[gapType] || 1.0;
  }

  /**
   * Check for escalation triggers
   * @param {Object} context - Analysis context
   * @returns {Array} Array of escalation triggers that match
   */
  checkEscalationTriggers(context) {
    if (!this.frameworks.confidence) {
      return [];
    }

    const triggers = this.frameworks.confidence.confidence_framework?.escalation_triggers || [];
    const matched = [];

    for (const trigger of triggers) {
      if (trigger.condition === 'conflicting_standards' && context.hasConflictingStandards) {
        matched.push(trigger);
      }
      if (trigger.condition === 'ambiguous_requirement' && context.isAmbiguous) {
        matched.push(trigger);
      }
    }

    return matched;
  }

  /**
   * Get contradiction resolution strategy
   * @param {string} conflictType - Type of conflict ('standard_vs_standard', 'org_vs_requirement', 'document_vs_document')
   * @returns {Object} Resolution strategy
   */
  getContradictionStrategy(conflictType) {
    if (!this.frameworks.contradiction) {
      return null;
    }

    const strategies = this.frameworks.contradiction.contradiction_resolution?.strategies || [];
    return strategies.find(s => s.conflict_type === conflictType) || null;
  }

  /**
   * Get clarification flow
   * @param {string} flowName - Flow name ('ambiguous_user_query', 'conflicting_evidence', 'missing_context')
   * @returns {Object} Clarification flow
   */
  getClarificationFlow(flowName) {
    if (!this.frameworks.clarification) {
      return null;
    }

    const flows = this.frameworks.clarification.clarification_flows || [];
    return flows.find(f => f.name === flowName) || null;
  }
}

// Export singleton instance
let frameworkLoaderInstance = null;

export function getComplianceGapFrameworkLoader() {
  if (!frameworkLoaderInstance) {
    frameworkLoaderInstance = new ComplianceGapFrameworkLoader();
  }
  return frameworkLoaderInstance;
}

export default ComplianceGapFrameworkLoader;

