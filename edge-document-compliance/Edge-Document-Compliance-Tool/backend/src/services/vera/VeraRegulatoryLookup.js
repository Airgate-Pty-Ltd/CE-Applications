/**
 * Vera Regulatory Lookup
 * Quick lookup of regulations by country/industry
 */

import { queryEdcatAI } from '../../config/databases.js';

// Use provider-agnostic Vera model service
import { callVeraModel, isVeraModelAvailable } from './veraModelService.js';

const VeraRegulatoryLookup = {

  async findRegulatoryRequirements(country, industry, productType) {
    console.log(`[VeraRegulatoryLookup] Looking up regulations for ${industry} in ${country}...`);

    // Check database first
    try {
      const cached = await queryEdcatAI(
        `SELECT * FROM edcat.vera_regulatory_lookup 
         WHERE LOWER(country) = LOWER($1) 
         AND LOWER(industry) = LOWER($2)`,
        [country, industry]
      );

      if (cached.rows.length > 0) {
        return {
          source: 'cached',
          results: cached.rows
        };
      }
    } catch (error) {
      console.log('[VeraRegulatoryLookup] Cache check failed, will research:', error.message);
    }

    // If not cached, research
    const results = await this.researchRegulatoryRequirements(
      country,
      industry,
      productType
    );

    // Cache results
    for (const result of results) {
      try {
        await queryEdcatAI(
          `INSERT INTO edcat.vera_regulatory_lookup 
           (country, industry, product_type, regulation_name, regulatory_body, 
            description, requirements, compliance_mandatory)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT DO NOTHING`,
          [
            country, 
            industry, 
            productType, 
            result.regulation_name, 
            result.regulatory_body,
            result.description, 
            JSON.stringify(result.requirements || []), 
            result.mandatory || false
          ]
        );
      } catch (error) {
        console.error('[VeraRegulatoryLookup] Error caching result:', error.message);
      }
    }

    return {
      source: 'research',
      results: results,
      cached_for_future: true
    };
  },

  async researchRegulatoryRequirements(country, industry, productType) {
    if (!isVeraModelAvailable()) {
      // Fallback without LLM
      return [{
        regulation_name: `${country} ${industry} regulations`,
        regulatory_body: 'Regulatory Authority',
        description: `Regulatory requirements for ${industry} in ${country}`,
        requirements: ['Compliance required', 'Certification may be needed'],
        mandatory: true,
        certification_required: false
      }];
    }

    try {
      // Construct search queries
      const queries = [
        `${country} ${industry} regulations`,
        `${country} manufacturing regulations ${industry}`,
        `${country} product compliance requirements ${industry}`,
        `regulatory body ${country} ${industry}`
      ];

      // Search for regulations using Vera model service
      const result = await callVeraModel([
        {
          role: 'user',
          content: `Research and provide regulatory requirements for:
Country: ${country}
Industry: ${industry}
Product Type: ${productType || 'general'}

Return JSON array:
[{
  "regulation_name": "...",
  "regulatory_body": "name of agency",
  "description": "what this regulates",
  "requirements": ["requirement 1", "requirement 2", ...],
  "mandatory": true/false,
  "certification_required": true/false,
  "estimated_compliance_time": "X months"
}]`
        }
      ]);
      
      // Parse the result
      let regulations = [];
      try {
        regulations = JSON.parse(result.answer);
      } catch (e) {
        // If not JSON, create a simple structure
        regulations = [{
          regulation_name: 'Regulatory Requirements',
          regulatory_body: 'Research Results',
          description: result.answer,
          requirements: [],
          mandatory: true,
          certification_required: false
        }];
      }

      try {
        return regulations;
      } catch (e) {
        console.error('[VeraRegulatoryLookup] Failed to parse response:', e.message);
        return [];
      }
    } catch (error) {
      console.error('[VeraRegulatoryLookup] Research error:', error.message);
      return [];
    }
  }
};

export default VeraRegulatoryLookup;

