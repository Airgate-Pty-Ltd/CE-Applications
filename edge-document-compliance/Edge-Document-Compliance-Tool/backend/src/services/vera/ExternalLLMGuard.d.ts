/**
 * External LLM Guard
 *
 * Hard-disables external LLM usage for Vera.
 * Vera must use internal reasoning only (VeraCoreEngine).
 */
/**
 * Assert that external LLMs are disabled
 * Throws an error if external LLM usage is attempted (unless explicitly allowed)
 */
export declare function assertExternalLLMsDisabled(): void;
/**
 * Check if external LLMs are allowed (for conditional logic)
 */
export declare function isExternalLLMAllowed(): boolean;
/**
 * Guard wrapper for functions that should not use external LLMs
 */
export declare function guardExternalLLM<T extends (...args: any[]) => any>(fn: T, moduleName: string): T;
declare const _default: {
    assertExternalLLMsDisabled: typeof assertExternalLLMsDisabled;
    isExternalLLMAllowed: typeof isExternalLLMAllowed;
    guardExternalLLM: typeof guardExternalLLM;
};
export default _default;
//# sourceMappingURL=ExternalLLMGuard.d.ts.map