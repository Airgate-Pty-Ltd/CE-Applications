/**
 * Vera Admin Routes
 *
 * Internal admin endpoints for managing Vera configuration, rules, templates, and patterns.
 * These endpoints provide JSON-only responses for internal tooling.
 *
 * PURPOSE:
 * - Enable configuration management for Vera's knowledge base
 * - Support admin tools for persona, rules, boundaries, and templates
 * - Provide access to patterns discovered by Vera
 *
 * EXTENSION POINTS:
 * - Add new admin endpoints as Vera capabilities expand
 * - Integrate with admin UI for visual configuration
 */
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=veraAdmin.routes.d.ts.map