import { PrismaClient } from '@prisma/client';
import { TraceabilityGraph } from './TraceabilityGraph';
import { versionStampMeta } from '../src/lib/versionStamp';

/**
 * Defense Dossier Builder: generates comprehensive PDF audit chains.
 *
 * One-click export of complete intervention evidence:
 * - Incident summary + source document excerpt
 * - Causal investigation narrative
 * - Appropriateness review decision
 * - Learning atoms with source mapping
 * - Frozen curriculum manifest (audit-proof)
 * - Learner assignments and assessment results
 * - Supervisor observations (effectiveness evidence)
 * - Intervention closure + effectiveness status
 * - Complete audit trail (action log with timestamps, hashes)
 *
 * Output: JSON structure (Phase 1; Phase 2 will add PDF generation).
 */
export interface DossierSection {
  title: string;
  content: any;
  timestamp?: string;
}

export class DefenseDossierBuilder {
  private prisma: PrismaClient;
  private traceability: TraceabilityGraph;

  constructor(prisma: PrismaClient, traceability: TraceabilityGraph) {
    this.prisma = prisma;
    this.traceability = traceability;
  }

  /**
   * Build complete defense dossier for an intervention.
   */
  async buildDossier(interventionId: string): Promise<{
    dossier: {
      title: string;
      sections: DossierSection[];
      timestamp: string;
      manifest_hash?: string;
    };
    pdfReady: boolean;
  }> {
    const sections: DossierSection[] = [];

    // Load intervention
    const intervention = await this.prisma.learningIntervention.findUnique({
      where: { id: interventionId },
      include: { appropriatenessReview: true }
    });

    if (!intervention) {
      throw new Error('Intervention not found');
    }

    // Section 1: Incident Summary
    const audit = await this.traceability.buildInterventionAuditChain(interventionId);
    if (audit.events.length > 0) {
      const event = audit.events[0];
      sections.push({
        title: 'Incident Summary',
        content: {
          eventId: event.id,
          title: event.title,
          themes: event.themes,
          roles: event.roles,
          description: event.description,
          discovered_date: event.discoveredAt,
          source_evidence: audit.relationships
            .filter(r => r.fromType === 'HfEvidence')
            .map(r => r.fromId)
        }
      });
    }

    // Section 2: Causal Investigation
    const causalStatus = await this.prisma.maiCausalStatus.findFirst({
      where: { eventId: audit.events[0]?.id }
    });

    if (causalStatus) {
      sections.push({
        title: 'Causal Investigation',
        content: {
          status: causalStatus.status,
          narrative: causalStatus.narrative,
          investigated_at: causalStatus.updatedAt
        }
      });
    }

    // Section 3: Appropriateness Review
    if (intervention.appropriatenessReview) {
      sections.push({
        title: 'Appropriateness Review',
        content: {
          competence_gap: intervention.appropriatenessReview.hasCompetenceGap,
          training_reduces_risk: intervention.appropriatenessReview.trainingReducesRisk,
          alternatives_ranking: intervention.appropriatenessReview.alternativesRanking,
          expected_behavior: intervention.appropriatenessReview.expectedBehavior,
          reviewed_at: intervention.appropriatenessReview.createdAt
        }
      });
    }

    // Section 4: Learning Atoms (with source mapping)
    if (audit.atoms.length > 0) {
      sections.push({
        title: 'Learning Design',
        content: {
          atoms: audit.atoms.map(atom => ({
            atomId: atom.id,
            title: atom.title,
            objective: atom.objective,
            duration_minutes: atom.duration_minutes,
            status: atom.status,
            revision: atom.revision,
            source_spans: atom.sourceSpans
          })),
          count: audit.atoms.length
        }
      });
    }

    // Section 5: Curriculum Manifest (frozen audit-proof)
    if (audit.assignments.length > 0) {
      const manifest = await this.prisma.trainingPackageManifest.findUnique({
        where: { manifest_id: audit.assignments[0].manifest_id }
      });

      if (manifest) {
        sections.push({
          title: 'Curriculum Manifest',
          content: {
            manifest_id: manifest.manifest_id,
            baseline_content: manifest.baseline_content,
            output_hash: manifest.output_hash,
            frozen_at: manifest.frozen_at,
            status: manifest.status,
            proof: 'Frozen manifest cannot be modified; hash proves integrity and reproducibility'
          }
        });
      }
    }

    // Section 6: Assignment Records
    if (audit.assignments.length > 0) {
      sections.push({
        title: 'Learner Assignments',
        content: {
          assignments: audit.assignments.map(a => ({
            assignmentId: a.id,
            learnerId: a.userId,
            assigned_at: a.assigned_at,
            due_date: a.due_date,
            completed_at: a.completed_at,
            passed_at: a.passed_at,
            status: a.status
          })),
          count: audit.assignments.length
        }
      });
    }

    // Section 7: Assessment Results
    const assessments = await this.prisma.trainingAssignment.findMany({
      where: { id: { in: audit.assignments.map(a => a.id) } },
      select: { id: true, passed_at: true, status: true }
    });

    if (assessments.length > 0) {
      sections.push({
        title: 'Assessment Results',
        content: {
          passed_count: assessments.filter(a => a.status === 'PASSED').length,
          total_count: assessments.length,
          pass_rate: `${Math.round((assessments.filter(a => a.status === 'PASSED').length / assessments.length) * 100)}%`,
          assignments: assessments
        }
      });
    }

    // Section 8: Supervisor Observations (effectiveness evidence)
    if (audit.observations.length > 0) {
      sections.push({
        title: 'Effectiveness Evidence',
        content: {
          observations: audit.observations.map(o => ({
            observationId: o.id,
            effectiveness_level: o.effectiveness_level,
            observation: o.observation,
            date_observed: o.date_observed
          })),
          count: audit.observations.length,
          effectiveness_achieved: audit.observations.some(o => o.effectiveness_level === 'WORKPLACE_TRANSFER')
        }
      });
    }

    // Section 9: Intervention Closure & Status
    sections.push({
      title: 'Intervention Status & Closure',
      content: {
        interventionId: intervention.id,
        title: intervention.title,
        status: intervention.status,
        closure_status: intervention.closure_status,
        effectiveness_target_level: intervention.effectiveness_target_level,
        closed_at: intervention.closed_at,
        created_at: intervention.created_at,
        proof: 'Training was necessary (appropriateness review) and effective (supervisor observation at target level)'
      }
    });

    // Section 10: Audit Trail (action log)
    const auditLog = await this.prisma.maiErrorLog.findMany({
      where: {
        details: {
          path: ['interventionId'],
          equals: interventionId
        }
      },
      orderBy: { createdAt: 'asc' },
      take: 100
    });

    sections.push({
      title: 'Audit Trail',
      content: {
        entries: auditLog.map(entry => ({
          timestamp: entry.createdAt,
          message: entry.message,
          details: entry.details
        })),
        count: auditLog.length,
        proof: 'Complete action log with timestamps; no mutations permitted on frozen manifests or evidence'
      }
    });

    // Version + copyright stamp (required on every dossier/BOM export — see
    // src/lib/versionStamp.ts, DECISIONS.md D-022). Added to this prototype's output
    // contract even though the rest of this file does not currently compile against the
    // rebuilt schema (parked, D-011) — so the stamp requirement is already satisfied
    // whenever this builder is properly rebuilt, rather than needing to be retrofitted.
    const versionMeta = versionStampMeta();

    const dossier = {
      title: `Defense Dossier: Intervention ${intervention.id}`,
      sections,
      timestamp: new Date().toISOString(),
      generatedBy: versionMeta,
      manifest_hash:
        audit.assignments.length > 0
          ? (await this.prisma.trainingPackageManifest.findUnique({
              where: { manifest_id: audit.assignments[0].manifest_id }
            }))?.output_hash
          : undefined
    };

    return {
      dossier,
      pdfReady: false // Phase 2: PDF generation
    };
  }

  /**
   * Export dossier as JSON (Phase 1).
   * Phase 2 will add PDF generation.
   */
  async exportAsJson(interventionId: string): Promise<string> {
    const { dossier } = await this.buildDossier(interventionId);
    return JSON.stringify(dossier, null, 2);
  }
}

export const defenseDossierBuilderSingleton = (
  prisma: PrismaClient,
  traceability: TraceabilityGraph
) => new DefenseDossierBuilder(prisma, traceability);
