/**
 * Final Composer
 * Formats Vera's responses into her natural, professional auditor voice
 */
export interface ComposerOptions {
    removeCapabilityLists?: boolean;
    ensureDirectAnswer?: boolean;
    addFollowUp?: boolean;
    maxLength?: number;
}
/**
 * Compose final response from Vera's intelligence output
 */
export declare function composeFinalResponse(veraResponse: string, options?: ComposerOptions): string;
declare const _default: {
    composeFinalResponse: typeof composeFinalResponse;
};
export default _default;
//# sourceMappingURL=finalComposer.d.ts.map