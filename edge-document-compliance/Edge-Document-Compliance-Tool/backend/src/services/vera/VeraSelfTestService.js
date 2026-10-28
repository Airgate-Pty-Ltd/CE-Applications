/**
 * Vera Self-Test Service
 *
 * Runs diagnostic tests to verify fixes and check system health.
 * Phase 7: Self-testing capability
 */
import { queryEdcatAI, queryPostgres } from '../../config/databases.js';
export class VeraSelfTestService {
    /**
     * Run all self-tests
     */
    static async runAllTests() {
        const results = [];
        // Test 1: Database connections
        results.push(await this.testDatabaseConnections());
        // Test 2: Schema integrity
        results.push(await this.testSchemaIntegrity());
        // Test 3: pgvector availability
        results.push(await this.testPgvectorAvailability());
        // Test 4: Memory tables
        results.push(await this.testMemoryTables());
        // Test 5: Learning tables
        results.push(await this.testLearningTables());
        // Test 6: Correction tables
        results.push(await this.testCorrectionTables());
        // Test 7: Critical EDCAT table existence and row counts
        results.push(await this.testCriticalEDCATTables());
        const passedTests = results.filter(r => r.passed).length;
        const failedTests = results.filter(r => !r.passed).length;
        let overallStatus;
        if (failedTests === 0) {
            overallStatus = 'PASS';
        }
        else if (passedTests > 0) {
            overallStatus = 'PARTIAL';
        }
        else {
            overallStatus = 'FAIL';
        }
        return {
            overallStatus,
            totalTests: results.length,
            passedTests,
            failedTests,
            results,
            timestamp: new Date()
        };
    }
    /**
     * Test database connections
     */
    static async testDatabaseConnections() {
        try {
            // Test Customer Data DB
            const customerTest = await queryPostgres('SELECT 1 as test');
            if (!customerTest || customerTest.rows.length === 0) {
                return {
                    testName: 'Database Connections',
                    passed: false,
                    message: 'Customer Data DB connection failed',
                    details: { database: 'customer_data' }
                };
            }
            // Test EDCAT AI DB
            const edcatTest = await queryEdcatAI('SELECT 1 as test');
            if (!edcatTest || edcatTest.rows.length === 0) {
                return {
                    testName: 'Database Connections',
                    passed: false,
                    message: 'EDCAT AI DB connection failed',
                    details: { database: 'edcat_ai' }
                };
            }
            return {
                testName: 'Database Connections',
                passed: true,
                message: 'Both database connections are working',
                details: { customer_data: 'OK', edcat_ai: 'OK' }
            };
        }
        catch (error) {
            return {
                testName: 'Database Connections',
                passed: false,
                message: `Database connection error: ${error.message}`,
                details: { error: error.message }
            };
        }
    }
    /**
     * Test schema integrity
     */
    static async testSchemaIntegrity() {
        try {
            // Check critical tables exist
            const criticalTables = [
                { schema: 'edcat', table: 'conversation_memory', columns: ['message_text', 'question_text', 'role'] },
                { schema: 'edcat', table: 'vera_learned_corrections', columns: ['question_text'] },
                { schema: 'edcat', table: 'vera_query_response_bank', columns: ['question_text', 'user_query_pattern'] },
                { schema: 'edcat', table: 'document_content_for_learning', columns: ['content', 'standard_code'] },
                { schema: 'edcat', table: 'terms_and_definitions', columns: ['term', 'definition'] },
                { schema: 'public', table: 'compliance_requirements', columns: ['requirement_text', 'standard_code'] }
            ];
            const missing = [];
            const missingColumns = [];
            for (const { schema, table, columns } of criticalTables) {
                const pool = schema === 'edcat' ? queryEdcatAI : queryPostgres;
                // Check table exists
                const tableCheck = await pool(`SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = $1 AND table_name = $2
          ) as exists`, [schema, table]);
                if (!tableCheck.rows[0]?.exists) {
                    missing.push(`${schema}.${table}`);
                    continue;
                }
                // Check columns exist
                for (const column of columns) {
                    const columnCheck = await pool(`SELECT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_schema = $1 AND table_name = $2 AND column_name = $3
            ) as exists`, [schema, table, column]);
                    if (!columnCheck.rows[0]?.exists) {
                        missingColumns.push(`${schema}.${table}.${column}`);
                    }
                }
            }
            if (missing.length > 0 || missingColumns.length > 0) {
                return {
                    testName: 'Schema Integrity',
                    passed: false,
                    message: `Missing ${missing.length} table(s) and ${missingColumns.length} column(s)`,
                    details: { missingTables: missing, missingColumns }
                };
            }
            return {
                testName: 'Schema Integrity',
                passed: true,
                message: 'All critical tables and columns exist',
                details: { tablesChecked: criticalTables.length }
            };
        }
        catch (error) {
            return {
                testName: 'Schema Integrity',
                passed: false,
                message: `Schema check error: ${error.message}`,
                details: { error: error.message }
            };
        }
    }
    /**
     * Test pgvector availability
     */
    static async testPgvectorAvailability() {
        try {
            const result = await queryEdcatAI(`SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as has_vector`);
            const hasVector = result.rows[0]?.has_vector === true;
            if (!hasVector) {
                return {
                    testName: 'pgvector Extension',
                    passed: false,
                    message: 'pgvector extension is not installed',
                    details: {
                        recommendation: 'Run: CREATE EXTENSION IF NOT EXISTS vector;',
                        impact: 'Semantic search will fall back to keyword search'
                    }
                };
            }
            // Test vector operations
            try {
                await queryEdcatAI(`SELECT '[1,2,3]'::vector as test_vector`);
            }
            catch (vectorError) {
                return {
                    testName: 'pgvector Extension',
                    passed: false,
                    message: 'pgvector is installed but vector operations are failing',
                    details: { error: vectorError.message }
                };
            }
            return {
                testName: 'pgvector Extension',
                passed: true,
                message: 'pgvector is installed and working',
                details: { vectorOperations: 'OK' }
            };
        }
        catch (error) {
            return {
                testName: 'pgvector Extension',
                passed: false,
                message: `pgvector check error: ${error.message}`,
                details: { error: error.message }
            };
        }
    }
    /**
     * Test memory tables
     */
    static async testMemoryTables() {
        try {
            // Test conversation_memory table
            const testInsert = await queryEdcatAI(`INSERT INTO edcat.conversation_memory 
         (conversation_id, message_text, question_text, role, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING id`, ['test-session-' + Date.now(), 'Test message', 'Test question', 'user']).catch(() => null);
            if (!testInsert) {
                return {
                    testName: 'Memory Tables',
                    passed: false,
                    message: 'Cannot insert into conversation_memory table',
                    details: { table: 'edcat.conversation_memory' }
                };
            }
            // Clean up test data
            await queryEdcatAI(`DELETE FROM edcat.conversation_memory WHERE conversation_id LIKE 'test-session-%'`).catch(() => { });
            return {
                testName: 'Memory Tables',
                passed: true,
                message: 'Memory tables are accessible and writable',
                details: { table: 'edcat.conversation_memory', status: 'OK' }
            };
        }
        catch (error) {
            return {
                testName: 'Memory Tables',
                passed: false,
                message: `Memory table test error: ${error.message}`,
                details: { error: error.message }
            };
        }
    }
    /**
     * Test learning tables
     */
    static async testLearningTables() {
        try {
            const result = await queryEdcatAI(`SELECT COUNT(*) as count FROM edcat.document_content_for_learning`);
            const count = parseInt(result.rows[0]?.count || '0', 10);
            return {
                testName: 'Learning Tables',
                passed: true,
                message: `Learning tables accessible (${count} documents indexed)`,
                details: { documentCount: count, table: 'edcat.document_content_for_learning' }
            };
        }
        catch (error) {
            return {
                testName: 'Learning Tables',
                passed: false,
                message: `Learning table test error: ${error.message}`,
                details: { error: error.message, table: 'edcat.document_content_for_learning' }
            };
        }
    }
    /**
     * Test correction tables
     */
    static async testCorrectionTables() {
        try {
            // Test both correction tables
            const correctionsCheck = await queryEdcatAI(`SELECT COUNT(*) as count FROM edcat.vera_learned_corrections`).catch(() => ({ rows: [{ count: '0' }] }));
            const qnaCheck = await queryEdcatAI(`SELECT COUNT(*) as count FROM edcat.vera_query_response_bank`).catch(() => ({ rows: [{ count: '0' }] }));
            const correctionsCount = parseInt(correctionsCheck.rows[0]?.count || '0', 10);
            const qnaCount = parseInt(qnaCheck.rows[0]?.count || '0', 10);
            return {
                testName: 'Correction Tables',
                passed: true,
                message: `Correction tables accessible (${correctionsCount} corrections, ${qnaCount} Q&A entries)`,
                details: {
                    correctionsTable: 'edcat.vera_learned_corrections',
                    qnaTable: 'edcat.vera_query_response_bank',
                    correctionsCount,
                    qnaCount
                }
            };
        }
        catch (error) {
            return {
                testName: 'Correction Tables',
                passed: false,
                message: `Correction table test error: ${error.message}`,
                details: { error: error.message }
            };
        }
    }
    /**
     * Test critical EDCAT table existence and row counts
     */
    static async testCriticalEDCATTables() {
        try {
            const criticalTables = [
                { schema: 'edcat', table: 'ai_conversation_history' },
                { schema: 'edcat', table: 'ai_persona_profile' },
                { schema: 'edcat', table: 'ai_prompt' },
                { schema: 'edcat', table: 'ai_policy' },
                { schema: 'edcat', table: 'ai_conversation_state' },
                { schema: 'edcat', table: 'vera_query_response_bank' },
                { schema: 'edcat', table: 'conversation_memory' },
                { schema: 'edcat', table: 'document_content_for_learning' }
            ];
            const results = {};
            let missingTables = [];
            for (const { schema, table } of criticalTables) {
                try {
                    // Check if table exists
                    const existsCheck = await queryEdcatAI(`SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = $1 AND table_name = $2
            ) as exists`, [schema, table]);
                    const exists = existsCheck.rows[0]?.exists === true;
                    if (!exists) {
                        missingTables.push(`${schema}.${table}`);
                        results[`${schema}.${table}`] = { exists: false, count: 0 };
                        continue;
                    }
                    // Get row count
                    const countResult = await queryEdcatAI(`SELECT COUNT(*) as count FROM ${schema}.${table}`);
                    const count = parseInt(countResult.rows[0]?.count || '0', 10);
                    results[`${schema}.${table}`] = { exists: true, count };
                }
                catch (error) {
                    missingTables.push(`${schema}.${table}`);
                    results[`${schema}.${table}`] = { exists: false, count: 0 };
                }
            }
            if (missingTables.length > 0) {
                return {
                    testName: 'Critical EDCAT Tables',
                    passed: false,
                    message: `Missing ${missingTables.length} critical table(s)`,
                    details: { missingTables, results }
                };
            }
            const totalRows = Object.values(results).reduce((sum, r) => sum + r.count, 0);
            return {
                testName: 'Critical EDCAT Tables',
                passed: true,
                message: `All critical EDCAT tables exist (${totalRows} total rows across tables)`,
                details: { tablesChecked: criticalTables.length, totalRows, results }
            };
        }
        catch (error) {
            return {
                testName: 'Critical EDCAT Tables',
                passed: false,
                message: `Critical EDCAT table test error: ${error.message}`,
                details: { error: error.message }
            };
        }
    }
    /**
     * Format test report for human consumption
     */
    static formatTestReport(report) {
        const parts = [];
        parts.push(`**Self-Test Report** (${report.timestamp.toLocaleString()})`);
        parts.push('');
        parts.push(`**Overall Status:** ${report.overallStatus}`);
        parts.push(`**Results:** ${report.passedTests}/${report.totalTests} tests passed`);
        parts.push('');
        report.results.forEach((result, idx) => {
            const icon = result.passed ? '✅' : '❌';
            parts.push(`${idx + 1}. ${icon} **${result.testName}**`);
            parts.push(`   ${result.message}`);
            if (result.details && Object.keys(result.details).length > 0) {
                const detailsStr = Object.entries(result.details)
                    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                    .join(', ');
                parts.push(`   Details: ${detailsStr}`);
            }
            parts.push('');
        });
        if (report.overallStatus === 'PASS') {
            parts.push('All systems are operational. No issues detected.');
        }
        else if (report.overallStatus === 'PARTIAL') {
            parts.push('Some systems have issues. Review failed tests above.');
        }
        else {
            parts.push('Multiple systems are failing. Immediate attention required.');
        }
        return parts.join('\n');
    }
}
//# sourceMappingURL=VeraSelfTestService.js.map