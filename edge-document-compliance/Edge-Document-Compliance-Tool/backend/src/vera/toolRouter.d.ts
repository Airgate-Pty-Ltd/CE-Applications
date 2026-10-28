/**
 * Tool Router
 * Routes tasks to appropriate analysis engines and tools
 */
interface ToolResult {
    success: boolean;
    data?: any;
    error?: string;
    reasoning?: string;
}
/**
 * Route to standards parser
 */
export declare function routeToStandardsParser(standardId: string, options?: {
    forceReparse?: boolean;
}): Promise<ToolResult>;
/**
 * Route to gap analysis engine
 */
export declare function routeToGapAnalysis(standardId: string, documentIds: string[], options?: {
    customerId?: string;
}): Promise<ToolResult>;
/**
 * Route to requirement comparison engine
 */
export declare function routeToRequirementCompare(requirementId1: string, requirementId2: string): Promise<ToolResult>;
/**
 * Route to procedure comparison engine
 */
export declare function routeToProcedureCompare(procedureId1: string, procedureId2: string): Promise<ToolResult>;
/**
 * Route to regulatory lookup engine
 */
export declare function routeToRegulatoryLookup(regulatoryCode: string, partNumber?: string): Promise<ToolResult>;
declare const _default: {
    routeToStandardsParser: typeof routeToStandardsParser;
    routeToGapAnalysis: typeof routeToGapAnalysis;
    routeToRequirementCompare: typeof routeToRequirementCompare;
    routeToProcedureCompare: typeof routeToProcedureCompare;
    routeToRegulatoryLookup: typeof routeToRegulatoryLookup;
};
export default _default;
//# sourceMappingURL=toolRouter.d.ts.map