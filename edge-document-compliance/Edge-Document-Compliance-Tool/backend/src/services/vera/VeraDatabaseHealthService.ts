/**
 * Vera Database Health Service
 * 
 * Monitors and verifies database connections.
 * Provides health checks and connection diagnostics.
 */

import { queryPostgres, queryEdcatAI, checkConnections } from '../../config/databases.js';

export interface DatabaseHealth {
  postgres: {
    connected: boolean;
    latency?: number;
    error?: string;
    tables?: string[];
  };
  edcatAI: {
    connected: boolean;
    latency?: number;
    error?: string;
    tables?: string[];
  };
  timestamp: Date;
}

export class VeraDatabaseHealthService {
  /**
   * Comprehensive health check
   */
  static async checkHealth(): Promise<DatabaseHealth> {
    const timestamp = new Date();
    const health: DatabaseHealth = {
      postgres: { connected: false },
      edcatAI: { connected: false },
      timestamp
    };

    // Check PostgreSQL
    try {
      const start = Date.now();
      const result = await queryPostgres('SELECT NOW() as now, version() as version');
      const latency = Date.now() - start;
      
      health.postgres = {
        connected: true,
        latency,
        tables: await this.getTableList('postgres')
      };
    } catch (error: any) {
      health.postgres = {
        connected: false,
        error: error.message
      };
    }

    // Check EDCAT AI
    try {
      const start = Date.now();
      const result = await queryEdcatAI('SELECT NOW() as now');
      const latency = Date.now() - start;
      
      health.edcatAI = {
        connected: true,
        latency,
        tables: await this.getTableList('edcat')
      };
    } catch (error: any) {
      health.edcatAI = {
        connected: false,
        error: error.message
      };
    }

    return health;
  }

  /**
   * Get list of tables in a schema
   */
  private static async getTableList(schema: 'postgres' | 'edcat'): Promise<string[]> {
    try {
      const query = schema === 'postgres'
        ? `SELECT table_name FROM information_schema.tables 
           WHERE table_schema = 'public' 
           ORDER BY table_name 
           LIMIT 50`
        : `SELECT table_name FROM information_schema.tables 
           WHERE table_schema = 'edcat' 
           ORDER BY table_name 
           LIMIT 50`;
      
      const result = schema === 'postgres'
        ? await queryPostgres(query)
        : await queryEdcatAI(query);
      
      return result.rows.map((r: any) => r.table_name);
    } catch (error: any) {
      console.warn(`[VeraDatabaseHealth] Error getting table list for ${schema}:`, error.message);
      return [];
    }
  }

  /**
   * Verify critical tables exist
   */
  static async verifyCriticalTables(): Promise<{
    postgres: { exists: boolean; missing: string[] };
    edcat: { exists: boolean; missing: string[] };
  }> {
    const criticalPostgres = [
      'standards',
      'compliance_requirements',
      'customer_documents',
      'gap_analyses'
    ];

    const criticalEdcat = [
      'ai_conversation_history',
      'ai_conversation_state',
      'document_content_for_learning',
      'example_documents',
      'vera_memory',
      'ai_information_request'
    ];

    const result = {
      postgres: { exists: true, missing: [] as string[] },
      edcat: { exists: true, missing: [] as string[] }
    };

    // Check PostgreSQL tables
    try {
      const pgTables = await this.getTableList('postgres');
      for (const table of criticalPostgres) {
        if (!pgTables.includes(table)) {
          result.postgres.missing.push(table);
          result.postgres.exists = false;
        }
      }
    } catch (error: any) {
      result.postgres.exists = false;
      result.postgres.missing = criticalPostgres;
    }

    // Check EDCAT tables
    try {
      const edcatTables = await this.getTableList('edcat');
      for (const table of criticalEdcat) {
        if (!edcatTables.includes(table)) {
          result.edcat.missing.push(table);
          result.edcat.exists = false;
        }
      }
    } catch (error: any) {
      result.edcat.exists = false;
      result.edcat.missing = criticalEdcat;
    }

    return result;
  }

  /**
   * Test query performance
   */
  static async testQueryPerformance(): Promise<{
    postgres: { avgLatency: number; samples: number[] };
    edcat: { avgLatency: number; samples: number[] };
  }> {
    const samples = 5;
    const postgresSamples: number[] = [];
    const edcatSamples: number[] = [];

    // Test PostgreSQL
    for (let i = 0; i < samples; i++) {
      try {
        const start = Date.now();
        await queryPostgres('SELECT 1');
        postgresSamples.push(Date.now() - start);
      } catch (error) {
        // Skip failed samples
      }
    }

    // Test EDCAT AI
    for (let i = 0; i < samples; i++) {
      try {
        const start = Date.now();
        await queryEdcatAI('SELECT 1');
        edcatSamples.push(Date.now() - start);
      } catch (error) {
        // Skip failed samples
      }
    }

    return {
      postgres: {
        avgLatency: postgresSamples.length > 0
          ? postgresSamples.reduce((a, b) => a + b, 0) / postgresSamples.length
          : 0,
        samples: postgresSamples
      },
      edcat: {
        avgLatency: edcatSamples.length > 0
          ? edcatSamples.reduce((a, b) => a + b, 0) / edcatSamples.length
          : 0,
        samples: edcatSamples
      }
    };
  }
}

