/**
 * Bulk Training Script
 * Load training examples from templates to rapidly train the parser
 * 
 * Usage: node src/scripts/bulk-train-parser.js AS9100D
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

// AS9100D Training Examples
const AS9100D_EXAMPLES = [
  {
    type: 'requirement',
    keywords: ['organization', 'establish', 'maintain', 'configuration', 'management', 'product', 'identification', 'traceability', 'shall']
  },
  {
    type: 'requirement',
    keywords: ['organization', 'establish', 'procedures', 'prevent', 'counterfeit', 'suspect', 'parts', 'shall']
  },
  {
    type: 'requirement',
    keywords: ['organization', 'establish', 'procedures', 'control', 'foreign', 'object', 'debris', 'product', 'safety', 'shall']
  },
  {
    type: 'requirement',
    keywords: ['organization', 'establish', 'procedures', 'tool', 'equipment', 'control', 'calibration', 'maintenance', 'shall']
  },
  {
    type: 'requirement',
    keywords: ['organization', 'ensure', 'persons', 'competent', 'appropriate', 'education', 'training', 'experience', 'shall']
  },
  {
    type: 'requirement',
    keywords: ['organization', 'determine', 'provide', 'resources', 'establishment', 'implementation', 'improvement', 'QMS', 'shall']
  },
  {
    type: 'requirement',
    keywords: ['top', 'management', 'assign', 'responsibility', 'authority', 'QMS', 'conforms', 'shall']
  },
  {
    type: 'requirement',
    keywords: ['organization', 'determine', 'risks', 'opportunities', 'addressed', 'shall']
  }
];

// ISO 9001 Training Examples
const ISO9001_EXAMPLES = [
  {
    type: 'requirement',
    keywords: ['organization', 'determine', 'external', 'internal', 'issues', 'purpose', 'strategic', 'direction', 'shall']
  },
  {
    type: 'requirement',
    keywords: ['top', 'management', 'assign', 'responsibility', 'authority', 'QMS', 'conforms', 'shall']
  },
  {
    type: 'requirement',
    keywords: ['top', 'management', 'quality', 'policy', 'establish', 'appropriate', 'purpose', 'strategic', 'direction', 'shall']
  },
  {
    type: 'requirement',
    keywords: ['organization', 'determine', 'risks', 'opportunities', 'addressed', 'shall']
  },
  {
    type: 'requirement',
    keywords: ['organization', 'determine', 'provide', 'resources', 'establishment', 'implementation', 'improvement', 'QMS', 'shall']
  },
  {
    type: 'requirement',
    keywords: ['organization', 'ensure', 'persons', 'competent', 'appropriate', 'education', 'training', 'experience', 'shall']
  },
  {
    type: 'requirement',
    keywords: ['organization', 'retain', 'documented', 'information', 'conformity', 'necessary', 'shall']
  }
];

// FAA Part 21 Training Examples
const FAA_PART21_EXAMPLES = [
  {
    type: 'requirement',
    keywords: ['applicant', 'adequate', 'facilities', 'design', 'manufacturing', 'processing', 'certification', 'shall']
  },
  {
    type: 'requirement',
    keywords: ['person', 'perform', 'activity', 'regulated', 'approved', 'FAA', 'shall', 'not']
  },
  {
    type: 'requirement',
    keywords: ['applicant', 'demonstrate', 'design', 'method', 'manufacture', 'result', 'conforms', 'shall']
  },
  {
    type: 'requirement',
    keywords: ['applicant', 'establish', 'maintain', 'system', 'changes', 'design', 'evaluated', 'shall']
  },
  {
    type: 'requirement',
    keywords: ['applicant', 'establish', 'quality', 'assurance', 'system', 'manufacturing', 'shall']
  },
  {
    type: 'requirement',
    keywords: ['applicant', 'maintain', 'traceability', 'changes', 'approved', 'design', 'shall']
  }
];

const TRAINING_DATA = {
  'AS9100D': AS9100D_EXAMPLES,
  'AS9100': AS9100D_EXAMPLES,
  'ISO9001': ISO9001_EXAMPLES,
  'ISO 9001': ISO9001_EXAMPLES,
  'FAA_PART21': FAA_PART21_EXAMPLES,
  'FAA Part 21': FAA_PART21_EXAMPLES
};

async function bulkTrain(standardCode) {
  const examples = TRAINING_DATA[standardCode] || TRAINING_DATA[standardCode.toUpperCase()];
  
  if (!examples) {
    console.error(`❌ No training examples found for standard: ${standardCode}`);
    console.log(`Available standards: ${Object.keys(TRAINING_DATA).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n🚀 Bulk Training Parser for: ${standardCode}`);
  console.log(`   Examples: ${examples.length}`);
  console.log(`   API: ${API_BASE}\n`);

  try {
    const response = await axios.post(`${API_BASE}/api/parser/train`, {
      standardCode: standardCode,
      examples: examples
    });

    if (response.data.success) {
      console.log(`✅ Training completed successfully!`);
      console.log(`   Examples trained: ${response.data.examplesTrained}`);
      console.log(`   Total keywords: ${response.data.totalKeywords}`);
      console.log(`   Total patterns: ${response.data.totalPatterns}`);
      console.log(`\n📊 Next steps:`);
      console.log(`   1. Re-parse your ${standardCode} standard`);
      console.log(`   2. Check accuracy: GET ${API_BASE}/api/parser/accuracy/${standardCode}`);
      console.log(`   3. Validate extractions and submit feedback\n`);
    } else {
      console.error(`❌ Training failed:`, response.data.error);
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error during training:`, error.message);
    if (error.response) {
      console.error(`   Response:`, error.response.data);
    }
    process.exit(1);
  }
}

// Run if called directly
const standardCode = process.argv[2];
if (standardCode) {
  bulkTrain(standardCode);
} else {
  console.log('Usage: node src/scripts/bulk-train-parser.js <STANDARD_CODE>');
  console.log('\nAvailable standards:');
  Object.keys(TRAINING_DATA).forEach(code => {
    console.log(`  - ${code} (${TRAINING_DATA[code].length} examples)`);
  });
  process.exit(1);
}

export { bulkTrain, TRAINING_DATA };

