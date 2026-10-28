/**
 * VERA ENHANCEMENTS - COMPREHENSIVE DEBUG & TEST SCRIPT
 * 
 * Tests all three tiers of enhancements:
 * - TIER 1: Exact matching algorithm
 * - TIER 2: Conversation memory & learning
 * - TIER 3: Knowledge graph
 * 
 * Usage: node backend/src/scripts/test-vera-enhancements.js
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.PUBLIC_URL || 'http://localhost:8080';
const TEST_SESSION_ID = 'test-session-' + Date.now();
const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000000';
const TEST_USER_ID = 'test-user-1';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`TEST: ${testName}`, 'cyan');
  log('='.repeat(60), 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

/**
 * TIER 1: Test Exact Matching Algorithm
 */
async function testTier1_ExactMatching() {
  logTest('TIER 1: Exact Matching Algorithm');

  const testCases = [
    {
      name: 'AS9100 Definition',
      message: 'what is AS9100',
      expected: 'Should return AS9100 definition, not generic template'
    },
    {
      name: 'ISO 9001 Definition',
      message: 'define ISO 9001',
      expected: 'Should return ISO 9001 definition'
    },
    {
      name: 'Gap Analysis Query',
      message: 'explain gap analysis',
      expected: 'Should return gap analysis explanation'
    }
  ];

  for (const testCase of testCases) {
    logInfo(`Testing: ${testCase.name}`);
    logInfo(`Message: "${testCase.message}"`);
    
    try {
      const response = await fetch(`${BASE_URL}/api/chat/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: testCase.message,
          sessionId: TEST_SESSION_ID,
          tenantId: TEST_TENANT_ID,
          userId: TEST_USER_ID
        })
      });

      const data = await response.json();
      
      if (data.success && data.response) {
        const responseText = data.response.toLowerCase();
        const messageLower = testCase.message.toLowerCase();
        
        // Check if response contains key terms from the question
        const keyTerms = messageLower.split(/\s+/).filter(w => w.length > 3);
        const hasRelevantContent = keyTerms.some(term => responseText.includes(term));
        
        if (hasRelevantContent) {
          logSuccess(`Response contains relevant content`);
          logInfo(`Response preview: ${data.response.substring(0, 100)}...`);
        } else {
          logError(`Response doesn't seem relevant to question`);
          logInfo(`Full response: ${data.response}`);
        }
        
        // Check source
        if (data.source === 'vera_qa_bank' || data.metadata?.source === 'vera_query_response_bank') {
          logSuccess(`Response came from Q&A bank (exact match)`);
        } else {
          logInfo(`Response came from: ${data.source || 'fallback'}`);
        }
      } else {
        logError(`Request failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      logError(`Test failed: ${error.message}`);
    }
    
    console.log('');
  }
}

/**
 * TIER 2: Test Conversation Memory & Learning
 */
async function testTier2_ConversationMemory() {
  logTest('TIER 2: Conversation Memory & Learning');

  // Test 1: Multi-turn conversation with pronoun resolution
  logInfo('Test 1: Multi-turn conversation with pronouns');
  
  try {
    // First message
    logInfo('Sending: "Tell me about ISO 9001"');
    const response1 = await fetch(`${BASE_URL}/api/chat/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Tell me about ISO 9001',
        sessionId: TEST_SESSION_ID,
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID
      })
    });
    
    const data1 = await response1.json();
    if (data1.success) {
      logSuccess('First message processed');
      logInfo(`Response: ${data1.response?.substring(0, 80)}...`);
    }

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Second message with pronoun
    logInfo('Sending: "Compare it to AS9100"');
    const response2 = await fetch(`${BASE_URL}/api/chat/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Compare it to AS9100',
        sessionId: TEST_SESSION_ID,
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID
      })
    });
    
    const data2 = await response2.json();
    if (data2.success) {
      const responseText = data2.response?.toLowerCase() || '';
      if (responseText.includes('iso 9001') || responseText.includes('9001')) {
        logSuccess('Pronoun "it" was resolved to "ISO 9001"');
      } else {
        logError('Pronoun resolution may have failed');
      }
      logInfo(`Response: ${data2.response?.substring(0, 100)}...`);
    }

  } catch (error) {
    logError(`Multi-turn test failed: ${error.message}`);
  }

  // Test 2: Feedback endpoint
  logInfo('\nTest 2: Feedback endpoint');
  
  try {
    const feedbackResponse = await fetch(`${BASE_URL}/api/chat/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: TEST_SESSION_ID,
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        feedbackType: 'approval',
        reason: 'Great explanation'
      })
    });

    const feedbackData = await feedbackResponse.json();
    if (feedbackData.success) {
      logSuccess('Feedback recorded successfully');
      logInfo(`Message: ${feedbackData.message}`);
    } else {
      logError(`Feedback failed: ${feedbackData.error}`);
    }
  } catch (error) {
    logError(`Feedback test failed: ${error.message}`);
  }

  // Test 3: Correction feedback
  logInfo('\nTest 3: Correction feedback');
  
  try {
    const correctionResponse = await fetch(`${BASE_URL}/api/chat/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: TEST_SESSION_ID,
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        feedbackType: 'correction',
        correctedAnswer: 'AS9100D is the aerospace quality management standard that extends ISO 9001 with additional aerospace requirements.',
        reason: 'More accurate definition'
      })
    });

    const correctionData = await correctionResponse.json();
    if (correctionData.success) {
      logSuccess('Correction recorded successfully');
      logInfo(`Message: ${correctionData.message}`);
    } else {
      logError(`Correction failed: ${correctionData.error}`);
    }
  } catch (error) {
    logError(`Correction test failed: ${error.message}`);
  }
}

/**
 * TIER 3: Test Knowledge Graph
 */
async function testTier3_KnowledgeGraph() {
  logTest('TIER 3: Knowledge Graph');

  // Test 1: Standards comparison
  logInfo('Test 1: Standards comparison');
  
  try {
    const compareResponse = await fetch(`${BASE_URL}/api/chat/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        standard1: 'ISO 9001',
        standard2: 'AS9100D'
      })
    });

    const compareData = await compareResponse.json();
    if (compareData.success) {
      logSuccess('Standards comparison successful');
      logInfo(`Relationship: ${compareData.relationship}`);
      logInfo(`Overlapping requirements: ${compareData.overlappingRequirements}`);
      logInfo(`Summary: ${compareData.summary}`);
    } else {
      logError(`Comparison failed: ${compareData.error}`);
    }
  } catch (error) {
    logError(`Comparison test failed: ${error.message}`);
  }

  // Test 2: Clause mapping
  logInfo('\nTest 2: Clause mapping');
  
  try {
    const mappingResponse = await fetch(`${BASE_URL}/api/chat/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        standard1: 'ISO 9001',
        standard2: 'AS9100D',
        fromClause: '8.5'
      })
    });

    const mappingData = await mappingResponse.json();
    if (mappingData.success) {
      logSuccess('Clause mapping successful');
      logInfo(`Message: ${mappingData.message}`);
      if (mappingData.targetClause) {
        logInfo(`Mapped to: ${mappingData.targetClause} (${mappingData.similarity}% similar)`);
      }
    } else {
      logError(`Mapping failed: ${mappingData.error || mappingData.message}`);
    }
  } catch (error) {
    logError(`Mapping test failed: ${error.message}`);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  log('\n' + '='.repeat(60), 'yellow');
  log('VERA ENHANCEMENTS - COMPREHENSIVE TEST SUITE', 'yellow');
  log('='.repeat(60), 'yellow');
  log(`Base URL: ${BASE_URL}`, 'blue');
  log(`Test Session ID: ${TEST_SESSION_ID}`, 'blue');
  log('='.repeat(60) + '\n', 'yellow');

  try {
    // Test health endpoint first
    logInfo('Checking server health...');
    const healthResponse = await fetch(`${BASE_URL}/health`);
    if (healthResponse.ok) {
      logSuccess('Server is healthy');
    } else {
      logError('Server health check failed');
      return;
    }

    // Run all tier tests
    await testTier1_ExactMatching();
    await testTier2_ConversationMemory();
    await testTier3_KnowledgeGraph();

    log('\n' + '='.repeat(60), 'green');
    log('ALL TESTS COMPLETED', 'green');
    log('='.repeat(60), 'green');
    log('\nCheck the logs above for detailed results.', 'blue');
    log('Look for ✅ (success) and ❌ (failure) indicators.', 'blue');

  } catch (error) {
    logError(`Test suite failed: ${error.message}`);
    console.error(error);
  }
}

// Run tests
runAllTests().catch(console.error);

