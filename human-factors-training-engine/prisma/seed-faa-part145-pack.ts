/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

/**
 * D-064: instantiates the FAA Part 145 / AC 145-10 policy pack (drafted in
 * docs/02-controlled/HF-ENGINE-POLICY-PACK-FAA-PART145-Draft1.md) as real PolicyPack /
 * PolicyPackClause / ClauseTopicMap data - the concrete proof of the spine architecture's
 * "map once, cover many packs" benefit (D-060): every HF-content clause below reuses an atom
 * already imported for the GM1 145.A.30(e) baseline (D-062). No new content is authored here.
 *
 * Per D-063, coverage is precise/direct (PolicyPackClause.mappedAtomIds), not inferred from
 * shared spine topics - each reuse below is its own explicit judgment (matching an AC 145-10
 * suggested element to the specific already-imported atom that actually teaches it), the same
 * discipline used for GM1, not an automatic topic-based shortcut.
 *
 * Created UNAPPROVED (approvedBy/approvedAt null) - Draft 1, pending owner review, matching
 * both the CAAC pack's and the GM1 pack's own "Claude drafts, owner approves" precedent.
 *
 * Run with: npm run db:seed:faa-part145-pack
 */
import { PrismaClient } from '@prisma/client';
import { toDbArray, fromDbArray } from '../src/lib/json';

const prisma = new PrismaClient();

const FAA_FRAMEWORK = '14 CFR Part 145 / AC 145-10';
const SPINE_REVISION = 1;
const DRAFT_ACTOR = 'system:seed-faa-part145-pack';

// --- Regulatory-floor clauses (mandatory program/personnel structure - no spine-topic content) ---
interface FloorClauseSeed {
  clauseNumber: string;
  clauseTitle: string;
  clauseText: string;
}
const FLOOR_CLAUSES: FloorClauseSeed[] = [
  { clauseNumber: '145.3(a)', clauseTitle: 'Accountable manager', clauseText: 'Responsibility for and authority over all Part 145 operations; primary FAA contact.' },
  { clauseNumber: '145.151', clauseTitle: 'Personnel requirements', clauseText: 'Designate AM; provide sufficient qualified personnel; determine noncertificated employees’ abilities.' },
  { clauseNumber: '145.153', clauseTitle: 'Supervisory personnel', clauseText: 'Sufficient supervisors, appropriately certificated, overseeing personnel unfamiliar with the work.' },
  { clauseNumber: '145.155', clauseTitle: 'Inspection personnel', clauseText: 'Familiarity with applicable regulations and inspection methods; proficiency with equipment; article-specific.' },
  { clauseNumber: '145.157', clauseTitle: 'Return-to-service authorization', clauseText: 'Part 65 mechanic/repairman certification; English proficiency.' },
  { clauseNumber: '145.159 / 145.160', clauseTitle: 'Repairman recommendation; former-FAA-employee cooling-off', clauseText: '65.101 eligibility for repairman recommendations; two-year cooling-off for former FAA inspectors.' },
  { clauseNumber: '145.161', clauseTitle: 'Rosters and employment summaries', clauseText: 'Management/supervisory, inspection, and RTS rosters; employment summaries; 5-business-day currency.' },
  { clauseNumber: '145.163', clauseTitle: 'FAA-approved training program', clauseText: 'Initial and recurrent training ensuring capability to perform assigned tasks; 2-year records; revision procedure.' },
  { clauseNumber: '145.165', clauseTitle: 'Hazmat training', clauseText: 'Hazmat-employer training program (49 CFR 171.8/172 Subpart H) and operator-specific hazmat authorization.' },
];

// --- HF-content clauses (AC 145-10 par. 301 suggested indoctrination elements) ---
interface HfClauseSeed {
  clauseNumber: string;
  clauseTitle: string;
  spineTopicCode: string;
  reuseAtomTitles: string[]; // must exist already, created for GM1 (D-062)
}
const HF_CLAUSES: HfClauseSeed[] = [
  { clauseNumber: 'AC145-10-HF.1', clauseTitle: 'Introduction to human factors', spineTopicCode: 'SP-01', reuseAtomTitles: ['Why Competent People Make Mistakes'] },
  { clauseNumber: 'AC145-10-HF.2', clauseTitle: 'Statistics', spineTopicCode: 'SP-14', reuseAtomTitles: [] }, // gap - matches GM1 1.2
  { clauseNumber: 'AC145-10-HF.3', clauseTitle: 'Safety culture/organizational factors', spineTopicCode: 'SP-10', reuseAtomTitles: ['Visible Commitment and Going to the Floor', 'From Pathological to Generative: The Five Rungs'] },
  { clauseNumber: 'AC145-10-HF.4', clauseTitle: 'Human error', spineTopicCode: 'SP-07', reuseAtomTitles: ['The Swiss-Cheese Model: Latent and Active Failures'] },
  { clauseNumber: 'AC145-10-HF.5', clauseTitle: 'Types of errors in maintenance task', spineTopicCode: 'SP-07', reuseAtomTitles: ['Error Types: Why Competent People Err'] },
  { clauseNumber: 'AC145-10-HF.6', clauseTitle: 'Human reliability', spineTopicCode: 'SP-07', reuseAtomTitles: ['Designing the Error Out, and the Limits of Catching It'] },
  { clauseNumber: 'AC145-10-HF.7', clauseTitle: 'Vision', spineTopicCode: 'SP-15', reuseAtomTitles: [] }, // gap - matches GM1 4.1
  { clauseNumber: 'AC145-10-HF.8', clauseTitle: 'Hearing', spineTopicCode: 'SP-15', reuseAtomTitles: [] }, // gap - matches GM1 4.2
  { clauseNumber: 'AC145-10-HF.9', clauseTitle: 'Stress', spineTopicCode: 'SP-05', reuseAtomTitles: ['Performance-Shaping Factors: The Conditions That Make Error Likely', 'Why Good People Make Errors: Human Limits'] },
  { clauseNumber: 'AC145-10-HF.10', clauseTitle: 'Situational awareness', spineTopicCode: 'SP-07', reuseAtomTitles: ['Situational Awareness: The Shared Mental Model'] },
  { clauseNumber: 'AC145-10-HF.11', clauseTitle: 'Workload management', spineTopicCode: 'SP-05', reuseAtomTitles: ['Workload and Task Management', 'Performance-Shaping Factors: The Conditions That Make Error Likely'] },
  { clauseNumber: 'AC145-10-HF.12', clauseTitle: 'Human performance and limitation', spineTopicCode: 'SP-07', reuseAtomTitles: ['Why Good People Make Errors: Human Limits'] },
];

async function main() {
  const spineTopics = await prisma.requirementSpineTopic.findMany({ where: { spineRevision: SPINE_REVISION } });
  const topicIdByCode = new Map(spineTopics.map((t) => [t.code, t.id]));

  const atoms = await prisma.learningAtom.findMany({ where: { origin: 'regulatory-baseline' }, select: { id: true, title: true } });
  const atomIdByTitle = new Map(atoms.map((a) => [a.title, a.id]));

  let pack = await prisma.policyPack.findFirst({
    where: { regulatoryFramework: FAA_FRAMEWORK, name: 'FAA 14 CFR Part 145 / AC 145-10 — Human Factors' },
  });
  let packCreated = false;
  if (!pack) {
    pack = await prisma.policyPack.create({
      data: {
        name: 'FAA 14 CFR Part 145 / AC 145-10 — Human Factors',
        regulatoryFramework: FAA_FRAMEWORK,
        regulatoryReference: '14 CFR Part 145 (ecfr.gov, verified 2026-08-07 via AQ-145) + AC 145-10 CHG 1 (advisory) — see DECISIONS.md D-064',
        spineRevision: SPINE_REVISION,
        // approvedBy/approvedAt intentionally left null: Draft 1, pending owner review
      },
    });
    packCreated = true;
  }
  console.log(`PolicyPack (FAA Part 145): ${packCreated ? 'created' : 'reused existing'} (id=${pack.id}).`);

  let clausesCreated = 0;
  let clausesUpdated = 0;
  let mapsCreated = 0;
  let mapsUpdated = 0;
  let clauseLinksAdded = 0;
  let gapClauses = 0;

  async function upsertClause(clauseNumber: string, clauseTitle: string, clauseText: string | null) {
    const existing = await prisma.policyPackClause.findFirst({ where: { packId: pack!.id, clauseNumber } });
    if (existing) {
      const row = await prisma.policyPackClause.update({ where: { id: existing.id }, data: { clauseTitle, clauseText } });
      clausesUpdated++;
      return row;
    }
    const row = await prisma.policyPackClause.create({ data: { packId: pack!.id, clauseNumber, clauseTitle, clauseText } });
    clausesCreated++;
    return row;
  }

  for (const c of FLOOR_CLAUSES) {
    await upsertClause(c.clauseNumber, c.clauseTitle, c.clauseText);
  }

  for (const c of HF_CLAUSES) {
    const clause = await upsertClause(c.clauseNumber, c.clauseTitle, null);

    const topicId = topicIdByCode.get(c.spineTopicCode);
    if (!topicId) throw new Error(`Unknown spine topic code "${c.spineTopicCode}" for clause ${c.clauseNumber}`);
    const existingMap = await prisma.clauseTopicMap.findUnique({ where: { clauseId_topicId: { clauseId: clause.id, topicId } } });
    if (existingMap) {
      await prisma.clauseTopicMap.update({ where: { id: existingMap.id }, data: { coverage: c.reuseAtomTitles.length > 0 ? 'FULL' : 'PARTIAL', mappedBy: DRAFT_ACTOR } });
      mapsUpdated++;
    } else {
      await prisma.clauseTopicMap.create({
        data: { clauseId: clause.id, topicId, coverage: c.reuseAtomTitles.length > 0 ? 'FULL' : 'PARTIAL', mappedBy: DRAFT_ACTOR },
      });
      mapsCreated++;
    }

    if (c.reuseAtomTitles.length === 0) {
      gapClauses++;
      continue;
    }

    const reuseAtomIds = c.reuseAtomTitles.map((title) => {
      const id = atomIdByTitle.get(title);
      if (!id) throw new Error(`No existing atom titled "${title}" found for FAA clause ${c.clauseNumber} - run db:seed:baseline-content first.`);
      return id;
    });

    const current = fromDbArray<string>(clause.mappedAtomIds);
    const newIds = reuseAtomIds.filter((id) => !current.includes(id));
    if (newIds.length > 0) {
      await prisma.policyPackClause.update({
        where: { id: clause.id },
        data: { mappedAtomIds: toDbArray([...current, ...newIds]) },
      });
      clauseLinksAdded += newIds.length;
    }
  }

  console.log(`PolicyPackClause: ${clausesCreated} created, ${clausesUpdated} updated (${FLOOR_CLAUSES.length} floor + ${HF_CLAUSES.length} HF-content).`);
  console.log(`ClauseTopicMap: ${mapsCreated} created, ${mapsUpdated} updated.`);
  console.log(`Direct atom reuse links added: ${clauseLinksAdded} (0 new atoms authored - all reused from the GM1 baseline import).`);
  const gapTitles = HF_CLAUSES.filter((c) => c.reuseAtomTitles.length === 0).map((c) => c.clauseTitle).join(', ');
  console.log(`Real gaps carried over from GM1: ${gapClauses} of ${HF_CLAUSES.length} HF-content clauses (${gapTitles}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
