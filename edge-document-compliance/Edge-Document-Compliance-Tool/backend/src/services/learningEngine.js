/**
 * LEARNING ENGINE
 * 
 * Processes user feedback and generates tuning proposals.
 * Runs as part of nightly learning cycle (learnNightly.js).
 * 
 * Responsibilities:
 * - Analyze parser performance trends
 * - Analyze gap analyzer performance trends
 * - Extract terminology patterns
 * - Propose threshold adjustments
 * - Apply safety guardrails
 * - Generate audit trail
 */

import { query, queryEdcatAI } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';

// ============================================================
// LEARNING PHASE 1: PARSER PERFORMANCE
// ============================================================

export async function analyzeParserPerformance(schemaName, lookbackDays = 30) {
  console.log(`📊 Analyzing parser performance for ${schemaName}...`);

  const result = await query(
    `SELECT 
      pt.standard_id,
      ps.code as standard_code,
      ps.name as standard_name,
      COUNT(pt.parser_trace_id) as total_traces,
      COUNT(pf.parser_feedback_id) as traces_with_feedback,
      AVG((pt.confidence_scores)[1]) as avg_confidence_before,
      AVG(pf.user_confidence_correct) as avg_confidence_after,
      (AVG(pf.user_confidence_correct) - AVG((pt.confidence_scores)[1])) as improvement_delta,
      COUNT(CASE WHEN pf.user_said_is_requirement = TRUE THEN 1 END) as correct_count,
      COUNT(CASE WHEN pf.user_said_is_requirement = FALSE THEN 1 END) as incorrect_count
    FROM ${schemaName}.parser_traces pt
    LEFT JOIN ${schemaName}.parser_feedback pf 
      ON pt.parser_trace_id = pf.parser_trace_id
    LEFT JOIN standards ps 
      ON pt.standard_id = ps.id
    WHERE pt.analyzed_at > NOW() - INTERVAL '${lookbackDays} days'
    GROUP BY pt.standard_id, ps.code, ps.name
    HAVING COUNT(pf.parser_feedback_id) >= 20
    `,
    []
  );

  const improvements = [];
  for (const row of result.rows) {
    if (row.improvement_delta && row.improvement_delta > 0.05) {
      improvements.push({
        type: 'parser',
        standard_code: row.standard_code,
        standard_id: row.standard_id,
        improvement: row.improvement_delta,
        samples: row.traces_with_feedback,
        current_confidence: row.avg_confidence_before,
        target_confidence: row.avg_confidence_after,
        correct: row.correct_count,
        incorrect: row.incorrect_count,
        reason: `Parser averaging ${row.avg_confidence_before.toFixed(2)} confidence but should be ${row.avg_confidence_after.toFixed(2)} (+${row.improvement_delta.toFixed(3)})`,
      });
    }
  }

  return improvements;
}

// ============================================================
// LEARNING PHASE 2: GAP ANALYZER PERFORMANCE
// ============================================================

export async function analyzeGapAnalyzerPerformance(
  schemaName,
  lookbackDays = 30
) {
  console.log(`📊 Analyzing gap analyzer performance for ${schemaName}...`);

  const result = await query(
    `SELECT 
      gat.standard_id,
      ps.code as standard_code,
      ps.name as standard_name,
      COUNT(gat.gap_trace_id) as total_traces,
      COUNT(gaf.gap_feedback_id) as traces_with_feedback,
      AVG(gat.match_confidence) as avg_confidence_before,
      AVG(gaf.user_confidence) as avg_confidence_after,
      (AVG(gaf.user_confidence) - AVG(gat.match_confidence)) as improvement_delta,
      COUNT(CASE WHEN gaf.user_says_covered = TRUE THEN 1 END) as correctly_identified_coverage,
      COUNT(CASE WHEN gaf.user_says_gap = TRUE THEN 1 END) as correctly_identified_gaps
    FROM ${schemaName}.gap_analysis_traces gat
    LEFT JOIN ${schemaName}.gap_analysis_feedback gaf 
      ON gat.gap_trace_id = gaf.gap_trace_id
    LEFT JOIN public.compliance_standards ps 
      ON gat.standard_id = ps.standard_id
    WHERE gat.analyzed_at > NOW() - INTERVAL '${lookbackDays} days'
    GROUP BY gat.standard_id, ps.code, ps.name
    HAVING COUNT(gaf.gap_feedback_id) >= 20
    `,
    []
  );

  const improvements = [];
  for (const row of result.rows) {
    if (row.improvement_delta && row.improvement_delta > 0.05) {
      improvements.push({
        type: 'gap_analyzer',
        standard_code: row.standard_code,
        standard_id: row.standard_id,
        improvement: row.improvement_delta,
        samples: row.traces_with_feedback,
        current_confidence: row.avg_confidence_before,
        target_confidence: row.avg_confidence_after,
        correctly_coverage: row.correctly_identified_coverage,
        correctly_gaps: row.correctly_identified_gaps,
        reason: `Gap analyzer averaging ${row.avg_confidence_before.toFixed(2)} confidence but should be ${row.avg_confidence_after.toFixed(2)} (+${row.improvement_delta.toFixed(3)})`,
      });
    }
  }

  return improvements;
}

// ============================================================
// LEARNING PHASE 3: TERMINOLOGY MAPPING
// ============================================================

export async function learnTerminology(schemaName, lookbackDays = 30) {
  console.log(`📚 Learning terminology patterns for ${schemaName}...`);

  // Find requirement-procedure pairs that user confirmed as coverage
  const result = await query(
    `SELECT 
      cr.requirement_text,
      p.procedure_text,
      COUNT(*) as frequency,
      AVG(gaf.user_confidence) as accuracy
    FROM ${schemaName}.gap_analysis_traces gat
    JOIN parsed_requirements cr 
      ON gat.requirement_id = cr.id
    JOIN ${schemaName}.procedures p 
      ON gat.procedure_id = p.procedure_id
    LEFT JOIN ${schemaName}.gap_analysis_feedback gaf 
      ON gat.gap_trace_id = gaf.gap_trace_id
    WHERE gat.analyzed_at > NOW() - INTERVAL '${lookbackDays} days'
      AND gaf.user_says_covered = TRUE
    GROUP BY cr.requirement_text, p.procedure_text
    HAVING COUNT(*) >= 3
    ORDER BY frequency DESC
    LIMIT 100`,
    []
  );

  // Extract terminology mappings
  const terminology = {};
  for (const row of result.rows) {
    const reqTerms = extractTerms(row.requirement_text);
    const procTerms = extractTerms(row.procedure_text);

    // Link terms that appear together
    for (const reqTerm of reqTerms) {
      if (!terminology[reqTerm]) {
        terminology[reqTerm] = [];
      }
      for (const procTerm of procTerms) {
        if (!terminology[reqTerm].includes(procTerm)) {
          terminology[reqTerm].push(procTerm);
        }
      }
    }
  }

  return terminology;
}

function extractTerms(text) {
  return text
    .toLowerCase()
    .split(/[\s,;:.()]+/)
    .filter((w) => w.length > 4)
    .slice(0, 15);
}

// ============================================================
// TUNING PROPOSAL & APPLICATION
// ============================================================

export async function proposeTunings(
  schemaName,
  improvements,
  analyzerType = 'parser'
) {
  console.log(
    `💡 Proposing ${improvements.length} tuning(s) for ${analyzerType}...`
  );

  const tunings = [];

  for (const improvement of improvements) {
    // Get current threshold
    const tuningTable =
      analyzerType === 'parser'
        ? 'parser_tuning'
        : 'gap_analyzer_tuning';

    const currentTuning = await query(
      `SELECT 
        confidence_threshold_full,
        confidence_threshold_partial
      FROM ${schemaName}.${tuningTable}
      WHERE standard_code = $1 AND approved = TRUE
      ORDER BY created_at DESC
      LIMIT 1`,
      [improvement.standard_code]
    );

    const currentFull =
      currentTuning.rows[0]?.confidence_threshold_full || 0.82;
    const currentPartial =
      currentTuning.rows[0]?.confidence_threshold_partial || 0.70;

    // Calculate new thresholds with safety bounds
    const newFull = applyGuardrails(
      currentFull + 0.01,
      analyzerType === 'parser' ? 0.78 : 0.75,
      analyzerType === 'parser' ? 0.88 : 0.85
    );

    const newPartial = applyGuardrails(
      currentPartial + 0.01,
      analyzerType === 'parser' ? 0.65 : 0.60,
      analyzerType === 'parser' ? 0.80 : 0.78
    );

    // Determine if auto-approved
    const shouldAutoApprove = improvement.improvement < 0.02; // Tiny changes auto-approve

    // Store tuning proposal
    const tuningId = uuidv4();
    const idColumn = analyzerType === 'parser' ? 'parser_tuning_id' : 'gap_tuning_id';
    
    await query(
      `INSERT INTO ${schemaName}.${tuningTable}
      (${idColumn}, standard_code, confidence_threshold_full, 
       confidence_threshold_partial, approved, improvement_delta, reason)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        tuningId,
        improvement.standard_code,
        newFull,
        newPartial,
        shouldAutoApprove,
        improvement.improvement,
        improvement.reason,
      ]
    );

    tunings.push({
      tuningId,
      standard_code: improvement.standard_code,
      analyzer_type: analyzerType,
      old_full: currentFull,
      new_full: newFull,
      old_partial: currentPartial,
      new_partial: newPartial,
      improvement: improvement.improvement,
      auto_approved: shouldAutoApprove,
    });

    // Record learning event
    await recordLearningEvent(
      schemaName,
      'tuning_proposed',
      null,
      null,
      improvement.improvement,
      {
        analyzer_type: analyzerType,
        standard_code: improvement.standard_code,
        tuning_id: tuningId,
        auto_approved: shouldAutoApprove,
      }
    );
  }

  return tunings;
}

export async function updateTerminologySynonyms(
  schemaName,
  terminology
) {
  console.log(`📚 Updating terminology mappings for ${schemaName}...`);

  // Update all gap_analyzer_tunings with new terminology
  for (const [term, synonyms] of Object.entries(terminology)) {
    await query(
      `UPDATE ${schemaName}.gap_analyzer_tuning
      SET terminology_synonyms = 
        COALESCE(terminology_synonyms, '{}'::jsonb) || $1::jsonb
      WHERE standard_code IS NOT NULL`,
      [JSON.stringify({ [term]: synonyms })]
    );
  }

  return Object.keys(terminology).length;
}

// ============================================================
// SAFETY GUARDRAILS
// ============================================================

function applyGuardrails(value, min, max) {
  // Clamp value to [min, max] range
  return Math.max(min, Math.min(max, value));
}

// ============================================================
// AUDIT TRAIL
// ============================================================

export async function recordLearningEvent(
  schemaName,
  eventType,
  traceId,
  feedbackId,
  improvementSignal,
  eventData
) {
  const eventId = uuidv4();

  await query(
    `INSERT INTO ${schemaName}.learning_events
    (event_id, event_type, source_trace_id, source_feedback_id,
     improvement_signal, event_data)
    VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      eventId,
      eventType,
      traceId,
      feedbackId,
      improvementSignal ? JSON.stringify(improvementSignal) : null,
      JSON.stringify(eventData),
    ]
  );

  return eventId;
}

export async function getLearningHistory(schemaName, days = 7) {
  const result = await query(
    `SELECT 
      event_type,
      COUNT(*) as count,
      AVG(CAST(improvement_signal AS DECIMAL)) as avg_improvement,
      MAX(created_at) as last_event
    FROM ${schemaName}.learning_events
    WHERE created_at > NOW() - INTERVAL '${days} days'
    GROUP BY event_type
    ORDER BY last_event DESC`,
    []
  );

  return result.rows;
}

