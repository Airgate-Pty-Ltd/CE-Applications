/**
 * Vera Debug Service
 * Manages debug mode state for users and handles debug commands
 */

import { queryEdcatAI, queryPostgres, postgresPool, edcatPool, checkConnections } from '../../config/databases.js';

/**
 * Enter debug mode for a user
 * @param {Object} params
 * @param {string} params.tenantId
 * @param {string} params.userId
 * @returns {Promise<void>}
 */
export async function enterDebugMode({ tenantId, userId }) {
  await queryEdcatAI(
    `
    INSERT INTO edcat.vera_debug_sessions (tenant_id, user_id, is_debug_mode, updated_at)
    VALUES ($1, $2, TRUE, NOW())
    ON CONFLICT (tenant_id, user_id)
    DO UPDATE SET is_debug_mode = EXCLUDED.is_debug_mode, updated_at = EXCLUDED.updated_at;
    `,
    [tenantId, userId]
  );
}

/**
 * Exit debug mode for a user
 * @param {Object} params
 * @param {string} params.tenantId
 * @param {string} params.userId
 * @returns {Promise<void>}
 */
export async function exitDebugMode({ tenantId, userId }) {
  await queryEdcatAI(
    `
    INSERT INTO edcat.vera_debug_sessions (tenant_id, user_id, is_debug_mode, updated_at)
    VALUES ($1, $2, FALSE, NOW())
    ON CONFLICT (tenant_id, user_id)
    DO UPDATE SET is_debug_mode = EXCLUDED.is_debug_mode, updated_at = EXCLUDED.updated_at;
    `,
    [tenantId, userId]
  );
}

/**
 * Check if user is in debug mode
 * @param {Object} params
 * @param {string} params.tenantId
 * @param {string} params.userId
 * @returns {Promise<boolean>}
 */
export async function isDebugMode({ tenantId, userId }) {
  try {
    const result = await queryEdcatAI(
      `
      SELECT is_debug_mode
      FROM edcat.vera_debug_sessions
      WHERE tenant_id = $1 AND user_id = $2
      `,
      [tenantId, userId]
    );

    return result.rows[0]?.is_debug_mode === true;
  } catch (error) {
    // If table doesn't exist yet, return false (debug mode not available)
    console.warn('[VeraDebugService] Could not check debug mode:', error.message);
    return false;
  }
}

/**
 * Handle debug commands
 * @param {Object} params
 * @param {string} params.command - The debug command (e.g., "database connections")
 * @param {string} params.tenantId
 * @param {string} params.userId
 * @returns {Promise<string>} Debug response
 */
export async function handleDebugCommand({ command, tenantId, userId }) {
  const lowerCommand = (command || '').toLowerCase().trim();

  // Remove "debug:" prefix if present
  const cleanCommand = lowerCommand.replace(/^debug:\s*/, '').trim();

  // Handle different debug commands
  if (cleanCommand.includes('database') || cleanCommand.includes('db') || cleanCommand.includes('connection')) {
    return await handleDatabaseConnectionsDebug();
  }

  if (cleanCommand.includes('tables') || cleanCommand.includes('schema')) {
    return await handleTablesDebug(tenantId);
  }

  if (cleanCommand.includes('migration') || cleanCommand.includes('migrate')) {
    return await handleMigrationsDebug();
  }

  // Learning content debug commands
  if (cleanCommand.includes('learning standard') || cleanCommand.includes('learning docs')) {
    const standardMatch = cleanCommand.match(/learning\s+(?:standard|docs?)\s+([A-Z0-9_]+)/i);
    if (standardMatch) {
      const standardCode = standardMatch[1].toUpperCase();
      return await handleLearningStandardDebug(standardCode);
    }
    return 'Usage: debug: learning standard <CODE>\nExample: debug: learning standard AS9100D';
  }

  if (cleanCommand.includes('examples')) {
    const standardMatch = cleanCommand.match(/examples\s+([A-Z0-9_]+)/i);
    if (standardMatch) {
      const standardCode = standardMatch[1].toUpperCase();
      return await handleExamplesDebug(standardCode);
    }
    return 'Usage: debug: examples <CODE>\nExample: debug: examples AS9100D';
  }

  // Document numbering policy debug
  if (cleanCommand.includes('document numbering') || cleanCommand.includes('numbering policy') || 
      cleanCommand.includes('clause structure') || cleanCommand.includes('annex a')) {
    return await handleDocumentNumberingPolicyDebug();
  }

  // Error analysis - parse stack traces and error messages
  if (cleanCommand.includes('error') || cleanCommand.includes('trace') || cleanCommand.includes('stack') || 
      cleanCommand.includes('null') || cleanCommand.includes('innerHTML') || cleanCommand.includes('cannot set')) {
    return await analyzeErrorLog(cleanCommand);
  }

  // Default: list available commands
  return `Available debug commands:\n` +
    `• debug: database connections - Check database connection status\n` +
    `• debug: tables - List key tables in both databases\n` +
    `• debug: migrations - Check migration status\n` +
    `• debug: document numbering - Explain policy on document numbering and clause structure\n` +
    `• debug: error <stack trace> - Analyze error messages and stack traces\n` +
    `• debug: learning standard <CODE> - Show learning content for a standard (e.g., AS9100D)\n` +
    `• debug: examples <CODE> - Show approved/bad examples for a standard\n` +
    `\nMore commands coming soon.`;
}

/**
 * Analyze error messages and stack traces
 * @param {string} errorText - Error message or stack trace
 * @returns {Promise<string>} Analysis
 */
export async function analyzeErrorLog(errorText) {
  const analysis = [];
  
  // Detect common error patterns
  if (errorText.includes('Cannot set properties of null') || errorText.includes('innerHTML')) {
    analysis.push('**Error Type**: DOM Null Reference Error');
    analysis.push('');
    analysis.push('**Likely Cause**:');
    analysis.push('  • Attempting to set `innerHTML` on a DOM element that doesn\'t exist');
    analysis.push('  • Element was removed from DOM before JavaScript tried to access it');
    analysis.push('  • Element ID mismatch between HTML and JavaScript');
    analysis.push('');
    analysis.push('**Common Locations**:');
    analysis.push('  • `renderDocuments()` function in frontend');
    analysis.push('  • Functions that manipulate DOM after async operations');
    analysis.push('');
    analysis.push('**Recommended Fix**:');
    analysis.push('  1. Add null check before setting innerHTML:');
    analysis.push('     ```js');
    analysis.push('     const el = document.getElementById("element-id");');
    analysis.push('     if (!el || !document.body.contains(el)) {');
    analysis.push('       console.warn("Element not found, skipping");');
    analysis.push('       return;');
    analysis.push('     }');
    analysis.push('     el.innerHTML = html;');
    analysis.push('     ```');
    analysis.push('  2. Use helper function `safeSetInnerHTML(elementId, html)`');
    analysis.push('  3. Verify element IDs match between HTML and JavaScript');
    analysis.push('  4. Check if element exists in current view (may be in different tab/view)');
  }
  
  if (errorText.includes('relation') && errorText.includes('does not exist')) {
    analysis.push('**Error Type**: Database Table Missing');
    analysis.push('');
    analysis.push('**Likely Cause**:');
    analysis.push('  • Table was dropped by cleanup script');
    analysis.push('  • Migration hasn\'t run yet');
    analysis.push('  • Table name typo in query');
    analysis.push('');
    analysis.push('**Recommended Fix**:');
    analysis.push('  1. Check if table exists: `SELECT * FROM information_schema.tables WHERE table_name = \'table_name\'`');
    analysis.push('  2. Run migrations: Check `backend/src/database/twoDatabaseMigrations.js`');
    analysis.push('  3. Verify cleanup script isn\'t dropping the table (check `FORCE_ORPHAN_CLEANUP` env var)');
  }
  
  if (errorText.includes('Standard not found')) {
    analysis.push('**Error Type**: Standard Resolution Error');
    analysis.push('');
    analysis.push('**Likely Cause**:');
    analysis.push('  • Standard code doesn\'t match any uploaded standards');
    analysis.push('  • Standard hasn\'t been uploaded/parsed yet');
    analysis.push('  • Case sensitivity mismatch in standard code');
    analysis.push('');
    analysis.push('**Recommended Fix**:');
    analysis.push('  1. Verify standard exists: `SELECT code, name FROM standards`');
    analysis.push('  2. Upload and parse the standard first');
    analysis.push('  3. Use exact standard code (case-sensitive)');
  }
  
  if (errorText.includes('501') || errorText.includes('Not Implemented')) {
    analysis.push('**Error Type**: API Endpoint Not Implemented');
    analysis.push('');
    analysis.push('**Likely Cause**:');
    analysis.push('  • Route handler returns 501 status');
    analysis.push('  • Route not registered in Express app');
    analysis.push('  • Table missing (causing fallback to 501)');
    analysis.push('');
    analysis.push('**Recommended Fix**:');
    analysis.push('  1. Check route file exists and is exported');
    analysis.push('  2. Verify route is registered in `app.js` or `index.js`');
    analysis.push('  3. Check if table exists (may be dropped by cleanup)');
  }
  
  if (analysis.length === 0) {
    analysis.push('**Error Analysis**:');
    analysis.push('  Could not identify specific error pattern.');
    analysis.push('  Please provide more context or the full stack trace.');
  }
  
  return analysis.join('\n');
}

/**
 * Handle database connections debug command
 * @returns {Promise<string>}
 */
async function handleDatabaseConnectionsDebug() {
  const diagnostics = [];

  // Check Customer Data DB (PostgreSQL)
  let customerDbStatus = '❌ Not initialized';
  let customerDbDetails = '';
  try {
    if (postgresPool) {
      const startTime = Date.now();
      const result = await queryPostgres('SELECT NOW() as now, version() as version');
      const latency = Date.now() - startTime;
      
      customerDbStatus = '✅ Connected';
      customerDbDetails = `\n  • Latency: ${latency}ms\n` +
        `  • PostgreSQL Version: ${result.rows[0]?.version?.split(' ')[0] || 'Unknown'}\n` +
        `  • Pool Status: ${postgresPool.totalCount || 0} total, ${postgresPool.idleCount || 0} idle, ${postgresPool.waitingCount || 0} waiting`;
    }
  } catch (error) {
    customerDbStatus = `❌ Error: ${error.message}`;
  }

  // Check EDCAT AI DB
  let edcatDbStatus = '❌ Not initialized';
  let edcatDbDetails = '';
  try {
    if (edcatPool) {
      const startTime = Date.now();
      const result = await queryEdcatAI('SELECT NOW() as now, version() as version');
      const latency = Date.now() - startTime;
      
      edcatDbStatus = '✅ Connected';
      edcatDbDetails = `\n  • Latency: ${latency}ms\n` +
        `  • PostgreSQL Version: ${result.rows[0]?.version?.split(' ')[0] || 'Unknown'}\n` +
        `  • Pool Status: ${edcatPool.totalCount || 0} total, ${edcatPool.idleCount || 0} idle, ${edcatPool.waitingCount || 0} waiting`;
    }
  } catch (error) {
    edcatDbStatus = `❌ Error: ${error.message}`;
  }

  // Environment info (safe - no secrets)
  const envInfo = [];
  if (process.env.DATABASE_URL) {
    const dbUrl = process.env.DATABASE_URL;
    // Only show host/port, not credentials
    try {
      const url = new URL(dbUrl);
      envInfo.push(`Customer DB: ${url.hostname}:${url.port || 5432} (${url.protocol.replace(':', '')})`);
    } catch (err) {
      envInfo.push('Customer DB: URL configured (format not parseable)');
    }
  } else {
    envInfo.push('Customer DB: DATABASE_URL not set');
  }

  if (process.env.EDCAT_AI_DATABASE_URL) {
    const edcatUrl = process.env.EDCAT_AI_DATABASE_URL;
    try {
      const url = new URL(edcatUrl);
      envInfo.push(`EDCAT AI DB: ${url.hostname}:${url.port || 5432} (${url.protocol.replace(':', '')})`);
    } catch (err) {
      envInfo.push('EDCAT AI DB: URL configured (format not parseable)');
    }
  } else {
    envInfo.push('EDCAT AI DB: EDCAT_AI_DATABASE_URL not set (using DATABASE_URL)');
  }

  return `**Database Connection Diagnostics**\n\n` +
    `**Customer Data DB (PostgreSQL)**: ${customerDbStatus}${customerDbDetails}\n\n` +
    `**EDCAT AI Intelligence DB**: ${edcatDbStatus}${edcatDbDetails}\n\n` +
    `**Environment**:\n${envInfo.map(info => `  • ${info}`).join('\n')}\n\n` +
    `**Note**: Connection strings are not shown for security. Only host/port information is displayed.`;
}

/**
 * Handle tables debug command
 * @param {string} tenantId
 * @returns {Promise<string>}
 */
async function handleTablesDebug(tenantId) {
  const diagnostics = [];

  // Customer Data DB tables
  try {
    const customerTables = await queryPostgres(`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
      LIMIT 20
    `);
    
    diagnostics.push(`**Customer Data DB Tables** (${customerTables.rows.length} shown):`);
    customerTables.rows.forEach(row => {
      diagnostics.push(`  • ${row.table_name}`);
    });
  } catch (error) {
    diagnostics.push(`**Customer Data DB**: Error querying tables: ${error.message}`);
  }

  // EDCAT AI DB tables
  try {
    const edcatTables = await queryEdcatAI(`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'edcat'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
      LIMIT 20
    `);
    
    diagnostics.push(`\n**EDCAT AI DB Tables** (${edcatTables.rows.length} shown):`);
    edcatTables.rows.forEach(row => {
      diagnostics.push(`  • ${row.table_name}`);
    });
  } catch (error) {
    diagnostics.push(`\n**EDCAT AI DB**: Error querying tables: ${error.message}`);
  }

  return diagnostics.join('\n');
}

/**
 * Handle migrations debug command
 * @returns {Promise<string>}
 */
async function handleMigrationsDebug() {
  const diagnostics = [];

  // Check for migration tracking table (if it exists)
  try {
    const migrationCheck = await queryEdcatAI(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'edcat' 
        AND table_name = 'schema_migrations'
      ) as exists;
    `);

    if (migrationCheck.rows[0]?.exists) {
      const migrations = await queryEdcatAI(`
        SELECT version, name, run_at
        FROM edcat.schema_migrations
        ORDER BY run_at DESC
        LIMIT 10
      `);
      
      diagnostics.push(`**Recent Migrations** (${migrations.rows.length} shown):`);
      migrations.rows.forEach(row => {
        diagnostics.push(`  • ${row.version || 'N/A'}: ${row.name || 'N/A'} (${row.run_at || 'N/A'})`);
      });
    } else {
      diagnostics.push(`**Migrations**: No migration tracking table found. Migrations are managed via twoDatabaseMigrations.js.`);
    }
  } catch (error) {
    diagnostics.push(`**Migrations**: Could not check migration status: ${error.message}`);
  }

  return diagnostics.length > 0 ? diagnostics.join('\n') : 'Migration status unavailable.';
}

/**
 * Check if message is a debug message
 * @param {string} message
 * @returns {boolean}
 */
export function isDebugMessage(message) {
  if (!message) return false;
  const lower = message.toLowerCase();
  return lower.startsWith('debug:') || lower.includes('debug mode') || lower.includes('0331');
}

/**
 * Handle debug request (enhanced version)
 * @param {Object} params
 * @param {string} params.tenantId
 * @param {string} params.userId
 * @param {string} params.message
 * @returns {Promise<string>}
 */
/**
 * Handle debug requests including routing explanations
 * @param {Object} params
 * @param {string} params.tenantId
 * @param {string} params.userId
 * @param {string} params.message
 * @returns {Promise<string>}
 */
export async function handleDebugRequest({ tenantId, userId, message }) {
  const lower = (message || '').toLowerCase().trim();
  
  // Check for routing explanation requests
  if (lower.includes('why did you answer') || 
      lower.includes('why did you respond') ||
      lower.includes('analyze last response') ||
      lower.includes('explain your reasoning') ||
      lower.includes('how did you decide')) {
    return await explainLastRoutingDecision({ tenantId, userId });
  }
  
  // Intent/knowledge introspection
  if (lower.includes('which intent') || lower.includes('intent, topic') || lower.includes('knowledge base entry')) {
    return await handleIntentIntrospection({ tenantId, userId });
  }

  // Clause debug (show standard_id, clause_ref used)
  if (lower.includes('standard_id') && (lower.includes('clause') || lower.includes('8.7') || lower.includes('7.4'))) {
    return await handleClauseDebug({ tenantId, userId, message });
  }

  // Requirement mapping debug
  if (lower.includes('requirement mapping') || lower.includes('example of a requirement mapping')) {
    return await handleRequirementMappingDebug({ tenantId });
  }

  // Table visibility check
  if (lower.includes('verify') && (lower.includes('table') || lower.includes('can see tables'))) {
    return await handleTableVisibilityCheck();
  }
  
  // Otherwise, handle as regular debug command
  if (lower.startsWith('debug:')) {
    const command = lower.substring(6).trim();
    return await handleDebugCommand({ command, tenantId, userId });
  }
  
  // Default debug response
  return `Debug mode is active. Available commands:
• debug: database connections - Check database status
• debug: tables - List key tables
• debug: migrations - Check migration status
• debug: analyze <error> - Analyze error logs
• why did you answer that way? - Explain last routing decision
• which intent, topic, sub-intent, and knowledge base entry - Introspect last answer
• show me the internal standard_id you used - Debug clause lookup
• show me one example of a requirement mapping - Debug mappings
• verify that you can see tables - Check table visibility`;
}

/**
 * Explain the last routing decision from conversation history
 * @param {Object} params
 * @param {string} params.tenantId
 * @param {string} params.userId
 * @returns {Promise<string>}
 */
async function explainLastRoutingDecision({ tenantId, userId }) {
  try {
    // Get last conversation entry with debug trace
    const result = await queryEdcatAI(
      `SELECT message_text, intent, metadata
       FROM edcat.ai_conversation_history
       WHERE tenant_id = $1
         AND user_id = $2
         AND metadata->>'debugTrace' IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [tenantId, userId]
    );
    
    if (result.rows.length === 0) {
      return `I don't have a recent routing decision to explain. Ask me a question first, then ask "why did you answer that way?"`;
    }
    
    const lastEntry = result.rows[0];
    const debugTrace = JSON.parse(lastEntry.metadata?.debugTrace || '{}');
    
    let explanation = `**Routing Decision Explanation**\n\n`;
    explanation += `For your last message: "${lastEntry.message_text.substring(0, 100)}${lastEntry.message_text.length > 100 ? '...' : ''}"\n\n`;
    
    if (debugTrace.intentInfo) {
      explanation += `**Intent Classification:**\n`;
      explanation += `- High-level intent: ${debugTrace.intentInfo.highLevelIntent}\n`;
      explanation += `- Domain: ${debugTrace.intentInfo.domain}\n`;
      if (debugTrace.intentInfo.entities) {
        explanation += `- Entities: ${JSON.stringify(debugTrace.intentInfo.entities)}\n`;
      }
      explanation += `\n`;
    }
    
    if (debugTrace.routesConsidered && debugTrace.routesConsidered.length > 0) {
      explanation += `**Routes Considered:**\n`;
      for (const route of debugTrace.routesConsidered) {
        explanation += `- ${route}\n`;
      }
      explanation += `\n`;
    }
    
    if (debugTrace.selectedRoute) {
      explanation += `**Selected Route:** ${debugTrace.selectedRoute}\n\n`;
      
      // Explain why this route was selected
      if (debugTrace.selectedRoute === 'qualityTechnical') {
        explanation += `I selected the quality engineering route because your message contained quality/Six Sigma/Lean keywords. I used the Quality Reasoning Service with knowledge base content and general LLM knowledge.\n`;
      } else if (debugTrace.selectedRoute === 'regulatoryTechnical') {
        explanation += `I selected the regulatory route because your message mentioned a standard (AS9100, ISO 9001, etc.) or clause reference. I used the Regulatory Reasoning Service, which strictly uses clause text from parsed requirements.\n`;
      } else if (debugTrace.selectedRoute === 'smalltalk') {
        explanation += `I selected the smalltalk route because your message was a greeting or casual conversation, not a technical question.\n`;
      } else if (debugTrace.selectedRoute === 'genericTechnical') {
        explanation += `I selected the generic technical route because your message was a technical question but didn't match quality or regulatory domains. I used general LLM knowledge plus any relevant Q&A bank entries.\n`;
      }
    }
    
    if (debugTrace.notes && debugTrace.notes.length > 0) {
      explanation += `\n**Notes:**\n`;
      for (const note of debugTrace.notes) {
        explanation += `- ${note}\n`;
      }
    }
    
    return explanation;
  } catch (error) {
    console.error('[VeraDebugService] Error explaining routing:', error.message);
    return `I encountered an error while retrieving routing information: ${error.message}`;
  }
}

// Removed duplicate - see function above

/**
 * Handle intent/knowledge introspection for last message
 */
async function handleIntentIntrospection({ tenantId, userId }) {
  try {
    const { queryEdcatAI } = await import('../../config/databases.js');
    
    // Get last conversation entry
    const result = await queryEdcatAI(
      `SELECT 
        message_text,
        intent,
        metadata
       FROM edcat.ai_conversation_history
       WHERE tenant_id = $1
         AND user_id = $2
         AND role = 'user'
       ORDER BY created_at DESC
       LIMIT 1`,
      [tenantId, userId]
    );
    
    if (result.rows.length === 0) {
      return "I don't have a recent message to introspect. Ask me a question first, then ask about the intent.";
    }
    
    const lastMessage = result.rows[0];
    const metadata = typeof lastMessage.metadata === 'string' 
      ? JSON.parse(lastMessage.metadata || '{}')
      : (lastMessage.metadata || {});
    
    let response = `**Intent Introspection for Last Message**\n\n`;
    response += `User message: "${lastMessage.message_text.substring(0, 200)}${lastMessage.message_text.length > 200 ? '...' : ''}"\n\n`;
    response += `**Detected Intent:**\n`;
    response += `- Intent: ${lastMessage.intent || 'unknown'}\n`;
    
    if (metadata.debugTrace) {
      const trace = typeof metadata.debugTrace === 'string' 
        ? JSON.parse(metadata.debugTrace)
        : metadata.debugTrace;
      response += `- High-level intent: ${trace.intentInfo?.highLevelIntent || 'unknown'}\n`;
      response += `- Domain: ${trace.intentInfo?.domain || 'unknown'}\n`;
      response += `- Topic: ${trace.intentInfo?.entities?.topic || 'none'}\n`;
      response += `- Selected route: ${trace.selectedRoute || 'unknown'}\n`;
    }
    
    if (metadata.source) {
      response += `\n**Knowledge Source:**\n`;
      response += `- Source type: ${metadata.source.type || 'unknown'}\n`;
      response += `- Source table: ${metadata.source.table || 'unknown'}\n`;
      if (metadata.source.template) {
        response += `- Template: ${metadata.source.template}\n`;
      }
    }
    
    return response;
  } catch (error) {
    console.error('[VeraDebugService] Error in intent introspection:', error.message);
    return `Error retrieving intent information: ${error.message}`;
  }
}

/**
 * Handle clause debug (show standard_id, clause_ref used)
 */
async function handleClauseDebug({ tenantId, userId, message }) {
  try {
    const { queryPostgres } = await import('../../config/databases.js');
    const { findStandardByCode } = await import('./VeraClauseLookupService.js');
    
    // Extract clause reference from message
    const clauseMatch = message.match(/([4-9]\.\d+(\.\d+)?(\s*[a-z])?)/);
    const clauseRef = clauseMatch ? clauseMatch[1].replace(/\s+/g, '') : null;
    
    // Extract standard name
    const standardMatch = message.match(/(as9100|iso\s*9001|iso\s*13485)/i);
    const standardName = standardMatch ? standardMatch[1].replace(/\s+/g, '').toUpperCase() : null;
    
    let response = `**Clause Debug Information**\n\n`;
    
    if (clauseRef) {
      response += `Clause reference: ${clauseRef}\n`;
    }
    
    if (standardName) {
      // Find standard
      const standardInfo = await findStandardByCode(standardName);
      
      if (standardInfo) {
        response += `Standard: ${standardInfo.code || standardInfo.name}\n`;
        response += `Standard ID: ${standardInfo.id}\n\n`;
        
        if (clauseRef) {
          // Check if clause exists in parsed_requirements
          const clauseCheck = await queryPostgres(
            `SELECT COUNT(*) as count 
             FROM public.parsed_requirements 
             WHERE standard_id = $1 
               AND (clause_number = $2 OR full_ref = $2 OR clause_ref = $2)`,
            [standardInfo.id, clauseRef]
          );
          
          const clauseCount = parseInt(clauseCheck.rows[0]?.count || 0);
          response += `Clause ${clauseRef} in parsed_requirements: ${clauseCount > 0 ? 'Found' : 'Not found'}\n`;
          
          if (clauseCount > 0) {
            const clauseData = await queryPostgres(
              `SELECT clause_number, full_ref, clause_title 
               FROM public.parsed_requirements 
               WHERE standard_id = $1 
                 AND (clause_number = $2 OR full_ref = $2)
               LIMIT 1`,
              [standardInfo.id, clauseRef]
            );
            
            if (clauseData.rows.length > 0) {
              response += `Clause title: ${clauseData.rows[0].clause_title || 'No title'}\n`;
            }
          }
        }
      } else {
        response += `Standard "${standardName}" not found in database.\n`;
      }
    }
    
    return response;
  } catch (error) {
    console.error('[VeraDebugService] Error in clause debug:', error.message);
    return `Error retrieving clause debug information: ${error.message}`;
  }
}

/**
 * Handle requirement mapping debug
 */
async function handleRequirementMappingDebug({ tenantId }) {
  try {
    const { queryPostgres } = await import('../../config/databases.js');
    
    // Get one example requirement mapping
    // NOTE: doc_number is cosmetic; this query uses document_id and title which are authoritative
    const mappingQuery = `
      SELECT 
        rm.id,
        rm.standard_id,
        rm.clause_ref,
        rm.clause_number,
        rm.customer_document_id,
        s.code as standard_code,
        s.name as standard_name,
        cd.title as document_title,
        cd.doc_number as document_number
      FROM public.requirement_mappings rm
      LEFT JOIN public.standards s ON rm.standard_id = s.id
      LEFT JOIN public.customer_documents cd ON rm.customer_document_id = cd.id
      LIMIT 1
    `;
    
    const mappingResult = await queryPostgres(mappingQuery, []);
    
    if (mappingResult.rows.length === 0) {
      return "I don't have any requirement mappings in my database yet. Mappings are created when customer procedures are linked to standard clauses.";
    }
    
    const mapping = mappingResult.rows[0];
    let response = `**Requirement Mapping Example**\n\n`;
    response += `Mapping ID: ${mapping.id}\n`;
    response += `Standard: ${mapping.standard_code || mapping.standard_name || 'Unknown'}\n`;
    response += `Standard ID: ${mapping.standard_id}\n`;
    response += `Clause Ref: ${mapping.clause_ref || mapping.clause_number || 'Unknown'}\n`;
    response += `Document ID: ${mapping.customer_document_id || 'Not linked'}\n`;
    response += `Document Title: ${mapping.document_title || 'Unknown'}\n`;
    if (mapping.document_number) {
      response += `Document Number: ${mapping.document_number} (cosmetic metadata only)\n`;
    }
    response += `\n**Note**: Document numbering is cosmetic metadata and does not affect compliance logic. Coverage is determined by document_id, title, content, and explicit mappings.`;
    
    return response;
  } catch (error) {
    console.error('[VeraDebugService] Error in requirement mapping debug:', error.message);
    return `Error retrieving requirement mapping: ${error.message}`;
  }
}

/**
 * Handle document numbering policy debug
 */
async function handleDocumentNumberingPolicyDebug() {
  try {
    // Get policy from ai_policy
    const policyResult = await queryEdcatAI(
      `SELECT config FROM edcat.ai_policy 
       WHERE tenant_id = '00000000-0000-0000-0000-000000000000' 
         AND name = 'vera_document_numbering_policy'`
    );

    let policy = null;
    if (policyResult.rows.length > 0) {
      policy = policyResult.rows[0].config;
    }

    let response = `**Document Numbering Policy (Debug Mode)**\n\n`;
    
    if (policy) {
      response += `**Policy**: ${policy.description || 'Document numbering is treated as cosmetic metadata.'}\n\n`;
      response += `**Document Numbering Treatment**: ${policy.doc_numbering || 'cosmetic'}\n`;
      response += `**Uses Annex A Guidance**: ${policy.use_annex_a ? 'Yes' : 'No'}\n\n`;
      response += `**Compliance Keys (Authoritative)**:\n`;
      if (policy.compliance_keys && Array.isArray(policy.compliance_keys)) {
        policy.compliance_keys.forEach(key => {
          response += `  • ${key}\n`;
        });
      }
      response += `\n**Ignored for Compliance**:\n`;
      if (policy.ignored_for_compliance && Array.isArray(policy.ignored_for_compliance)) {
        policy.ignored_for_compliance.forEach(item => {
          response += `  • ${item}\n`;
        });
      }
      if (policy.standards_basis) {
        response += `\n**Standards Basis**: ${policy.standards_basis}\n`;
      }
    } else {
      response += `**Policy**: Document numbering is treated as cosmetic metadata only.\n\n`;
      response += `**Compliance Keys (Authoritative)**:\n`;
      response += `  • title\n`;
      response += `  • content\n`;
      response += `  • requirement_mappings\n\n`;
      response += `**Ignored for Compliance**:\n`;
      response += `  • doc_number_format\n`;
      response += `  • clause-like numbering in titles\n\n`;
      response += `**Standards Basis**: ISO 9001 / AS9-series informative annex on structure and terminology not required for QMS documentation\n`;
    }

    response += `\n**In Practice**:\n`;
    response += `I never use document numbers as the deciding factor for compliance. I prioritise the document title, its content, and any explicit mappings to standard clauses. Numbering styles and inconsistencies are treated as internal housekeeping, not as findings.\n`;
    response += `\nThis aligns with Annex A guidance that organizations are free to use their own structure, numbering, and terminology as long as requirements are implemented and traceable.`;

    return response;
  } catch (error) {
    console.error('[VeraDebugService] Error in document numbering policy debug:', error.message);
    return `Error retrieving document numbering policy: ${error.message}`;
  }
}

/**
 * Handle table visibility check
 */
async function handleTableVisibilityCheck() {
  try {
    const { queryPostgres, queryEdcatAI } = await import('../../config/databases.js');
    
    const tablesToCheck = [
      { name: 'standards', schema: 'public', db: 'postgres' },
      { name: 'parsed_requirements', schema: 'public', db: 'postgres' },
      { name: 'customer_documents', schema: 'public', db: 'postgres' },
      { name: 'gap_analyses', schema: 'public', db: 'postgres' },
      { name: 'ai_conversation_state', schema: 'edcat', db: 'edcat' },
      { name: 'ai_conversation_history', schema: 'edcat', db: 'edcat' }
    ];
    
    let response = `**Table Visibility Check**\n\n`;
    
    for (const table of tablesToCheck) {
      const checkQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = $1 
          AND table_name = $2
        ) as exists
      `;
      
      const db = table.db === 'postgres' ? queryPostgres : queryEdcatAI;
      const checkResult = await db(checkQuery, [table.schema, table.name]);
      const exists = checkResult.rows[0]?.exists || false;
      
      response += `${table.schema}.${table.name}: ${exists ? '✅ Exists' : '❌ Not found'}\n`;
    }
    
    return response;
  } catch (error) {
    console.error('[VeraDebugService] Error in table visibility check:', error.message);
    return `Error checking table visibility: ${error.message}`;
  }
}

async function _debugDatabase() {
  try {
    const customerCheck = await queryPostgres('SELECT COUNT(*) AS standards FROM public.standards', []);
    const edcatCheck = await queryEdcatAI('SELECT COUNT(*) AS qna FROM edcat.vera_query_response_bank', []);

    const standardsCount = customerCheck.rows?.[0]?.standards || 0;
    const qnaCount = edcatCheck.rows?.[0]?.qna || 0;

    return [
      '🔧 Vera Debug: Database Connectivity',
      '',
      `- Customer Data DB: standards entries = ${standardsCount}`,
      `- EDCAT AI DB: Vera Q&A bank entries = ${qnaCount}`,
      '',
      'If counts are zero or unexpectedly low, check migrations and seeds for standards and vera_query_response_bank.'
    ].join('\n');
  } catch (err) {
    console.error('[VeraDebugService] _debugDatabase error:', err);
    return `❌ Debug DB Error: ${err.message}`;
  }
}

async function _debugSchema() {
  try {
    const res = await queryPostgres(
      `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
      `,
      []
    );

    const names = res.rows.map(r => r.table_name);

    return [
      '🔧 Vera Debug: Public Schema Tables',
      '',
      ...names.map(n => `- ${n}`)
    ].join('\n');
  } catch (err) {
    console.error('[VeraDebugService] _debugSchema error:', err);
    return `❌ Debug Schema Error: ${err.message}`;
  }
}

async function _debugGapArchive() {
  try {
    const ga = await queryPostgres(
      `
      SELECT COUNT(*) AS gap_count
      FROM public.gap_analyses
      `,
      []
    );

    const gapCount = ga.rows?.[0]?.gap_count || 0;

    return [
      '🔧 Vera Debug: Customer Archive / GAP Analyses',
      '',
      `- gap_analyses rows: ${gapCount}`,
      '',
      'If this is zero, the front-end may show 404/500 when trying to load or create GAP analyses.',
      'Verify the /api/customer-archive/gap-analyses routes and their INSERT/SELECT statements.'
    ].join('\n');
  } catch (err) {
    console.error('[VeraDebugService] _debugGapArchive error:', err);
    return `❌ Debug GAP Archive Error: ${err.message}`;
  }
}

async function _debugSummary() {
  return [
    '🔧 Vera Debug Summary',
    '',
    '- Two-database architecture (Customer Data + EDCAT AI) is initialized via migrations.',
    '- Use "debug: database" to check counts for standards and Vera Q&A bank.',
    '- Use "debug: tables" to list public schema tables.',
    '- Use "debug: gap archive" to review GAP analysis table status.'
  ].join('\n');
}

/**
 * Handle learning standard debug command
 */
async function handleLearningStandardDebug(standardCode) {
  try {
    // Import dynamically to handle TypeScript module
    const { debugLearningForStandard } = await import('./VeraLearningRepository.js');
    const debugInfo = await debugLearningForStandard(standardCode);
    
    const parts = [];
    parts.push(`📚 Learning Content for Standard: ${standardCode}`);
    parts.push('='.repeat(60));
    
    if (debugInfo.standardInfo) {
      parts.push(`Standard Name: ${debugInfo.standardInfo.name}`);
      parts.push(`Authority: ${debugInfo.standardInfo.authority_source || 'N/A'}`);
      parts.push(`Sector: ${debugInfo.standardInfo.sector || 'N/A'}`);
      parts.push('');
    }
    
    parts.push(`Learning Documents: ${debugInfo.learningDocsCount}`);
    parts.push(`Approved Examples: ${debugInfo.approvedExamplesCount}`);
    parts.push(`Bad Examples: ${debugInfo.badExamplesCount}`);
    parts.push('');
    
    if (debugInfo.sampleApproved.length > 0) {
      parts.push('**Approved Examples:**');
      debugInfo.sampleApproved.forEach((ex, idx) => {
        parts.push(`${idx + 1}. ${ex.file_name} (score: ${ex.quality_score})`);
        parts.push(`   Preview: ${ex.preview}`);
        parts.push('');
      });
    }
    
    if (debugInfo.sampleBad.length > 0) {
      parts.push('**Bad Examples:**');
      debugInfo.sampleBad.forEach((ex, idx) => {
        parts.push(`${idx + 1}. ${ex.file_name} (score: ${ex.quality_score})`);
        parts.push(`   Preview: ${ex.preview}`);
        parts.push('');
      });
    }
    
    if (debugInfo.learningDocsCount === 0 && debugInfo.approvedExamplesCount === 0 && debugInfo.badExamplesCount === 0) {
      parts.push('⚠️  No learning content found for this standard.');
      parts.push('   Run: npm run ingest:requirements');
    }
    
    return parts.join('\n');
  } catch (error) {
    return `❌ Error fetching learning content: ${error.message}`;
  }
}

/**
 * Handle examples debug command
 */
async function handleExamplesDebug(standardCode) {
  try {
    // Import dynamically to handle TypeScript module
    const { debugLearningForStandard } = await import('./VeraLearningRepository.js');
    const debugInfo = await debugLearningForStandard(standardCode);
    
    const parts = [];
    parts.push(`📋 Examples for Standard: ${standardCode}`);
    parts.push('='.repeat(60));
    parts.push(`Approved Examples: ${debugInfo.approvedExamplesCount}`);
    parts.push(`Bad Examples: ${debugInfo.badExamplesCount}`);
    parts.push('');
    
    if (debugInfo.sampleApproved.length > 0) {
      parts.push('**✅ Approved Examples (quality_score >= 0.8):**');
      debugInfo.sampleApproved.forEach((ex, idx) => {
        parts.push(`${idx + 1}. ${ex.file_name}`);
        parts.push(`   Quality Score: ${ex.quality_score}`);
        parts.push(`   Preview: ${ex.preview.substring(0, 200)}...`);
        parts.push('');
      });
    } else {
      parts.push('No approved examples found.');
      parts.push('');
    }
    
    if (debugInfo.sampleBad.length > 0) {
      parts.push('**❌ Bad Examples (quality_score <= 0.4):**');
      debugInfo.sampleBad.forEach((ex, idx) => {
        parts.push(`${idx + 1}. ${ex.file_name}`);
        parts.push(`   Quality Score: ${ex.quality_score}`);
        parts.push(`   Preview: ${ex.preview.substring(0, 200)}...`);
        parts.push('');
      });
    } else {
      parts.push('No bad examples found.');
    }
    
    return parts.join('\n');
  } catch (error) {
    return `❌ Error fetching examples: ${error.message}`;
  }
}

export default {
  enterDebugMode,
  exitDebugMode,
  isDebugMode,
  handleDebugCommand,
  analyzeErrorLog,
  isDebugMessage,
  handleDebugRequest
};

