/**
 * ComplianceGap Module Server
 * Express routes integration for ComplianceGap module
 * 
 * This module integrates ComplianceGap into the main EDCAT application
 */

import complianceGapRouter from './routes/api.js';

/**
 * Get the ComplianceGap router
 * This is the main export - used by app.js to mount routes
 */
export default complianceGapRouter;

