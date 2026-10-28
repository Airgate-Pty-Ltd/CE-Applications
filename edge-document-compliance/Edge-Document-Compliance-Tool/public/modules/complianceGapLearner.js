/**
 * COMPLIANCE GAP LEARNING MODULE
 * Records parsing events, clarifications, and feedback
 * Calculates improvements and creates new model versions
 */
/**
 * Main Learning Module
 */
export class ComplianceGapLearner {
  constructor(options = {}) {
    this.options = {
      improvementThreshold: options.improvementThreshold || 0.05,
      minEventsForVersion: options.minEventsForVersion || 10,
      ...options
    };
    this.events = [];
    this.modelVersions = [
      {
        version: '1.0.0',
        baselineAccuracy: 0.780,
        baselinePrecision: 0.800,
        baselineRecall: 0.840,
        created: new Date().toISOString(),
        reason: 'Initial version',
        totalEvents: 0,
        approved: true
      }
    ];
    this.learningLog = [];
  }
  /**
   * Record a learning event
   */
  recordEvent(eventType, eventData) {
    const validTypes = ['parsing', 'clarification', 'rating', 'correction', 'feedback'];
    if (!validTypes.includes(eventType)) {
      throw new Error(`Invalid event type: ${eventType}. Must be one of: ${validTypes.join(', ')}`);
    }
    const event = {
      eventId: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      eventType,
      timestamp: new Date().toISOString(),
      data: eventData,
      improvement: this.calculateImprovement(eventType, eventData)
    };
    this.events.push(event);
    this.learningLog.push({
      timestamp: new Date().toISOString(),
      action: `Recorded ${eventType} event`,
      details: event
    });
    console.log(`✅ Recorded ${eventType} event (improvement: ${(event.improvement * 100).toFixed(1)}%)`);
    return event;
  }

  /**
   * Calculate improvement from an event
   */
  calculateImprovement(eventType, data) {
    let improvement = 0;
    if (eventType === 'parsing') {
      // Improvement from parsing confidence
      if (data.confidenceAfter && data.confidenceBefore) {
        improvement = data.confidenceAfter - data.confidenceBefore;
      }
    } else if (eventType === 'clarification') {
      // Improvement from user clarification
      if (data.confidenceAfter && data.confidenceBefore) {
        improvement = data.confidenceAfter - data.confidenceBefore;
      }
    } else if (eventType === 'rating') {
      // Improvement from user rating (1-5 scale)
      if (data.rating >= 4) {
        improvement = 0.05; // Good rating = small improvement
      } else if (data.rating <= 2) {
        improvement = -0.05; // Bad rating = need to improve
      }
    } else if (eventType === 'correction') {
      // Correction event shows where model was wrong
      improvement = -0.10; // Negative - model needs to learn
    } else if (eventType === 'feedback') {
      // General feedback
      if (data.sentiment === 'positive') {
        improvement = 0.03;
      } else if (data.sentiment === 'negative') {
        improvement = -0.03;
      }
    }
    return Math.round(improvement * 10000) / 10000; // Round to 4 decimals
  }

  /**
   * Get average improvement over recent events
   */
  getAverageImprovement(eventCount = 10) {
    if (this.events.length === 0) return 0;
    const recentEvents = this.events.slice(-eventCount);
    const totalImprovement = recentEvents.reduce((sum, e) => sum + e.improvement, 0);
    return totalImprovement / recentEvents.length;
  }

  /**
   * Check if should create new model version
   */
  shouldCreateNewVersion() {
    // Needs minimum events
    if (this.events.length < this.options.minEventsForVersion) {
      return {
        shouldCreate: false,
        reason: `Not enough events (${this.events.length}/${this.options.minEventsForVersion})`
      };
    }
    // Check average improvement
    const avgImprovement = this.getAverageImprovement();
    if (avgImprovement >= this.options.improvementThreshold) {
      return {
        shouldCreate: true,
        reason: `Average improvement ${(avgImprovement * 100).toFixed(1)}% meets threshold`,
        improvement: avgImprovement
      };
    }
    return {
      shouldCreate: false,
      reason: `Average improvement ${(avgImprovement * 100).toFixed(1)}% below threshold ${(this.options.improvementThreshold * 100).toFixed(1)}%`,
      improvement: avgImprovement
    };
  }

  /**
   * Create new model version
   */
  createNewVersion() {
    const decision = this.shouldCreateNewVersion();
    if (!decision.shouldCreate) {
      console.log(`⚠️  Cannot create version: ${decision.reason}`);
      return null;
    }
    // Get current version
    const currentVersion = this.modelVersions[this.modelVersions.length - 1];
    // Calculate new baseline accuracy
    const improvement = decision.improvement;
    const newAccuracy = Math.min(0.99, currentVersion.baselineAccuracy + improvement);
    // Increment version number
    const versionParts = currentVersion.version.split('.');
    const patch = parseInt(versionParts[2], 10) + 1;
    const newVersionNumber = `${versionParts[0]}.${versionParts[1]}.${patch}`;
    // Create new version
    const newVersion = {
      version: newVersionNumber,
      baselineAccuracy: newAccuracy,
      baselinePrecision: Math.min(0.99, currentVersion.baselinePrecision + (improvement * 0.5)),
      baselineRecall: Math.min(0.99, currentVersion.baselineRecall + (improvement * 0.5)),
      created: new Date().toISOString(),
      createdFrom: currentVersion.version,
      reason: `Improvement of ${(improvement * 100).toFixed(1)}% from ${this.events.length} learning events`,
      totalEvents: this.events.length,
      improvementDetails: {
        averageImprovement: improvement,
        improvementSources: this.getImprovementSources(),
        eventCount: this.events.length
      },
      approved: false // Requires approval before production use
    };
    this.modelVersions.push(newVersion);
    this.learningLog.push({
      timestamp: new Date().toISOString(),
      action: 'Created new model version',
      version: newVersionNumber,
      details: newVersion
    });
    console.log(`✨ Created new model version: ${newVersionNumber}`);
    console.log(`   Improvement: ${(improvement * 100).toFixed(1)}%`);
    console.log(`   New accuracy: ${(newAccuracy * 100).toFixed(1)}%`);
    return newVersion;
  }

  /**
   * Analyze what improved accuracy
   */
  getImprovementSources() {
    const sources = {
      parsing: 0,
      clarification: 0,
      rating: 0,
      correction: 0,
      feedback: 0
    };
    for (const event of this.events) {
      if (event.improvement > 0) {
        sources[event.eventType]++;
      }
    }
    return sources;
  }

  /**
   * Get learning summary
   */
  getSummary() {
    const avgImprovement = this.getAverageImprovement();
    const currentVersion = this.modelVersions[this.modelVersions.length - 1];
    return {
      currentVersion: currentVersion.version,
      currentAccuracy: currentVersion.baselineAccuracy,
      totalEvents: this.events.length,
      eventsByType: this.getEventCountsByType(),
      averageImprovement: avgImprovement,
      improvementSources: this.getImprovementSources(),
      readyForNewVersion: this.shouldCreateNewVersion().shouldCreate,
      modelHistory: this.modelVersions.map(v => ({
        version: v.version,
        accuracy: v.baselineAccuracy,
        created: v.created,
        reason: v.reason
      })),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get event counts by type
   */
  getEventCountsByType() {
    const counts = {
      parsing: 0,
      clarification: 0,
      rating: 0,
      correction: 0,
      feedback: 0
    };
    for (const event of this.events) {
      counts[event.eventType]++;
    }
    return counts;
  }

  /**
   * Approve a model version for production
   */
  approveVersion(versionNumber) {
    const version = this.modelVersions.find(v => v.version === versionNumber);
    if (!version) {
      throw new Error(`Version not found: ${versionNumber}`);
    }
    version.approved = true;
    version.approvedAt = new Date().toISOString();
    this.learningLog.push({
      timestamp: new Date().toISOString(),
      action: 'Approved model version for production',
      version: versionNumber
    });
    console.log(`✅ Approved version ${versionNumber} for production`);
    return version;
  }

  /**
   * Get approved versions
   */
  getApprovedVersions() {
    return this.modelVersions.filter(v => v.approved);
  }

  /**
   * Get latest approved version
   */
  getLatestApprovedVersion() {
    const approved = this.getApprovedVersions();
    return approved.length > 0 ? approved[approved.length - 1] : this.modelVersions[0];
  }

  /**
   * Export learning log for audit
   */
  exportLearningLog() {
    return {
      timestamp: new Date().toISOString(),
      summary: this.getSummary(),
      log: this.learningLog.slice(-50), // Last 50 events
      allEvents: this.events.map(e => ({
        eventId: e.eventId,
        type: e.eventType,
        timestamp: e.timestamp,
        improvement: e.improvement,
        details: e.data
      }))
    };
  }

  /**
   * Predict model accuracy for next use
   */
  predictNextAccuracy() {
    const currentVersion = this.modelVersions[this.modelVersions.length - 1];
    const avgImprovement = this.getAverageImprovement();
    const predictedAccuracy = Math.min(
      0.99,
      currentVersion.baselineAccuracy + (avgImprovement * 0.5)
    );
    return {
      currentAccuracy: currentVersion.baselineAccuracy,
      predictedAccuracy,
      trend: avgImprovement > 0 ? 'improving' : avgImprovement < 0 ? 'declining' : 'stable',
      expectedImprovement: avgImprovement
    };
  }
}

export default ComplianceGapLearner;

