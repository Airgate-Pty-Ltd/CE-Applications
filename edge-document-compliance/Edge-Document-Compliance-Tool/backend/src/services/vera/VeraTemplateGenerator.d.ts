/**
 * Vera Template Generator
 *
 * Generates procedure templates dynamically from approved examples.
 * Analyzes multiple examples to extract common patterns, sections, and phrasing.
 *
 * 100% internal - no external LLM calls.
 */
import { ExampleDoc } from './VeraLearningRepository.js';
export interface TemplateSection {
    name: string;
    order: number;
    placeholderText: string;
    required: boolean;
    commonPhrases: string[];
}
export interface GeneratedTemplate {
    standardCode: string;
    clauseRef?: string;
    sections: TemplateSection[];
    commonPhrases: string[];
    estimatedLength: number;
}
export declare class VeraTemplateGenerator {
    /**
     * Generate template from approved examples
     */
    static generateTemplateFromExamples(standardCode: string, clauseRef: string | undefined, examples: ExampleDoc[]): GeneratedTemplate;
    /**
     * Extract section headings from examples
     * ITERATION 9: Enhanced pattern extraction
     */
    private static extractSections;
    /**
     * Parse sections from document content
     */
    private static parseSections;
    /**
     * Normalize section name
     */
    private static normalizeSectionName;
    /**
     * Extract common structures from content (ITERATION 9 enhancement)
     */
    private static extractCommonStructures;
    /**
     * Extract phrases from content
     */
    private static extractPhrases;
    /**
     * Find most common phrase
     */
    private static findMostCommonPhrase;
    /**
     * Generate placeholder text for a section
     */
    private static generatePlaceholder;
    /**
     * Extract common phrases across examples
     */
    private static extractCommonPhrases;
    /**
     * Estimate template length
     */
    private static estimateLength;
    /**
     * Generate generic template when no examples available
     */
    private static generateGenericTemplate;
    /**
     * Format template as markdown/text
     */
    static formatTemplate(template: GeneratedTemplate): string;
}
//# sourceMappingURL=VeraTemplateGenerator.d.ts.map