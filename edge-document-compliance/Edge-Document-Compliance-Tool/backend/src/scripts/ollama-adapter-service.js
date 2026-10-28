/**
 * Ollama Adapter Service for Vera
 * 
 * Converts Vera's LLM request format to Ollama's API format
 * and vice versa. This allows Vera to use Ollama or fine-tuned models
 * without modifying VeraLLMBridge.
 * 
 * Usage:
 *   node ollama-adapter-service.js --port 5001
 * 
 * Then configure Vera:
 *   VERA_LLM_ENDPOINT=http://localhost:5001/adapt
 */

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'koesn/mistral-7b-instruct:latest';
const ADAPTER_PORT = process.env.ADAPTER_PORT || 5001;

/**
 * Convert Vera's request format to Ollama format
 */
function convertVeraToOllama(veraRequest) {
  const { systemPrompt, contextBlocks, userMessage } = veraRequest;
  
  // Build combined prompt
  const contextText = contextBlocks
    .map(block => `## ${block.label}\n\n${block.text}`)
    .join('\n\n---\n\n');
  
  const fullPrompt = `${systemPrompt}\n\n${contextText}\n\nUser: ${userMessage}\n\nVera:`;
  
  return {
    model: OLLAMA_MODEL,
    prompt: fullPrompt,
    stream: false,
    options: {
      temperature: 0.7,
      top_p: 0.9
    }
  };
}

/**
 * Convert Ollama response to Vera format
 */
function convertOllamaToVera(ollamaResponse) {
  const responseText = ollamaResponse.response || ollamaResponse.text || '';
  
  return {
    text: responseText,
    answer: responseText,  // Alias for compatibility
    response: responseText,  // Alias for compatibility
    reasoning: ollamaResponse.reasoning,
    citations: ollamaResponse.citations || []
  };
}

/**
 * Adapter endpoint: Converts Vera format → Ollama format → Vera format
 */
app.post('/adapt', async (req, res) => {
  try {
    const veraRequest = req.body;
    
    // Convert to Ollama format
    const ollamaRequest = convertVeraToOllama(veraRequest);
    
    // Call Ollama
    const ollamaResponse = await fetch(OLLAMA_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ollamaRequest)
    });
    
    if (!ollamaResponse.ok) {
      throw new Error(`Ollama API error: ${ollamaResponse.status} ${ollamaResponse.statusText}`);
    }
    
    const ollamaData = await ollamaResponse.json();
    
    // Convert back to Vera format
    const veraResponse = convertOllamaToVera(ollamaData);
    
    res.json(veraResponse);
    
  } catch (error) {
    console.error('[OllamaAdapter] Error:', error);
    res.status(500).json({
      error: error.message,
      text: '',
      answer: '',
      response: ''
    });
  }
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    adapter: 'ollama',
    ollama_endpoint: OLLAMA_ENDPOINT,
    ollama_model: OLLAMA_MODEL
  });
});

/**
 * Test endpoint
 */
app.post('/test', async (req, res) => {
  try {
    const testPrompt = req.body.prompt || "Define Quality in 50 words";
    
    const ollamaRequest = {
      model: OLLAMA_MODEL,
      prompt: testPrompt,
      stream: false
    };
    
    const ollamaResponse = await fetch(OLLAMA_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ollamaRequest)
    });
    
    if (!ollamaResponse.ok) {
      throw new Error(`Ollama API error: ${ollamaResponse.status}`);
    }
    
    const ollamaData = await ollamaResponse.json();
    
    res.json({
      success: true,
      prompt: testPrompt,
      response: ollamaData.response || ollamaData.text || '',
      ollama_status: ollamaResponse.status
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const PORT = process.env.PORT || ADAPTER_PORT;

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('Ollama Adapter Service for Vera');
  console.log('='.repeat(60));
  console.log();
  console.log(`📡 Adapter running on: http://localhost:${PORT}`);
  console.log(`🔗 Ollama endpoint: ${OLLAMA_ENDPOINT}`);
  console.log(`🤖 Ollama model: ${OLLAMA_MODEL}`);
  console.log();
  console.log('📡 Endpoints:');
  console.log(`   POST http://localhost:${PORT}/adapt  (Vera → Ollama adapter)`);
  console.log(`   POST http://localhost:${PORT}/test   (Test Ollama connection)`);
  console.log(`   GET  http://localhost:${PORT}/health (Health check)`);
  console.log();
  console.log('💡 Configure Vera with:');
  console.log(`   VERA_LLM_PROVIDER=local_http`);
  console.log(`   VERA_LLM_ENDPOINT=http://localhost:${PORT}/adapt`);
  console.log();
  console.log('Press Ctrl+C to stop');
  console.log('='.repeat(60));
});

