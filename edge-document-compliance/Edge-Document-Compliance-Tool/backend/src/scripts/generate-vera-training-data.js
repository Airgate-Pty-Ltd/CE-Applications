/**
 * Generate Vera Training Data for Deductive Reasoning
 * Creates 200 standard patterns + 200 regulatory patterns + 100 customer patterns
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const seedDir = path.join(__dirname, '../../EDCAT AIP/seed');

// Ensure directory exists
if (!fs.existsSync(seedDir)) {
  fs.mkdirSync(seedDir, { recursive: true });
}

// Common standards and variations
const standards = {
  'ISO 9001:2015': ['ISO9001', 'ISO 9001', 'iso9001', 'ISO9001:2015', 'ISO9001-2015', 'iso 9001', 'I-S-O 9001'],
  'ISO 9001:2023': ['ISO9001:2023', 'ISO 9001 2023', 'iso9001-2023'],
  'ISO 13485:2016': ['ISO13485', 'ISO 13485', 'iso13485', 'ISO13485:2016', 'ISO 13485 2016'],
  'ISO 27001:2022': ['ISO27001', 'ISO 27001', 'iso27001', 'ISO27001:2022'],
  'ISO 45001:2018': ['ISO45001', 'ISO 45001', 'iso45001', 'ISO45001:2018'],
  'AS9100D': ['AS9100', 'AS 9100', 'as9100', 'AS9100D', 'AS 9100D', 'AS-9100-D'],
  'AS9110C': ['AS9110', 'AS 9110', 'as9110', 'AS9110C'],
  'IATF 16949:2016': ['IATF16949', 'IATF 16949', 'iatf16949', 'IATF16949:2016']
};

// Common regulatory codes
const regulatory = {
  'FAA Part 21': ['FAA-PART-21', 'FAA Part 21', 'faa part 21', 'FAA21', 'FAA-21'],
  'FAA Part 145': ['FAA-PART-145', 'FAA Part 145', 'faa part 145', 'FAA145', 'FAA-145'],
  'EASA Part 145': ['EASA-PART-145', 'EASA Part 145', 'easa part 145', 'EASA145'],
  'CASA Part 21': ['CASA-PART-21', 'CASA Part 21', 'casa part 21', 'CASA21'],
  '21 CFR Part 820': ['21-CFR-820', '21 CFR 820', '21CFR820', '21CFR Part 820'],
  '21 CFR Part 11': ['21-CFR-11', '21 CFR 11', '21CFR11', '21 CFR Part 11'],
  'MDSAP': ['MDSAP', 'mdsap', 'MDSAP Audit', 'MDSAP Program']
};

/**
 * Generate broken variations of a string
 */
function generateBrokenVariations(correct) {
  const variations = [];
  
  // Missing characters
  for (let i = 0; i < correct.length; i++) {
    if (correct[i].match(/[a-z0-9]/i)) {
      variations.push(correct.slice(0, i) + correct.slice(i + 1));
    }
  }
  
  // Transposed characters
  for (let i = 0; i < correct.length - 1; i++) {
    if (correct[i] !== correct[i + 1] && correct[i].match(/[a-z0-9]/i) && correct[i + 1].match(/[a-z0-9]/i)) {
      const swapped = correct.split('');
      [swapped[i], swapped[i + 1]] = [swapped[i + 1], swapped[i]];
      variations.push(swapped.join(''));
    }
  }
  
  // Common misspellings
  const misspellings = {
    'ISO': ['I-S-O', 'ISO', 'iso', 'Iso', 'I S O'],
    '9001': ['9001', '901', '9001', '90001'],
    'AS': ['AS', 'as', 'A-S', 'A S'],
    'IATF': ['IATF', 'iatf', 'I-A-T-F', 'IAT', 'IAT-F'],
    'Part': ['Part', 'part', 'PART', 'Pt', 'pt']
  };
  
  // Number variations (missing digits)
  if (correct.match(/\d+/)) {
    const numbers = correct.match(/\d+/g);
    numbers.forEach(num => {
      if (num.length > 2) {
        variations.push(correct.replace(num, num.slice(0, -1))); // Missing last digit
        variations.push(correct.replace(num, num.slice(1))); // Missing first digit
      }
    });
  }
  
  // Case variations
  variations.push(correct.toLowerCase());
  variations.push(correct.toUpperCase());
  
  // Space variations
  if (correct.includes(' ')) {
    variations.push(correct.replace(/\s+/g, ''));
    variations.push(correct.replace(/\s+/g, '-'));
    variations.push(correct.replace(/\s+/g, '_'));
  }
  
  // Punctuation variations
  if (correct.includes(':')) {
    variations.push(correct.replace(':', ''));
    variations.push(correct.replace(':', '-'));
    variations.push(correct.replace(':', ' '));
  }
  
  return [...new Set(variations)].slice(0, 10); // Limit to 10 variations per correct form
}

/**
 * Generate standard patterns
 */
function generateStandardPatterns() {
  const examples = [];
  let count = 0;
  
  for (const [correct, variations] of Object.entries(standards)) {
    // Add correct form
    examples.push({
      broken: correct,
      correct: correct,
      intent: 'query_clause',
      pattern_type: 'exact_match'
    });
    count++;
    
    // Add variations
    for (const variant of variations) {
      if (count >= 200) break;
      examples.push({
        broken: variant,
        correct: correct,
        intent: 'query_clause',
        pattern_type: 'variation'
      });
      count++;
    }
    
    // Generate broken variations
    const brokenVars = generateBrokenVariations(correct);
    for (const broken of brokenVars) {
      if (count >= 200) break;
      if (broken !== correct && broken.length > 2) {
        examples.push({
          broken: broken,
          correct: correct,
          intent: 'query_clause',
          pattern_type: 'typo_or_missing'
        });
        count++;
      }
    }
    
    // Add clause-specific examples
    const clauses = ['4.1', '5.1', '6.1', '7.1', '8.1', '9.1', '9.2', '10.1'];
    for (const clause of clauses) {
      if (count >= 200) break;
      
      // Correct form with clause
      examples.push({
        broken: `${correct} clause ${clause}`,
        correct: correct,
        intent: 'query_clause',
        clause: clause,
        pattern_type: 'clause_query'
      });
      count++;
      
      // Broken standard name with clause
      if (variations.length > 0) {
        const brokenStandard = variations[0];
        examples.push({
          broken: `${brokenStandard} clause ${clause}`,
          correct: correct,
          intent: 'query_clause',
          clause: clause,
          pattern_type: 'broken_standard_clause'
        });
        count++;
      }
      
      // Missing spaces
      examples.push({
        broken: `${correct.replace(/\s+/g, '')}clause${clause}`,
        correct: correct,
        intent: 'query_clause',
        clause: clause,
        pattern_type: 'missing_spaces'
      });
      count++;
      
      // Partial clause
      if (count < 200 && clause.includes('.')) {
        const partialClause = clause.split('.')[0];
        examples.push({
          broken: `${correct} clause ${partialClause}`,
          correct: correct,
          intent: 'query_clause',
          clause: clause,
          pattern_type: 'partial_clause'
        });
        count++;
      }
    }
    
    if (count >= 200) break;
  }
  
  // Add common misspellings and typos
  const commonTypos = [
    { broken: 'ISO901', correct: 'ISO 9001:2015', note: 'Missing digit' },
    { broken: 'ISO900', correct: 'ISO 9001:2015', note: 'Missing last digit' },
    { broken: 'ISO 9100', correct: 'ISO 9001:2015', note: 'Wrong digit' },
    { broken: 'AS910', correct: 'AS9100D', note: 'Missing digit' },
    { broken: 'AS9000', correct: 'AS9100D', note: 'Wrong digit' },
    { broken: 'IATF 1699', correct: 'IATF 16949:2016', note: 'Missing digit' },
    { broken: 'ISO1348', correct: 'ISO 13485:2016', note: 'Missing digit' }
  ];
  
  for (const typo of commonTypos) {
    if (count >= 200) break;
    examples.push({
      broken: typo.broken,
      correct: typo.correct,
      intent: 'query_clause',
      pattern_type: 'common_typo',
      note: typo.note
    });
    count++;
  }
  
  return examples.slice(0, 200);
}

/**
 * Generate regulatory patterns
 */
function generateRegulatoryPatterns() {
  const examples = [];
  let count = 0;
  
  for (const [correct, variations] of Object.entries(regulatory)) {
    // Add correct form
    examples.push({
      broken: correct,
      correct: correct,
      intent: 'query_regulatory',
      pattern_type: 'exact_match'
    });
    count++;
    
    // Add variations
    for (const variant of variations) {
      if (count >= 200) break;
      examples.push({
        broken: variant,
        correct: correct,
        intent: 'query_regulatory',
        pattern_type: 'variation'
      });
      count++;
    }
    
    // Generate broken variations
    const brokenVars = generateBrokenVariations(correct);
    for (const broken of brokenVars) {
      if (count >= 200) break;
      if (broken !== correct && broken.length > 2) {
        examples.push({
          broken: broken,
          correct: correct,
          intent: 'query_regulatory',
          pattern_type: 'typo_or_missing'
        });
        count++;
      }
    }
    
    // Add part-specific queries
    if (correct.includes('Part')) {
      const partMatch = correct.match(/Part (\d+)/i);
      if (partMatch) {
        const partNum = partMatch[1];
        const variations = [
          `Part ${partNum}`,
          `part ${partNum}`,
          `PART ${partNum}`,
          `Pt ${partNum}`,
          `pt ${partNum}`,
          partNum,
          `P${partNum}`,
          `p${partNum}`
        ];
        
        for (const variant of variations) {
          if (count >= 200) break;
          examples.push({
            broken: variant,
            correct: correct,
            intent: 'query_regulatory',
            pattern_type: 'part_variation'
          });
          count++;
        }
      }
    }
    
    if (count >= 200) break;
  }
  
  // Add common regulatory misspellings
  const commonTypos = [
    { broken: 'FAA21', correct: 'FAA Part 21', note: 'Missing space and Part' },
    { broken: 'FAA 21', correct: 'FAA Part 21', note: 'Missing Part' },
    { broken: 'FAA-PT-21', correct: 'FAA Part 21', note: 'Abbreviated Part' },
    { broken: 'EASA 145', correct: 'EASA Part 145', note: 'Missing Part' },
    { broken: '21CFR820', correct: '21 CFR Part 820', note: 'Missing spaces' },
    { broken: 'CFR 820', correct: '21 CFR Part 820', note: 'Missing 21' },
    { broken: '21 CFR 82', correct: '21 CFR Part 820', note: 'Missing digit' }
  ];
  
  for (const typo of commonTypos) {
    if (count >= 200) break;
    examples.push({
      broken: typo.broken,
      correct: typo.correct,
      intent: 'query_regulatory',
      pattern_type: 'common_typo',
      note: typo.note
    });
    count++;
  }
  
  return examples.slice(0, 200);
}

/**
 * Generate customer request patterns
 */
function generateCustomerPatterns() {
  const examples = [];
  let count = 0;
  
  const customerIntents = [
    { broken: 'what do i need', correct: 'gap_analysis', intent: 'gap_analysis' },
    { broken: 'what am i missing', correct: 'gap_analysis', intent: 'gap_analysis' },
    { broken: 'show gaps', correct: 'gap_analysis', intent: 'gap_analysis' },
    { broken: 'check compliance', correct: 'gap_analysis', intent: 'gap_analysis' },
    { broken: 'draft procedure', correct: 'create_procedure', intent: 'create_procedure' },
    { broken: 'write procedure', correct: 'create_procedure', intent: 'create_procedure' },
    { broken: 'create doc', correct: 'create_procedure', intent: 'create_procedure' },
    { broken: 'help with', correct: 'general_query', intent: 'general_query' },
    { broken: 'tell me about', correct: 'general_query', intent: 'general_query' },
    { broken: 'explain', correct: 'general_query', intent: 'general_query' }
  ];
  
  for (const pattern of customerIntents) {
    if (count >= 100) break;
    examples.push({
      broken: pattern.broken,
      correct: pattern.correct,
      intent: pattern.intent,
      pattern_type: 'intent_pattern'
    });
    count++;
    
    // Add variations with standards
    for (const standard of Object.keys(standards).slice(0, 5)) {
      if (count >= 100) break;
      examples.push({
        broken: `${pattern.broken} ${standard}`,
        correct: standard,
        intent: pattern.intent,
        pattern_type: 'intent_with_standard'
      });
      count++;
    }
    
    // Add broken standard variations
    for (const [correct, variations] of Object.entries(standards).slice(0, 3)) {
      if (count >= 100) break;
      if (variations.length > 0) {
        examples.push({
          broken: `${pattern.broken} ${variations[0]}`,
          correct: correct,
          intent: pattern.intent,
          pattern_type: 'intent_with_broken_standard'
        });
        count++;
      }
    }
  }
  
  return examples.slice(0, 100);
}

/**
 * Main function
 */
function generateTrainingData() {
  console.log('🚀 Generating Vera Training Data...\n');
  
  // Generate standard patterns
  const standardPatterns = generateStandardPatterns();
  const standardFile = path.join(seedDir, 'vera_standard_patterns.json');
  fs.writeFileSync(standardFile, JSON.stringify({
    version: '1.0',
    type: 'standard_patterns',
    description: 'Training patterns for ISO, AS, IATF standards with broken/partial variations',
    examples: standardPatterns,
    total_examples: standardPatterns.length
  }, null, 2));
  console.log(`✓ Generated ${standardPatterns.length} standard patterns`);
  
  // Generate regulatory patterns
  const regulatoryPatterns = generateRegulatoryPatterns();
  const regulatoryFile = path.join(seedDir, 'vera_regulatory_patterns.json');
  fs.writeFileSync(regulatoryFile, JSON.stringify({
    version: '1.0',
    type: 'regulatory_patterns',
    description: 'Training patterns for FAA, EASA, CASA, FDA regulatory codes with broken/partial variations',
    examples: regulatoryPatterns,
    total_examples: regulatoryPatterns.length
  }, null, 2));
  console.log(`✓ Generated ${regulatoryPatterns.length} regulatory patterns`);
  
  // Generate customer patterns
  const customerPatterns = generateCustomerPatterns();
  const customerFile = path.join(seedDir, 'vera_customer_patterns.json');
  fs.writeFileSync(customerFile, JSON.stringify({
    version: '1.0',
    type: 'customer_patterns',
    description: 'Training patterns for customer request intents with broken/partial variations',
    examples: customerPatterns,
    total_examples: customerPatterns.length
  }, null, 2));
  console.log(`✓ Generated ${customerPatterns.length} customer patterns`);
  
  console.log(`\n✅ Total: ${standardPatterns.length + regulatoryPatterns.length + customerPatterns.length} training examples generated!`);
  console.log(`\n📁 Files created:`);
  console.log(`   - ${standardFile}`);
  console.log(`   - ${regulatoryFile}`);
  console.log(`   - ${customerFile}`);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateTrainingData();
}

export { generateTrainingData, generateStandardPatterns, generateRegulatoryPatterns, generateCustomerPatterns };

