/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

/**
 * D-062: imports Annex Quality / Safety Academy training content, extracted verbatim (read-only
 * source, see DECISIONS.md D-059/D-062) into content files under prisma/baseline-content/, as
 * DRAFT LearningAtom rows for the GM1 145.A.30(e) regulatory-baseline curriculum.
 *
 * Every content file was assembled by copying the source lesson's own section AS AUTHORED - no
 * rewriting, summarizing, or "improving," only light format conversion (production/slide cues
 * dropped, headers normalized). Atoms land in DRAFT status - nothing arrives pre-approved. The
 * real atom-approval workflow (POST /api/atoms/:id/approve) is the only way any of this becomes
 * APPROVED, exactly like every other atom in this system.
 *
 * AtomTopicMap rows are created here at IMPORT time, not atom-approval time - a deliberate,
 * logged extension of the D-060 design (see D-062): the owner asked for the traceability matrix
 * to show "covered-pending-approval vs. gap" for this batch before any approval happens, which
 * requires the topic linkage to exist pre-approval. This gates atom *content-authoring intent*,
 * not atom *publication* - the human approval gate is untouched.
 *
 * Run with: npm run db:seed:baseline-content
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { toDbArray, fromDbArray } from '../lib/json';

const prisma = new PrismaClient();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_ROOT = path.join(__dirname, 'baseline-content');
const SPINE_REVISION = 1;
const IMPORT_ACTOR = 'system:seed-baseline-content';

interface ParsedAtomFile {
  atomTitle: string;
  sourceCourse: string;
  sourceFile: string;
  sourceSection: string;
  gmItems: string[];
  spineTopicCodes: string[];
  body: string;
}

function parseFrontmatter(raw: string, filePath: string): ParsedAtomFile {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error(`No frontmatter block found in ${filePath}`);
  const [, fmBlock, body] = match;

  const fields: Record<string, string> = {};
  const lines = fmBlock.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (!m) continue;
    fields[m[1]] = m[2];
  }

  const unquote = (v: string) => v.trim().replace(/^"(.*)"$/, '$1');
  const parseArray = (v: string): string[] => {
    const arrMatch = v.match(/^\[(.*)\]$/);
    if (!arrMatch) throw new Error(`Expected array value in ${filePath}: ${v}`);
    if (arrMatch[1].trim() === '') return [];
    return arrMatch[1].split(',').map((s) => unquote(s.trim()));
  };

  for (const required of ['atomTitle', 'sourceCourse', 'sourceFile', 'sourceSection', 'gmItems', 'spineTopicCodes']) {
    if (!(required in fields)) throw new Error(`Missing frontmatter field "${required}" in ${filePath}`);
  }

  return {
    atomTitle: unquote(fields.atomTitle),
    sourceCourse: unquote(fields.sourceCourse),
    sourceFile: unquote(fields.sourceFile),
    sourceSection: unquote(fields.sourceSection),
    gmItems: parseArray(fields.gmItems),
    spineTopicCodes: parseArray(fields.spineTopicCodes),
    body: body.trim(),
  };
}

function findContentFiles(): string[] {
  const results: string[] = [];
  for (const courseDir of fs.readdirSync(CONTENT_ROOT)) {
    const fullDir = path.join(CONTENT_ROOT, courseDir);
    if (!fs.statSync(fullDir).isDirectory()) continue;
    for (const file of fs.readdirSync(fullDir)) {
      if (file.endsWith('.md')) results.push(path.join(fullDir, file));
    }
  }
  return results.sort();
}

async function main() {
  const files = findContentFiles();
  if (files.length === 0) throw new Error(`No content files found under ${CONTENT_ROOT}`);

  const spineTopics = await prisma.requirementSpineTopic.findMany({ where: { spineRevision: SPINE_REVISION } });
  const topicIdByCode = new Map(spineTopics.map((t) => [t.code, t.id]));

  const gm1Pack = await prisma.policyPack.findFirst({ where: { regulatoryFramework: 'GM1 145.A.30(e)' } });
  if (!gm1Pack) throw new Error('GM1 145.A.30(e) PolicyPack not found - run db:seed:regulatory-clauses first.');
  const gm1Clauses = await prisma.policyPackClause.findMany({ where: { packId: gm1Pack.id } });
  const clauseByItemNumber = new Map(gm1Clauses.map((c) => [c.clauseNumber, c]));

  let atomsCreated = 0;
  let atomsReused = 0;
  let topicMapsCreated = 0;
  let topicMapsReused = 0;
  let clauseLinksAdded = 0;

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = parseFrontmatter(raw, filePath);

    for (const code of parsed.spineTopicCodes) {
      if (!topicIdByCode.has(code)) throw new Error(`Unknown spine topic code "${code}" referenced in ${filePath}`);
    }

    const sourceClause = `GM1 145.A.30(e) item${parsed.gmItems.length > 1 ? 's' : ''} ${parsed.gmItems.join(', ')}`;

    let atom = await prisma.learningAtom.findFirst({
      where: { title: parsed.atomTitle, origin: 'regulatory-baseline', contentSource: parsed.sourceFile },
    });
    if (atom) {
      atom = await prisma.learningAtom.update({
        where: { id: atom.id },
        data: { content: parsed.body, sourceClause, objective: parsed.atomTitle },
      });
      atomsReused++;
    } else {
      atom = await prisma.learningAtom.create({
        data: {
        tenantId: 'tenant_001',
          title: parsed.atomTitle,
          objective: parsed.atomTitle,
          format: 'micro_lesson',
          content: parsed.body,
          status: 'DRAFT',
          origin: 'regulatory-baseline',
          sourceClause,
          contentSource: parsed.sourceFile,
        },
      });
      atomsCreated++;
    }

    for (const code of parsed.spineTopicCodes) {
      const topicId = topicIdByCode.get(code)!;
      const existing = await prisma.atomTopicMap.findUnique({
        where: { atomId_topicId: { atomId: atom.id, topicId } },
      });
      if (existing) {
        topicMapsReused++;
      } else {
        await prisma.atomTopicMap.create({
          data: { atomId: atom.id, topicId, mappedBy: IMPORT_ACTOR, approvedAt: new Date() },
        });
        topicMapsCreated++;
      }
    }

    // Direct, precise clause link (PolicyPackClause.mappedAtomIds) for exactly the GM1 items
    // this atom was authored to cover - see D-063: broad spine-topic sharing among GM1's 66
    // items (many clauses per topic) makes topic-indirection alone an unreliable per-clause
    // coverage signal for a single pack's own traceability view. mappedAtomIds is precise;
    // AtomTopicMap above remains real infrastructure for future cross-pack topic reuse.
    for (const itemNumber of parsed.gmItems) {
      const clause = clauseByItemNumber.get(itemNumber);
      if (!clause) throw new Error(`No GM1 PolicyPackClause found for item "${itemNumber}" referenced in ${filePath}`);
      const current = fromDbArray<string>(clause.mappedAtomIds);
      if (!current.includes(atom.id)) {
        await prisma.policyPackClause.update({
          where: { id: clause.id },
          data: { mappedAtomIds: toDbArray([...current, atom.id]) },
        });
        clauseLinksAdded++;
        clauseByItemNumber.set(itemNumber, { ...clause, mappedAtomIds: toDbArray([...current, atom.id]) });
      }
    }
  }

  console.log(`Baseline content import: ${files.length} content files processed.`);
  console.log(`LearningAtom: ${atomsCreated} created, ${atomsReused} updated (DRAFT, origin=regulatory-baseline).`);
  console.log(`AtomTopicMap: ${topicMapsCreated} created, ${topicMapsReused} already present.`);
  console.log(`PolicyPackClause direct links (mappedAtomIds): ${clauseLinksAdded} added.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
