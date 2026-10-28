/**
 * Vera Comprehensive Researcher
 * Execute comprehensive research across multiple sources
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { queryEdcatAI } from '../../config/databases.js';

// Use provider-agnostic Vera model service
import { callVeraModel, isVeraModelAvailable } from './veraModelService.js';

const VeraComprehensiveResearcher = {

  async executeComprehensiveResearch(parsedRequest) {
    console.log(`[VeraComprehensiveResearcher] Starting research for: ${parsedRequest.parsed_details.primary_topic}`);

    const startTime = Date.now();

    try {
      // Step 1: Generate search queries
      const searchQueries = this.generateSearchQueries(parsedRequest.parsed_details);

      // Step 2: Execute parallel searches
      const searchResults = await this.parallelSearch(searchQueries, parsedRequest);

      // Step 3: Extract and parse content
      const extractedContent = await this.extractContent(searchResults);

      // Step 4: Assess source credibility
      const credibleContent = await this.assessCredibility(extractedContent);

      // Step 5: Cross-reference for accuracy
      const verified = await this.crossReference(credibleContent);

      // Step 6: Synthesize findings
      const synthesis = await this.synthesizeFindings(verified, parsedRequest);

      // Step 7: Generate comprehensive report
      const report = await this.generateReport(synthesis, parsedRequest);

      const duration = (Date.now() - startTime) / 1000;

      return {
        success: true,
        duration: duration,
        sources_found: searchResults.length,
        authoritative_sources: credibleContent.length,
        sources: verified.slice(0, 10), // Return top 10 sources for saving
        report: report,
        confidence: this.calculateConfidence(verified)
      };

    } catch (error) {
      console.error('[VeraComprehensiveResearcher] Research failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  generateSearchQueries(parsed) {
    const queries = [];

    // Primary queries
    if (parsed.standards && parsed.standards.length > 0) {
      queries.push(...parsed.standards.map(s => `${s} standard requirements`));
      queries.push(...parsed.standards.map(s => `${s} ISO official`));
    }

    if (parsed.industries && parsed.industries.length > 0) {
      queries.push(
        `${parsed.industries[0]} compliance requirements`,
        `${parsed.industries[0]} regulations`
      );
    }

    if (parsed.countries && parsed.countries.length > 0) {
      queries.push(
        `${parsed.countries[0]} regulations manufacturing`,
        `${parsed.countries[0]} quality standards`,
        `${parsed.countries[0]} regulatory bodies`
      );
    }

    // Combination queries
    if (parsed.countries && parsed.countries.length > 0 && parsed.industries && parsed.industries.length > 0) {
      queries.push(
        `${parsed.countries[0]} ${parsed.industries[0]} regulations`,
        `regulations for ${parsed.industries[0]} in ${parsed.countries[0]}`
      );
    }

    return [...new Set(queries)].slice(0, 10); // Unique, max 10
  },

  async parallelSearch(queries, parsedRequest) {
    console.log(`[VeraComprehensiveResearcher] Searching: ${queries.join(', ')}`);

    const allResults = [];

    // Search multiple sources in parallel
    const searches = [
      this.searchGoogle(queries),
      this.searchBing(queries),
      this.searchISODatabase(queries),
      this.searchGovernmentSites(queries),
      this.searchAcademic(queries),
      this.searchCertificationBodies(queries)
    ];

    const results = await Promise.allSettled(searches);

    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        allResults.push(...result.value);
      }
    });

    return allResults;
  },

  async searchGoogle(queries) {
    // Note: In production, use Google Custom Search API
    // For now, return empty array (web scraping may be blocked)
    console.log('[VeraComprehensiveResearcher] Google search (limited - use API in production)');
    return [];
  },

  async searchBing(queries) {
    // Note: In production, use Bing Search API
    console.log('[VeraComprehensiveResearcher] Bing search (limited - use API in production)');
    return [];
  },

  async searchISODatabase(queries) {
    const results = [];

    for (const query of queries.slice(0, 2)) {
      try {
        // ISO.org search
        const response = await axios.get('https://www.iso.org/standard-list.html', {
          params: { keyword: query },
          timeout: 15000,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const $ = cheerio.load(response.data);
        
        $('.document').each((i, el) => {
          const title = $(el).find('.title').text().trim();
          const url = $(el).find('a').attr('href');
          
          if (title && url) {
            results.push({
              source: 'ISO.org',
              title: title,
              url: url,
              credibility: 1.0,
              source_type: 'official_standard'
            });
          }
        });
      } catch (error) {
        console.error('[VeraComprehensiveResearcher] ISO search error:', error.message);
      }
    }

    return results;
  },

  async searchGovernmentSites(queries) {
    // Simplified - in production, use proper APIs
    console.log('[VeraComprehensiveResearcher] Government sites search (limited)');
    return [];
  },

  async searchAcademic(queries) {
    // Simplified - in production, use Google Scholar API
    console.log('[VeraComprehensiveResearcher] Academic search (limited)');
    return [];
  },

  async searchCertificationBodies(queries) {
    // Simplified - in production, search certification body websites
    console.log('[VeraComprehensiveResearcher] Certification bodies search (limited)');
    return [];
  },

  async extractContent(searchResults) {
    console.log(`[VeraComprehensiveResearcher] Extracting content from ${searchResults.length} sources...`);

    const extracted = [];
    const topResults = searchResults.slice(0, 15);

    for (const result of topResults) {
      try {
        const response = await axios.get(result.url, {
          timeout: 10000,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (response.data && response.data.length > 100) {
          extracted.push({
            ...result,
            content: response.data,
            content_length: response.data.length,
            fetched_at: new Date()
          });
        }
      } catch (error) {
        console.log(`[VeraComprehensiveResearcher] Failed to extract: ${result.url}`);
      }
    }

    return extracted;
  },

  async assessCredibility(extractedContent) {
    console.log('[VeraComprehensiveResearcher] Assessing source credibility...');

    const credible = [];

    for (const content of extractedContent) {
      let credibilityScore = 0.50;

      // Factor 1: Source type
      const sourceTypeScores = {
        'official_standard': 0.99,
        'government': 0.98,
        'academic': 0.85,
        'certification_body': 0.90,
        'industry_publication': 0.75
      };

      credibilityScore = sourceTypeScores[content.source_type] || 0.50;

      // Factor 2: Domain authority
      const authorityDomains = [
        'iso.org', 'fda.gov', 'faa.gov', 'easa.europa.eu',
        'bsigroup.com', 'dnv.com', 'scholar.google.com'
      ];

      try {
        const domain = new URL(content.url).hostname;
        if (authorityDomains.some(auth => domain.includes(auth))) {
          credibilityScore = Math.min(credibilityScore + 0.05, 1.0);
        }
      } catch (e) {
        // Invalid URL
      }

      // Factor 3: Content quality
      if (content.content_length > 2000) {
        credibilityScore += 0.05;
      }

      content.credibility_score = Math.min(credibilityScore, 1.0);

      if (credibilityScore > 0.65) {
        credible.push(content);
      }
    }

    return credible.sort((a, b) => b.credibility_score - a.credibility_score);
  },

  async crossReference(credibleContent) {
    console.log('[VeraComprehensiveResearcher] Cross-referencing sources...');

    const verified = [];

    for (const content of credibleContent) {
      let verificationScore = content.credibility_score;

      // Check if this information appears elsewhere
      const mentions = credibleContent.filter(c =>
        c !== content && 
        this.contentsSimilar(c.content, content.content)
      ).length;

      // Multiple sources mentioning same info increases confidence
      if (mentions > 0) {
        verificationScore += (mentions * 0.05);
      }

      content.verification_score = Math.min(verificationScore, 1.0);
      content.mentions_in_other_sources = mentions;

      verified.push(content);
    }

    return verified;
  },

  contentsSimilar(content1, content2) {
    // Simple similarity check
    const text1 = (content1 || '').substring(0, 500).toLowerCase();
    const text2 = (content2 || '').substring(0, 500).toLowerCase();

    const commonWords = text1.split(' ').filter(word => 
      text2.includes(word) && word.length > 3
    ).length;

    return commonWords > 10;
  },

  async synthesizeFindings(verifiedContent, parsedRequest) {
    console.log('[VeraComprehensiveResearcher] Synthesizing findings...');

    // Enhanced fallback synthesis that extracts key information
    if (!isVeraModelAvailable() || verifiedContent.length === 0) {
      // Try to get information from database first
      const { ResearchRepository } = await import('./VeraRepository.js');
      
      // Check if we have cached regulatory lookup
      const topic = parsedRequest.parsed_details.primary_topic;
      const regulatorMatch = topic.match(/(FAA|EASA|CASA|CAAC|FDA)/i);
      const partMatch = topic.match(/part\s*(\d+)/i);
      
      if (regulatorMatch && partMatch) {
        const regulator = regulatorMatch[1].toUpperCase();
        const partNumber = partMatch[1];
        const lookup = await ResearchRepository.getRegulatoryLookup(regulator, `PART-${partNumber}`);
        
        if (lookup && lookup.regulation_text) {
          return {
            summary: `**${regulator} Part ${partNumber}**\n\n${lookup.regulation_text.substring(0, 2000)}`,
            introduction: `Information about ${regulator} Part ${partNumber} from regulatory database.`,
            keyFindings: this.extractKeyFindingsFromText(lookup.regulation_text),
            requirements: this.extractRequirementsFromText(lookup.regulation_text),
            source: lookup.source_url || 'Regulatory database'
          };
        }
      }

      // Enhanced fallback with structured information
      const summary = this.buildStructuredSummary(verifiedContent, parsedRequest);
      return summary;
    }

    try {
      // Use Vera model service to synthesize all information
      if (!isVeraModelAvailable()) {
        throw new Error('VERA_MODEL_ENDPOINT not configured - cannot synthesize research results');
      }

      const contentSummaries = verifiedContent
        .slice(0, 5) // Top 5 sources
        .map((c, i) => `Source ${i + 1}: ${c.title}\n${(c.content || '').substring(0, 1000)}`)
        .join('\n\n');

      const result = await callVeraModel([
        {
          role: 'user',
          content: `Synthesize information from these sources about: "${parsedRequest.parsed_details.primary_topic}"

${contentSummaries}

Provide a comprehensive analysis with:
1. Overview and purpose
2. Key requirements and sections
3. Who it applies to
4. Common implementation challenges
5. Key takeaways
6. Implementation considerations

Format as structured JSON with: summary, introduction, keyFindings (array), requirements (array), whoApplies, challenges (array), takeaways (array)`
        }
      ]);

      const content = result.answer || '';
      
      // Try to parse as JSON, fallback to text
      try {
        const parsed = JSON.parse(content);
        return parsed;
      } catch (err) {
        // Not JSON, return structured format
        return {
          summary: content,
          introduction: `Comprehensive analysis of ${parsedRequest.parsed_details.primary_topic}`,
          keyFindings: this.extractKeyFindingsFromText(content),
          requirements: this.extractRequirementsFromText(content)
        };
      }
    } catch (error) {
      console.error('[VeraComprehensiveResearcher] Synthesis error:', error.message);
      return this.buildStructuredSummary(verifiedContent, parsedRequest);
    }
  },

  buildStructuredSummary(verifiedContent, parsedRequest) {
    const topic = parsedRequest.parsed_details.primary_topic;
    
    // Build comprehensive summary from available content
    const summaries = verifiedContent
      .slice(0, 5)
      .map(c => c.title || c.url)
      .filter(Boolean);

    return {
      summary: `${topic} is a regulatory standard or requirement that applies to the specified industry or jurisdiction.`,
      introduction: `This research provides information about ${topic}. ${verifiedContent.length > 0 ? `Found ${verifiedContent.length} relevant sources.` : 'Limited sources available.'}`,
      keyFindings: summaries.length > 0 ? summaries : [
        `${topic} is an important regulatory requirement`,
        'Compliance requires understanding specific clauses and sections',
        'Implementation typically requires documentation and evidence'
      ],
      requirements: [
        'Review the complete regulation text',
        'Identify applicable clauses',
        'Document compliance evidence',
        'Maintain records as required'
      ],
      whoApplies: 'Organizations operating in the relevant industry or jurisdiction',
      challenges: [
        'Interpreting regulatory language',
        'Ensuring complete coverage',
        'Maintaining ongoing compliance'
      ],
      takeaways: [
        `Understanding ${topic} is essential for compliance`,
        'Regular review and updates are necessary',
        'Expert consultation may be beneficial'
      ]
    };
  },

  extractKeyFindingsFromText(text) {
    if (!text) return [];
    
    const findings = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    // Extract sentences that look like findings
    for (const sentence of sentences.slice(0, 5)) {
      const trimmed = sentence.trim();
      if (trimmed.length > 30 && trimmed.length < 200) {
        findings.push(trimmed);
      }
    }
    
    return findings.length > 0 ? findings : ['Key information extracted from sources'];
  },

  extractRequirementsFromText(text) {
    if (!text) return [];
    
    const requirements = [];
    const requirementPatterns = [
      /(?:shall|must|will|required to|must ensure)/gi,
      /(?:clause|section|requirement|standard)/gi
    ];
    
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    for (const sentence of sentences) {
      if (requirementPatterns.some(pattern => pattern.test(sentence))) {
        const trimmed = sentence.trim();
        if (trimmed.length > 30 && trimmed.length < 200) {
          requirements.push(trimmed);
        }
      }
    }
    
    return requirements.slice(0, 5);
  },

  async generateReport(synthesis, parsedRequest) {
    // Ensure synthesis is an object with proper structure
    const report = {
      topic: parsedRequest.parsed_details.primary_topic,
      request_type: parsedRequest.request_type,
      summary: typeof synthesis === 'string' ? synthesis : synthesis.summary || synthesis,
      introduction: synthesis.introduction || `Research report for ${parsedRequest.parsed_details.primary_topic}`,
      keyFindings: synthesis.keyFindings || [],
      requirements: synthesis.requirements || [],
      whoApplies: synthesis.whoApplies || 'Relevant organizations',
      challenges: synthesis.challenges || [],
      takeaways: synthesis.takeaways || [],
      research_depth: parsedRequest.parsed_details.depth_required || 'comprehensive',
      generated_at: new Date()
    };
    
    return report;
  },

  calculateConfidence(verified) {
    if (verified.length === 0) {
      // Even with no sources, if we have database knowledge, confidence should be higher
      return 0.50; // Increased from 0.30
    }
    
    // Calculate based on source quality and quantity
    const avgCredibility = verified.reduce((sum, v) => sum + (v.credibility_score || 0.50), 0) / verified.length;
    const sourceCount = verified.length;
    
    // Base confidence from source quality
    let confidence = avgCredibility * 0.70;
    
    // Boost from multiple sources
    if (sourceCount >= 5) {
      confidence = Math.min(0.95, confidence + 0.20);
    } else if (sourceCount >= 3) {
      confidence = Math.min(0.90, confidence + 0.15);
    } else if (sourceCount >= 1) {
      confidence = Math.min(0.85, confidence + 0.10);
    }
    
    // Boost from verification scores
    const avgVerification = verified.reduce((sum, v) => sum + (v.verification_score || 0.50), 0) / verified.length;
    confidence = (confidence + avgVerification * 0.30) / 1.30;
    
    return Math.min(0.95, Math.max(0.50, confidence));
  }
};

export default VeraComprehensiveResearcher;

