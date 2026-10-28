/**
 * Vera Diagnostics Routes
 *
 * Diagnostic endpoints for monitoring Vera's health, reasoning, and performance.
 * These endpoints provide internal observability and debugging capabilities.
 *
 * PURPOSE:
 * - Health checks for Vera's database connections and data integrity
 * - Reasoning trace summaries for debugging analysis issues
 * - Concept coverage analysis for understanding Vera's reasoning depth
 *
 * EXTENSION POINTS:
 * - Add performance metrics endpoints
 * - Add reasoning quality metrics
 * - Add learning effectiveness tracking
 */
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=veraDiagnostics.routes.d.ts.map