/**
 * Vera Regulatory Repository
 *
 * Specialized repository for querying regulatory standards and clauses.
 * Handles FAA Part 21.137, CASA CASRS, EASA, UK CAA, FDA 21 CFR Part 11, etc.
 *
 * 100% internal - no external LLM calls.
 */
export interface RegulatorySection {
    standardCode: string;
    sectionRef: string;
    contentText: string;
    metadata: any;
    source: 'compliance_requirements' | 'document_content_for_learning';
}
export declare class VeraRegulatoryRepository {
    /**
     * Find regulatory section text (e.g., FAA 21.137(n), CASA Part 145)
     */
    findRegSectionText(standardCode: string, sectionRef: string): Promise<RegulatorySection[]>;
    /**
     * Get all clauses for a regulatory standard
     */
    getAllRegulatoryClauses(standardCode: string): Promise<Array<{
        reference: string;
        title: string;
        requirementText: string;
    }>>;
    /**
     * Check if a regulatory standard is available
     */
    isRegulatoryStandardAvailable(standardCode: string): Promise<boolean>;
}
//# sourceMappingURL=VeraRegulatoryRepository.d.ts.map