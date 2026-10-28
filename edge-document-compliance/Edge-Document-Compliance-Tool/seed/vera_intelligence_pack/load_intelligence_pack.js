/**
 * Vera Intelligence Expansion Pack Loader
 * 
 * Loads all intelligence data into the edcat schema tables.
 * This significantly improves Vera's reasoning and knowledge capabilities.
 * 
 * Usage: node seed/vera_intelligence_pack/load_intelligence_pack.js
 */

import { queryEdcatAI } from '../../backend/src/config/databases.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Statistics tracking
const stats = {
  concepts: { loaded: 0, skipped: 0, errors: 0 },
  relationships: { loaded: 0, skipped: 0, errors: 0 },
  enrichments: { loaded: 0, skipped: 0, errors: 0 },
  profiles: { loaded: 0, skipped: 0, errors: 0 },
  regulatory: { loaded: 0, skipped: 0, errors: 0 },
  patterns: { loaded: 0, skipped: 0, errors: 0 },
  questions: { loaded: 0, skipped: 0, errors: 0 },
  transfers: { loaded: 0, skipped: 0, errors: 0 },
  reasoning: { loaded: 0, skipped: 0, errors: 0 }
};

/**
 * Load concepts into vera_knowledge_graph_concepts
 */
async function loadConcepts() {
  try {
    const conceptsPath = path.join(__dirname, 'vera_knowledge_graph_concepts.json');
    const conceptsData = JSON.parse(fs.readFileSync(conceptsPath, 'utf8'));
    
    console.log(`\n📚 Loading ${conceptsData.concepts.length} concepts...`);
    
    for (const concept of conceptsData.concepts) {
      try {
        // Check if concept already exists
        const existing = await queryEdcatAI(
          `SELECT concept_id FROM edcat.vera_knowledge_graph_concepts WHERE concept_name = $1`,
          [concept.concept_name]
        );
        
        if (existing.rows.length > 0) {
          stats.concepts.skipped++;
          continue;
        }
        
        // Generate UUID for concept (don't use concept_id from JSON if it's a string like "gen_001")
        const conceptUuid = uuidv4();
        
        // Insert concept
        await queryEdcatAI(
          `INSERT INTO edcat.vera_knowledge_graph_concepts 
           (concept_name, concept_description, is_universal_concept, 
            appears_in_standards, related_concepts, importance_score, complexity_score,
            implementation_examples, common_misconceptions, typical_audit_pitfalls)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            concept.concept_name,
            concept.concept_description,
            concept.is_universal_concept || false,
            concept.appears_in_standards || [],
            concept.related_concepts ? JSON.stringify({ related: concept.related_concepts }) : null,
            concept.importance_score || 0.5,
            concept.complexity_score || 0.5,
            concept.implementation_examples || [],
            concept.common_misconceptions || [],
            concept.typical_audit_pitfalls || []
          ]
        );
        
        stats.concepts.loaded++;
        if (stats.concepts.loaded % 10 === 0) {
          process.stdout.write('.');
        }
      } catch (error) {
        console.error(`\n❌ Error loading concept ${concept.concept_name}:`, error.message);
        stats.concepts.errors++;
      }
    }
    
    console.log(`\n✅ Concepts: ${stats.concepts.loaded} loaded, ${stats.concepts.skipped} skipped, ${stats.concepts.errors} errors`);
  } catch (error) {
    console.error('❌ Error loading concepts:', error);
    throw error;
  }
}

/**
 * Load concept relationships
 */
async function loadRelationships() {
  try {
    const relsPath = path.join(__dirname, 'vera_concept_relationships.json');
    if (!fs.existsSync(relsPath)) {
      console.log('\n⚠️  Relationships file not found, skipping...');
      return;
    }
    
    const relsData = JSON.parse(fs.readFileSync(relsPath, 'utf8'));
    console.log(`\n🔗 Loading ${relsData.relationships?.length || 0} relationships...`);
    
    // First, get concept IDs from concept names
    const conceptMap = new Map();
    const concepts = await queryEdcatAI(
      `SELECT concept_id, concept_name FROM edcat.vera_knowledge_graph_concepts`
    );
    concepts.rows.forEach(c => conceptMap.set(c.concept_name, c.concept_id));
    
    for (const rel of relsData.relationships || []) {
      try {
        // rel.concept_id_1 and rel.concept_id_2 are actually concept names, not IDs
        const concept1Id = conceptMap.get(rel.concept_id_1);
        const concept2Id = conceptMap.get(rel.concept_id_2);
        
        if (!concept1Id || !concept2Id) {
          // Skip if concepts don't exist yet (they need to be loaded first)
          stats.relationships.skipped++;
          continue;
        }
        
        // Check if relationship already exists
        const existing = await queryEdcatAI(
          `SELECT relationship_id FROM edcat.vera_concept_relationships 
           WHERE concept_id_1 = $1 AND concept_id_2 = $2 AND relationship_type = $3`,
          [concept1Id, concept2Id, rel.relationship_type]
        );
        
        if (existing.rows.length > 0) {
          stats.relationships.skipped++;
          continue;
        }
        
        // Insert relationship
        await queryEdcatAI(
          `INSERT INTO edcat.vera_concept_relationships 
           (concept_id_1, concept_id_2, relationship_type, relationship_strength, 
            relationship_reason, supporting_requirements)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            concept1Id,
            concept2Id,
            rel.relationship_type,
            rel.relationship_strength || 0.8,
            rel.relationship_reason,
            rel.supporting_requirements ? JSON.stringify(rel.supporting_requirements) : null
          ]
        );
        
        stats.relationships.loaded++;
        if (stats.relationships.loaded % 10 === 0) {
          process.stdout.write('.');
        }
      } catch (error) {
        console.error(`\n❌ Error loading relationship:`, error.message);
        stats.relationships.errors++;
      }
    }
    
    console.log(`\n✅ Relationships: ${stats.relationships.loaded} loaded, ${stats.relationships.skipped} skipped, ${stats.relationships.errors} errors`);
  } catch (error) {
    console.error('❌ Error loading relationships:', error);
    stats.relationships.errors++;
  }
}

/**
 * Load pattern discoveries
 */
async function loadPatterns() {
  try {
    const patternsPath = path.join(__dirname, 'vera_pattern_discoveries.json');
    if (!fs.existsSync(patternsPath)) {
      console.log('\n⚠️  Patterns file not found, skipping...');
      return;
    }
    
    const patternsData = JSON.parse(fs.readFileSync(patternsPath, 'utf8'));
    console.log(`\n🔍 Loading ${patternsData.patterns?.length || 0} patterns...`);
    
    for (const pattern of patternsData.patterns || []) {
      try {
        // Check if pattern already exists
        const existing = await queryEdcatAI(
          `SELECT pattern_id FROM edcat.vera_pattern_discoveries WHERE pattern_name = $1`,
          [pattern.pattern_name]
        );
        
        if (existing.rows.length > 0) {
          stats.patterns.skipped++;
          continue;
        }
        
        // Insert pattern
        await queryEdcatAI(
          `INSERT INTO edcat.vera_pattern_discoveries 
           (pattern_name, pattern_description, pattern_type, appears_in_standards, 
            appears_in_industries, frequency_count, significance_score, interpretation, 
            vera_application, validation_confidence)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            pattern.pattern_name,
            pattern.pattern_description,
            pattern.pattern_type,
            pattern.appears_in_standards || [],
            pattern.appears_in_industries || [],
            pattern.frequency_count || 0,
            pattern.significance_score || 0.8,
            pattern.interpretation,
            pattern.vera_application,
            pattern.validation_confidence || 0.8
          ]
        );
        
        stats.patterns.loaded++;
      } catch (error) {
        console.error(`\n❌ Error loading pattern ${pattern.pattern_name}:`, error.message);
        stats.patterns.errors++;
      }
    }
    
    console.log(`✅ Patterns: ${stats.patterns.loaded} loaded, ${stats.patterns.skipped} skipped, ${stats.patterns.errors} errors`);
  } catch (error) {
    console.error('❌ Error loading patterns:', error);
    stats.patterns.errors++;
  }
}

/**
 * Load self-learning questions
 */
async function loadQuestions() {
  try {
    const questionsPath = path.join(__dirname, 'vera_self_learning_questions.json');
    if (!fs.existsSync(questionsPath)) {
      console.log('\n⚠️  Questions file not found, skipping...');
      return;
    }
    
    const questionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
    console.log(`\n❓ Loading ${questionsData.questions?.length || 0} self-learning questions...`);
    
    for (const question of questionsData.questions || []) {
      try {
        // Check if question already exists
        const existing = await queryEdcatAI(
          `SELECT question_id FROM edcat.vera_self_learning_questions WHERE question_text = $1`,
          [question.question_text]
        );
        
        if (existing.rows.length > 0) {
          stats.questions.skipped++;
          continue;
        }
        
        // Insert question
        await queryEdcatAI(
          `INSERT INTO edcat.vera_self_learning_questions 
           (question_text, question_category, triggered_by_event, learning_potential_score, 
            hypothesis, hypothesis_confidence, validation_method, is_answered, 
            cross_standard_applicability)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            question.question_text,
            question.question_category,
            question.triggered_by_event,
            question.learning_potential_score || 0.8,
            question.hypothesis,
            question.hypothesis_confidence || 0.8,
            question.validation_method,
            question.is_answered || false,
            question.cross_standard_applicability || []
          ]
        );
        
        stats.questions.loaded++;
      } catch (error) {
        console.error(`\n❌ Error loading question:`, error.message);
        stats.questions.errors++;
      }
    }
    
    console.log(`✅ Questions: ${stats.questions.loaded} loaded, ${stats.questions.skipped} skipped, ${stats.questions.errors} errors`);
  } catch (error) {
    console.error('❌ Error loading questions:', error);
    stats.questions.errors++;
  }
}

/**
 * Load regulatory lookup data
 */
async function loadRegulatory() {
  try {
    const regulatoryPath = path.join(__dirname, 'vera_regulatory_lookup.json');
    if (!fs.existsSync(regulatoryPath)) {
      console.log('\n⚠️  Regulatory file not found, skipping...');
      return;
    }
    
    const regulatoryData = JSON.parse(fs.readFileSync(regulatoryPath, 'utf8'));
    console.log(`\n📋 Loading ${regulatoryData.regulations?.length || 0} regulations...`);
    
    for (const reg of regulatoryData.regulations || []) {
      try {
        // Check if regulation already exists
        const existing = await queryEdcatAI(
          `SELECT lookup_id FROM edcat.vera_regulatory_lookup WHERE regulation_name = $1 AND country = $2`,
          [reg.regulation_name, reg.country]
        );
        
        if (existing.rows.length > 0) {
          stats.regulatory.skipped++;
          continue;
        }
        
        // Insert regulation
        await queryEdcatAI(
          `INSERT INTO edcat.vera_regulatory_lookup 
           (country, region, sub_region, industry, product_type, regulation_name, 
            regulation_type, regulatory_body, description, requirements, compliance_mandatory, 
            certification_required, certification_bodies, effective_date, compliance_deadline, 
            enforcement_date, official_source_url, guidance_documents, related_standards, 
            related_regulations)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
          [
            reg.country,
            reg.region || null,
            reg.sub_region || null,
            reg.industry,
            reg.product_type,
            reg.regulation_name,
            reg.regulation_type,
            reg.regulatory_body,
            reg.description,
            reg.requirements || [],
            reg.compliance_mandatory || false,
            reg.certification_required || false,
            reg.certification_bodies || [],
            reg.effective_date ? new Date(reg.effective_date) : null,
            reg.compliance_deadline ? new Date(reg.compliance_deadline) : null,
            reg.enforcement_date ? new Date(reg.enforcement_date) : null,
            reg.official_source_url,
            reg.guidance_documents || [],
            reg.related_standards || [],
            reg.related_regulations || []
          ]
        );
        
        stats.regulatory.loaded++;
      } catch (error) {
        console.error(`\n❌ Error loading regulation ${reg.regulation_name}:`, error.message);
        stats.regulatory.errors++;
      }
    }
    
    console.log(`✅ Regulations: ${stats.regulatory.loaded} loaded, ${stats.regulatory.skipped} skipped, ${stats.regulatory.errors} errors`);
  } catch (error) {
    console.error('❌ Error loading regulatory data:', error);
    stats.regulatory.errors++;
  }
}

/**
 * Load standard profiles
 */
async function loadStandardProfiles() {
  try {
    const profilesPath = path.join(__dirname, 'vera_standard_profiles.json');
    if (!fs.existsSync(profilesPath)) {
      console.log('\n⚠️  Standard profiles file not found, skipping...');
      return;
    }
    
    const profilesData = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
    console.log(`\n📊 Loading ${profilesData.profiles?.length || 0} standard profiles...`);
    
    for (const profile of profilesData.profiles || []) {
      try {
        // Check if profile already exists
        const existing = await queryEdcatAI(
          `SELECT profile_id FROM edcat.vera_standard_profiles WHERE standard_code = $1`,
          [profile.standard_code]
        );
        
        if (existing.rows.length > 0) {
          stats.profiles.skipped++;
          continue;
        }
        
        // Insert profile
        await queryEdcatAI(
          `INSERT INTO edcat.vera_standard_profiles 
           (standard_code, standard_full_name, vera_knowledge_summary, section_count, 
            clause_count, critical_clauses, strategic_intent, core_concept_importance, 
            typical_implementations, typical_gaps, related_standards, industry_variations, 
            vera_expertise_level)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            profile.standard_code,
            profile.standard_full_name,
            profile.vera_knowledge_summary,
            profile.section_count || 0,
            profile.clause_count || 0,
            profile.critical_clauses || [],
            profile.strategic_intent,
            profile.core_concept_importance ? JSON.stringify(profile.core_concept_importance) : null,
            profile.typical_implementations ? JSON.stringify(profile.typical_implementations) : null,
            profile.typical_gaps || [],
            profile.related_standards ? JSON.stringify(profile.related_standards) : null,
            profile.industry_variations ? JSON.stringify(profile.industry_variations) : null,
            profile.vera_expertise_level || 0.8
          ]
        );
        
        stats.profiles.loaded++;
      } catch (error) {
        console.error(`\n❌ Error loading profile ${profile.standard_code}:`, error.message);
        stats.profiles.errors++;
      }
    }
    
    console.log(`✅ Profiles: ${stats.profiles.loaded} loaded, ${stats.profiles.skipped} skipped, ${stats.profiles.errors} errors`);
  } catch (error) {
    console.error('❌ Error loading standard profiles:', error);
    stats.profiles.errors++;
  }
}

/**
 * Load transfer learning maps
 */
async function loadTransferMaps() {
  try {
    const transfersPath = path.join(__dirname, 'vera_transfer_learning_maps.json');
    if (!fs.existsSync(transfersPath)) {
      console.log('\n⚠️  Transfer maps file not found, skipping...');
      return;
    }
    
    const transfersData = JSON.parse(fs.readFileSync(transfersPath, 'utf8'));
    console.log(`\n🔄 Loading ${transfersData.transfer_maps?.length || 0} transfer learning maps...`);
    
    // Get concept IDs
    const conceptMap = new Map();
    const concepts = await queryEdcatAI(
      `SELECT concept_id, concept_name FROM edcat.vera_knowledge_graph_concepts`
    );
    concepts.rows.forEach(c => conceptMap.set(c.concept_name, c.concept_id));
    
    for (const transfer of transfersData.transfer_maps || []) {
      try {
        const sourceConceptId = transfer.source_concept_id ? conceptMap.get(transfer.source_concept_id) : null;
        const targetConceptId = transfer.target_concept_id ? conceptMap.get(transfer.target_concept_id) : null;
        
        // Check if transfer already exists
        const existing = await queryEdcatAI(
          `SELECT map_id FROM edcat.vera_transfer_learning_maps 
           WHERE source_standard = $1 AND target_standard = $2 AND source_concept_id = $3 AND target_concept_id = $4`,
          [transfer.source_standard, transfer.target_standard, sourceConceptId, targetConceptId]
        );
        
        if (existing.rows.length > 0) {
          stats.transfers.skipped++;
          continue;
        }
        
        // Insert transfer map
        await queryEdcatAI(
          `INSERT INTO edcat.vera_transfer_learning_maps 
           (source_standard, source_concept_id, source_requirement_id, target_standard, 
            target_concept_id, target_requirement_id, transfer_rule, transfer_confidence, 
            validated, validation_count, validation_accuracy)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            transfer.source_standard,
            sourceConceptId,
            transfer.source_requirement_id || null,
            transfer.target_standard,
            targetConceptId,
            transfer.target_requirement_id || null,
            transfer.transfer_rule,
            transfer.transfer_confidence || 0.8,
            transfer.validated || false,
            transfer.validation_count || 0,
            transfer.validation_accuracy || 0.8
          ]
        );
        
        stats.transfers.loaded++;
      } catch (error) {
        console.error(`\n❌ Error loading transfer map:`, error.message);
        stats.transfers.errors++;
      }
    }
    
    console.log(`✅ Transfer maps: ${stats.transfers.loaded} loaded, ${stats.transfers.skipped} skipped, ${stats.transfers.errors} errors`);
  } catch (error) {
    console.error('❌ Error loading transfer maps:', error);
    stats.transfers.errors++;
  }
}

/**
 * Load contextual enrichments
 */
async function loadEnrichments() {
  try {
    const enrichmentsPath = path.join(__dirname, 'vera_contextual_enrichment.json');
    if (!fs.existsSync(enrichmentsPath)) {
      console.log('\n⚠️  Enrichments file not found, skipping...');
      return;
    }
    
    const enrichmentsData = JSON.parse(fs.readFileSync(enrichmentsPath, 'utf8'));
    console.log(`\n📖 Loading ${enrichmentsData.enrichments?.length || 0} contextual enrichments...`);
    
    for (const enrichment of enrichmentsData.enrichments || []) {
      try {
        // Insert enrichment (requirement_id can be null for concept-level enrichments)
        await queryEdcatAI(
          `INSERT INTO edcat.vera_contextual_enrichment 
           (requirement_id, context_type, context_description, requirement_purpose, 
            affects_which_roles, if_not_met_consequences, prerequisite_requirements, 
            dependent_requirements, real_world_examples, audit_failure_frequency, 
            customer_complaint_frequency)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            enrichment.requirement_id || null,
            enrichment.context_type,
            enrichment.context_description,
            enrichment.requirement_purpose,
            enrichment.affects_which_roles || [],
            enrichment.if_not_met_consequences || [],
            enrichment.prerequisite_requirements || [],
            enrichment.dependent_requirements || [],
            enrichment.real_world_examples ? JSON.stringify(enrichment.real_world_examples) : null,
            enrichment.audit_failure_frequency || 0.5,
            enrichment.customer_complaint_frequency || 0.3
          ]
        );
        
        stats.enrichments.loaded++;
      } catch (error) {
        console.error(`\n❌ Error loading enrichment:`, error.message);
        stats.enrichments.errors++;
      }
    }
    
    console.log(`✅ Enrichments: ${stats.enrichments.loaded} loaded, ${stats.enrichments.skipped} skipped, ${stats.enrichments.errors} errors`);
  } catch (error) {
    console.error('❌ Error loading enrichments:', error);
    stats.enrichments.errors++;
  }
}

/**
 * Main loader function
 */
async function main() {
  console.log('🚀 Starting Vera Intelligence Expansion Pack Loader...\n');
  console.log('═'.repeat(60));
  
  try {
    // Verify database connection
    await queryEdcatAI('SELECT 1');
    console.log('✅ Database connection verified\n');
    
    // Load all data
    await loadConcepts();
    await loadRelationships();
    await loadPatterns();
    await loadQuestions();
    await loadRegulatory();
    await loadStandardProfiles();
    await loadTransferMaps();
    await loadEnrichments();
    
    // Print summary
    console.log('\n' + '═'.repeat(60));
    console.log('📊 LOAD SUMMARY');
    console.log('═'.repeat(60));
    console.log(`Concepts:      ${stats.concepts.loaded} loaded, ${stats.concepts.skipped} skipped, ${stats.concepts.errors} errors`);
    console.log(`Relationships: ${stats.relationships.loaded} loaded, ${stats.relationships.skipped} skipped, ${stats.relationships.errors} errors`);
    console.log(`Patterns:      ${stats.patterns.loaded} loaded, ${stats.patterns.skipped} skipped, ${stats.patterns.errors} errors`);
    console.log(`Questions:     ${stats.questions.loaded} loaded, ${stats.questions.skipped} skipped, ${stats.questions.errors} errors`);
    console.log(`Regulations:   ${stats.regulatory.loaded} loaded, ${stats.regulatory.skipped} skipped, ${stats.regulatory.errors} errors`);
    console.log(`Profiles:      ${stats.profiles.loaded} loaded, ${stats.profiles.skipped} skipped, ${stats.profiles.errors} errors`);
    console.log(`Transfers:     ${stats.transfers.loaded} loaded, ${stats.transfers.skipped} skipped, ${stats.transfers.errors} errors`);
    console.log(`Enrichments:   ${stats.enrichments.loaded} loaded, ${stats.enrichments.skipped} skipped, ${stats.enrichments.errors} errors`);
    console.log('═'.repeat(60));
    
    const totalLoaded = stats.concepts.loaded + stats.relationships.loaded + stats.patterns.loaded + 
                       stats.questions.loaded + stats.regulatory.loaded + stats.profiles.loaded + 
                       stats.transfers.loaded + stats.enrichments.loaded;
    
    console.log(`\n🎉 Total: ${totalLoaded} intelligence records loaded!`);
    console.log('✅ Intelligence pack loading complete!');
    
  } catch (error) {
    console.error('\n❌ Fatal error loading intelligence pack:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { loadConcepts, loadRelationships, loadPatterns, loadQuestions, loadRegulatory, loadStandardProfiles, loadTransferMaps, loadEnrichments };

