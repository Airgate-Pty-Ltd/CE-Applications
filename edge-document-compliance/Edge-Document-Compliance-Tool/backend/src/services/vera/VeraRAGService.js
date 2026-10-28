/**
 * VERA RAG (Retrieval-Augmented Generation) Integration Service
 * 
 * Loads knowledge architecture files and provides RAG capabilities:
 * - Loads and indexes knowledge hierarchy, training corpus, reasoning patterns, and persona alignment
 * - Retrieves relevant knowledge based on user queries
 * - Augments prompts with retrieved knowledge for enhanced LLM responses
 * - Calls Ollama/Mistral with augmented prompts
 * 
 * This service transforms VERA from a basic Q&A system into a comprehensive
 * quality expert with deep domain knowledge and expert reasoning patterns.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { searchPublicData } from './VeraWebSearchService.js';
import { callOllamaWithFullSupport } from './VeraOllamaService.js';
import { getConfigForResponseType } from './VeraLLMConfigService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Knowledge architecture file paths
const KNOWLEDGE_DIR = path.join(__dirname);
const KNOWLEDGE_HIERARCHY_PATH = path.join(KNOWLEDGE_DIR, 'vera_knowledge_hierarchy.json');
const TRAINING_CORPUS_PATH = path.join(KNOWLEDGE_DIR, 'vera_training_corpus.md');
const REASONING_PATTERNS_PATH = path.join(KNOWLEDGE_DIR, 'vera_reasoning_patterns.md');
const PERSONA_ALIGNMENT_PATH = path.join(KNOWLEDGE_DIR, 'vera_persona_alignment.md');

// In-memory knowledge store
let knowledgeHierarchy = null;
let trainingCorpus = null;
let reasoningPatterns = null;
let personaAlignment = null;
let knowledgeIndexed = false;

/**
 * Load knowledge architecture from all 4 files
 * @returns {Promise<Object>} Status of loaded knowledge files
 */
export async function loadKnowledgeArchitecture() {
  const status = {
    hierarchy: false,
    corpus: false,
    reasoning: false,
    persona: false,
    errors: []
  };

  try {
    // Load knowledge hierarchy (JSON)
    if (fs.existsSync(KNOWLEDGE_HIERARCHY_PATH)) {
      const hierarchyData = fs.readFileSync(KNOWLEDGE_HIERARCHY_PATH, 'utf-8');
      knowledgeHierarchy = JSON.parse(hierarchyData);
      status.hierarchy = true;
      console.log('[VeraRAG] Loaded knowledge hierarchy');
    } else {
      status.errors.push(`Knowledge hierarchy not found: ${KNOWLEDGE_HIERARCHY_PATH}`);
      console.warn('[VeraRAG] Knowledge hierarchy file not found');
    }
  } catch (error) {
    status.errors.push(`Error loading hierarchy: ${error.message}`);
    console.error('[VeraRAG] Error loading knowledge hierarchy:', error);
  }

  try {
    // Load training corpus (Markdown)
    if (fs.existsSync(TRAINING_CORPUS_PATH)) {
      trainingCorpus = fs.readFileSync(TRAINING_CORPUS_PATH, 'utf-8');
      status.corpus = true;
      console.log('[VeraRAG] Loaded training corpus');
    } else {
      status.errors.push(`Training corpus not found: ${TRAINING_CORPUS_PATH}`);
      console.warn('[VeraRAG] Training corpus file not found');
    }
  } catch (error) {
    status.errors.push(`Error loading corpus: ${error.message}`);
    console.error('[VeraRAG] Error loading training corpus:', error);
  }

  try {
    // Load reasoning patterns (Markdown)
    if (fs.existsSync(REASONING_PATTERNS_PATH)) {
      reasoningPatterns = fs.readFileSync(REASONING_PATTERNS_PATH, 'utf-8');
      status.reasoning = true;
      console.log('[VeraRAG] Loaded reasoning patterns');
    } else {
      status.errors.push(`Reasoning patterns not found: ${REASONING_PATTERNS_PATH}`);
      console.warn('[VeraRAG] Reasoning patterns file not found');
    }
  } catch (error) {
    status.errors.push(`Error loading reasoning: ${error.message}`);
    console.error('[VeraRAG] Error loading reasoning patterns:', error);
  }

  try {
    // Load persona alignment (Markdown)
    if (fs.existsSync(PERSONA_ALIGNMENT_PATH)) {
      personaAlignment = fs.readFileSync(PERSONA_ALIGNMENT_PATH, 'utf-8');
      status.persona = true;
      console.log('[VeraRAG] Loaded persona alignment');
    } else {
      status.errors.push(`Persona alignment not found: ${PERSONA_ALIGNMENT_PATH}`);
      console.warn('[VeraRAG] Persona alignment file not found');
    }
  } catch (error) {
    status.errors.push(`Error loading persona: ${error.message}`);
    console.error('[VeraRAG] Error loading persona alignment:', error);
  }

  // Index knowledge for fast retrieval
  if (status.hierarchy || status.corpus || status.reasoning || status.persona) {
    indexKnowledge();
    knowledgeIndexed = true;
  }

  return status;
}

/**
 * Index knowledge for fast retrieval
 * Creates searchable indexes from loaded knowledge
 */
function indexKnowledge() {
  // For now, we'll do simple text-based search
  // In the future, this could use vector embeddings or more sophisticated indexing
  console.log('[VeraRAG] Knowledge indexed for retrieval');
}

/**
 * Search knowledge hierarchy for relevant domains, subdomains, and competencies
 * @param {string} query - User query
 * @returns {Array} Relevant knowledge nodes
 */
function searchHierarchy(query) {
  if (!knowledgeHierarchy) return [];

  const queryLower = query.toLowerCase();
  const results = [];

  try {
    const domains = knowledgeHierarchy.knowledge_architecture?.structure?.domains || [];
    
    for (const domain of domains) {
      // Check domain level
      if (domain.name?.toLowerCase().includes(queryLower) ||
          domain.description?.toLowerCase().includes(queryLower)) {
        results.push({
          type: 'domain',
          id: domain.id,
          name: domain.name,
          description: domain.description,
          relevance: 'high'
        });
      }

      // Check subdomains
      const subdomains = domain.subdomains || [];
      for (const subdomain of subdomains) {
        if (subdomain.name?.toLowerCase().includes(queryLower) ||
            subdomain.description?.toLowerCase().includes(queryLower)) {
          results.push({
            type: 'subdomain',
            id: subdomain.id,
            name: subdomain.name,
            description: subdomain.description,
            domain: domain.name,
            relevance: 'high'
          });
        }

        // Check competencies
        const competencies = subdomain.competencies || [];
        for (const competency of competencies) {
          const competencyText = [
            competency.name,
            competency.description,
            ...(competency.micro_skills || []),
            ...(competency.use_cases || [])
          ].join(' ').toLowerCase();

          if (competencyText.includes(queryLower)) {
            results.push({
              type: 'competency',
              id: competency.id,
              name: competency.name,
              description: competency.description,
              micro_skills: competency.micro_skills || [],
              use_cases: competency.use_cases || [],
              human_skill_pairings: competency.human_skill_pairings || [],
              technical_foundations: competency.technical_foundations || [],
              domain: domain.name,
              subdomain: subdomain.name,
              relevance: 'high'
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('[VeraRAG] Error searching hierarchy:', error);
  }

  return results.slice(0, 10); // Return top 10 results
}

/**
 * Search training corpus for relevant knowledge
 * @param {string} query - User query
 * @returns {string} Relevant corpus excerpts
 */
function searchCorpus(query) {
  if (!trainingCorpus) return '';

  const queryLower = query.toLowerCase();
  const lines = trainingCorpus.split('\n');
  const relevantSections = [];
  let currentSection = '';
  let inRelevantSection = false;

  // Simple keyword matching - find sections that contain query terms
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if line is a header (starts with #)
    if (line.startsWith('#')) {
      if (currentSection && inRelevantSection) {
        relevantSections.push(currentSection);
      }
      currentSection = line + '\n';
      inRelevantSection = line.toLowerCase().includes(queryLower);
    } else if (inRelevantSection) {
      currentSection += line + '\n';
    } else if (line.toLowerCase().includes(queryLower)) {
      // Found relevant content, start capturing
      inRelevantSection = true;
      currentSection = line + '\n';
    }
  }

  if (currentSection && inRelevantSection) {
    relevantSections.push(currentSection);
  }

  // Return combined relevant sections (limit to 2000 chars)
  return relevantSections.join('\n\n').substring(0, 2000);
}

/**
 * Get applicable reasoning patterns for the query
 * @param {string} query - User query
 * @returns {string} Relevant reasoning patterns
 */
function getReasoningPatterns(query) {
  if (!reasoningPatterns) return '';

  const queryLower = query.toLowerCase();
  const lines = reasoningPatterns.split('\n');
  const relevantPatterns = [];
  let currentPattern = '';
  let inRelevantPattern = false;

  // Find sections that match query intent
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.startsWith('#')) {
      if (currentPattern && inRelevantPattern) {
        relevantPatterns.push(currentPattern);
      }
      currentPattern = line + '\n';
      inRelevantPattern = line.toLowerCase().includes(queryLower);
    } else if (inRelevantPattern) {
      currentPattern += line + '\n';
    } else if (line.toLowerCase().includes(queryLower)) {
      inRelevantPattern = true;
      currentPattern = line + '\n';
    }
  }

  if (currentPattern && inRelevantPattern) {
    relevantPatterns.push(currentPattern);
  }

  return relevantPatterns.join('\n\n').substring(0, 1500);
}

/**
 * Get persona alignment guidance
 * @returns {string} Persona alignment instructions
 */
function getPersonaAlignment() {
  if (!personaAlignment) return '';

  // Return first 1000 chars of persona alignment (usually contains key guidance)
  return personaAlignment.substring(0, 1000);
}

/**
 * Extract location from query (e.g., "weather in Pocatello" → "Pocatello")
 */
function extractLocationFromQuery(query) {
  // Patterns: "in [location]", "at [location]", "[location] weather", etc.
  const patterns = [
    /(?:in|at|near|for)\s+([A-Z][A-Za-z\s,]+?)(?:\s|$|,|\.)/,
    /([A-Z][A-Za-z\s,]+?)\s+(?:weather|forecast|temperature)/,
    /weather\s+(?:in|at|for)\s+([A-Z][A-Za-z\s,]+?)(?:\s|$|,|\.)/
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Extract distance/direction locations from query
 */
function extractDistanceLocations(query) {
  // Patterns: "from X to Y", "X to Y", "distance between X and Y"
  const patterns = [
    /(?:from|between)\s+([A-Z][A-Za-z\s,]+?)\s+(?:to|and)\s+([A-Z][A-Za-z\s,]+?)(?:\s|$|,|\.)/i,
    /([A-Z][A-Za-z\s,]+?)\s+to\s+([A-Z][A-Za-z\s,]+?)(?:\s|$|,|\.)/,
    /distance\s+(?:from|between)\s+([A-Z][A-Za-z\s,]+?)\s+(?:to|and)\s+([A-Z][A-Za-z\s,]+?)(?:\s|$|,|\.)/i
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match && match[1] && match[2]) {
      return {
        start_location: match[1].trim(),
        end_location: match[2].trim()
      };
    }
  }

  return null;
}

/**
 * Detect if a query needs web search
 * @param {string} query - User query
 * @returns {Object} { needsWebSearch: boolean, searchType: string, options: object }
 */
export function detectWebSearchNeeded(query) {
  const queryLower = query.toLowerCase();
  
  // Keywords that indicate need for current/live data
  const webSearchIndicators = {
    // Time-sensitive queries
    current: ['current', 'latest', 'now', 'today', 'recent', 'newest', 'up-to-date', 'what\'s', 'what is the current'],
    weather: ['weather', 'forecast', 'temperature', 'rain', 'snow', 'sunny', 'cloudy'],
    time: ['what time', 'current time', 'time in', 'timezone'],
    distance: ['distance', 'how far', 'miles', 'kilometers', 'km', 'mi'],
    directions: ['directions', 'how to get', 'route', 'navigate'],
    news: ['news', 'latest news', 'breaking', 'headline'],
    stock: ['stock', 'price', 'market', 'ticker', 'share'],
    exchange_rate: ['exchange rate', 'currency', 'usd', 'eur', 'gbp', 'yen'],
    regulation: ['current fda', 'latest fda', 'new fda', 'recent fda', 'current faa', 'latest regulation'],
    recall: ['recall', 'recalled', 'safety alert'],
    guidance: ['current guidance', 'latest guidance', 'new guidance', 'recent guidance']
  };

  // Check for web search indicators
  for (const [category, keywords] of Object.entries(webSearchIndicators)) {
    if (keywords.some(keyword => queryLower.includes(keyword))) {
      // Determine search type
      let searchType = 'auto';
      if (category === 'weather') searchType = 'weather';
      else if (category === 'time') searchType = 'current_time';
      else if (category === 'distance') searchType = 'distance';
      else if (category === 'directions') searchType = 'directions';
      else if (category === 'news') searchType = 'news';
      else if (category === 'stock') searchType = 'stock';
      else if (category === 'exchange_rate') searchType = 'exchange_rate';
      else if (category === 'regulation') searchType = 'regulation';
      else if (category === 'recall') searchType = 'recall';
      else if (category === 'guidance') searchType = 'regulation';
      else if (category === 'current') {
        // Generic current data - try to detect specific type
        if (queryLower.includes('fda') || queryLower.includes('faa') || queryLower.includes('regulation')) {
          searchType = 'regulation';
        } else if (queryLower.includes('weather')) {
          searchType = 'weather';
        } else if (queryLower.includes('news')) {
          searchType = 'news';
        } else {
          searchType = 'auto';
        }
      }

      // Extract options from query
      const options = {};
      
      if (searchType === 'weather' || searchType === 'weather_forecast') {
        const location = extractLocationFromQuery(query);
        if (location) {
          options.location = location;
        }
      } else if (searchType === 'distance' || searchType === 'directions' || searchType === 'travel_time') {
        const locations = extractDistanceLocations(query);
        if (locations) {
          options.start_location = locations.start_location;
          options.end_location = locations.end_location;
        }
      } else if (searchType === 'stock') {
        // Extract stock symbol
        const symbolMatch = query.match(/\b([A-Z]{1,5})\b/);
        if (symbolMatch) {
          options.symbol = symbolMatch[1];
        }
      } else if (searchType === 'exchange_rate') {
        // Extract currencies
        const currencyMatch = query.match(/([A-Z]{3})\s+(?:to|in)\s+([A-Z]{3})/i);
        if (currencyMatch) {
          options.from = currencyMatch[1].toUpperCase();
          options.to = currencyMatch[2].toUpperCase();
        }
      }

      return {
        needsWebSearch: true,
        searchType: searchType,
        options: options
      };
    }
  }

  return {
    needsWebSearch: false,
    searchType: null,
    options: {}
  };
}

/**
 * Retrieve relevant knowledge for a user query
 * @param {string} userQuery - User's question or request
 * @param {Object} options - Options including userId, location, etc.
 * @returns {Promise<Object>} Retrieved knowledge, reasoning patterns, persona guidance, and web search results
 */
export async function retrieveKnowledge(userQuery, options = {}) {
  if (!knowledgeIndexed) {
    console.warn('[VeraRAG] Knowledge not indexed. Call loadKnowledgeArchitecture() first.');
  }

  // Search hierarchy for relevant domains/competencies
  const hierarchyResults = knowledgeIndexed ? searchHierarchy(userQuery) : [];

  // Search corpus for relevant knowledge
  const corpusExcerpts = knowledgeIndexed ? searchCorpus(userQuery) : '';

  // Get reasoning patterns
  const reasoning = knowledgeIndexed ? getReasoningPatterns(userQuery) : '';

  // Get persona alignment
  const persona = knowledgeIndexed ? getPersonaAlignment() : '';

  // Check if web search is needed
  const webSearchDetection = detectWebSearchNeeded(userQuery);
  let webSearchResult = null;

  if (webSearchDetection.needsWebSearch) {
    try {
      console.log(`[VeraRAG] Web search needed for: ${userQuery.substring(0, 50)}...`);
      const searchOptions = {
        userId: options.userId || 'default',
        location: options.location,
        start_location: options.start_location,
        end_location: options.end_location,
        symbol: options.symbol,
        from: options.from,
        to: options.to
      };

      webSearchResult = await searchPublicData(userQuery, webSearchDetection.searchType, searchOptions);
      
      if (webSearchResult.error) {
        console.warn('[VeraRAG] Web search error:', webSearchResult.error);
        webSearchResult = null; // Don't fail, just continue without web search
      } else {
        console.log(`[VeraRAG] Web search successful: ${webSearchResult.type}`);
      }
    } catch (error) {
      console.error('[VeraRAG] Web search failed:', error);
      webSearchResult = null; // Don't fail, just continue without web search
    }
  }

  return {
    knowledge: hierarchyResults,
    corpus: corpusExcerpts,
    reasoning: reasoning,
    persona: persona,
    webSearch: webSearchResult
  };
}

/**
 * Augment prompt with retrieved knowledge
 * @param {string} userQuery - Original user query
 * @param {Object} retrievedKnowledge - Retrieved knowledge from retrieveKnowledge()
 * @returns {string} Augmented prompt for LLM
 */
export function augmentPromptForVera(userQuery, retrievedKnowledge) {
  const { knowledge, corpus, reasoning, persona, webSearch } = retrievedKnowledge;

  // Build system prompt with persona alignment
  let systemPrompt = `You are VERA, the World's Foremost AI Quality Expert. You are a warm, professional, experienced quality management expert who combines deep technical knowledge with human understanding and practical wisdom.\n\n`;

  if (persona) {
    systemPrompt += `PERSONA GUIDANCE:\n${persona}\n\n`;
  }

  // Add reasoning patterns
  if (reasoning) {
    systemPrompt += `EXPERT REASONING PATTERNS:\n${reasoning}\n\n`;
  }

  systemPrompt += `Your responses should be:\n`;
  systemPrompt += `- Technically accurate and comprehensive\n`;
  systemPrompt += `- Practical and actionable\n`;
  systemPrompt += `- Empathetic and supportive\n`;
  systemPrompt += `- Clear and well-structured\n\n`;

  // Build context from retrieved knowledge
  let contextBlocks = [];

  // Add hierarchy knowledge
  if (knowledge.length > 0) {
    const hierarchyContext = knowledge.map(k => {
      let text = `**${k.name}**\n${k.description || ''}\n`;
      if (k.micro_skills && k.micro_skills.length > 0) {
        text += `\nKey Skills: ${k.micro_skills.slice(0, 5).join(', ')}\n`;
      }
      if (k.use_cases && k.use_cases.length > 0) {
        text += `\nUse Cases: ${k.use_cases.slice(0, 3).join(', ')}\n`;
      }
      return text;
    }).join('\n\n---\n\n');

    contextBlocks.push({
      label: 'Relevant Knowledge Domains',
      text: hierarchyContext
    });
  }

  // Add corpus excerpts
  if (corpus) {
    contextBlocks.push({
      label: 'Domain Knowledge',
      text: corpus
    });
  }

  // Add web search results (current/live data)
  if (webSearch && webSearch.result) {
    let webSearchText = '';
    
    if (typeof webSearch.result === 'string') {
      webSearchText = webSearch.result;
    } else if (webSearch.result.text) {
      webSearchText = webSearch.result.text;
    } else if (webSearch.result.articles) {
      // News articles
      webSearchText = webSearch.result.articles.map(a => `${a.title}: ${a.snippet}`).join('\n\n');
    } else if (webSearch.result.places) {
      // Places (restaurants, hotels, etc.)
      webSearchText = webSearch.result.places.map(p => `${p.name} - ${p.address} (Rating: ${p.rating || 'N/A'})`).join('\n\n');
    } else {
      // Try to stringify the result
      webSearchText = JSON.stringify(webSearch.result, null, 2);
    }

    if (webSearchText) {
      contextBlocks.push({
        label: `Current Data (${webSearch.type || 'web search'})`,
        text: `**Retrieved ${webSearch.retrieved_at ? new Date(webSearch.retrieved_at).toLocaleString() : 'just now'}**:\n\n${webSearchText}\n\n${webSearch.url ? `Source: ${webSearch.url}` : ''}`
      });
    }
  }

  // Build user message
  const userMessage = userQuery;

  // Combine into final prompt
  const contextText = contextBlocks.length > 0
    ? contextBlocks.map(block => `## ${block.label}\n\n${block.text}`).join('\n\n---\n\n')
    : '';

  const augmentedPrompt = contextText
    ? `${systemPrompt}\n\nCONTEXT:\n\n${contextText}\n\n---\n\nUSER QUESTION:\n${userMessage}\n\nVERA RESPONSE:`
    : `${systemPrompt}\n\nUSER QUESTION:\n${userMessage}\n\nVERA RESPONSE:`;

  return {
    systemPrompt,
    contextBlocks,
    userMessage,
    fullPrompt: augmentedPrompt
  };
}

/**
 * Call Ollama/Mistral with augmented prompt (Production-Ready)
 * @param {string} userQuery - User's question
 * @param {Object} retrievedKnowledge - Retrieved knowledge (optional, will retrieve if not provided)
 * @param {Object} options - Options for retrieval and LLM call
 * @returns {Promise<Object>} VERA's response with metrics
 */
export async function callVeraWithRAG(userQuery, retrievedKnowledge = null, options = {}) {
  try {
    const {
      userId = null,
      conversationId = null,
      responseType = 'general_qa',
      useStreaming = false,
      onToken = null,
      tenantId = '00000000-0000-0000-0000-000000000000'
    } = options;

    // Retrieve knowledge if not provided
    if (!retrievedKnowledge) {
      retrievedKnowledge = await retrieveKnowledge(userQuery, options);
    }

    // Augment prompt
    const augmented = augmentPromptForVera(userQuery, retrievedKnowledge);

    // Call Ollama with full production support
    const llmResponse = await callOllamaWithFullSupport({
      userQuery,
      systemPrompt: augmented.systemPrompt,
      context: augmented.contextBlocks.map(b => b.text).join('\n\n'),
      responseType,
      userId,
      conversationId,
      useStreaming,
      onToken,
      validateResponse: true,
      trackMetrics: true,
      tenantId
    });

    return {
      answer: llmResponse.response,
      retrievedKnowledge: {
        domainsFound: retrievedKnowledge.knowledge.length,
        corpusUsed: retrievedKnowledge.corpus.length > 0,
        reasoningUsed: retrievedKnowledge.reasoning.length > 0,
        webSearchUsed: !!retrievedKnowledge.webSearch,
        webSearchType: retrievedKnowledge.webSearch?.type || null
      },
      metrics: {
        fromCache: llmResponse.fromCache || false,
        tokensUsed: llmResponse.tokensUsed || 0,
        responseTime: llmResponse.responseTime || 0,
        qualityScore: llmResponse.qualityScore || null,
        fromFallback: llmResponse.fromFallback || false
      },
      augmentedPrompt: augmented.fullPrompt.substring(0, 500) + '...' // Truncated for logging
    };
  } catch (error) {
    console.error('[VeraRAG] Error calling VERA with RAG:', error);
    throw error;
  }
}

/**
 * Check if knowledge architecture is loaded
 * @returns {boolean}
 */
export function isKnowledgeLoaded() {
  return knowledgeIndexed;
}

/**
 * Get knowledge architecture status
 * @returns {Object} Status of loaded knowledge files
 */
export function getKnowledgeStatus() {
  return {
    hierarchy: !!knowledgeHierarchy,
    corpus: !!trainingCorpus,
    reasoning: !!reasoningPatterns,
    persona: !!personaAlignment,
    indexed: knowledgeIndexed
  };
}

// Auto-load knowledge on module import (non-blocking)
loadKnowledgeArchitecture().catch(err => {
  console.error('[VeraRAG] Failed to auto-load knowledge architecture:', err);
});

