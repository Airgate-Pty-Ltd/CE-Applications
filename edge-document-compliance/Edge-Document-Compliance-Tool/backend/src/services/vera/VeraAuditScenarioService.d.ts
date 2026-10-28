/**
 * Vera Audit Scenario Service
 *
 * Generates and manages audit scenarios for training and simulation.
 * Vera acts as a world-class lead auditor coach.
 */
export interface AuditScenarioStep {
    stepNumber: number;
    description: string;
    expectedEvidence?: string[];
    suggestedQuestions?: string[];
    commonPitfalls?: string[];
    auditorNotes?: string;
}
export interface AuditScenario {
    id?: string;
    title: string;
    standardCode: string;
    clauses: string[];
    industryContext?: string;
    difficulty: "intro" | "intermediate" | "advanced";
    steps: AuditScenarioStep[];
    narrative?: string;
    learningObjectives?: string[];
    estimatedDuration?: string;
}
/**
 * Generate an audit scenario for given standard and clauses
 */
export declare function generateAuditScenario(standardCode: string, clauses: string[], options?: {
    difficulty?: "intro" | "intermediate" | "advanced";
    tenantId?: string;
    industryContext?: string;
}): Promise<AuditScenario>;
/**
 * List saved scenarios
 */
export declare function listSavedScenarios(params: {
    tenantId?: string;
    standardCode?: string;
    difficulty?: string;
}): Promise<AuditScenario[]>;
/**
 * Get scenario by ID
 */
export declare function getScenarioById(scenarioId: string): Promise<AuditScenario | null>;
//# sourceMappingURL=VeraAuditScenarioService.d.ts.map