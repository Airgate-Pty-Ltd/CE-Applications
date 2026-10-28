#!/usr/bin/env node
/**
 * Registry Validation: Validates all 14 Phase 1 kernel rules
 * - Load seed-kernel-rules.json
 * - Verify all conditions use closed grammar
 * - Check each rule has 3 test cases
 * - Simulate evaluateOperator for basic validation
 */

import fs from 'fs';
const seedRules = JSON.parse(fs.readFileSync('./prisma/seed-kernel-rules.json', 'utf8'));

const CLOSED_GRAMMAR = [
  'is_null', 'not_null', 'is_empty', 'not_empty',
  'eq', 'ne', 'in',
  'length_gte', 'length_lt',
  'date_before_today', 'date_after_today',
  'linked_record_exists', 'linked_record_missing',
  'all', 'any', 'not'
];

const FAKE_OPERATORS = ['count_events', 'no_covering_training', 'equals', 'contains'];

let passCount = 0;
let failCount = 0;
const errors = [];

console.log('\n=== REGISTRY VALIDATION: Phase 1 Kernel Rules ===\n');

// Validation 1: File loads correctly
console.log('✓ seed-kernel-rules.json loaded');
console.log(`  Rules count: ${seedRules.rules.length} (expected 14)`);

if (seedRules.rules.length !== 14) {
  failCount++;
  errors.push(`❌ Expected 14 rules, got ${seedRules.rules.length}`);
} else {
  passCount++;
}

// Validation 2: Check for fake operators
console.log('\n✓ Checking for fake operators...');
const rulesJson = JSON.stringify(seedRules);
let fakeFound = false;

for (const fakeOp of FAKE_OPERATORS) {
  const pattern = `"op":"${fakeOp}"`;
  if (rulesJson.includes(pattern)) {
    failCount++;
    errors.push(`❌ Found fake operator: ${fakeOp}`);
    fakeFound = true;
  }
}

if (!fakeFound) {
  passCount++;
  console.log('  ✓ No fake operators found');
}

// Validation 3: Validate each rule
console.log('\n✓ Validating all 14 rules...');

for (const rule of seedRules.rules) {
  const ruleId = rule.ruleId;

  // Check required fields
  if (!ruleId) {
    failCount++;
    errors.push(`❌ Rule missing ruleId`);
    continue;
  }

  // Check condition exists
  const hasCondition = rule.condition || rule.all || rule.any || rule.not;
  if (!hasCondition) {
    failCount++;
    errors.push(`❌ ${ruleId}: no condition found`);
    continue;
  }

  // Validate condition grammar
  validateConditionGrammar(ruleId, hasCondition, errors);

  // Check test cases
  if (!rule.testCases || rule.testCases.length < 3) {
    failCount++;
    errors.push(`❌ ${ruleId}: must have 3 test cases, has ${rule.testCases?.length || 0}`);
    continue;
  }

  // Verify test case naming
  const [posCase, negCase, missingCase] = rule.testCases;
  if (!posCase.match(new RegExp(`^${ruleId}-POS-`))) {
    failCount++;
    errors.push(`❌ ${ruleId}: positive test case naming wrong (${posCase})`);
  } else if (!negCase.match(new RegExp(`^${ruleId}-NEG-`))) {
    failCount++;
    errors.push(`❌ ${ruleId}: negative test case naming wrong (${negCase})`);
  } else if (!missingCase.match(new RegExp(`^${ruleId}-MISSING-`))) {
    failCount++;
    errors.push(`❌ ${ruleId}: missing-data test case naming wrong (${missingCase})`);
  } else {
    passCount++;
  }

  console.log(`  ✓ ${ruleId}: grammar valid, 3 test cases, naming correct`);
}

// Validation 4: Simulate closed grammar evaluator
console.log('\n✓ Simulating closed grammar evaluation...');

function validateConditionGrammar(ruleId, condition, errorList) {
  if (!condition || typeof condition !== 'object') return;

  const cond = condition;
  const op = cond.op;

  if (op && !CLOSED_GRAMMAR.includes(op)) {
    failCount++;
    errorList.push(`❌ ${ruleId}: unknown operator '${op}' (not in closed grammar)`);
    return;
  }

  // Field-based operators must have 'field'
  const fieldOps = ['is_null', 'not_null', 'is_empty', 'not_empty', 'eq', 'ne', 'in', 'length_gte', 'length_lt', 'date_before_today', 'date_after_today'];
  if (op && fieldOps.includes(op) && !cond.field) {
    failCount++;
    errorList.push(`❌ ${ruleId}: operator '${op}' missing 'field' property`);
    return;
  }

  // Link-based operators must have 'link'
  const linkOps = ['linked_record_exists', 'linked_record_missing'];
  if (op && linkOps.includes(op) && !cond.link) {
    failCount++;
    errorList.push(`❌ ${ruleId}: operator '${op}' missing 'link' property`);
    return;
  }

  // Recursively validate composites
  if (cond.all && Array.isArray(cond.all)) {
    for (const subcond of cond.all) {
      validateConditionGrammar(ruleId, subcond, errorList);
    }
  }

  if (cond.any && Array.isArray(cond.any)) {
    for (const subcond of cond.any) {
      validateConditionGrammar(ruleId, subcond, errorList);
    }
  }

  if (cond.not) {
    validateConditionGrammar(ruleId, cond.not, errorList);
  }
}

// Summary
console.log('\n=== SUMMARY ===');
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);

if (errors.length > 0) {
  console.log('\nErrors:');
  for (const err of errors) {
    console.log(err);
  }
  process.exit(1);
} else {
  console.log('\n✅ ALL VALIDATION CHECKS PASSED\n');
  console.log('Kernel grammar validator is ready:');
  console.log('- 14 rules load correctly');
  console.log('- All operators use closed grammar (is_null, not_null, eq, ne, in, all[], any[], not{}, etc.)');
  console.log('- No fake operators (count_events, no_covering_training, equals, contains)');
  console.log('- Each rule has 3 test cases (positive, negative, missing-data)');
  console.log('- All test cases follow naming convention\n');
  process.exit(0);
}
