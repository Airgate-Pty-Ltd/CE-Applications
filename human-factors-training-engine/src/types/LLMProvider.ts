/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

// Classification type (string enum values)

/**
 * LLMProvider: pluggable interface for AI Assist.
 * Implementations: OllamaProvider (local), ExternalApiProvider (if enabled later).
 *
 * The kernel itself never touches this; only AI Assist calls providers.
 */
export interface LLMProvider {
  /**
   * Generate atom text from source evidence.
   */
  generateAtomText(input: {
    sourceText: string;
    theme: string;
    objective: string;
    classification: string;
  }): Promise<string>;

  /**
   * Check if this provider allows a given classification.
   */
  allowsClassification?(classification: string): boolean;
}

/**
 * Ollama provider: local LLM via Ollama HTTP API.
 */
export class OllamaProvider implements LLMProvider {
  private baseUrl: string;
  private modelName: string;

  constructor(baseUrl: string = 'http://localhost:11434', modelName: string = 'llama2') {
    this.baseUrl = baseUrl;
    this.modelName = modelName;
  }

  async generateAtomText(input: {
    sourceText: string;
    theme: string;
    objective: string;
  }): Promise<string> {
    const prompt = `Based on the following evidence, generate a concise learning atom (5-10 minutes of instruction) addressing the theme "${input.theme}" with the objective: "${input.objective}".

Evidence:
${input.sourceText}

Output the atom text as a clear, focused lesson with no preamble.`;

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.modelName,
          prompt,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.response || '';
    } catch (error) {
      throw new Error(
        `Ollama call failed: ${error instanceof Error ? error.message : 'Unknown error'}. Is Ollama running at ${this.baseUrl}?`
      );
    }
  }

  allowsClassification(): boolean {
    // Local Ollama is OK for all classifications
    return true;
  }
}
