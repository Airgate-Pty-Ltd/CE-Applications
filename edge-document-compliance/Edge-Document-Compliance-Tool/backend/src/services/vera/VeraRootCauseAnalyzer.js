/**
 * VERA Root Cause Analyzer Service
 * Guided RCA using 5-Why, Fishbone, and decision trees
 * Uses Ollama for intelligent guidance
 */

import { queryPostgres } from '../../config/databases.js';
import { v4 as uuidv4 } from 'uuid';

const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';

/**
 * Call Ollama for RCA guidance
 */
async function callOllama(prompt, systemPrompt = null) {
  try {
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(`${OLLAMA_ENDPOINT}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response || '';
  } catch (error) {
    console.error('[VERA RCA] Ollama error:', error);
    throw new Error(`Ollama request failed: ${error.message}`);
  }
}

/**
 * Analyze nonconformance and perform root cause analysis
 * @param {string} nonconformanceId - Nonconformance ID
 * @param {Object} options - Analysis options
 * @returns {Promise<Object>} RCA results
 */
export async function analyzeRootCause(nonconformanceId, options = {}) {
  try {
    // Get nonconformance details
    const ncResult = await queryPostgres(
      `SELECT * FROM public.nonconformances WHERE id = $1`,
      [nonconformanceId]
    );

    if (ncResult.rows.length === 0) {
      throw new Error(`Nonconformance not found: ${nonconformanceId}`);
    }

    const nonconformance = ncResult.rows[0];

    // Perform 5-Why analysis using Ollama
    const rcaResults = await perform5WhyAnalysis(nonconformance);

    // Generate fishbone diagram
    const fishboneData = await generateFishboneDiagram(nonconformance, rcaResults);

    // Save root cause analysis
    const rootCauseId = uuidv4();
    await queryPostgres(
      `INSERT INTO public.root_causes
       (id, nonconformance_id, analysis_method, why_level_1, why_level_2, why_level_3,
        why_level_4, why_level_5, root_cause, root_cause_category, contributing_factors,
        evidence_collected, confidence_score, fishbone_diagram)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        rootCauseId,
        nonconformanceId,
        '5why',
        rcaResults.why1,
        rcaResults.why2,
        rcaResults.why3,
        rcaResults.why4,
        rcaResults.why5,
        rcaResults.rootCause,
        rcaResults.category,
        JSON.stringify(rcaResults.contributingFactors),
        rcaResults.evidence,
        rcaResults.confidence || 0.75,
        JSON.stringify(fishboneData)
      ]
    );

    // Update nonconformance status
    await queryPostgres(
      `UPDATE public.nonconformances
       SET status = 'rca_complete', updated_at = NOW()
       WHERE id = $1`,
      [nonconformanceId]
    );

    // Generate corrective action recommendations
    const caRecommendations = await generateCorrectiveActionRecommendations(
      nonconformance,
      rcaResults
    );

    return {
      nonconformance_id: nonconformanceId,
      root_cause_id: rootCauseId,
      analysis: {
        method: '5why',
        why_levels: {
          level_1: rcaResults.why1,
          level_2: rcaResults.why2,
          level_3: rcaResults.why3,
          level_4: rcaResults.why4,
          level_5: rcaResults.why5
        },
        root_cause: rcaResults.rootCause,
        category: rcaResults.category,
        confidence: rcaResults.confidence,
        contributing_factors: rcaResults.contributingFactors,
        evidence: rcaResults.evidence
      },
      fishbone_diagram: fishboneData,
      corrective_action_recommendations: caRecommendations
    };
  } catch (error) {
    console.error('[VERA RCA] Analysis error:', error);
    throw error;
  }
}

/**
 * Perform 5-Why analysis using Ollama
 */
async function perform5WhyAnalysis(nonconformance) {
  const systemPrompt = `You are a quality expert performing root cause analysis using the 5-Why method.
For each "why", dig deeper into the underlying cause. The 5th why should reveal the true root cause.
Be specific, factual, and avoid assumptions.`;

  const prompt = `
Nonconformance Details:
Title: ${nonconformance.title}
Description: ${nonconformance.description}
Location: ${nonconformance.location || 'Not specified'}
Severity: ${nonconformance.severity}
Detected: ${nonconformance.detected_at}

Perform a 5-Why analysis. For each level, ask "Why did this happen?" and provide a specific answer.

Respond in JSON format:
{
  "why1": "First why - immediate cause",
  "why2": "Second why - underlying cause",
  "why3": "Third why - deeper cause",
  "why4": "Fourth why - systemic cause",
  "why5": "Fifth why - root cause",
  "rootCause": "Final root cause statement",
  "category": "process|training|equipment|material|environment|management",
  "confidence": 0.85,
  "contributingFactors": ["factor1", "factor2"],
  "evidence": "What evidence supports this root cause?"
}
`;

  try {
    const response = await callOllama(prompt, systemPrompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      return createFallback5Why(nonconformance);
    }

    const analysis = JSON.parse(jsonMatch[0]);
    
    // Validate required fields
    if (!analysis.why1 || !analysis.rootCause) {
      return createFallback5Why(nonconformance);
    }

    return {
      why1: analysis.why1,
      why2: analysis.why2 || 'Requires further investigation',
      why3: analysis.why3 || 'Requires further investigation',
      why4: analysis.why4 || 'Requires further investigation',
      why5: analysis.why5 || analysis.rootCause,
      rootCause: analysis.rootCause,
      category: analysis.category || 'process',
      confidence: analysis.confidence || 0.75,
      contributingFactors: analysis.contributingFactors || [],
      evidence: analysis.evidence || 'Analysis pending'
    };
  } catch (error) {
    console.error('[VERA RCA] 5-Why analysis failed, using fallback:', error);
    return createFallback5Why(nonconformance);
  }
}

/**
 * Create fallback 5-Why analysis
 */
function createFallback5Why(nonconformance) {
  return {
    why1: `The nonconformance occurred: ${nonconformance.description}`,
    why2: 'Requires investigation - AI service unavailable',
    why3: 'Requires investigation - AI service unavailable',
    why4: 'Requires investigation - AI service unavailable',
    why5: 'Root cause analysis pending - manual review required',
    rootCause: 'Root cause analysis pending - manual review required',
    category: 'process',
    confidence: 0.5,
    contributingFactors: [],
    evidence: 'Manual investigation required'
  };
}

/**
 * Generate fishbone diagram data
 */
async function generateFishboneDiagram(nonconformance, rcaResults) {
  // Fishbone categories: Man, Machine, Material, Method, Measurement, Environment
  const categories = {
    man: { label: 'People/Training', factors: [] },
    machine: { label: 'Equipment', factors: [] },
    material: { label: 'Materials', factors: [] },
    method: { label: 'Process/Method', factors: [] },
    measurement: { label: 'Measurement', factors: [] },
    environment: { label: 'Environment', factors: [] }
  };

  // Map root cause category to fishbone category
  const categoryMap = {
    'training': 'man',
    'equipment': 'machine',
    'material': 'material',
    'process': 'method',
    'environment': 'environment',
    'management': 'method'
  };

  const primaryCategory = categoryMap[rcaResults.category] || 'method';
  categories[primaryCategory].factors.push(rcaResults.rootCause);

  // Add contributing factors
  rcaResults.contributingFactors.forEach(factor => {
    // Simple categorization (in production, use more sophisticated logic)
    if (factor.toLowerCase().includes('train') || factor.toLowerCase().includes('skill')) {
      categories.man.factors.push(factor);
    } else if (factor.toLowerCase().includes('equip') || factor.toLowerCase().includes('machine')) {
      categories.machine.factors.push(factor);
    } else {
      categories[primaryCategory].factors.push(factor);
    }
  });

  return {
    effect: nonconformance.title,
    categories: Object.entries(categories).map(([key, value]) => ({
      id: key,
      label: value.label,
      factors: value.factors
    }))
  };
}

/**
 * Generate corrective action recommendations
 */
async function generateCorrectiveActionRecommendations(nonconformance, rcaResults) {
  const systemPrompt = `You are a quality expert recommending corrective actions based on root cause analysis.
Recommendations should be:
- Specific and actionable
- Address the root cause directly
- Include implementation steps
- Consider effectiveness verification`;

  const prompt = `
Nonconformance: ${nonconformance.title}
Root Cause: ${rcaResults.rootCause}
Category: ${rcaResults.category}

Generate 3-5 corrective action recommendations in JSON format:
{
  "recommendations": [
    {
      "action": "Specific action to take",
      "priority": "high|medium|low",
      "responsible": "Who should do this",
      "timeline": "Expected completion time",
      "effectiveness_verification": "How to verify this worked"
    }
  ]
}
`;

  try {
    const response = await callOllama(prompt, systemPrompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      return createFallbackRecommendations(rcaResults);
    }

    const data = JSON.parse(jsonMatch[0]);
    return data.recommendations || createFallbackRecommendations(rcaResults);
  } catch (error) {
    console.error('[VERA RCA] Recommendation generation failed:', error);
    return createFallbackRecommendations(rcaResults);
  }
}

/**
 * Create fallback recommendations
 */
function createFallbackRecommendations(rcaResults) {
  return [
    {
      action: `Address root cause: ${rcaResults.rootCause}`,
      priority: 'high',
      responsible: 'Quality Manager',
      timeline: '30 days',
      effectiveness_verification: 'Monitor for recurrence of nonconformance'
    }
  ];
}

/**
 * Create corrective action from recommendation
 */
export async function createCorrectiveAction(nonconformanceId, rootCauseId, actionData) {
  const caNumber = `CA-${Date.now()}-${uuidv4().substring(0, 8)}`;
  
  const result = await queryPostgres(
    `INSERT INTO public.corrective_actions
     (nonconformance_id, root_cause_id, ca_number, action_description, responsible_person,
      target_completion_date, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      nonconformanceId,
      rootCauseId,
      caNumber,
      actionData.action_description,
      actionData.responsible_person,
      actionData.target_completion_date,
      'planned'
    ]
  );

  // Update nonconformance status
  await queryPostgres(
    `UPDATE public.nonconformances
     SET status = 'capa_in_progress', updated_at = NOW()
     WHERE id = $1`,
    [nonconformanceId]
  );

  return result.rows[0];
}

/**
 * Verify corrective action effectiveness
 */
export async function verifyCorrectiveAction(correctiveActionId, verificationData) {
  const { effectiveness_verification, verified_by, effectiveness_score } = verificationData;

  const result = await queryPostgres(
    `UPDATE public.corrective_actions
     SET effectiveness_verification = $1, verified_by = $2, verified_at = NOW(),
         effectiveness_score = $3, status = 'verified', updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [effectiveness_verification, verified_by, effectiveness_score, correctiveActionId]
  );

  if (result.rows.length === 0) {
    throw new Error(`Corrective action not found: ${correctiveActionId}`);
  }

  const ca = result.rows[0];

  // If effective, close the nonconformance
  if (effectiveness_score >= 0.8) {
    await queryPostgres(
      `UPDATE public.nonconformances
       SET status = 'closed', updated_at = NOW()
       WHERE id = $1`,
      [ca.nonconformance_id]
    );
  }

  // Record learning event
  await queryPostgres(
    `INSERT INTO public.rca_learning_events
     (nonconformance_id, root_cause_id, corrective_action_id, learning_type,
      after_state, improvement_description)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      ca.nonconformance_id,
      ca.root_cause_id,
      correctiveActionId,
      'ca_effectiveness',
      JSON.stringify({ effectiveness_score, verified_at: new Date() }),
      `Corrective action verified with score ${effectiveness_score}`
    ]
  );

  return result.rows[0];
}

/**
 * Get RCA decision tree guidance
 */
export async function getRCAGuidance(nonconformanceId, currentStep = null) {
  // Get decision tree nodes
  const treeResult = await queryPostgres(
    `SELECT * FROM public.rca_decision_tree
     WHERE is_active = TRUE
     ORDER BY priority DESC, id
     LIMIT 10`
  );

  // For now, return basic guidance
  // In production, use the decision tree to guide the user
  return {
    current_step: currentStep || 'start',
    guidance: 'Begin by describing the nonconformance in detail. Then we will work through the 5-Why analysis.',
    next_questions: [
      'What exactly happened?',
      'When did it occur?',
      'Where did it occur?',
      'Who was involved?',
      'What was the immediate impact?'
    ]
  };
}

/**
 * Get nonconformance with RCA details
 */
export async function getNonconformanceWithRCA(nonconformanceId) {
  const ncResult = await queryPostgres(
    `SELECT * FROM public.nonconformances WHERE id = $1`,
    [nonconformanceId]
  );

  if (ncResult.rows.length === 0) {
    throw new Error(`Nonconformance not found: ${nonconformanceId}`);
  }

  const nonconformance = ncResult.rows[0];

  // Get root cause analysis
  const rcaResult = await queryPostgres(
    `SELECT * FROM public.root_causes WHERE nonconformance_id = $1`,
    [nonconformanceId]
  );

  // Get corrective actions
  const caResult = await queryPostgres(
    `SELECT * FROM public.corrective_actions WHERE nonconformance_id = $1
     ORDER BY created_at DESC`,
    [nonconformanceId]
  );

  return {
    nonconformance,
    root_cause_analysis: rcaResult.rows[0] || null,
    corrective_actions: caResult.rows
  };
}

