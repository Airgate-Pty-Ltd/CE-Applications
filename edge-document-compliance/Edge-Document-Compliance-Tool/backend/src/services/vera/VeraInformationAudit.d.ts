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
declare class VeraInformationAudit {
    private auditLog;
    private queryResults;
    /**
     * AUDIT 1: Database Connections
     * Verify both databases can be queried
     */
    auditDatabaseConnections(): Promise<any>;
    /**
     * AUDIT 2: Data Availability
     * Check how much data exists in each critical table
     */
    auditDataAvailability(): Promise<any>;
    /**
     * AUDIT 3: Retrieval Paths
     * Test if each major retrieval method actually works
     */
    auditRetrievalPaths(): Promise<any>;
    private testTerminologyLookup;
    private testQABank;
    private testSemanticSearch;
    private testClauseMatching;
    private testRegulatoryLookup;
    private testLearningDocuments;
    /**
     * AUDIT 4: Query Logging
     * Enable verbose logging to VeraCoreEngine to see what's actually happening
     */
    auditQueryLogging(): Promise<void>;
    /**
     * FULL AUDIT REPORT
     */
    runFullAudit(): Promise<any>;
}
export default VeraInformationAudit;
//# sourceMappingURL=VeraInformationAudit.d.ts.map