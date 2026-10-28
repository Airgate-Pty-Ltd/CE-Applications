/**
 * Whitelist Crawler Service
 * 
 * Bounded ingestion from approved regulatory/standards domains only.
 * Never fetches arbitrary user-supplied URLs.
 * 
 * © 2025 Conform-Edge Quality Consulting. All rights reserved. CEQC-OQCQMS
 */

import { query } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ingestionService from './ingestionService.js';
import embeddingService from './embeddingService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default whitelist configuration
const DEFAULT_WHITELIST = {
  allowed_domains: [
    'www.faa.gov',
    'www.easa.europa.eu',
    'www.casa.gov.au',
    'www.tc.gc.ca',
    'www.iso.org',
    'www.sae.org'
  ],
  start_urls: [
    'https://www.faa.gov/regulations_policies/handbooks_manuals/',
    'https://www.easa.europa.eu/en/document-library'
  ],
  max_depth: 3,
  respect_robots_txt: true
};

/**
 * Load whitelist configuration
 */
function loadWhitelistConfig() {
  const configPath = path.join(__dirname, '../config/whitelistDomains.json');
  
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return { ...DEFAULT_WHITELIST, ...config };
    } catch (error) {
      console.warn('[Crawler] Failed to load whitelist config, using defaults:', error);
    }
  }
  
  return DEFAULT_WHITELIST;
}

/**
 * Check if URL is whitelisted
 */
function isUrlWhitelisted(url, config) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/^www\./, '');
    
    return config.allowed_domains.some(allowed => {
      const allowedDomain = allowed.replace(/^www\./, '');
      return domain === allowedDomain || domain.endsWith('.' + allowedDomain);
    });
  } catch (error) {
    return false;
  }
}

/**
 * Check robots.txt compliance
 */
async function checkRobotsTxt(url) {
  try {
    const urlObj = new URL(url);
    const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;
    
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(robotsUrl, { timeout: 5000 });
    
    if (!response.ok) {
      // If robots.txt doesn't exist, allow crawling
      return true;
    }
    
    const robotsText = await response.text();
    const userAgent = 'EDCAT-Crawler/1.0';
    
    // Simple robots.txt parser (basic implementation)
    const lines = robotsText.split('\n');
    let currentUserAgent = null;
    let disallowed = [];
    
    for (const line of lines) {
      const trimmed = line.trim().toLowerCase();
      if (trimmed.startsWith('user-agent:')) {
        currentUserAgent = trimmed.substring(11).trim();
      } else if (trimmed.startsWith('disallow:') && (currentUserAgent === '*' || currentUserAgent === userAgent.toLowerCase())) {
        const path = trimmed.substring(9).trim();
        if (path) disallowed.push(path);
      }
    }
    
    // Check if URL path matches any disallowed pattern
    const urlPath = urlObj.pathname;
    return !disallowed.some(pattern => {
      if (pattern === '/') return true; // Disallow all
      return urlPath.startsWith(pattern);
    });
    
  } catch (error) {
    console.warn('[Crawler] Robots.txt check failed, allowing:', error.message);
    return true; // Allow if check fails
  }
}

/**
 * Extract text content from HTML
 */
async function extractTextFromHtml(html) {
  // Simple HTML text extraction (in production, use cheerio or similar)
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return text;
}

/**
 * Fetch and process a single URL
 */
async function fetchAndProcessUrl(url, config, tenantId, depth = 0) {
  if (depth > config.max_depth) {
    return { fetched: false, reason: 'max_depth_exceeded' };
  }
  
  // Validate URL is whitelisted
  if (!isUrlWhitelisted(url, config)) {
    return { fetched: false, reason: 'not_whitelisted' };
  }
  
  // Check robots.txt if enabled
  if (config.respect_robots_txt) {
    const allowed = await checkRobotsTxt(url);
    if (!allowed) {
      return { fetched: false, reason: 'robots_txt_disallowed' };
    }
  }
  
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'EDCAT-Crawler/1.0 (Conform-Edge Compliance Intelligence)'
      }
    });
    
    if (!response.ok) {
      return { fetched: false, reason: `http_${response.status}` };
    }
    
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/pdf')) {
      return { fetched: false, reason: 'unsupported_content_type' };
    }
    
    const content = await response.buffer();
    
    // For HTML, extract text
    // For PDF, save and process via ingestion service
    let text = '';
    let documentType = 'regulation';
    
    if (contentType.includes('text/html')) {
      const html = content.toString('utf8');
      text = await extractTextFromHtml(html);
      documentType = 'regulation';
    } else if (contentType.includes('application/pdf')) {
      // Save PDF temporarily and process
      const tempPath = path.join(__dirname, '../../uploads/crawler', `${uuidv4()}.pdf`);
      fs.mkdirSync(path.dirname(tempPath), { recursive: true });
      fs.writeFileSync(tempPath, content);
      
      // Use ingestion service to process
      const docId = uuidv4();
      await query(
        `INSERT INTO documents (id, customer_id, document_name, document_type, source_reference, source, raw_text, parse_status, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          docId,
          tenantId,
          `Crawled: ${new URL(url).pathname}`,
          'regulation',
          new URL(url).hostname,
          'crawler',
          '', // Will be populated by ingestion
          'pending',
          true
        ]
      );
      
      // Process via ingestion service
      await ingestionService.ingestDocument({
        documentId: docId,
        tenantId,
        filePath: tempPath,
        mimeType: 'application/pdf',
        docType: 'regulation',
        metadata: { crawled_from: url, crawled_at: new Date().toISOString() }
      });
      
      // Clean up temp file
      fs.unlinkSync(tempPath);
      
      return { fetched: true, documentId: docId, url };
    }
    
    if (!text || text.trim().length < 100) {
      return { fetched: false, reason: 'insufficient_content' };
    }
    
    // Store as document
    const docId = uuidv4();
    await query(
      `INSERT INTO documents (id, customer_id, document_name, document_type, source_reference, source, raw_text, parse_status, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        docId,
        tenantId,
        `Crawled: ${new URL(url).pathname}`,
        documentType,
        new URL(url).hostname,
        'crawler',
        text,
        'success',
        true
      ]
    );
    
    // Chunk and embed
    await ingestionService.ingestDocument({
      documentId: docId,
      tenantId,
      filePath: null, // No file, text already extracted
      mimeType: 'text/html',
      docType: documentType,
      metadata: { crawled_from: url, crawled_at: new Date().toISOString() }
    });
    
    return { fetched: true, documentId: docId, url };
    
  } catch (error) {
    console.error(`[Crawler] Error fetching ${url}:`, error);
    return { fetched: false, reason: error.message };
  }
}

/**
 * Crawl whitelisted sources
 * @param {string} tenantId - Tenant ID (use Conform-Edge tenant for global corpus)
 * @param {Object} options - Crawl options
 */
export async function crawlWhitelistedSources(tenantId, options = {}) {
  const config = loadWhitelistConfig();
  const startUrls = options.startUrls || config.start_urls;
  const maxDepth = options.maxDepth || config.max_depth;
  
  if (!tenantId) {
    throw new Error('Tenant ID required for crawler');
  }
  
  const results = {
    fetched: 0,
    failed: 0,
    skipped: 0,
    documents: []
  };
  
  // Create crawl job record
  const jobId = uuidv4();
  await query(
    `INSERT INTO crawler_jobs (id, tenant_id, started_at, status, audit_log)
     VALUES ($1, $2, NOW(), 'running', $3)`,
    [
      jobId,
      tenantId,
      JSON.stringify({ start_urls: startUrls, config })
    ]
  );
  
  try {
    for (const startUrl of startUrls) {
      if (!isUrlWhitelisted(startUrl, config)) {
        console.warn(`[Crawler] Start URL not whitelisted: ${startUrl}`);
        results.skipped++;
        continue;
      }
      
      const result = await fetchAndProcessUrl(startUrl, config, tenantId, 0);
      
      if (result.fetched) {
        results.fetched++;
        results.documents.push(result.documentId);
      } else {
        results.failed++;
        console.warn(`[Crawler] Failed to fetch ${startUrl}: ${result.reason}`);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Update job status
    await query(
      `UPDATE crawler_jobs 
       SET completed_at = NOW(), 
           status = 'success',
           documents_fetched = $1,
           documents_processed = $2,
           audit_log = jsonb_set(audit_log, '{results}', $3::jsonb)
       WHERE id = $4`,
      [
        results.fetched,
        results.documents.length,
        JSON.stringify(results),
        jobId
      ]
    );
    
    return {
      success: true,
      jobId,
      results
    };
    
  } catch (error) {
    console.error('[Crawler] Crawl failed:', error);
    
    await query(
      `UPDATE crawler_jobs 
       SET completed_at = NOW(), 
           status = 'failed',
           error_message = $1
       WHERE id = $2`,
      [error.message, jobId]
    );
    
    throw error;
  }
}

/**
 * Get crawl job history
 */
export async function getCrawlHistory(tenantId, limit = 50) {
  const result = await query(
    `SELECT id, started_at, completed_at, status, documents_fetched, documents_processed, error_message
     FROM crawler_jobs
     WHERE tenant_id = $1
     ORDER BY started_at DESC
     LIMIT $2`,
    [tenantId, limit]
  );
  
  return result.rows;
}

export default {
  crawlWhitelistedSources,
  getCrawlHistory,
  loadWhitelistConfig
};

