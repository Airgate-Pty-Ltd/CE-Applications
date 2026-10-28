/**
 * VERA INFORMATION AUDIT SERVICE
 * 
 * Diagnostic tool to understand:
 * 1. What information Vera actually has access to
 * 2. Why she can't find/retrieve it
 * 3. Where the retrieval is failing
 * 4. What code paths are being used/avoided
 * 
 * This is the CRITICAL DEBUG layer needed to fix the loop problem.
 */

import { queryPostgres, queryEdcatAI } from '../../config/databases.js';

class VeraInformationAudit {
  private auditLog: any[] = [];
  private queryResults: Map<string, any> = new Map();

  /**
   * AUDIT 1: Database Connections
   * Verify both databases can be queried
   */
  async auditDatabaseConnections(): Promise<any> {
    console.log('\n=== VERA AUDIT: Database Connections ===\n');
    
    const results = {
      postgres: { connected: false, tables: [], error: null as string | null },
      edcatAI: { connected: false, tables: [], error: null as string | null }
    };

    // Test Postgres (Customer Data)
    try {
      const pgResult = await queryPostgres(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 10`
      );
      results.postgres.connected = true;
      results.postgres.tables = pgResult.rows.map((r: any) => r.table_name);
      console.log('✅ POSTGRES CONNECTED');
      console.log('   Tables:', results.postgres.tables);
    } catch (error: any) {
      results.postgres.error = error.message;
      console.log('❌ POSTGRES FAILED:', error.message);
    }

    // Test EDCAT AI (Vera Intelligence)
    try {
      const edcatResult = await queryEdcatAI(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'edcat' LIMIT 10`
      );
      results.edcatAI.connected = true;
      results.edcatAI.tables = edcatResult.rows.map((r: any) => r.table_name);
      console.log('✅ EDCAT AI CONNECTED');
      console.log('   Tables:', results.edcatAI.tables);
    } catch (error: any) {
      results.edcatAI.error = error.message;
      console.log('❌ EDCAT AI FAILED:', error.message);
    }

    return results;
  }

  /**
   * AUDIT 2: Data Availability
   * Check how much data exists in each critical table
   */
  async auditDataAvailability(): Promise<any> {
    console.log('\n=== VERA AUDIT: Data Availability ===\n');

    const tables = [
      // Compliance standards
      { db: 'public' as 'public' | 'edcat', table: 'standards', name: 'Standards' },
      { db: 'public' as 'public' | 'edcat', table: 'compliance_requirements', name: 'Requirements' },
      
      // Learning documents
      { db: 'edcat' as 'public' | 'edcat', table: 'document_content_for_learning', name: 'Learning Docs' },
      { db: 'edcat' as 'public' | 'edcat', table: 'example_documents', name: 'Examples' },
      
      // Q&A Bank
      { db: 'edcat' as 'public' | 'edcat', table: 'vera_query_response_bank', name: 'Q&A Bank' },
      
      // Terminology
      { db: 'edcat' as 'public' | 'edcat', table: 'terms_and_definitions', name: 'Terms' },
      
      // Regulatory
      { db: 'public' as 'public' | 'edcat', table: 'regulatory_registry', name: 'Regulatory' },
      
      // Memory
      { db: 'edcat' as 'public' | 'edcat', table: 'ai_conversation_history', name: 'Conversation History' },
      { db: 'edcat' as 'public' | 'edcat', table: 'vera_memory', name: 'Memory' }
    ];

    const availability: any = {};

    for (const { db, table, name } of tables) {
      try {
        const query = db === 'edcat' ? queryEdcatAI : queryPostgres;
        const schemaPrefix = db === 'edcat' ? 'edcat.' : 'public.';
        const result = await query(`SELECT COUNT(*) as count FROM ${schemaPrefix}${table}`);
        const count = result.rows[0]?.count || 0;
        
        availability[name] = {
          table,
          db,
          rowCount: parseInt(count as string),
          hasData: parseInt(count as string) > 0
        };

        console.log(`${parseInt(count as string) > 0 ? '✅' : '⚠️ '} ${name.padEnd(25)} | ${count} rows`);
      } catch (error: any) {
        availability[name] = {
          table,
          db,
          error: error.message,
          hasData: false
        };
        console.log(`❌ ${name.padEnd(25)} | ERROR: ${error.message}`);
      }
    }

    return availability;
  }

  /**
   * AUDIT 3: Retrieval Paths
   * Test if each major retrieval method actually works
   */
  async auditRetrievalPaths(): Promise<any> {
    console.log('\n=== VERA AUDIT: Retrieval Paths ===\n');

    const paths = {
      terminologyLookup: await this.testTerminologyLookup(),
      qaResponseBank: await this.testQABank(),
      semanticSearch: await this.testSemanticSearch(),
      clauseMatching: await this.testClauseMatching(),
      regulatoryLookup: await this.testRegulatoryLookup(),
      learningDocuments: await this.testLearningDocuments()
    };

    return paths;
  }

  private async testTerminologyLookup(): Promise<any> {
    console.log('Testing: Terminology Lookup...');
    try {
      // Try to find a term
      const result = await queryEdcatAI(
        `SELECT * FROM edcat.terms_and_definitions WHERE term ILIKE 'procedure' LIMIT 1`
      );

      if (result.rows.length > 0) {
        console.log('  ✅ Terminology lookup working | Found:', result.rows[0].term);
        return { working: true, sample: result.rows[0] };
      } else {
        console.log('  ⚠️  Table exists but no term "procedure" found');
        return { working: false, reason: 'No sample data' };
      }
    } catch (error: any) {
      console.log('  ❌ Terminology lookup FAILED:', error.message);
      return { working: false, error: error.message };
    }
  }

  private async testQABank(): Promise<any> {
    console.log('Testing: Q&A Response Bank...');
    try {
      const countResult = await queryEdcatAI(
        `SELECT COUNT(*) as count FROM edcat.vera_query_response_bank`
      );
      const count = parseInt(countResult.rows[0]?.count as string || '0');

      if (count > 0) {
        const sampleResult = await queryEdcatAI(
          `SELECT * FROM edcat.vera_query_response_bank LIMIT 1`
        );
        console.log('  ✅ Q&A bank working | Found:', sampleResult.rows[0]?.user_query_pattern?.substring(0, 50) || 'sample entry');
        return { working: true, sampleCount: count };
      } else {
        console.log('  ⚠️  Q&A bank exists but is empty');
        return { working: false, reason: 'No Q&A entries' };
      }
    } catch (error: any) {
      console.log('  ❌ Q&A bank FAILED:', error.message);
      return { working: false, error: error.message };
    }
  }

  private async testSemanticSearch(): Promise<any> {
    console.log('Testing: Semantic Search...');
    try {
      // Check if knowledge_embeddings table exists
      const tableCheck = await queryEdcatAI(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='edcat' AND table_name='knowledge_embeddings') as exists`
      );

      if (!tableCheck.rows[0]?.exists) {
        console.log('  ⚠️  knowledge_embeddings table does not exist');
        return { working: false, reason: 'Table missing' };
      }

      const result = await queryEdcatAI(
        `SELECT COUNT(*) as count FROM edcat.knowledge_embeddings`
      );

      const count = parseInt(result.rows[0]?.count as string || '0');
      console.log(`  ${count > 0 ? '✅' : '⚠️ '} Semantic search | ${count} embeddings`);
      
      return { 
        working: count > 0, 
        embeddingCount: count,
        hasData: count > 0
      };
    } catch (error: any) {
      console.log('  ❌ Semantic search FAILED:', error.message);
      return { working: false, error: error.message };
    }
  }

  private async testClauseMatching(): Promise<any> {
    console.log('Testing: Clause Matching...');
    try {
      const result = await queryPostgres(
        `SELECT * FROM public.compliance_requirements WHERE clause_reference IS NOT NULL LIMIT 1`
      );

      if (result.rows.length > 0) {
        console.log('  ✅ Clause matching working | Found:', result.rows[0].clause_reference);
        return { working: true, sample: result.rows[0] };
      } else {
        console.log('  ⚠️  No clauses with clause_reference found');
        return { working: false, reason: 'No clause data' };
      }
    } catch (error: any) {
      console.log('  ❌ Clause matching FAILED:', error.message);
      return { working: false, error: error.message };
    }
  }

  private async testRegulatoryLookup(): Promise<any> {
    console.log('Testing: Regulatory Lookup...');
    try {
      const countResult = await queryPostgres(
        `SELECT COUNT(*) as count FROM public.regulatory_registry`
      );
      const count = parseInt(countResult.rows[0]?.count as string || '0');

      if (count > 0) {
        const sampleResult = await queryPostgres(
          `SELECT * FROM public.regulatory_registry LIMIT 1`
        );
        console.log('  ✅ Regulatory lookup working | Found:', sampleResult.rows[0]?.standard_code || 'sample entry');
        return { working: true, sampleCount: count };
      } else {
        console.log('  ⚠️  Regulatory table exists but is empty');
        return { working: false, reason: 'No regulatory data' };
      }
    } catch (error: any) {
      console.log('  ❌ Regulatory lookup FAILED:', error.message);
      return { working: false, error: error.message };
    }
  }

  private async testLearningDocuments(): Promise<any> {
    console.log('Testing: Learning Documents...');
    try {
      const result = await queryEdcatAI(
        `SELECT COUNT(*) as count FROM edcat.document_content_for_learning`
      );

      const count = parseInt(result.rows[0]?.count as string || '0');
      console.log(`  ${count > 0 ? '✅' : '⚠️ '} Learning docs | ${count} documents`);
      
      return { 
        working: count > 0,
        documentCount: count,
        hasData: count > 0
      };
    } catch (error: any) {
      console.log('  ❌ Learning documents FAILED:', error.message);
      return { working: false, error: error.message };
    }
  }

  /**
   * AUDIT 4: Query Logging
   * Enable verbose logging to VeraCoreEngine to see what's actually happening
   */
  async auditQueryLogging(): Promise<void> {
    console.log('\n=== VERA AUDIT: Query Logging (Next 10 queries) ===\n');
    
    // Add logging wrapper that will be called on the next requests
    console.log('📝 Logging enabled. Next 10 queries will be logged with full results.\n');
    
    // Store this in environment or a debug flag
    (global as any).VERA_QUERY_DEBUG = true;
    (global as any).VERA_DEBUG_QUERY_LIMIT = 10;
  }

  /**
   * FULL AUDIT REPORT
   */
  async runFullAudit(): Promise<any> {
    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                   VERA INFORMATION AUDIT                     ║');
    console.log('║                  (Understanding Why She\'s Stuck)            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const report = {
      timestamp: new Date().toISOString(),
      databases: await this.auditDatabaseConnections(),
      dataAvailability: await this.auditDataAvailability(),
      retrievalPaths: await this.auditRetrievalPaths()
    };

    await this.auditQueryLogging();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                  AUDIT COMPLETE                              ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    return report;
  }
}

export default VeraInformationAudit;

