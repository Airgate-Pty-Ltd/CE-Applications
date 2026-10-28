/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from '@prisma/client';
import { LLMProvider } from '../types/LLMProvider';
import { toDb } from '@/lib/json';

/**
 * AI Assist service: pluggable LLM abstraction with confidentiality gating.
 *
 * Rule: BURRANA_PRIVATE evidence cannot be sent to any LLM (external or local).
 * Restricted classes (EXPORT_CONTROLLED, CUSTOMER_CONFIDENTIAL) check provider config.
 * Fallback: always available no-AI manual path; AI optional enhancement only.
 */
export class AiAssist {
  private prisma: PrismaClient;
  private llmProvider: LLMProvider | null;

  constructor(prisma: PrismaClient, llmProvider?: LLMProvider) {
    this.prisma = prisma;
    this.llmProvider = llmProvider || null;
  }

  /**
   * Propose atom text from source evidence.
   * Returns {aiDraft, sourceSpans, canUseAi} for UI to render.
   * If classification blocks AI, canUseAi=false; manual path still works.
   */
  async proposeAtomFromEvidence(
    tenantId: string,
    evidenceId: string,
    theme: string,
    atomObjective: string
  ): Promise<{
    aiDraft?: string;
    sourceSpans: string[];
    canUseAi: boolean;
    reason?: string;
  }> {
    // Load evidence
    const evidence = await this.prisma.hfEvidence.findUnique({
      where: { id: evidenceId }
    });

    if (!evidence) {
      return {
        sourceSpans: [],
        canUseAi: false,
        reason: 'Evidence not found'
      };
    }

    // Use evidence.classification field directly
    const classification = evidence.classification || 'PUBLIC';

    // Extractable text: per SCHEMA-DELTA.md, `source` is a short citation label
    // ("NCR-2026-0001"), not document content — `description` holds the actual
    // extracted/ingested text (see EvidenceIngestion.ts's EXTRACTED state). Fixed
    // 2026-08-06: this previously read evidence.source for both the LLM prompt and
    // span extraction, meaning a real AI call would have been given a citation label
    // instead of the incident narrative. Falls back to `source` only when `description`
    // is genuinely empty (e.g. evidence created directly with content in `source`, as
    // some existing tests and seed data do).
    const extractableText = evidence.description || evidence.source || '';

    // Check confidentiality gate
    if (classification === 'BURRANA_PRIVATE') {
      await this.logAiAssistRejection(tenantId, evidenceId, 'BURRANA_PRIVATE block');
      return {
        sourceSpans: this.extractSourceSpans(extractableText),
        canUseAi: false,
        reason: 'This evidence is confidential (BURRANA_PRIVATE). AI Assist unavailable. Manual authoring required.'
      };
    }

    // Check restricted classifications against provider config
    if (['EXPORT_CONTROLLED', 'CUSTOMER_CONFIDENTIAL'].includes(classification)) {
      if (!this.llmProvider || !this.llmProvider.allowsClassification?.(classification)) {
        await this.logAiAssistRejection(tenantId, evidenceId, `${classification} + provider config blocks`);
        return {
          sourceSpans: this.extractSourceSpans(extractableText),
          canUseAi: false,
          reason: `This evidence is classified ${classification}. Your LLM provider is not configured to process this classification.`
        };
      }
    }

    // AI Assist available: call LLM provider
    if (!this.llmProvider) {
      return {
        sourceSpans: this.extractSourceSpans(extractableText),
        canUseAi: false,
        reason: 'No LLM provider configured. Manual authoring only.'
      };
    }

    try {
      const aiDraft = await this.llmProvider.generateAtomText({
        sourceText: extractableText,
        theme,
        objective: atomObjective,
        classification
      });

      // Log successful AI call for audit trail
      await this.logAiAssistCall(tenantId, evidenceId, 'atom_proposal', 'success');

      return {
        aiDraft,
        sourceSpans: this.extractSourceSpans(extractableText),
        canUseAi: true
      };
    } catch (error) {
      // LLM call failed; fallback to manual path
      await this.logAiAssistCall(
        tenantId,
        evidenceId,
        'atom_proposal',
        'error',
        error instanceof Error ? error.message : 'Unknown error'
      );

      return {
        sourceSpans: this.extractSourceSpans(extractableText),
        canUseAi: false,
        reason: 'AI Assist call failed. Proceeding with manual authoring. No evidence was sent to external systems.'
      };
    }
  }

  /**
   * Extract source spans from evidence text (simple version: split by sentences).
   * In production, use a more sophisticated parser or annotations from evidence extraction.
   */
  private extractSourceSpans(text: string): string[] {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    return sentences.slice(0, 3).map(s => s.trim()); // Return first 3 sentences as spans
  }

  /**
   * Log AI Assist call for audit trail.
   * Fixed 2026-08-06: previously wrote to MaiErrorLog with eventId: '' — MaiErrorLog.eventId
   * is a required foreign key to MaiEvent, so every call to this method has always thrown a
   * P2003 foreign-key violation, silently swallowed by the surrounding try/catch (only
   * console.error'd). No AI-assist audit entry has ever actually persisted. MaiErrorLog is
   * scoped to kernel rule-evaluation errors tied to a real MaiEvent snapshot; AuditLog (no
   * such FK, nullable actor) is the correct table for this general call log. Caught writing
   * AiAssist.test.ts's audit-log assertions for C-002/C-003.
   */
  private async logAiAssistCall(
    tenantId: string,
    evidenceId: string,
    callType: string,
    status: 'success' | 'error',
    errorMsg?: string
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: tenantId,
          actor: null,
          action: `AI_ASSIST_${callType.toUpperCase()}`,
          object: 'HfEvidence',
          objectId: evidenceId,
          details: JSON.stringify({ tenantId, callType, status, errorMsg })
        }
      });
    } catch (err) {
      console.error('[AiAssist] Failed to log call:', err);
    }
  }

  /**
   * Log AI Assist rejection due to confidentiality. See logAiAssistCall() comment — same fix.
   */
  private async logAiAssistRejection(
    tenantId: string,
    evidenceId: string,
    reason: string
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: tenantId,
          actor: null,
          action: 'AI_ASSIST_REJECTED',
          object: 'HfEvidence',
          objectId: evidenceId,
          details: JSON.stringify({ tenantId, reason: `AI Assist rejected: ${reason}` })
        }
      });
    } catch (err) {
      console.error('[AiAssist] Failed to log rejection:', err);
    }
  }

  /**
   * Check if AI Assist is available for a given evidence classification.
   */
  async isAiAvailable(classification: string): Promise<boolean> {
    if (classification === 'BURRANA_PRIVATE') return false;
    if (['EXPORT_CONTROLLED', 'CUSTOMER_CONFIDENTIAL'].includes(classification)) {
      return this.llmProvider?.allowsClassification?.(classification) ?? false;
    }
    return this.llmProvider !== null;
  }
}

export const aiAssistSingleton = (prisma: PrismaClient, llmProvider?: LLMProvider) =>
  new AiAssist(prisma, llmProvider);
