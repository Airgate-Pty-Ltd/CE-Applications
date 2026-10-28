/**
 * Vera Core Engine Tests
 * 
 * Sanity checks to ensure:
 * - No external HTTP calls are made to AI endpoints
 * - Responses are generated solely from internal DB content and templates
 */

import { generateVeraResponse, type VeraRequest } from '../services/vera/VeraCoreEngine.js';
import { queryPostgres, queryEdcatAI } from '../config/databases.js';
import fetch from 'node-fetch';

// Mock fetch to detect external API calls
const originalFetch = global.fetch;
let fetchCallCount = 0;
let fetchUrls: string[] = [];

beforeAll(() => {
  (global as any).fetch = jest.fn((url: string, options?: any) => {
    fetchCallCount++;
    fetchUrls.push(url);
    // Block any calls to external AI endpoints
    if (url.includes('api.openai.com') || url.includes('api.anthropic.com')) {
      throw new Error(`External AI API call blocked: ${url}`);
    }
    return originalFetch(url, options);
  });
});

afterAll(() => {
  (global as any).fetch = originalFetch;
});

describe('VeraCoreEngine', () => {
  beforeEach(() => {
    fetchCallCount = 0;
    fetchUrls = [];
  });

  test('should generate response without external API calls', async () => {
    const request: VeraRequest = {
      message: 'What does AS9100D 8.7 cover?',
      sessionId: 'test-session-123',
      userId: 'test-user-123',
      tenantId: '00000000-0000-0000-0000-000000000000',
      debugMode: false
    };

    const response = await generateVeraResponse(request);

    // Verify response structure
    expect(response).toHaveProperty('answer');
    expect(response).toHaveProperty('mode');
    expect(['normal', 'fallback', 'error']).toContain(response.mode);

    // Verify no external API calls were made
    expect(fetchCallCount).toBe(0);
    expect(fetchUrls.filter(url => 
      url.includes('api.openai.com') || 
      url.includes('api.anthropic.com')
    )).toHaveLength(0);
  }, 10000);

  test('should handle clause questions using internal DB', async () => {
    const request: VeraRequest = {
      message: 'What does clause 8.7 say?',
      sessionId: 'test-session-456',
      tenantId: '00000000-0000-0000-0000-000000000000'
    };

    const response = await generateVeraResponse(request);

    expect(response.answer).toBeTruthy();
    expect(response.mode).toBeDefined();
    expect(response.metadata).toBeDefined();

    // Verify no external API calls
    expect(fetchCallCount).toBe(0);
  }, 10000);

  test('should return error mode for empty message', async () => {
    const request: VeraRequest = {
      message: '',
      sessionId: 'test-session-789'
    };

    const response = await generateVeraResponse(request);

    expect(response.mode).toBe('error');
    expect(response.answer).toContain('Please provide');
  });

  test('should record conversation turn in database', async () => {
    const sessionId = `test-session-${Date.now()}`;
    const request: VeraRequest = {
      message: 'Hello, Vera',
      sessionId,
      tenantId: '00000000-0000-0000-0000-000000000000'
    };

    await generateVeraResponse(request);

    // Verify conversation was recorded
    const historyResult = await queryEdcatAI(
      `SELECT COUNT(*) as count 
       FROM edcat.ai_conversation_history 
       WHERE session_id = $1`,
      [sessionId]
    );

    expect(parseInt(historyResult.rows[0].count)).toBeGreaterThan(0);
  }, 10000);
});

/**
 * Manual test function for debugging
 * Call this from a test script or debug endpoint
 */
export async function testVeraCoreEngineManually() {
  console.log('[Test] Testing VeraCoreEngine with sample message...');

  const request: VeraRequest = {
    message: 'What does AS9100D 8.7 cover?',
    sessionId: `test-${Date.now()}`,
    tenantId: '00000000-0000-0000-0000-000000000000',
    debugMode: true
  };

  try {
    const response = await generateVeraResponse(request);
    
    console.log('[Test] Response received:');
    console.log('  Mode:', response.mode);
    console.log('  Intent:', response.intent);
    console.log('  Topic:', response.topic);
    console.log('  Answer length:', response.answer.length);
    console.log('  Metadata:', JSON.stringify(response.metadata, null, 2));
    
    return response;
  } catch (error: any) {
    console.error('[Test] Error:', error.message);
    throw error;
  }
}

