/**
 * VERA Web Search Service
 * 
 * Comprehensive public data access for VERA.
 * Enables VERA to search and retrieve ANY publicly available data,
 * making her a true companion with context about the user's world.
 * 
 * Supported search types:
 * - Regulatory & Compliance (FAA, FDA, EASA, ISO, etc.)
 * - Weather & Environment
 * - Travel & Logistics
 * - Business & Market
 * - Technical & Engineering
 * - Health & Safety
 * - General Knowledge
 * - Quality Management Specific
 * - Real-time Data
 * - Academic & Professional
 */

import { queryPostgres } from '../../database/connection.js';
import fetch from 'node-fetch';
import * as VeraCredentialService from './VeraCredentialService.js';
import VeraWebsiteLoginService from './VeraWebsiteLoginService.js';

// API Configuration (from environment variables)
const GOOGLE_CUSTOM_SEARCH_KEY = process.env.GOOGLE_CUSTOM_SEARCH_KEY;
const GOOGLE_CUSTOM_SEARCH_ENGINE_ID = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const FINANCIAL_API_KEY = process.env.FINANCIAL_API_KEY || process.env.ALPHA_VANTAGE_API_KEY;
const EXCHANGE_RATE_API_KEY = process.env.EXCHANGE_RATE_API_KEY;

// Rate limiting (100 searches per hour per user)
const RATE_LIMIT = 100;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const searchCounts = new Map(); // Simple in-memory rate limiting

/**
 * Search public data based on query and type
 * @param {string} query - Search query
 * @param {string} type - Search type (default: "auto" for auto-detection)
 * @param {Object} options - Additional options (location, start_location, end_location, etc.)
 * @returns {Promise<Object>} Search results
 */
export async function searchPublicData(query, type = "auto", options = {}) {
  // Rate limiting check
  const userId = options.userId || 'default';
  if (!checkRateLimit(userId)) {
    return {
      error: "Rate limit exceeded",
      message: "Maximum 100 searches per hour. Please try again later.",
      retry_after: getRetryAfter(userId)
    };
  }

  // Search configuration
  const searchConfig = {
    // Regulatory & Compliance
    regulation: {
      sources: ['faa.gov', 'fda.gov', 'easa.europa.eu', 'casa.gov.au', 'iso.org', 'ecfr.gov', 'regulations.gov'],
      priority: 10,
      cache_hours: 24,
      searchMethod: 'google_custom'
    },
    industry_news: {
      sources: ['google_news', 'industry_publications'],
      priority: 7,
      cache_hours: 6,
      searchMethod: 'google_news'
    },
    standard_update: {
      sources: ['iso.org', 'ansi.org', 'astm.org'],
      priority: 9,
      cache_hours: 48,
      searchMethod: 'google_custom'
    },
    recall: {
      sources: ['recalls.gov', 'fda.gov/recalls', 'cpsc.gov'],
      priority: 10,
      cache_hours: 12,
      searchMethod: 'google_custom'
    },
    inspection: {
      sources: ['faa.gov', 'fda.gov', 'osha.gov'],
      priority: 9,
      cache_hours: 24,
      searchMethod: 'google_custom'
    },
    warning_letter: {
      sources: ['fda.gov/warning-letters'],
      priority: 10,
      cache_hours: 24,
      searchMethod: 'google_custom'
    },
    compliance: {
      sources: ['regulations.gov', 'ecfr.gov'],
      priority: 9,
      cache_hours: 24,
      searchMethod: 'google_custom'
    },

    // Weather & Environment
    weather: {
      api: 'openweathermap',
      priority: 8,
      cache_hours: 1,
      requires: ['location']
    },
    weather_forecast: {
      api: 'openweathermap',
      priority: 8,
      cache_hours: 2,
      requires: ['location']
    },
    air_quality: {
      api: 'openweathermap',
      priority: 7,
      cache_hours: 1,
      requires: ['location']
    },
    severe_weather: {
      api: 'openweathermap',
      priority: 9,
      cache_hours: 0.5,
      requires: ['location']
    },
    climate: {
      api: 'openweathermap',
      priority: 6,
      cache_hours: 168,
      requires: ['location']
    },
    natural_disaster: {
      sources: ['usgs.gov', 'noaa.gov'],
      priority: 9,
      cache_hours: 1,
      searchMethod: 'google_custom'
    },

    // Travel & Logistics
    distance: {
      api: 'google_maps',
      priority: 9,
      cache_hours: 24,
      requires: ['start_location', 'end_location']
    },
    directions: {
      api: 'google_maps',
      priority: 9,
      cache_hours: 1,
      requires: ['start_location', 'end_location']
    },
    traffic: {
      api: 'google_maps',
      priority: 8,
      cache_hours: 0.25,
      requires: ['location']
    },
    travel_time: {
      api: 'google_maps',
      priority: 9,
      cache_hours: 1,
      requires: ['start_location', 'end_location']
    },
    flight: {
      sources: ['flightaware.com', 'flightstats.com'],
      priority: 8,
      cache_hours: 1,
      searchMethod: 'google_custom'
    },
    hotel: {
      api: 'google_maps',
      priority: 7,
      cache_hours: 6,
      requires: ['location']
    },
    restaurant: {
      api: 'google_maps',
      priority: 7,
      cache_hours: 6,
      requires: ['location']
    },
    parking: {
      api: 'google_maps',
      priority: 6,
      cache_hours: 12,
      requires: ['location']
    },

    // Business & Market
    stock: {
      api: 'financial',
      priority: 9,
      cache_hours: 0.25,
      requires: ['symbol']
    },
    company: {
      sources: ['sec.gov', 'company websites'],
      priority: 8,
      cache_hours: 24,
      searchMethod: 'google_custom'
    },
    industry: {
      sources: ['industry publications'],
      priority: 7,
      cache_hours: 12,
      searchMethod: 'google_custom'
    },
    price: {
      sources: ['google shopping'],
      priority: 6,
      cache_hours: 6,
      searchMethod: 'google_custom'
    },
    supplier: {
      sources: ['supplier directories'],
      priority: 7,
      cache_hours: 24,
      searchMethod: 'google_custom'
    },

    // Technical & Engineering
    technical_spec: {
      sources: ['manufacturer websites', 'datasheet repositories'],
      priority: 8,
      cache_hours: 168,
      searchMethod: 'google_custom'
    },
    patent: {
      sources: ['uspto.gov', 'patents.google.com'],
      priority: 8,
      cache_hours: 168,
      searchMethod: 'google_custom'
    },
    software: {
      sources: ['github.com', 'software repositories'],
      priority: 7,
      cache_hours: 24,
      searchMethod: 'google_custom'
    },
    api: {
      sources: ['api documentation sites'],
      priority: 8,
      cache_hours: 24,
      searchMethod: 'google_custom'
    },
    research: {
      sources: ['scholar.google.com', 'pubmed.gov', 'arxiv.org'],
      priority: 8,
      cache_hours: 168,
      searchMethod: 'google_custom'
    },

    // Health & Safety
    safety_alert: {
      sources: ['osha.gov', 'cpsc.gov'],
      priority: 10,
      cache_hours: 12,
      searchMethod: 'google_custom'
    },
    chemical: {
      sources: ['pubchem.ncbi.nlm.nih.gov', 'cdc.gov'],
      priority: 9,
      cache_hours: 168,
      searchMethod: 'google_custom'
    },
    occupational_health: {
      sources: ['osha.gov', 'cdc.gov/niosh'],
      priority: 8,
      cache_hours: 24,
      searchMethod: 'google_custom'
    },
    medical: {
      sources: ['pubmed.gov', 'nih.gov'],
      priority: 7,
      cache_hours: 24,
      searchMethod: 'google_custom'
    },
    ergonomic: {
      sources: ['osha.gov', 'ergonomics.org'],
      priority: 7,
      cache_hours: 168,
      searchMethod: 'google_custom'
    },

    // General Knowledge
    news: {
      api: 'google_news',
      priority: 5,
      cache_hours: 4
    },
    local_news: {
      api: 'google_news',
      priority: 6,
      cache_hours: 4,
      requires: ['location']
    },
    education: {
      sources: ['educational resources'],
      priority: 6,
      cache_hours: 168,
      searchMethod: 'google_custom'
    },
    reference: {
      sources: ['wikipedia.org', 'reference.com'],
      priority: 3,
      cache_hours: 168,
      searchMethod: 'google_custom'
    },
    map: {
      api: 'google_maps',
      priority: 7,
      cache_hours: 24,
      requires: ['location']
    },
    address: {
      api: 'google_maps',
      priority: 8,
      cache_hours: 168,
      requires: ['location']
    },
    phone: {
      sources: ['phone directories'],
      priority: 6,
      cache_hours: 168,
      searchMethod: 'google_custom'
    },

    // Quality Management Specific
    best_practice: {
      sources: ['quality publications', 'asq.org', 'iso.org'],
      priority: 8,
      cache_hours: 168,
      searchMethod: 'google_custom'
    },
    audit_guide: {
      sources: ['iso.org', 'audit guidance'],
      priority: 9,
      cache_hours: 168,
      searchMethod: 'google_custom'
    },
    training: {
      sources: ['training resources', 'quality courses'],
      priority: 7,
      cache_hours: 168,
      searchMethod: 'google_custom'
    },
    tool_reference: {
      sources: ['quality tools', 'methodologies'],
      priority: 8,
      cache_hours: 168,
      searchMethod: 'google_custom'
    },
    case_study: {
      sources: ['quality case studies'],
      priority: 7,
      cache_hours: 168,
      searchMethod: 'google_custom'
    },
    supplier_rating: {
      sources: ['supplier ratings', 'certifications'],
      priority: 7,
      cache_hours: 24,
      searchMethod: 'google_custom'
    },
    conference: {
      sources: ['conference listings', 'event sites'],
      priority: 6,
      cache_hours: 24,
      searchMethod: 'google_custom'
    },
    publication: {
      sources: ['quality journals', 'magazines'],
      priority: 6,
      cache_hours: 168,
      searchMethod: 'google_custom'
    },

    // Data & Statistics
    statistics: {
      sources: ['data.gov', 'census.gov', 'bls.gov'],
      priority: 7,
      cache_hours: 168,
      searchMethod: 'google_custom'
    },
    government_data: {
      sources: ['data.gov', 'government statistics'],
      priority: 7,
      cache_hours: 168,
      searchMethod: 'google_custom'
    },
    economic: {
      sources: ['economic data', 'federal reserve'],
      priority: 7,
      cache_hours: 24,
      searchMethod: 'google_custom'
    },
    demographic: {
      sources: ['census.gov', 'demographic data'],
      priority: 6,
      cache_hours: 168,
      searchMethod: 'google_custom'
    },
    time_zone: {
      api: 'built_in',
      priority: 10,
      cache_hours: 0
    },
    holiday: {
      sources: ['holiday calendars'],
      priority: 5,
      cache_hours: 168,
      searchMethod: 'google_custom'
    },

    // Real-time Data
    current_time: {
      api: 'built_in',
      priority: 10,
      cache_hours: 0
    },
    exchange_rate: {
      api: 'exchange_rate',
      priority: 8,
      cache_hours: 1
    },
    cryptocurrency: {
      api: 'crypto',
      priority: 7,
      cache_hours: 0.25
    },
    sports: {
      sources: ['sports news', 'scores'],
      priority: 4,
      cache_hours: 1,
      searchMethod: 'google_custom'
    },
    tv_guide: {
      sources: ['tv listings'],
      priority: 3,
      cache_hours: 1,
      searchMethod: 'google_custom'
    },
    event: {
      sources: ['event listings'],
      priority: 6,
      cache_hours: 12,
      searchMethod: 'google_custom'
    },

    // Academic & Professional
    certification: {
      sources: ['certification requirements'],
      priority: 7,
      cache_hours: 168,
      searchMethod: 'google_custom'
    },
    course: {
      sources: ['online courses', 'training'],
      priority: 6,
      cache_hours: 168,
      searchMethod: 'google_custom'
    },
    journal: {
      sources: ['academic journals'],
      priority: 7,
      cache_hours: 168,
      searchMethod: 'google_custom'
    },
    professional_org: {
      sources: ['professional organizations'],
      priority: 6,
      cache_hours: 168,
      searchMethod: 'google_custom'
    },

    // Environmental & Sustainability
    carbon_footprint: {
      sources: ['carbon calculators'],
      priority: 6,
      cache_hours: 168,
      searchMethod: 'google_custom'
    },
    sustainability: {
      sources: ['sustainability resources'],
      priority: 6,
      cache_hours: 168,
      searchMethod: 'google_custom'
    },
    recycling: {
      sources: ['recycling information'],
      priority: 5,
      cache_hours: 168,
      searchMethod: 'google_custom'
    },
    renewable_energy: {
      sources: ['renewable energy info'],
      priority: 6,
      cache_hours: 168,
      searchMethod: 'google_custom'
    },
    waste_management: {
      sources: ['waste management'],
      priority: 6,
      cache_hours: 168,
      searchMethod: 'google_custom'
    }
  };

  // Auto-detect type if not specified
  if (type === "auto") {
    type = detectSearchType(query);
  }

  // Get search configuration
  const config = searchConfig[type];
  if (!config) {
    return {
      error: "Unsupported search type",
      type: type,
      suggestion: "Try: regulation, weather, distance, news, stock, etc.",
      available_types: Object.keys(searchConfig).slice(0, 20) // Show first 20
    };
  }

  // Check required options
  if (config.requires) {
    for (const req of config.requires) {
      if (!options[req] && !query.includes(req)) {
        return {
          error: `Missing required option: ${req}`,
          type: type,
          required: config.requires,
          suggestion: `Please provide ${req} in options or query`
        };
      }
    }
  }

  // Check cache first
  const cached = await checkCache(query, type);
  if (cached && !isCacheExpired(cached, config.cache_hours)) {
    incrementSearchCount(userId);
    return {
      result: cached.result,
      source: cached.source,
      cached: true,
      retrieved_at: cached.cached_at,
      url: cached.url,
      type: type
    };
  }

  // Execute search based on type
  let result;
  try {
    if (config.api === 'google_maps') {
      result = await searchGoogleMaps(query, type, options);
    } else if (config.api === 'openweathermap') {
      result = await searchWeather(query, type, options);
    } else if (config.api === 'google_news') {
      result = await searchNews(query, options);
    } else if (config.api === 'financial') {
      result = await searchFinancial(query, type, options);
    } else if (config.api === 'exchange_rate') {
      result = await searchExchangeRate(query, options);
    } else if (config.api === 'crypto') {
      result = await searchCryptocurrency(query, options);
    } else if (config.api === 'built_in') {
      result = await builtInSearch(query, type, options);
    } else if (config.searchMethod === 'google_custom') {
      result = await googleCustomSearch(query, type, config.sources, options);
    } else {
      result = await googleCustomSearch(query, type, [], options);
    }

    // Cache the result
    await cacheResult(query, type, result, config.cache_hours);

    // Increment rate limit counter
    incrementSearchCount(userId);

    // Return structured response
    return {
      result: result,
      type: type,
      retrieved_at: new Date().toISOString(),
      source: config.sources || config.api || 'google_custom',
      cache_expires_in_hours: config.cache_hours,
      url: result.url || null,
      cached: false
    };
  } catch (error) {
    console.error(`[VeraWebSearch] Error searching ${type}:`, error);
    
    // Check if error indicates login required
    if (error.message.includes('401') || error.message.includes('403') || error.message.includes('LOGIN_REQUIRED')) {
      // Try to extract website from error or query
      const websiteMatch = query.match(/(ansi|asq|iso)\.org/i);
      if (websiteMatch) {
        const website = websiteMatch[0].toLowerCase();
        const userId = options.userId || 'default';
        const credentials = await VeraCredentialService.checkCredentialExists(userId, website);
        
        return {
          error: 'LOGIN_REQUIRED',
          requires_login: true,
          website: website,
          message: `${website} requires login to access this content`,
          action: 'PROMPT_FOR_CREDENTIALS',
          stored_credentials: credentials ? true : false,
          credential_expired: credentials?.is_expired || false,
          next_steps: [
            `1. Visit https://${website}`,
            `2. Log in to your account`,
            `3. Tell me: "Add credentials for ${website}"`
          ]
        };
      }
    }
    
    return {
      error: error.message,
      type: type,
      query: query
    };
  }
}

/**
 * Auto-detect search type from query
 */
function detectSearchType(query) {
  const queryLower = query.toLowerCase();
  
  const keywords = {
    regulation: ['faa', 'fda', 'easa', 'casa', 'iso', 'requirement', 'regulation', 'compliance', 'regulatory'],
    weather: ['weather', 'forecast', 'rain', 'snow', 'temperature', 'celsius', 'fahrenheit', 'sunny', 'cloudy'],
    distance: ['distance', 'how far', 'miles', 'kilometers', 'km', 'mi'],
    directions: ['directions', 'how to get', 'route', 'navigate', 'driving'],
    news: ['news', 'latest', 'update', 'breaking', 'headline'],
    stock: ['stock', 'price', 'market', 'ticker', 'share', 'nasdaq', 'nyse'],
    time: ['time', 'what time', 'current time', 'timezone'],
    phone: ['phone', 'number', 'contact', 'telephone'],
    address: ['address', 'location', 'where is', 'find'],
    exchange_rate: ['exchange rate', 'currency', 'usd', 'eur', 'gbp', 'yen'],
    crypto: ['crypto', 'bitcoin', 'ethereum', 'cryptocurrency'],
    restaurant: ['restaurant', 'dining', 'food', 'eat', 'lunch', 'dinner'],
    hotel: ['hotel', 'lodging', 'accommodation', 'stay'],
    flight: ['flight', 'airline', 'airport', 'departure', 'arrival'],
    traffic: ['traffic', 'congestion', 'jam'],
    recall: ['recall', 'recalled', 'safety alert'],
    warning_letter: ['warning letter', 'fda warning'],
    standard_update: ['standard update', 'new standard', 'iso update'],
    best_practice: ['best practice', 'best practices', 'recommended'],
    audit_guide: ['audit guide', 'audit planning', 'audit checklist'],
    conference: ['conference', 'convention', 'event', 'meeting'],
    supplier: ['supplier', 'vendor', 'manufacturer']
  };

  for (const [type, words] of Object.entries(keywords)) {
    if (words.some(word => queryLower.includes(word))) {
      return type;
    }
  }

  return 'reference'; // Default fallback
}

/**
 * Search using Google Custom Search API
 * Handles credential-based access for gated content
 */
async function googleCustomSearch(query, type, siteRestrictions = [], options = {}) {
  if (!GOOGLE_CUSTOM_SEARCH_KEY || !GOOGLE_CUSTOM_SEARCH_ENGINE_ID) {
    throw new Error('Google Custom Search API not configured');
  }

  let searchQuery = query;
  if (siteRestrictions && siteRestrictions.length > 0) {
    // Add site restrictions
    const siteFilter = siteRestrictions.map(site => `site:${site}`).join(' OR ');
    searchQuery = `${query} (${siteFilter})`;
  }

  const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_CUSTOM_SEARCH_KEY}&cx=${GOOGLE_CUSTOM_SEARCH_ENGINE_ID}&q=${encodeURIComponent(searchQuery)}&num=5`;

  const response = await fetch(url);
  
  // Check for authentication errors
  if (response.status === 401 || response.status === 403) {
    // Check if this is a gated website that requires credentials
    const userId = options.userId || 'default';
    
    // Extract website from site restrictions or query
    const website = siteRestrictions && siteRestrictions.length > 0 
      ? siteRestrictions[0].replace(/^https?:\/\//, '').split('/')[0]
      : null;
    
    if (website) {
      // Check if user has credentials stored
      const credentials = await VeraCredentialService.checkCredentialExists(userId, website);
      
      if (credentials && !credentials.is_expired) {
        // Try fetching with stored credentials using Puppeteer
        try {
          const resultUrl = `https://${website}/search?q=${encodeURIComponent(query)}`;
          const authResponse = await VeraWebsiteLoginService.fetchWithCredentials(
            website, 
            resultUrl, 
            userId
          );
          
          if (authResponse.success) {
            // Parse HTML content to extract relevant information
            // This is a simplified version - could be enhanced with better HTML parsing
            return {
              text: `Content retrieved from ${website} (member-only access)`,
              title: authResponse.title || `Results from ${website}`,
              url: resultUrl,
              source: website,
              requires_credentials: true,
              content_preview: authResponse.content.substring(0, 500) // First 500 chars
            };
          }
        } catch (authError) {
          console.warn(`[VeraWebSearch] Failed to fetch with credentials for ${website}:`, authError.message);
        }
      }
      
      // No credentials or credentials expired
      return {
        error: 'LOGIN_REQUIRED',
        requires_login: true,
        website: website,
        message: `${website} requires login to access this content`,
        action: 'PROMPT_FOR_CREDENTIALS',
        stored_credentials: credentials ? true : false,
        credential_expired: credentials?.is_expired || false,
        next_steps: [
          `1. Visit https://${website}`,
          `2. Log in to your account`,
          `3. Tell me: "Add credentials for ${website}"`
        ]
      };
    }
  }
  
  if (!response.ok) {
    throw new Error(`Google Custom Search API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.items && data.items.length > 0) {
    const topResult = data.items[0];
    
    // Check if result URL requires authentication
    const resultUrl = topResult.link;
    if (resultUrl) {
      const urlObj = new URL(resultUrl);
      const website = urlObj.hostname.replace(/^www\./, '');
      const userId = options.userId || 'default';
      
      // Check if this website requires credentials
      const loginMap = VeraWebsiteLoginService.getLoginMap(website);
      if (loginMap && loginMap.requiresLogin) {
        const credentials = await VeraCredentialService.checkCredentialExists(userId, website);
        if (!credentials || credentials.is_expired) {
          // Result found but requires login
          return {
            text: topResult.snippet || topResult.title,
            title: topResult.title,
            url: resultUrl,
            source: topResult.displayLink,
            requires_login: true,
            website: website,
            action: 'PROMPT_FOR_CREDENTIALS',
            preview: topResult.snippet,
            additional_results: data.items.slice(1, 3).map(item => ({
              title: item.title,
              snippet: item.snippet,
              url: item.link
            }))
          };
        }
      }
    }
    
    return {
      text: topResult.snippet || topResult.title,
      title: topResult.title,
      url: topResult.link,
      source: topResult.displayLink,
      additional_results: data.items.slice(1, 3).map(item => ({
        title: item.title,
        snippet: item.snippet,
        url: item.link
      }))
    };
  }

  return {
    text: "No results found",
    url: null
  };
}

/**
 * Search Google News
 */
async function searchNews(query, options = {}) {
  if (!GOOGLE_CUSTOM_SEARCH_KEY || !GOOGLE_CUSTOM_SEARCH_ENGINE_ID) {
    // Fallback to regular search
    return await googleCustomSearch(`news ${query}`, 'news');
  }

  const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_CUSTOM_SEARCH_KEY}&cx=${GOOGLE_CUSTOM_SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&tbm=nws&num=5`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google News API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.items && data.items.length > 0) {
    const articles = data.items.slice(0, 3);
    return {
      text: articles.map(a => `${a.title}: ${a.snippet}`).join('\n\n'),
      articles: articles.map(a => ({
        title: a.title,
        snippet: a.snippet,
        url: a.link,
        source: a.source,
        date: a.pubDate
      })),
      url: articles[0].link
    };
  }

  return {
    text: "No news found",
    url: null
  };
}

/**
 * Search Google Maps (distance, directions, places)
 */
async function searchGoogleMaps(query, type, options = {}) {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API not configured');
  }

  if (type === 'distance' || type === 'travel_time') {
    const start = options.start_location || query.split(' to ')[0] || query.split(' from ')[1];
    const end = options.end_location || query.split(' to ')[1] || query.split(' from ')[0];
    
    if (!start || !end) {
      throw new Error('Both start_location and end_location required');
    }

    // Use Distance Matrix API
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(start)}&destinations=${encodeURIComponent(end)}&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.rows && data.rows[0] && data.rows[0].elements[0]) {
      const element = data.rows[0].elements[0];
      return {
        text: `${element.distance.text} (${element.duration.text})`,
        distance: element.distance.text,
        distance_meters: element.distance.value,
        duration: element.duration.text,
        duration_seconds: element.duration.value,
        start: start,
        end: end
      };
    }
  } else if (type === 'directions') {
    const start = options.start_location || query.split(' to ')[0];
    const end = options.end_location || query.split(' to ')[1];
    
    // Use Directions API
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(start)}&destination=${encodeURIComponent(end)}&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      return {
        text: `Route: ${route.legs[0].distance.text}, ${route.legs[0].duration.text}`,
        distance: route.legs[0].distance.text,
        duration: route.legs[0].duration.text,
        steps: route.legs[0].steps.slice(0, 5).map(s => s.html_instructions.replace(/<[^>]*>/g, '')),
        url: `https://www.google.com/maps/dir/${encodeURIComponent(start)}/${encodeURIComponent(end)}`
      };
    }
  } else {
    // Place search (restaurant, hotel, etc.)
    const location = options.location || query;
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(location)}&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const places = data.results.slice(0, 5);
      return {
        text: places.map(p => `${p.name} - ${p.formatted_address} (Rating: ${p.rating || 'N/A'})`).join('\n'),
        places: places.map(p => ({
          name: p.name,
          address: p.formatted_address,
          rating: p.rating,
          url: p.url || null
        })),
        url: places[0].url || null
      };
    }
  }

  return {
    text: "No results found",
    url: null
  };
}

/**
 * Search weather using OpenWeatherMap
 */
async function searchWeather(query, type, options = {}) {
  if (!OPENWEATHER_API_KEY) {
    throw new Error('OpenWeatherMap API not configured');
  }

  const location = options.location || query;
  
  // Geocode location first
  const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${OPENWEATHER_API_KEY}`;
  const geoResponse = await fetch(geoUrl);
  const geoData = await geoResponse.json();

  if (!geoData || geoData.length === 0) {
    throw new Error(`Location not found: ${location}`);
  }

  const { lat, lon } = geoData[0];

  if (type === 'weather_forecast') {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=imperial`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.list) {
      const forecasts = data.list.slice(0, 5);
      return {
        text: forecasts.map(f => `${new Date(f.dt * 1000).toLocaleString()}: ${f.main.temp}°F, ${f.weather[0].description}`).join('\n'),
        location: `${geoData[0].name}, ${geoData[0].country}`,
        forecasts: forecasts.map(f => ({
          datetime: new Date(f.dt * 1000).toISOString(),
          temp: f.main.temp,
          description: f.weather[0].description,
          humidity: f.main.humidity
        }))
      };
    }
  } else {
    // Current weather
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=imperial`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.main) {
      return {
        text: `Current weather in ${geoData[0].name}: ${data.main.temp}°F, ${data.weather[0].description}. Feels like ${data.main.feels_like}°F. Humidity: ${data.main.humidity}%`,
        location: `${geoData[0].name}, ${geoData[0].country}`,
        temperature: data.main.temp,
        feels_like: data.main.feels_like,
        description: data.weather[0].description,
        humidity: data.main.humidity,
        wind_speed: data.wind?.speed || 0
      };
    }
  }

  return {
    text: "Weather data not available",
    url: null
  };
}

/**
 * Search financial data (stocks)
 */
async function searchFinancial(query, type, options = {}) {
  if (!FINANCIAL_API_KEY) {
    throw new Error('Financial API not configured');
  }

  // Extract stock symbol from query
  const symbol = options.symbol || query.match(/\b[A-Z]{1,5}\b/)?.[0] || query.split(' ')[0].toUpperCase();

  // Use Alpha Vantage API
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${FINANCIAL_API_KEY}`;
  
  const response = await fetch(url);
  const data = await response.json();

  if (data['Global Quote']) {
    const quote = data['Global Quote'];
    return {
      text: `${quote['01. symbol']}: $${quote['05. price']} (${quote['09. change'] >= 0 ? '+' : ''}${quote['09. change']}%)`,
      symbol: quote['01. symbol'],
      price: quote['05. price'],
      change: quote['09. change'],
      change_percent: quote['10. change percent'],
      volume: quote['06. volume']
    };
  }

  return {
    text: `Stock data not available for ${symbol}`,
    url: null
  };
}

/**
 * Search exchange rates
 */
async function searchExchangeRate(query, options = {}) {
  // Extract currencies from query (e.g., "EUR to USD")
  const match = query.match(/([A-Z]{3})\s+to\s+([A-Z]{3})/i);
  const from = match ? match[1].toUpperCase() : (options.from || 'USD');
  const to = match ? match[2].toUpperCase() : (options.to || 'EUR');

  // Use exchangerate-api.com (free tier)
  const url = `https://api.exchangerate-api.com/v4/latest/${from}`;
  
  const response = await fetch(url);
  const data = await response.json();

  if (data.rates && data.rates[to]) {
    const rate = data.rates[to];
    return {
      text: `1 ${from} = ${rate} ${to}`,
      from: from,
      to: to,
      rate: rate,
      date: data.date
    };
  }

  return {
    text: `Exchange rate not available for ${from} to ${to}`,
    url: null
  };
}

/**
 * Search cryptocurrency
 */
async function searchCryptocurrency(query, options = {}) {
  // Use CoinGecko API (free, no key required)
  const symbol = options.symbol || query.match(/\b(bitcoin|ethereum|btc|eth)\b/i)?.[0] || 'bitcoin';
  const coinId = symbol.toLowerCase() === 'btc' ? 'bitcoin' : symbol.toLowerCase() === 'eth' ? 'ethereum' : symbol.toLowerCase();

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`;
  
  const response = await fetch(url);
  const data = await response.json();

  if (data[coinId]) {
    const price = data[coinId].usd;
    return {
      text: `${coinId.toUpperCase()}: $${price.toLocaleString()}`,
      symbol: coinId.toUpperCase(),
      price_usd: price
    };
  }

  return {
    text: `Cryptocurrency data not available for ${symbol}`,
    url: null
  };
}

/**
 * Built-in searches (no external API needed)
 */
async function builtInSearch(query, type, options = {}) {
  if (type === 'current_time') {
    const location = options.location || query.match(/in\s+([A-Za-z\s]+)/i)?.[1] || 'UTC';
    
    // Simple timezone handling (can be enhanced)
    const now = new Date();
    return {
      text: `Current time: ${now.toLocaleString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`,
      datetime: now.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  } else if (type === 'time_zone') {
    const location = options.location || query;
    const now = new Date();
    return {
      text: `Time zone for ${location}: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      current_time: now.toLocaleString()
    };
  }

  return {
    text: "Built-in search not available for this type",
    url: null
  };
}

/**
 * Cache management
 */
async function cacheResult(query, type, result, hours) {
  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + hours);

    // Delete expired entries for this query/type first
    await queryPostgres(
      `DELETE FROM public.vera_search_cache 
       WHERE query = $1 AND type = $2 AND expires_at < NOW()`,
      [query, type]
    );

    // Insert new cache entry
    await queryPostgres(
      `INSERT INTO public.vera_search_cache 
       (query, type, result, expires_at, cached_at, source, url)
       VALUES ($1, $2, $3, $4, NOW(), $5, $6)`,
      [query, type, JSON.stringify(result), expiresAt, result.source || null, result.url || null]
    );
  } catch (error) {
    console.error('[VeraWebSearch] Error caching result:', error);
    // Don't throw - caching is optional
  }
}

async function checkCache(query, type) {
  try {
    const result = await queryPostgres(
      `SELECT result, cached_at, source, url FROM public.vera_search_cache
       WHERE query = $1 AND type = $2 AND expires_at > NOW()
       ORDER BY cached_at DESC
       LIMIT 1`,
      [query, type]
    );

    if (result.rows && result.rows.length > 0) {
      return {
        result: JSON.parse(result.rows[0].result),
        cached_at: result.rows[0].cached_at,
        source: result.rows[0].source,
        url: result.rows[0].url
      };
    }
  } catch (error) {
    console.error('[VeraWebSearch] Error checking cache:', error);
  }

  return null;
}

function isCacheExpired(cached, maxHours) {
  if (!cached || !cached.cached_at) return true;
  
  const cachedTime = new Date(cached.cached_at);
  const now = new Date();
  const hoursDiff = (now - cachedTime) / (1000 * 60 * 60);
  
  return hoursDiff >= maxHours;
}

/**
 * Rate limiting
 */
function checkRateLimit(userId) {
  const now = Date.now();
  const userCounts = searchCounts.get(userId) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };

  if (now > userCounts.resetTime) {
    // Reset window
    searchCounts.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userCounts.count >= RATE_LIMIT) {
    return false;
  }

  userCounts.count++;
  searchCounts.set(userId, userCounts);
  return true;
}

function incrementSearchCount(userId) {
  const userCounts = searchCounts.get(userId) || { count: 0, resetTime: Date.now() + RATE_LIMIT_WINDOW };
  userCounts.count++;
  searchCounts.set(userId, userCounts);
}

function getRetryAfter(userId) {
  const userCounts = searchCounts.get(userId);
  if (!userCounts) return 0;
  
  const remaining = Math.ceil((userCounts.resetTime - Date.now()) / 1000);
  return remaining > 0 ? remaining : 0;
}

