/**
 * VERA Client Wrapper
 * EDCAT uses this to communicate with VERA-Core service
 */

import axios from 'axios';

/**
 * VERA Client Implementation
 * Inline implementation until VERA-Client is published to npm
 */
class VeraClient {
  constructor(options = {}) {
    this.baseURL = options.apiUrl || process.env.VERA_SERVICE_URL || 'http://localhost:3001';
    this.appId = options.appId || 'edcat-administrator';
    this.userId = options.userId || null;
    this.apiKey = options.apiKey || process.env.VERA_API_KEY || null;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-App-ID': this.appId,
        ...(this.apiKey && { 'X-API-Key': this.apiKey })
      }
    });
  }

  async chat(message, context = {}) {
    try {
      const response = await this.client.post('/api/vera/chat', {
        message,
        context,
        userId: this.userId,
        appId: this.appId
      });
      return response.data;
    } catch (error) {
      console.error('[VERA-Client] Chat error:', error.message);
      throw error;
    }
  }

  /**
   * Analyze compliance gaps using VERA-Core service
   * @param {string} standard - Standard name (e.g., "ISO 9001:2015")
   * @param {Array<string>} requirements - List of requirements from standard
   * @param {Array<string>} procedures - List of customer procedures
   * @param {string} userId - User performing analysis (optional)
   * @returns {Promise<Object>} Gap analysis results
   */
  async analyzeGap(standard, requirements, procedures, userId = null) {
    try {
      if (!standard || !Array.isArray(requirements) || !Array.isArray(procedures)) {
        throw new Error('Invalid parameters: standard, requirements, and procedures required');
      }

      console.log(`[VERA-Client] Analyzing gaps for ${standard}`, {
        requirementCount: requirements.length,
        procedureCount: procedures.length,
        userId: userId || this.userId
      });

      const response = await this.client.post('/api/vera/gap-analysis/analyze', {
        standard,
        standardRequirements: requirements.filter(r => r && typeof r === 'string'),
        customerProcedures: procedures.filter(p => p && typeof p === 'string'),
        userId: userId || this.userId || 'edcat-user',
        appId: this.appId
      }, {
        timeout: 60000 // 60 second timeout for gap analysis
      });

      console.log(`[VERA-Client] Gap analysis complete for ${standard}`, {
        gapCount: response.data.gapCount || response.data.gaps?.length || 0,
        coverage: response.data.gapPercentage || response.data.coverage_percentage
      });

      return {
        status: 'success',
        analysis: response.data
      };
    } catch (error) {
      console.error('[VERA-Client] Gap analysis error:', {
        standard,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });

      throw {
        status: 'error',
        message: `VERA analysis failed: ${error.message}`,
        vera_available: error.response?.status !== undefined,
        details: error.response?.data
      };
    }
  }

  /**
   * Get analysis history for user
   */
  async getAnalysisHistory(userId, limit = 10) {
    try {
      console.log(`[VERA-Client] Fetching analysis history for user: ${userId}`);

      const response = await this.client.get(
        `/api/vera/analyses/${userId}?limit=${limit}`,
        { timeout: 30000 }
      );

      return {
        status: 'success',
        analyses: response.data
      };
    } catch (error) {
      console.error('[VERA-Client] Failed to fetch analysis history', error.message);
      return {
        status: 'error',
        analyses: [],
        message: error.message
      };
    }
  }

  /**
   * Submit feedback on analysis
   */
  async submitFeedback(analysisId, feedback, userId = null) {
    try {
      console.log(`[VERA-Client] Submitting feedback for analysis: ${analysisId}`);

      const response = await this.client.post('/api/vera/feedback', {
        analysisId,
        userId: userId || this.userId || 'edcat-user',
        accuracy_rating: feedback.rating,
        was_helpful: feedback.helpful,
        comments: feedback.comments,
        gaps_user_disagreed: feedback.disagreed_gaps || [],
        gaps_user_confirmed: feedback.confirmed_gaps || []
      }, {
        timeout: 30000
      });

      console.log(`[VERA-Client] Feedback submitted for analysis: ${analysisId}`);

      return {
        status: 'success',
        feedback_received: true
      };
    } catch (error) {
      console.error('[VERA-Client] Failed to submit feedback', error.message);
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  /**
   * Check if VERA service is available (quick check)
   */
  async isAvailable() {
    try {
      const result = await this.health();
      return result.status === 'ok' || result.ollama_connected === true;
    } catch (error) {
      return false;
    }
  }

  async learn(question, answer, feedback) {
    try {
      const response = await this.client.post('/api/vera/learning/record', {
        question,
        answer,
        feedback,
        appId: this.appId,
        userId: this.userId
      });
      return response.data;
    } catch (error) {
      console.error('[VERA-Client] Learn error:', error.message);
      throw error;
    }
  }

  async getMemory(userId) {
    try {
      const response = await this.client.get(`/api/vera/memory/${userId}`);
      return response.data;
    } catch (error) {
      console.error('[VERA-Client] Get memory error:', error.message);
      throw error;
    }
  }

  async health() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      console.error('[VERA-Client] Health check error:', error.message);
      throw error;
    }
  }

  setUserId(userId) {
    this.userId = userId;
  }
}

// Initialize VERA client (shared instance)
export const veraClient = new VeraClient({
  apiUrl: process.env.VERA_SERVICE_URL || 'http://localhost:3001',
  appId: process.env.VERA_APP_ID || 'edcat-administrator'
});

export default veraClient;
export { VeraClient };
