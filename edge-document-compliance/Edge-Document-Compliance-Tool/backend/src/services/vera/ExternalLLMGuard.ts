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
export function assertExternalLLMsDisabled(): void {
  if (process.env.ALLOW_EXTERNAL_LLM === 'true') {
    console.warn('[ExternalLLMGuard] External LLM usage is ALLOWED (ALLOW_EXTERNAL_LLM=true). This should only be used for testing.');
    return;
  }

  throw new Error(
    'External LLM usage is disabled for Vera. Use VeraCoreEngine (internal) instead. ' +
    'If you need external LLM for testing, set ALLOW_EXTERNAL_LLM=true (not recommended for production).'
  );
}

/**
 * Check if external LLMs are allowed (for conditional logic)
 */
export function isExternalLLMAllowed(): boolean {
  return process.env.ALLOW_EXTERNAL_LLM === 'true';
}

/**
 * Guard wrapper for functions that should not use external LLMs
 */
export function guardExternalLLM<T extends (...args: any[]) => any>(
  fn: T,
  moduleName: string
): T {
  return ((...args: Parameters<T>) => {
    assertExternalLLMsDisabled();
    console.warn(`[ExternalLLMGuard] ${moduleName} is not used in production for Vera. Use VeraCoreEngine instead.`);
    return fn(...args);
  }) as T;
}

export default {
  assertExternalLLMsDisabled,
  isExternalLLMAllowed,
  guardExternalLLM
};

