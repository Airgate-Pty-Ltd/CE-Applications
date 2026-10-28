/**
 * Vera Self-Test Service
 *
 * Runs diagnostic tests to verify fixes and check system health.
 * Phase 7: Self-testing capability
 */
export interface SelfTestResult {
    testName: string;
    passed: boolean;
    message: string;
    details?: any;
}
export interface SelfTestReport {
    overallStatus: 'PASS' | 'PARTIAL' | 'FAIL';
    totalTests: number;
    passedTests: number;
    failedTests: number;
    results: SelfTestResult[];
    timestamp: Date;
}
export declare class VeraSelfTestService {
    /**
     * Run all self-tests
     */
    static runAllTests(): Promise<SelfTestReport>;
    /**
     * Test database connections
     */
    private static testDatabaseConnections;
    /**
     * Test schema integrity
     */
    private static testSchemaIntegrity;
    /**
     * Test pgvector availability
     */
    private static testPgvectorAvailability;
    /**
     * Test memory tables
     */
    private static testMemoryTables;
    /**
     * Test learning tables
     */
    private static testLearningTables;
    /**
     * Test correction tables
     */
    private static testCorrectionTables;
    /**
     * Test critical EDCAT table existence and row counts
     */
    private static testCriticalEDCATTables;
    /**
     * Format test report for human consumption
     */
    static formatTestReport(report: SelfTestReport): string;
}
//# sourceMappingURL=VeraSelfTestService.d.ts.map