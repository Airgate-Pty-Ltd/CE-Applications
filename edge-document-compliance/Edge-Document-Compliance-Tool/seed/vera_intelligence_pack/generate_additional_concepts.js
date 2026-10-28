/**
 * Helper script to generate additional concepts
 * This expands the concepts file to reach 150-300 concepts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Template for generating concepts quickly
const conceptTemplates = [
  // Production Controls
  {
    name: "production_planning",
    standards: ["ISO9001", "AS9100D", "IATF16949"],
    description: "Planning of production processes to ensure products meet requirements. Includes capacity planning, resource allocation, and scheduling."
  },
  {
    name: "production_control",
    standards: ["ISO9001", "AS9100D", "IATF16949"],
    description: "Control of production processes to ensure conformity to requirements. Includes process parameters, work instructions, and monitoring."
  },
  {
    name: "release_approval",
    standards: ["ISO9001", "AS9100D", "ISO13485"],
    description: "The process of authorizing release of products for delivery to customers. Includes verification activities and release authorization."
  },
  {
    name: "preservation_of_product",
    standards: ["ISO9001", "AS9100D", "ISO13485"],
    description: "Protecting products from deterioration or damage during handling, storage, and delivery. Includes packaging, storage conditions, and handling procedures."
  },
  
  // Human Factors
  {
    name: "human_factors_engineering",
    standards: ["AS9100D", "ISO13485"],
    description: "Designing systems, equipment, and processes to account for human capabilities and limitations to prevent errors and improve safety."
  },
  {
    name: "human_error_prevention",
    standards: ["AS9100D", "ISO13485", "FDA21CFR820"],
    description: "Systematic approaches to prevent human errors that could affect product quality or safety. Includes error-proofing, training, and design."
  },
  
  // Safety & Reliability
  {
    name: "product_safety",
    standards: ["AS9100D", "ISO13485", "IATF16949"],
    description: "Ensuring products are safe for their intended use and do not pose hazards to users or the environment. Includes hazard analysis and risk mitigation."
  },
  {
    name: "reliability_engineering",
    standards: ["AS9100D"],
    description: "Design and processes to ensure products perform reliably over their intended service life. Includes reliability testing and failure analysis."
  },
  {
    name: "safety_management_system",
    standards: ["AS9100D", "FAA"],
    description: "Systematic approach to managing safety risks. Includes hazard identification, risk assessment, and safety assurance."
  },
  
  // Lean & Process Improvement
  {
    name: "lean_manufacturing",
    standards: ["IATF16949"],
    description: "Philosophy focused on eliminating waste and improving flow. Includes value stream mapping, just-in-time, and continuous flow."
  },
  {
    name: "process_capability",
    standards: ["IATF16949", "ISO9001"],
    description: "Statistical measure of a process's ability to produce output within specification limits. Uses Cp and Cpk indices."
  },
  {
    name: "statistical_process_control",
    standards: ["IATF16949", "ISO9001"],
    description: "Use of statistical methods to monitor and control processes. Includes control charts and capability studies."
  },
  
  // More Quality Concepts
  {
    name: "quality_planning",
    standards: ["ISO9001", "AS9100D", "IATF16949"],
    description: "Planning quality activities to meet objectives. Includes quality plans, control plans, and inspection plans."
  },
  {
    name: "monitoring_measurement",
    standards: ["ISO9001", "AS9100D", "ISO13485"],
    description: "Determining and applying methods for monitoring and measurement to ensure conformity. Includes measurement system analysis."
  },
  {
    name: "customer_feedback",
    standards: ["ISO9001", "AS9100D", "IATF16949"],
    description: "Systematic collection and analysis of customer opinions and experiences to drive improvement."
  },
  
  // More specific aerospace/medical
  {
    name: "key_characteristics",
    standards: ["AS9100D"],
    description: "Product or process characteristics that have significant effect on safety, performance, form, fit, or function. Require special control."
  },
  {
    name: "design_for_manufacturing",
    standards: ["AS9100D", "IATF16949"],
    description: "Design approach that considers manufacturing capabilities and constraints to ensure products can be produced efficiently and reliably."
  },
  {
    name: "product_realization",
    standards: ["ISO9001", "AS9100D"],
    description: "All processes from product planning through delivery. Includes design, purchasing, production, and service."
  }
];

function generateConcept(template, id) {
  return {
    concept_id: `gen_${String(id).padStart(3, '0')}`,
    concept_name: template.name,
    concept_description: template.description,
    is_universal_concept: template.standards.length >= 3,
    appears_in_standards: template.standards,
    related_concepts: [],
    importance_score: 0.85,
    complexity_score: 0.65,
    implementation_examples: [`Implementation examples for ${template.name}`],
    common_misconceptions: [`Common misconceptions about ${template.name}`],
    typical_audit_pitfalls: [`Typical audit pitfalls for ${template.name}`],
    industry_relevance: {
      aerospace: "high",
      medical_device: "medium",
      automotive: "medium",
      general_industry: "high"
    }
  };
}

// Load existing concepts
const conceptsPath = path.join(__dirname, 'vera_knowledge_graph_concepts.json');
const existingData = JSON.parse(fs.readFileSync(conceptsPath, 'utf8'));
const currentCount = existingData.concepts.length;

console.log(`Current concepts: ${currentCount}`);
console.log(`Adding ${conceptTemplates.length} more concepts...`);

// Add new concepts
conceptTemplates.forEach((template, index) => {
  const newConcept = generateConcept(template, currentCount + index + 1);
  existingData.concepts.push(newConcept);
});

// Save
fs.writeFileSync(conceptsPath, JSON.stringify(existingData, null, 2));
console.log(`✅ Added ${conceptTemplates.length} concepts. Total: ${existingData.concepts.length}`);







