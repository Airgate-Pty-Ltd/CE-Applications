/**
 * Intent Classifier
 * Deterministic intent classification using Vera's own rule-based system
 * Completely independent - no external AI dependencies
 * NO OpenAI - uses only pattern matching and rule-based classification
 */
export type Intent = 'greeting' | 'question' | 'clause_lookup' | 'analysis' | 'meta' | 'upload_related' | 'clarification' | 'unknown';
interface ClassificationResult {
    intent: Intent;
    confidence: number;
    extractedData?: {
        standardCode?: string;
        clauseNumber?: string;
        analysisType?: string;
    };
}
/**
 * Deterministic intent classification using rules
 */
export declare function classifyIntentDeterministic(message: string): ClassificationResult | null;
/**
 * Enhanced deterministic classification for ambiguous cases
 * Uses pattern matching and keyword analysis - no external AI needed
 */
export declare function classifyIntentEnhanced(message: string): ClassificationResult;
/**
 * Main classification function - uses only deterministic and enhanced pattern matching
 * Completely independent - no external AI dependencies
 */
export declare function classifyIntent(message: string): Promise<ClassificationResult>;
declare const _default: {
    classifyIntent: typeof classifyIntent;
    classifyIntentDeterministic: typeof classifyIntentDeterministic;
    classifyIntentEnhanced: typeof classifyIntentEnhanced;
};
export default _default;
//# sourceMappingURL=intentClassifier.d.ts.map