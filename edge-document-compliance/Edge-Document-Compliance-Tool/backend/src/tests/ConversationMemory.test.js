/**
 * Integration Tests for Conversation Memory System
 * Tests conversation history, context tracking, and memory persistence
 */

import VeraRepository from '../services/vera/VeraRepository.js';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';
const TEST_USER_ID = 'test-user-' + Date.now();

let testConversationId = null;

/**
 * Test conversation session creation
 */
async function testSessionCreation() {
  console.log('\n🧪 Testing Session Creation...\n');
  
  try {
    const session = await VeraRepository.Conversation.getOrCreateSession(
      TEST_USER_ID,
      DEFAULT_TENANT_ID
    );
    
    if (session && session.conversation_id) {
      testConversationId = session.conversation_id;
      console.log(`  ✅ Session created: ${testConversationId}`);
      console.log(`  ✅ Active task: ${session.active_task}`);
      console.log(`  ✅ Current phase: ${session.current_phase}`);
      return true;
    } else {
      console.log('  ❌ Session creation failed: No conversation_id');
      return false;
    }
  } catch (error) {
    console.error('  ❌ Test failed:', error.message);
    return false;
  }
}

/**
 * Test conversation turn saving
 */
async function testSaveConversationTurn() {
  console.log('\n🧪 Testing Save Conversation Turn...\n');
  
  if (!testConversationId) {
    console.log('  ⚠️  Skipping: No test conversation ID');
    return false;
  }
  
  try {
    // Save user message
    const userTurn = await VeraRepository.Conversation.saveConversationTurn(
      testConversationId,
      'user',
      'What does clause 8.7 require?',
      { intent: 'compliance_question' }
    );
    console.log(`  ${userTurn ? '✅' : '❌'} User turn saved: ${userTurn ? 'Success' : 'Failed'}`);
    
    // Save assistant response
    const assistantTurn = await VeraRepository.Conversation.saveConversationTurn(
      testConversationId,
      'assistant',
      'Clause 8.7 requires the organization to control nonconforming outputs.',
      { intent: 'compliance_question', confidence: 0.90 }
    );
    console.log(`  ${assistantTurn ? '✅' : '❌'} Assistant turn saved: ${assistantTurn ? 'Success' : 'Failed'}`);
    
    return userTurn && assistantTurn;
  } catch (error) {
    console.error('  ❌ Test failed:', error.message);
    return false;
  }
}

/**
 * Test conversation history retrieval
 */
async function testGetConversationHistory() {
  console.log('\n🧪 Testing Get Conversation History...\n');
  
  if (!testConversationId) {
    console.log('  ⚠️  Skipping: No test conversation ID');
    return false;
  }
  
  try {
    const history = await VeraRepository.Conversation.getConversationHistory(
      testConversationId,
      10
    );
    
    console.log(`  ${Array.isArray(history) ? '✅' : '❌'} Returns array: ${Array.isArray(history)}`);
    console.log(`  ${history.length >= 0 ? '✅' : '❌'} History length: ${history.length}`);
    
    if (history.length > 0) {
      const lastMessage = history[history.length - 1];
      console.log(`  ${lastMessage.role ? '✅' : '❌'} Last message has role: ${lastMessage.role}`);
      console.log(`  ${lastMessage.message_content ? '✅' : '❌'} Last message has content: ${lastMessage.message_content ? 'Yes' : 'No'}`);
    }
    
    return Array.isArray(history);
  } catch (error) {
    console.error('  ❌ Test failed:', error.message);
    return false;
  }
}

/**
 * Test conversation context retrieval
 */
async function testGetConversationContext() {
  console.log('\n🧪 Testing Get Conversation Context...\n');
  
  if (!testConversationId) {
    console.log('  ⚠️  Skipping: No test conversation ID');
    return false;
  }
  
  try {
    const context = await VeraRepository.Conversation.getConversationContext(
      testConversationId
    );
    
    console.log(`  ${context ? '✅' : '❌'} Context retrieved: ${context ? 'Success' : 'Failed'}`);
    
    if (context) {
      console.log(`  ${context.active_task ? '✅' : '⚠️'} Active task: ${context.active_task || 'Not set'}`);
      console.log(`  ${context.current_phase ? '✅' : '⚠️'} Current phase: ${context.current_phase || 'Not set'}`);
      console.log(`  ${context.last_user_input ? '✅' : '⚠️'} Last user input: ${context.last_user_input ? 'Set' : 'Not set'}`);
      console.log(`  ${context.last_vera_response ? '✅' : '⚠️'} Last Vera response: ${context.last_vera_response ? 'Set' : 'Not set'}`);
    }
    
    return context !== null;
  } catch (error) {
    console.error('  ❌ Test failed:', error.message);
    return false;
  }
}

/**
 * Test conversation context updates
 */
async function testUpdateConversationContext() {
  console.log('\n🧪 Testing Update Conversation Context...\n');
  
  if (!testConversationId) {
    console.log('  ⚠️  Skipping: No test conversation ID');
    return false;
  }
  
  try {
    const updates = {
      active_task: 'compliance_analysis',
      current_phase: 'analysis_in_progress',
      conversation_topic: 'Clause 8.7 requirements',
      confidence_level: 0.85
    };
    
    const updated = await VeraRepository.Conversation.updateConversationContext(
      testConversationId,
      updates
    );
    
    console.log(`  ${updated ? '✅' : '❌'} Context updated: ${updated ? 'Success' : 'Failed'}`);
    
    if (updated) {
      console.log(`  ${updated.active_task === 'compliance_analysis' ? '✅' : '❌'} Active task updated correctly`);
      console.log(`  ${updated.current_phase === 'analysis_in_progress' ? '✅' : '❌'} Phase updated correctly`);
    }
    
    return updated !== null;
  } catch (error) {
    console.error('  ❌ Test failed:', error.message);
    return false;
  }
}

/**
 * Test conversation memory persistence
 */
async function testMemoryPersistence() {
  console.log('\n🧪 Testing Memory Persistence...\n');
  
  if (!testConversationId) {
    console.log('  ⚠️  Skipping: No test conversation ID');
    return false;
  }
  
  try {
    // Save a message
    await VeraRepository.Conversation.saveConversationTurn(
      testConversationId,
      'user',
      'Test persistence message',
      { test: true }
    );
    
    // Retrieve immediately
    const history1 = await VeraRepository.Conversation.getConversationHistory(
      testConversationId,
      1
    );
    
    const found = history1.some(msg => msg.message_content === 'Test persistence message');
    console.log(`  ${found ? '✅' : '❌'} Message persisted: ${found ? 'Yes' : 'No'}`);
    
    return found;
  } catch (error) {
    console.error('  ❌ Test failed:', error.message);
    return false;
  }
}

/**
 * Run all integration tests
 */
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 CONVERSATION MEMORY INTEGRATION TESTS');
  console.log('='.repeat(60));
  
  const results = {
    sessionCreation: false,
    saveTurn: false,
    getHistory: false,
    getContext: false,
    updateContext: false,
    memoryPersistence: false
  };
  
  // Run tests in sequence (some depend on previous results)
  results.sessionCreation = await testSessionCreation();
  results.saveTurn = await testSaveConversationTurn();
  results.getHistory = await testGetConversationHistory();
  results.getContext = await testGetConversationContext();
  results.updateContext = await testUpdateConversationContext();
  results.memoryPersistence = await testMemoryPersistence();
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Summary:\n');
  
  const passed = Object.values(results).filter(v => v).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`  ${passed ? '✅' : '❌'} ${test}`);
  });
  
  console.log(`\n  Overall: ${passed}/${total} tests passed`);
  console.log(`  Success rate: ${((passed / total) * 100).toFixed(1)}%\n`);
  
  // Cleanup
  if (testConversationId) {
    console.log(`\n🧹 Test conversation ID: ${testConversationId}`);
    console.log('   (Can be manually cleaned up if needed)\n');
  }
  
  return {
    success: passed === total,
    results: results,
    summary: { passed, total },
    conversationId: testConversationId
  };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().then(result => {
    process.exit(result.success ? 0 : 1);
  }).catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

export {
  runAllTests,
  testSessionCreation,
  testSaveConversationTurn,
  testGetConversationHistory,
  testGetConversationContext,
  testUpdateConversationContext,
  testMemoryPersistence
};

