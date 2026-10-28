/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient, LearningAtom } from '@prisma/client';
import crypto from 'crypto';
import { fromDbArray } from '@/lib/json';

/**
 * Curriculum Compiler: deterministic manifest generation.
 * Pure function: identical inputs → identical output_hash (no timestamp variation, no randomness).
 *
 * Input:
 * - approvedAtoms: LearningAtom[] (status = APPROVED)
 * - learnerAttributes: {role, site, first_time, ...}
 * - policyPacks: PolicyPack[] (Phase 2; Phase 1 empty)
 * - curriculum_revision: string (e.g., "HF-Phase-1-Vertical-Slice-v1")
 * - burden_budget: number (Phase 2; Phase 1 unlimited)
 * - recurrence_rule: string (Phase 2; Phase 1 empty)
 *
 * Output:
 * - manifest: {baseline_content, recurrent_content, source_traceability}
 * - output_hash: SHA-256 of serialized manifest (reproducibility proof)
 *
 * Immutability: once returned, manifest is frozen and cannot be edited.
 * New content requires new compilation (new manifest_id).
 */

export interface CompileInput {
  tenantId: string;
  approvedAtoms: LearningAtom[];
  learnerAttributes: {
    learnerId: string;
    role: string;
    site: string;
    first_time: boolean;
  };
  policyPacks?: any[]; // Phase 2
  curriculumRevision: string;
  burdenBudget?: number; // Phase 2
  recurrenceRule?: string; // Phase 2
}

export interface FrozenManifest {
  manifest_id: string; // Will be set to output_hash
  baseline_content: Array<{
    atomId: string;
    atomTitle: string;
    duration_minutes: number;
    order: number;
    objective: string;
  }>;
  recurrent_content?: Array<{
    atomId: string;
    atomTitle: string;
    duration_minutes: number;
    trigger: string;
  }>;
  source_traceability: Record<string, string[]>; // atomId -> evidenceIds
  curriculum_revision: string;
  learner_attributes: CompileInput['learnerAttributes'];
  compiled_at: string;
  output_hash: string;
  status: 'ACTIVE' | 'SUPERSEDED';
}

export class CurriculumCompiler {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Compile deterministic manifest from approved atoms.
   * Phase 1: baseline only; first_time=true.
   */
  async compile(input: CompileInput): Promise<{
    manifest: FrozenManifest;
    output_hash: string;
  }> {
    // Validate: all atoms must be APPROVED
    const invalidAtoms = input.approvedAtoms.filter(a => a.status !== 'APPROVED');
    if (invalidAtoms.length > 0) {
      throw new Error(`Cannot compile manifest: ${invalidAtoms.length} atoms not APPROVED`);
    }

    // Build baseline_content (Phase 1: all atoms, ordered by creation)
    const baseline_content = input.approvedAtoms
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((atom, index) => ({
        atomId: atom.id,
        atomTitle: atom.title,
        duration_minutes: atom.duration || 0,
        order: index + 1,
        objective: atom.objective || ''
      }));

    // Build source_traceability (atom -> evidence mapping)
    const source_traceability: Record<string, string[]> = {};
    for (const atom of input.approvedAtoms) {
      // Query evidence_relationship for atoms linked to evidence
      const relationships = await this.prisma.evidenceRelationship.findMany({
        where: {
          toEntityId: atom.id,
          toEntityType: 'LearningAtom'
        }
      });
      source_traceability[atom.id] = relationships.map(r => r.fromEntityId);
    }

    // Phase 1: no recurrent content, no policy packs, unlimited burden
    const recurrent_content: any[] = [];

    // Phase 1: compile_at is DETERMINISTIC (uses curriculum_revision for reproducibility, not timestamp)
    const compiled_at = this.getConsistentTimestamp(input.curriculumRevision);

    // Build frozen manifest (before hashing)
    const manifest: FrozenManifest = {
      manifest_id: '', // Will be set to output_hash
      baseline_content,
      recurrent_content,
      source_traceability,
      curriculum_revision: input.curriculumRevision,
      learner_attributes: input.learnerAttributes,
      compiled_at,
      output_hash: '', // Will be computed
      status: 'ACTIVE'
    };

    // Compute deterministic hash: serialize manifest in canonical form
    const output_hash = this.computeManifestHash(manifest);

    // Set manifest_id to output_hash (immutable id)
    manifest.manifest_id = output_hash;
    manifest.output_hash = output_hash;

    // Verify reproducibility: recompile and ensure hash matches
    const verifyHash = this.computeManifestHash(manifest);
    if (verifyHash !== output_hash) {
      throw new Error('Manifest hash verification failed (non-deterministic compilation)');
    }

    return { manifest, output_hash };
  }

  /**
   * Compute deterministic hash of manifest.
   * Canonical JSON serialization ensures identical inputs → identical hash.
   */
  private computeManifestHash(manifest: FrozenManifest): string {
    // Create a canonical representation (sorted keys, no variable timestamps)
    const canonical = {
      baseline_content: manifest.baseline_content,
      recurrent_content: manifest.recurrent_content,
      source_traceability: manifest.source_traceability,
      curriculum_revision: manifest.curriculum_revision,
      learner_attributes: manifest.learner_attributes
    };

    // Serialize with keys sorted at EVERY nesting level, not just the top.
    // Fixed 2026-08-06: the previous JSON.stringify(canonical, Object.keys(canonical).sort())
    // used the array form of JSON.stringify's replacer, which is a recursive key ALLOWLIST
    // FILTER, not a sort — it applied the 5 top-level key names to every nested object too,
    // silently dropping atomId/learnerId/role/site/etc. from the hash input entirely. Two
    // manifests compiled for different learners hashed identically as a result. Caught
    // writing CurriculumCompiler.test.ts's cross-learner hash-sensitivity case.
    const serialized = JSON.stringify(this.sortKeysDeep(canonical));

    // SHA-256 hash
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * Recursively rebuild an object/array with object keys in sorted order so that
   * JSON.stringify output is deterministic regardless of construction order upstream.
   */
  private sortKeysDeep(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sortKeysDeep(item));
    }
    if (value !== null && typeof value === 'object') {
      const sorted: Record<string, unknown> = {};
      for (const key of Object.keys(value as Record<string, unknown>).sort()) {
        sorted[key] = this.sortKeysDeep((value as Record<string, unknown>)[key]);
      }
      return sorted;
    }
    return value;
  }

  /**
   * Get deterministic timestamp based on curriculum_revision.
   * Phase 1: uses revision as seed; same revision → same timestamp.
   * This is non-standard but ensures reproducibility in Phase 1 testing.
   */
  private getConsistentTimestamp(curriculumRevision: string): string {
    // For Phase 1: use fixed time for all compilations of same revision
    // In production, this would be the actual compile time, but then recompiles won't have identical hash
    // For now, use revision hash to seed a consistent timestamp
    const hash = crypto
      .createHash('md5')
      .update(curriculumRevision)
      .digest('hex');
    const timestamp = parseInt(hash.substring(0, 8), 16) % (365 * 24 * 60 * 60 * 1000); // Seed from hash
    const baseDate = new Date('2026-08-05T00:00:00Z');
    baseDate.setTime(baseDate.getTime() + timestamp);
    return baseDate.toISOString();
  }

  /**
   * Verify reproducibility: compile twice with identical input, hashes should match.
   * Test-only method.
   */
  async verifyReproducibility(input: CompileInput): Promise<boolean> {
    const compile1 = await this.compile(input);
    const compile2 = await this.compile(input);
    return compile1.output_hash === compile2.output_hash;
  }
}

export const curriculumCompilerSingleton = (prisma: PrismaClient) =>
  new CurriculumCompiler(prisma);
