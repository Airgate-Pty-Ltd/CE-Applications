/**
 * VERA Web Search Routes
 * 
 * Provides API endpoints for VERA's comprehensive public data search capabilities
 */

import express from 'express';
import { searchPublicData } from '../services/vera/VeraWebSearchService.js';

const router = express.Router();

/**
 * GET /api/vera/search
 * Search public data with query parameters
 * 
 * Query params:
 * - query: Search query (required)
 * - type: Search type (optional, defaults to "auto")
 * - location: Location for location-based searches (optional)
 * - start_location: Start location for distance/directions (optional)
 * - end_location: End location for distance/directions (optional)
 * - symbol: Stock symbol or currency pair (optional)
 */
router.get('/search', async (req, res) => {
  try {
    const { query, type, location, start_location, end_location, symbol, from, to } = req.query;
    const userId = req.user?.id || req.headers['x-user-id'] || 'default';

    if (!query) {
      return res.status(400).json({
        error: 'Query parameter is required',
        example: '/api/vera/search?query=weather in Pocatello&type=weather'
      });
    }

    const options = {
      userId,
      location,
      start_location,
      end_location,
      symbol,
      from,
      to
    };

    const result = await searchPublicData(query, type || 'auto', options);

    if (result.error) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('[VeraSearch] Error in GET /search:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
});

/**
 * POST /api/vera/search
 * Search public data with JSON body
 * 
 * Body:
 * {
 *   "query": "Search query",
 *   "type": "weather" (optional),
 *   "options": {
 *     "location": "Pocatello, ID",
 *     "start_location": "Pocatello",
 *     "end_location": "Denver",
 *     "symbol": "AAPL"
 *   }
 * }
 */
router.post('/search', async (req, res) => {
  try {
    const { query, type, options = {} } = req.body;
    const userId = req.user?.id || req.headers['x-user-id'] || 'default';

    if (!query) {
      return res.status(400).json({
        error: 'Query is required in request body',
        example: {
          query: 'weather in Pocatello',
          type: 'weather',
          options: {
            location: 'Pocatello, ID'
          }
        }
      });
    }

    const searchOptions = {
      userId,
      ...options
    };

    const result = await searchPublicData(query, type || 'auto', searchOptions);

    if (result.error) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('[VeraSearch] Error in POST /search:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
});

/**
 * GET /api/vera/search/types
 * List all available search types
 */
router.get('/search/types', (req, res) => {
  const types = {
    regulatory_compliance: [
      'regulation',
      'industry_news',
      'standard_update',
      'recall',
      'inspection',
      'warning_letter',
      'compliance'
    ],
    weather_environment: [
      'weather',
      'weather_forecast',
      'air_quality',
      'severe_weather',
      'climate',
      'natural_disaster'
    ],
    travel_logistics: [
      'distance',
      'directions',
      'traffic',
      'travel_time',
      'flight',
      'hotel',
      'restaurant',
      'parking'
    ],
    business_market: [
      'stock',
      'company',
      'industry',
      'price',
      'supplier'
    ],
    technical_engineering: [
      'technical_spec',
      'patent',
      'software',
      'api',
      'research'
    ],
    health_safety: [
      'safety_alert',
      'chemical',
      'occupational_health',
      'medical',
      'ergonomic'
    ],
    general_knowledge: [
      'news',
      'local_news',
      'education',
      'reference',
      'map',
      'address',
      'phone'
    ],
    quality_management: [
      'best_practice',
      'audit_guide',
      'training',
      'tool_reference',
      'case_study',
      'supplier_rating',
      'conference',
      'publication'
    ],
    real_time_data: [
      'current_time',
      'exchange_rate',
      'cryptocurrency',
      'sports',
      'tv_guide',
      'event'
    ],
    academic_professional: [
      'certification',
      'course',
      'journal',
      'professional_org'
    ],
    environmental_sustainability: [
      'carbon_footprint',
      'sustainability',
      'recycling',
      'renewable_energy',
      'waste_management'
    ]
  };

  res.json({
    available_types: types,
    total_count: Object.values(types).flat().length,
    note: 'Use type="auto" to automatically detect search type from query'
  });
});

export default router;

