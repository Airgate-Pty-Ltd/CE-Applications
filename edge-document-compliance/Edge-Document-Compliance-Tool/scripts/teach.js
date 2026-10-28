/**
 * Teaching Pipeline - Orchestrates ingestion → analysis → reports
 * Bounded AI system for deterministic GAP analysis
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Note: This script is self-contained and doesn't require external services
// It implements a bounded, deterministic GAP analysis system

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
addFormats(ajv);

function loadSchema(schemaPath) {
  const fullPath = path.join(rootDir, schemaPath);
  const schema = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  const id = path.basename(schemaPath, '.json');
  ajv.addSchema(schema, id);
  return id;
}

function validate(id, data, label) {
  const v = ajv.getSchema(id);
  if (!v) throw new Error(`Schema not loaded: ${id}`);
  if (!v(data)) {
    const msg = `❌ ${label} schema validation failed:\n` + JSON.stringify(v.errors, null, 2);
    throw new Error(msg);
  }
}

function prependIPHeader(outPath, headerPath) {
  const header = fs.readFileSync(headerPath, 'utf8');
  const content = fs.readFileSync(outPath, 'utf8');
  fs.writeFileSync(outPath, `${header}\n\n${content}`, 'utf8');
}

function watermarkJSON(outPath, wmPath) {
  const data = JSON.parse(fs.readFileSync(outPath, 'utf8'));
  const wm = JSON.parse(fs.readFileSync(wmPath, 'utf8'));
  const wrapped = { watermark: wm, data };
  fs.writeFileSync(outPath, JSON.stringify(wrapped, null, 2), 'utf8');
}

function writeGapJSON(outDir, gapRows) {
  const filePath = path.join(outDir, 'gap.json');
  fs.writeFileSync(filePath, JSON.stringify(gapRows, null, 2), 'utf8');
  return filePath;
}

function writeGapCSV(outDir, gapRows) {
  if (gapRows.length === 0) {
    fs.writeFileSync(path.join(outDir, 'gap.csv'), 'clause_id,status,confidence,rationale\n', 'utf8');
    return;
  }

  const headers = Object.keys(gapRows[0]).join(',');
  const rows = gapRows.map(row => {
    return Object.values(row).map(val => {
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') return JSON.stringify(val).replace(/"/g, '""');
      return String(val).replace(/"/g, '""');
    }).join(',');
  });

  const csv = [headers, ...rows].join('\n');
  fs.writeFileSync(path.join(outDir, 'gap.csv'), csv, 'utf8');
}

function writeCoverageJSON(outDir, coverage) {
  const filePath = path.join(outDir, 'coverage.json');
  fs.writeFileSync(filePath, JSON.stringify(coverage, null, 2), 'utf8');
  return filePath;
}

async function main() {
  const standardPack = process.env.STANDARD_PACK || 'standards/as9100d/pack.yaml';
  const docsInventory = process.env.DOCS_INVENTORY || 'evidence/inventories/example-docs.json';
  const outDir = path.join(rootDir, process.env.OUT_DIR || 'out');
  const headerFile = path.join(rootDir, 'config/ip-header.txt');
  const wmFile = path.join(rootDir, 'config/ip-watermark.json');

  // Ensure output directory exists
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Load schemas
  const stdSchemaId = loadSchema('config/schemas/standard-pack.schema.json');
  const invSchemaId = loadSchema('config/schemas/evidence-inventory.schema.json');

  // Load standard pack
  const standardPackPath = path.join(rootDir, standardPack);
  const standardYaml = fs.readFileSync(standardPackPath, 'utf8');
  const standard = yaml.load(standardYaml);

  // Load evidence inventory
  const docsInventoryPath = path.join(rootDir, docsInventory);
  const evidence = JSON.parse(fs.readFileSync(docsInventoryPath, 'utf8'));

  // Validate inputs
  validate(stdSchemaId, standard, 'Standard Pack');
  validate(invSchemaId, evidence, 'Evidence Inventory');

  console.log(`✓ Loaded standard: ${standard.meta.name} ${standard.meta.version || ''}`);
  console.log(`✓ Loaded ${evidence.length} evidence documents`);

  // Extract requirements from standard clauses
  const requirements = [];
  for (const clause of standard.clauses) {
    // Extract "shall" statements
    const shallMatches = clause.text.match(/[^.!?]*(?:shall|must|will|should|may)[^.!?]*[.!?]/gi);
    if (shallMatches) {
      for (const match of shallMatches) {
        requirements.push({
          clauseId: clause.id,
          clauseTitle: clause.title,
          text: match.trim(),
          charStart: clause.char_start || 0,
          charEnd: clause.char_end || 0,
          source: {
            file: standardPack,
            clause_id: clause.id,
            char_start: clause.char_start || 0,
            char_end: clause.char_end || 0
          }
        });
      }
    } else {
      // If no explicit "shall", treat entire clause as requirement
      requirements.push({
        clauseId: clause.id,
        clauseTitle: clause.title,
        text: clause.text.trim(),
        charStart: clause.char_start || 0,
        charEnd: clause.char_end || 0,
        source: {
          file: standardPack,
          clause_id: clause.id,
          char_start: clause.char_start || 0,
          char_end: clause.char_end || 0
        }
      });
    }
  }

  console.log(`✓ Extracted ${requirements.length} requirements`);

  // Perform GAP analysis using keyword matching
  const gapRows = [];
  let covered = 0;
  let partial = 0;
  let gaps = 0;

  for (const req of requirements) {
    let bestMatch = null;
    let bestScore = 0;
    let matchedDoc = null;

    // Extract keywords from requirement
    const reqKeywords = req.text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 4)
      .slice(0, 10);

    // Match against evidence documents
    for (const doc of evidence) {
      let score = 0;
      const docText = (doc.contentSummary + ' ' + doc.keywords.join(' ')).toLowerCase();

      // Keyword matching
      for (const keyword of reqKeywords) {
        if (docText.includes(keyword)) {
          score += 0.1;
        }
      }

      // Check clause references
      if (doc.clausesReferenced && doc.clausesReferenced.includes(req.clauseId)) {
        score += 0.5;
      }

      // Check keywords array
      if (doc.keywords) {
        const matchingKeywords = doc.keywords.filter(k => 
          reqKeywords.some(rk => k.toLowerCase().includes(rk) || rk.includes(k.toLowerCase()))
        );
        score += matchingKeywords.length * 0.1;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = doc;
        matchedDoc = doc;
      }
    }

    // Determine status
    let status = 'gap';
    let rationale = 'No matching evidence found';

    if (bestScore >= 0.75) {
      status = 'covered';
      covered++;
      rationale = `Matched in ${matchedDoc.id} (${matchedDoc.title}): ${matchedDoc.contentSummary}`;
    } else if (bestScore >= 0.45) {
      status = 'partial';
      partial++;
      rationale = `Partial match in ${matchedDoc.id} (${matchedDoc.title}): score ${bestScore.toFixed(2)}`;
    } else {
      gaps++;
      rationale = `No sufficient match found. Best score: ${bestScore.toFixed(2)}`;
    }

    gapRows.push({
      clause_id: req.clauseId,
      clause_title: req.clauseTitle,
      requirement_text: req.text.substring(0, 200),
      status: status,
      confidence: bestScore,
      rationale: rationale,
      matched_document: matchedDoc ? matchedDoc.id : null,
      source: req.source
    });
  }

  // Calculate coverage
  const total = requirements.length;
  const coverage = {
    totals: {
      total: total,
      covered: covered,
      partial: partial,
      gaps: gaps
    },
    pct: {
      covered: Math.round((covered / total) * 100),
      partial: Math.round((partial / total) * 100),
      gaps: Math.round((gaps / total) * 100)
    },
    standard: {
      name: standard.meta.name,
      version: standard.meta.version || ''
    }
  };

  // Write outputs
  const gapJsonPath = writeGapJSON(outDir, gapRows);
  writeGapCSV(outDir, gapRows);
  const coverageJsonPath = writeCoverageJSON(outDir, coverage);

  // Add IP header and watermark
  prependIPHeader(path.join(outDir, 'gap.csv'), headerFile);
  watermarkJSON(gapJsonPath, wmFile);
  watermarkJSON(coverageJsonPath, wmFile);

  // Generate teaching report
  const report = `# Teaching Report

**Standard**: ${standard.meta.name} ${standard.meta.version || ''}

**Totals**: ${coverage.totals.total} requirements  

**Covered**: ${coverage.totals.covered} (${coverage.pct.covered}%)  

**Partial**: ${coverage.totals.partial} (${coverage.pct.partial}%)  

**Gaps**: ${coverage.totals.gaps} (${coverage.pct.gaps}%)

**Notes**:

- Deterministic keyword matcher used (no external APIs).

- All artifacts IP-marked and watermarked.

- See gap.json rows[].rationale for match decisions.

- Source pointers included for traceability.

`;

  fs.writeFileSync(path.join(outDir, 'teaching_report.md'), report, 'utf8');
  prependIPHeader(path.join(outDir, 'teaching_report.md'), headerFile);

  console.log('✅ Teaching pipeline complete. Artifacts in:', outDir);
  console.log(`   Coverage: ${coverage.pct.covered}% covered, ${coverage.pct.partial}% partial, ${coverage.pct.gaps}% gaps`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

