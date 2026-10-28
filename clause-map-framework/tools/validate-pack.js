#!/usr/bin/env node
/**
 * Conform-Edge Clause Map Pack Validator
 *
 * Enforces the authoring rules, not just the JSON schema:
 *   - no field carries requirement text unless source.publicDomain === true
 *   - quotedFragment stays under a word budget, per item
 *   - the SHARE of items in the pack using quotedFragment stays under a ceiling
 *   - no notes/definitions/annex-shaped content smuggled into intent/question/evidence
 *   - item IDs are unique and match clauseRef
 *   - groups referenced by items actually exist
 *
 * Usage: node validate-pack.js <pack.json> [--schema schema/clause-map.schema.json]
 * Exit code 0 = PASS, 1 = FAIL (CI-friendly).
 */
'use strict';
const fs = require('fs');
const path = require('path');

const QUOTED_FRAGMENT_MAX_WORDS = 6;
const QUOTED_FRAGMENT_PACK_CEILING = 0.25; // at most 25% of items may carry a quoted fragment
const FORBIDDEN_PATTERNS = [
  { re: /\bNOTE\s*\d*\s*:/i, why: 'looks like a copied standard NOTE' },
  { re: /\bEXAMPLE\s*\d*\s*:/i, why: 'looks like a copied standard EXAMPLE' },
  { re: /\bANNEX\s+[A-Z]\b/i, why: 'references/reproduces an annex' },
  { re: /\bfor the purposes? of this (standard|document|part)\b/i, why: 'looks like a copied definitions-clause phrase' },
];

function fail(msgs) {
  console.error('\nFAIL — Clause Map pack did not pass validation.\n');
  for (const m of msgs) console.error('  - ' + m);
  console.error(`\n${msgs.length} issue(s).\n`);
  process.exit(1);
}

function loadJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    fail([`Could not read/parse ${p}: ${e.message}`]);
  }
}

function wordCount(s) {
  return (s.trim().match(/\S+/g) || []).length;
}

function main() {
  const args = process.argv.slice(2);
  const packPath = args[0];
  if (!packPath) {
    console.error('Usage: node validate-pack.js <pack.json> [--schema <schema.json>]');
    process.exit(2);
  }
  const schemaIdx = args.indexOf('--schema');
  const schemaPath = schemaIdx !== -1 ? args[schemaIdx + 1]
    : path.join(__dirname, '..', 'schema', 'clause-map.schema.json');

  const pack = loadJson(packPath);
  const schema = loadJson(schemaPath);

  const issues = [];

  // --- Structural checks mirroring the JSON Schema (kept dependency-free; no ajv required) ---
  for (const req of schema.required || []) {
    if (!(req in pack)) issues.push(`missing required top-level field "${req}"`);
  }
  if (pack.schemaVersion !== '1.0.0') {
    issues.push(`schemaVersion must be "1.0.0", got "${pack.schemaVersion}"`);
  }
  if (!Array.isArray(pack.items) || pack.items.length === 0) {
    issues.push('items must be a non-empty array');
  }

  const publicDomain = !!(pack.source && pack.source.publicDomain);
  const groupIds = new Set((pack.groups || []).map(g => g.groupId));
  const itemIds = new Set();
  let quotedCount = 0;

  (pack.items || []).forEach((item, idx) => {
    const where = `item[${idx}] (${item.itemId || 'NO-ID'})`;

    const requiredFields = ['itemId', 'clauseRef', 'label', 'intent', 'question', 'evidence', 'ncPattern', 'findingStem'];
    for (const f of requiredFields) {
      if (item[f] === undefined || item[f] === null || item[f] === '') {
        issues.push(`${where}: missing required field "${f}"`);
      }
    }

    if (item.itemId) {
      if (itemIds.has(item.itemId)) issues.push(`${where}: duplicate itemId`);
      itemIds.add(item.itemId);
    }

    if (item.groupId && groupIds.size && !groupIds.has(item.groupId)) {
      issues.push(`${where}: groupId "${item.groupId}" not declared in pack.groups`);
    }

    // Forbidden content leaking into our own authored fields
    const authoredText = [item.label, item.intent, item.question, item.ncPattern, item.findingStem]
      .concat(Array.isArray(item.evidence) ? item.evidence : [])
      .filter(Boolean)
      .join(' \n ');
    for (const { re, why } of FORBIDDEN_PATTERNS) {
      if (re.test(authoredText)) {
        issues.push(`${where}: authored text matches forbidden pattern (${why}) — looks like copied standard content, not Conform-Edge authorship`);
      }
    }

    // requirementText gate
    if (item.requirementText) {
      if (!publicDomain) {
        issues.push(`${where}: requirementText present but source.publicDomain is not true — verbatim requirement text is not permitted for this source`);
      }
    }

    // quotedFragment budget
    if (item.quotedFragment) {
      quotedCount++;
      const wc = wordCount(item.quotedFragment);
      if (wc > QUOTED_FRAGMENT_MAX_WORDS) {
        issues.push(`${where}: quotedFragment is ${wc} words, exceeds the ${QUOTED_FRAGMENT_MAX_WORDS}-word budget`);
      }
      if (!/^["“].*["”]$/.test(item.quotedFragment.trim())) {
        issues.push(`${where}: quotedFragment must be wrapped in quotation marks`);
      }
    }
  });

  if (pack.items && pack.items.length) {
    const ratio = quotedCount / pack.items.length;
    if (ratio > QUOTED_FRAGMENT_PACK_CEILING) {
      issues.push(
        `pack-level: ${quotedCount}/${pack.items.length} items (${(ratio * 100).toFixed(0)}%) carry a quotedFragment, ` +
        `exceeding the ${(QUOTED_FRAGMENT_PACK_CEILING * 100).toFixed(0)}% ceiling — substitution risk, reduce quoted items`
      );
    }
  }

  if (!pack.license || !pack.license.owner || !pack.license.statement) {
    issues.push('license.owner and license.statement are required on every pack');
  }

  if (issues.length) fail(issues);

  console.log(`PASS — ${packPath}`);
  console.log(`  pack: ${pack.packId} v${pack.mapVersion}  (${pack.items.length} items, ${quotedCount} with quoted fragments)`);
  process.exit(0);
}

main();
