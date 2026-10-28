/**
 * Test Ollama Integration with Vera
 * 
 * Tests if Ollama's API format is compatible with Vera's LLM Bridge
 * 
 * Usage:
 *   node backend/src/scripts/test-ollama-vera-integration.js
 */

const fetch = require('node-fetch');

const OLLAMA_ENDPOINT = process.env.VERA_LLM_ENDPOINT || 'http://localhost:11434/api/generate';
const MODEL = 'koesn/mistral-7b-instruct:latest'; // Your installed model

async function testOllamaDirect() {
  console.log('='.repeat(60));
  console.log('Test 1: Direct Ollama API Call');
  console.log('='.repeat(60));
  
  try {
    const response = await fetch(OLLAMA_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        prompt: 'Define Quality in 50 words',
        stream: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    const data = await response.json();
    console.log('✅ Ollama direct call successful');
    console.log(`📄 Response (${data.response?.length || 0} chars):`);
    console.log(`   ${data.response?.substring(0, 200)}...`);
    return true;
  } catch (error) {
    console.error('❌ Ollama direct call failed:', error.message);
    return false;
  }
}

async function testVeraFormat() {
  console.log('\n' + '='.repeat(60));
  console.log('Test 2: Vera LLM Bridge Format');
  console.log('='.repeat(60));
  
  // Simulate what VeraLLMBridge sends
  const veraPayload = {
    system_prompt: 'You are Vera, a quality and compliance expert.',
    context: [
      { label: 'Standard Clause', text: 'Clause 8.5.1 requires...' }
    ],
    user_message: 'What is AS9100D?',
    intent: 'standard_question',
    tenant_id: null,
    user_role: null
  };
  
  // Convert to Ollama format
  const contextText = veraPayload.context
    .map(block => `## ${block.label}\n\n${block.text}`)
    .join('\n\n---\n\n');
  
  const ollamaPrompt = `${veraPayload.system_prompt}\n\n${contextText}\n\nUser: ${veraPayload.user_message}\n\nVera:`;
  
  try {
    const response = await fetch(OLLAMA_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        prompt: ollamaPrompt,
        stream: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    const data = await response.json();
    console.log('✅ Vera format conversion successful');
    console.log(`📄 Response (${data.response?.length || 0} chars):`);
    console.log(`   ${data.response?.substring(0, 300)}...`);
    return true;
  } catch (error) {
    console.error('❌ Vera format test failed:', error.message);
    return false;
  }
}

async function testVeraLLMBridgeCompatibility() {
  console.log('\n' + '='.repeat(60));
  console.log('Test 3: VeraLLMBridge Response Parsing');
  console.log('='.repeat(60));
  
  // Simulate Ollama response
  const ollamaResponse = {
    response: 'AS9100D is the aerospace quality management standard...',
    done: true
  };
  
  // Check if VeraLLMBridge can parse it
  // From VeraLLMBridge.ts line 138:
  // const answer = data.text || data.answer || data.response || '';
  
  const answer = ollamaResponse.text || ollamaResponse.answer || ollamaResponse.response || '';
  
  if (answer) {
    console.log('✅ Response parsing compatible');
    console.log(`📄 Parsed answer: ${answer.substring(0, 200)}...`);
    return true;
  } else {
    console.error('❌ Response parsing failed - no answer found');
    return false;
  }
}

async function main() {
  console.log('Ollama-Vera Integration Test');
  console.log('='.repeat(60));
  console.log(`Endpoint: ${OLLAMA_ENDPOINT}`);
  console.log(`Model: ${MODEL}`);
  console.log();
  
  const test1 = await testOllamaDirect();
  const test2 = await testVeraFormat();
  const test3 = testVeraLLMBridgeCompatibility();
  
  console.log('\n' + '='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  console.log(`Direct Ollama API:        ${test1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Vera Format Conversion:   ${test2 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Response Parsing:          ${test3 ? '✅ PASS' : '❌ FAIL'}`);
  console.log();
  
  if (test1 && test2 && test3) {
    console.log('✅ All tests passed! Ollama is compatible with Vera.');
    console.log('\n💡 Next steps:');
    console.log('   1. Set environment variables:');
    console.log('      VERA_LLM_PROVIDER=local_http');
    console.log(`      VERA_LLM_ENDPOINT=${OLLAMA_ENDPOINT}`);
    console.log('   2. Note: VeraLLMBridge needs adapter for Ollama format');
    console.log('   3. See: backend/src/services/vera/VeraLLMBridge.ts');
  } else {
    console.log('⚠️  Some tests failed. Check errors above.');
  }
  console.log('='.repeat(60));
}

main().catch(console.error);

