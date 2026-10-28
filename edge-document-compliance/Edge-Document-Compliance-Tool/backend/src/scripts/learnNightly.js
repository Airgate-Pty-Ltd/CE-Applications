/**
 * NIGHTLY LEARNING SCRIPT
 * 
 * Scheduled job that runs daily (default: 2:30 AM)
 * Analyzes feedback, proposes tunings, learns terminology
 * 
 * Usage: node learnNightly.js
 * Or schedule via cron: 30 2 * * * node learnNightly.js
 */

import { query } from '../database/connection.js';
import {
  analyzeParserPerformance,
  analyzeGapAnalyzerPerformance,
  learnTerminology,
  proposeTunings,
  updateTerminologySynonyms,
  getLearningHistory,
} from '../services/learningEngine.js';

const LOOKBACK_DAYS = process.env.LEARN_LOOKBACK_DAYS || 30;
const MIN_SAMPLES = process.env.LEARN_MIN_SAMPLES || 20;

async function runNightlyLearning() {
  console.log(`🌙 ========================================`);
  console.log(`🌙 NIGHTLY LEARNING CYCLE STARTING...`);
  console.log(`🌙 Time: ${new Date().toISOString()}`);
  console.log(`🌙 ========================================\n`);

  try {
    // Get all customer schemas
    const schemas = await getAllCustomerSchemas();
    console.log(`📋 Found ${schemas.length} customer schemas to learn from\n`);

    let totalImprovements = 0;
    let totalTuningsProposed = 0;

    for (const schemaName of schemas) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`📚 Processing: ${schemaName}`);
      console.log(`${'='.repeat(50)}`);

      try {
        // =========== PARSER LEARNING ===========
        console.log(`\n📊 Phase 1: Analyzing Parser Performance...`);
        const parserImprovements = await analyzeParserPerformance(
          schemaName,
          LOOKBACK_DAYS
        );

        if (parserImprovements.length > 0) {
          console.log(`✅ Found ${parserImprovements.length} parser improvement(s)`);
          for (const imp of parserImprovements) {
            console.log(`   • ${imp.standard_code}: +${imp.improvement.toFixed(3)}`);
          }

          const parserTunings = await proposeTunings(
            schemaName,
            parserImprovements,
            'parser'
          );
          totalTuningsProposed += parserTunings.length;
          totalImprovements += parserImprovements.length;

          for (const tuning of parserTunings) {
            console.log(`   ✏️  Tuning proposed for ${tuning.standard_code}`);
            console.log(
              `      ${tuning.old_full.toFixed(2)} → ${tuning.new_full.toFixed(2)} ` +
              `(${tuning.auto_approved ? 'auto-approved' : 'pending approval'})`
            );
          }
        } else {
          console.log(`ℹ️  No parser improvements detected`);
        }

        // =========== GAP ANALYZER LEARNING ===========
        console.log(`\n📊 Phase 2: Analyzing Gap Analyzer Performance...`);
        const gapImprovements = await analyzeGapAnalyzerPerformance(
          schemaName,
          LOOKBACK_DAYS
        );

        if (gapImprovements.length > 0) {
          console.log(`✅ Found ${gapImprovements.length} gap analyzer improvement(s)`);
          for (const imp of gapImprovements) {
            console.log(`   • ${imp.standard_code}: +${imp.improvement.toFixed(3)}`);
          }

          const gapTunings = await proposeTunings(
            schemaName,
            gapImprovements,
            'gap_analyzer'
          );
          totalTuningsProposed += gapTunings.length;
          totalImprovements += gapImprovements.length;

          for (const tuning of gapTunings) {
            console.log(`   ✏️  Tuning proposed for ${tuning.standard_code}`);
            console.log(
              `      ${tuning.old_full.toFixed(2)} → ${tuning.new_full.toFixed(2)} ` +
              `(${tuning.auto_approved ? 'auto-approved' : 'pending approval'})`
            );
          }
        } else {
          console.log(`ℹ️  No gap analyzer improvements detected`);
        }

        // =========== TERMINOLOGY LEARNING ===========
        console.log(`\n📚 Phase 3: Learning Terminology Patterns...`);
        const terminology = await learnTerminology(schemaName, LOOKBACK_DAYS);
        const termCount = Object.keys(terminology).length;

        if (termCount > 0) {
          console.log(`✅ Learned ${termCount} new terminology patterns`);
          const updated = await updateTerminologySynonyms(
            schemaName,
            terminology
          );
          console.log(`   Updated gap analyzer tunings with new synonyms`);
        } else {
          console.log(`ℹ️  No new terminology patterns detected`);
        }

        // =========== LEARNING SUMMARY ===========
        const history = await getLearningHistory(schemaName, 7);
        console.log(`\n📈 Last 7 Days Summary:`);
        for (const event of history) {
          console.log(
            `   • ${event.event_type}: ${event.count} events, ` +
            `avg improvement: +${(event.avg_improvement || 0).toFixed(3)}`
          );
        }
      } catch (error) {
        console.error(`❌ Error processing ${schemaName}:`, error.message);
        continue; // Continue to next schema even if one fails
      }
    }

    // =========== FINAL SUMMARY ===========
    console.log(`\n${'='.repeat(50)}`);
    console.log(`✅ NIGHTLY LEARNING COMPLETE`);
    console.log(`${'='.repeat(50)}`);
    console.log(`📊 Summary:`);
    console.log(`   • Customer schemas processed: ${schemas.length}`);
    console.log(`   • Improvements detected: ${totalImprovements}`);
    console.log(`   • Tunings proposed: ${totalTuningsProposed}`);
    console.log(`   • Time: ${new Date().toISOString()}`);
    console.log(`\n🌙 Learning cycle complete. System ready for next day.\n`);

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ NIGHTLY LEARNING FAILED:`);
    console.error(error);
    process.exit(1);
  }
}

async function getAllCustomerSchemas() {
  const result = await query(
    `SELECT schema_name 
     FROM information_schema.schemata 
     WHERE schema_name LIKE 'customer_%'
     AND schema_name NOT LIKE '%_temp'
     ORDER BY schema_name`
  );

  return result.rows.map((row) => row.schema_name);
}

// Run the learning cycle
runNightlyLearning();
