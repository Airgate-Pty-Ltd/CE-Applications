/**
 * Vera Audit Scenario Service
 * 
 * Generates and manages audit scenarios for training and simulation.
 * Vera acts as a world-class lead auditor coach.
 */

import { queryEdcatAI, queryPostgres } from '../../config/databases.js';
import { buildContext } from './VeraContextOrchestrator.js';
import { callVeraLLM, isLLMConfigured } from './VeraLLMBridge.js';
import { v4 as uuidv4 } from 'uuid';

export interface AuditScenarioStep {
  stepNumber: number;
  description: string;
  expectedEvidence?: string[];
  suggestedQuestions?: string[];
  commonPitfalls?: string[];
  auditorNotes?: string;
}

export interface AuditScenario {
  id?: string;
  title: string;
  standardCode: string;
  clauses: string[];
  industryContext?: string; // aerospace, medical_device, automotive...
  difficulty: "intro" | "intermediate" | "advanced";
  steps: AuditScenarioStep[];
  narrative?: string;
  learningObjectives?: string[];
  estimatedDuration?: string;
}

/**
 * Generate an audit scenario for given standard and clauses
 */
export async function generateAuditScenario(
  standardCode: string,
  clauses: string[],
  options?: {
    difficulty?: "intro" | "intermediate" | "advanced";
    tenantId?: string;
    industryContext?: string;
  }
): Promise<AuditScenario> {
  try {
    const {
      difficulty = "intermediate",
      tenantId = '00000000-0000-0000-0000-000000000000',
      industryContext
    } = options || {};

    console.log(`[VeraAuditScenario] Generating scenario for ${standardCode} clauses ${clauses.join(', ')}`);

    // Check if LLM is configured
    if (!isLLMConfigured()) {
      return generateFallbackScenario(standardCode, clauses, difficulty);
    }

    // Build context for scenario generation
    const context = await buildContext({
      tenantId,
      userMessage: `Generate audit scenario for ${standardCode} ${clauses.join(', ')}`,
      intent: 'audit_scenario_request',
      sessionId: null
    });

    // Build scenario generation prompt
    const systemPrompt = `You are a world-class lead auditor creating a realistic audit scenario for training purposes.

Generate a comprehensive audit scenario with:
1. A narrative setting (e.g., "You are auditing Receiving Inspection in a small aerospace supplier...")
2. Step-by-step audit process:
   - Opening meeting / scope definition
   - Process walk-through
   - Record sampling
   - Interview sequences
   - Closing meeting
3. For each step, provide:
   - Description of what happens
   - Expected evidence to look for
   - Suggested questions the auditor should ask
   - Common pitfalls to watch for
   - Auditor notes/considerations

Difficulty level: ${difficulty}
- intro: Simple, straightforward scenario with clear evidence
- intermediate: Some ambiguity, requires judgment calls
- advanced: Complex scenario with multiple issues, conflicting evidence

Standard: ${standardCode}
Clauses: ${clauses.join(', ')}
${industryContext ? `Industry: ${industryContext}` : ''}

Format your response as JSON:
{
  "title": "Scenario title",
  "narrative": "Opening narrative",
  "learningObjectives": ["objective1", "objective2"],
  "estimatedDuration": "2-3 hours",
  "steps": [
    {
      "stepNumber": 1,
      "description": "Step description",
      "expectedEvidence": ["evidence1", "evidence2"],
      "suggestedQuestions": ["question1", "question2"],
      "commonPitfalls": ["pitfall1"],
      "auditorNotes": "Notes for the auditor"
    }
  ]
}`;

    const contextBlocks = [
      {
        label: 'Standard Requirements',
        text: context.standardClauses?.map((c: any) => `${c.clauseNumber}: ${c.requirementText}`).join('\n\n') || 'No clauses found'
      },
      {
        label: 'Examples',
        text: context.examples?.filter((e: any) => e.isApproved).slice(0, 2).map((e: any) => `${e.title}: ${e.content}`).join('\n\n---\n\n') || 'No examples'
      }
    ];

    // Call LLM
    const llmResponse = await callVeraLLM({
      systemPrompt,
      contextBlocks,
      userMessage: `Generate an ${difficulty} audit scenario for ${standardCode} clauses ${clauses.join(', ')}`,
      intent: 'audit_scenario_request',
      tenantId
    });

    if (!llmResponse || !llmResponse.answer) {
      return generateFallbackScenario(standardCode, clauses, difficulty);
    }

    // Parse JSON response
    try {
      let jsonText = llmResponse.answer;
      const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/) || jsonText.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }

      const scenarioData = JSON.parse(jsonText.trim());

      const scenario: AuditScenario = {
        id: uuidv4(),
        title: scenarioData.title || `Audit Scenario: ${standardCode} ${clauses.join(', ')}`,
        standardCode,
        clauses,
        industryContext: industryContext || detectIndustryFromStandard(standardCode),
        difficulty,
        narrative: scenarioData.narrative,
        learningObjectives: scenarioData.learningObjectives || [],
        estimatedDuration: scenarioData.estimatedDuration || '2-3 hours',
        steps: scenarioData.steps || []
      };

      // Save scenario
      await saveScenario(scenario, tenantId);

      return scenario;

    } catch (parseError: any) {
      console.warn('[VeraAuditScenario] Failed to parse LLM response, using fallback');
      return generateFallbackScenario(standardCode, clauses, difficulty);
    }

  } catch (error: any) {
    console.error('[VeraAuditScenario] Error generating scenario:', error.message);
    return generateFallbackScenario(standardCode, clauses, options?.difficulty || 'intermediate');
  }
}

/**
 * Generate fallback scenario when LLM is not available
 */
function generateFallbackScenario(
  standardCode: string,
  clauses: string[],
  difficulty: "intro" | "intermediate" | "advanced"
): AuditScenario {
  return {
    id: uuidv4(),
    title: `Audit Scenario: ${standardCode} ${clauses.join(', ')}`,
    standardCode,
    clauses,
    difficulty,
    steps: [
      {
        stepNumber: 1,
        description: 'Opening Meeting - Define scope and objectives',
        expectedEvidence: ['Audit plan', 'Scope document', 'Previous audit reports'],
        suggestedQuestions: [
          'What is the scope of this audit?',
          'What are the key processes we will be reviewing?',
          'Who are the key personnel we need to interview?'
        ],
        commonPitfalls: ['Not clearly defining scope', 'Missing key stakeholders']
      },
      {
        stepNumber: 2,
        description: 'Process Walk-Through - Observe the process in action',
        expectedEvidence: ['Procedure documents', 'Work instructions', 'Process flow diagrams'],
        suggestedQuestions: [
          'Can you walk me through this process?',
          'How do you ensure compliance with the requirements?',
          'What records are generated?'
        ],
        commonPitfalls: ['Not observing actual practice', 'Missing nonconformities']
      },
      {
        stepNumber: 3,
        description: 'Record Sampling - Review records for evidence',
        expectedEvidence: ['Completed records', 'Training records', 'Calibration records'],
        suggestedQuestions: [
          'Can I see examples of completed records?',
          'How are records controlled?',
          'What is the retention period?'
        ],
        commonPitfalls: ['Insufficient sample size', 'Not checking record integrity']
      },
      {
        stepNumber: 4,
        description: 'Closing Meeting - Present findings and recommendations',
        expectedEvidence: ['Audit findings report', 'Nonconformity reports', 'Corrective action requests'],
        suggestedQuestions: [
          'Do you agree with these findings?',
          'What is your plan for addressing these issues?',
          'What is the timeline for corrective actions?'
        ],
        commonPitfalls: ['Not getting agreement on findings', 'Unclear corrective action requirements']
      }
    ]
  };
}

/**
 * Detect industry from standard code
 */
function detectIndustryFromStandard(standardCode: string): string {
  const upper = standardCode.toUpperCase();
  if (upper.includes('AS91') || upper.includes('FAA') || upper.includes('EASA') || upper.includes('CASA')) {
    return 'aerospace';
  }
  if (upper.includes('13485') || upper.includes('MDSAP') || upper.includes('FDA') || upper.includes('MDR')) {
    return 'medical_device';
  }
  if (upper.includes('IATF') || upper.includes('16949')) {
    return 'automotive';
  }
  return 'general';
}

/**
 * Save scenario to database
 */
async function saveScenario(scenario: AuditScenario, tenantId: string): Promise<void> {
  try {
    await queryEdcatAI(`
      INSERT INTO edcat.vera_audit_scenarios
      (id, tenant_id, title, standard_code, clauses, industry_context, difficulty, scenario_json, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        scenario_json = EXCLUDED.scenario_json,
        updated_at = NOW()
    `, [
      scenario.id,
      tenantId,
      scenario.title,
      scenario.standardCode,
      JSON.stringify(scenario.clauses),
      scenario.industryContext || null,
      scenario.difficulty,
      JSON.stringify(scenario)
    ]);

    console.log(`[VeraAuditScenario] Saved scenario: ${scenario.id}`);

  } catch (error: any) {
    console.error('[VeraAuditScenario] Error saving scenario:', error.message);
    // Non-fatal
  }
}

/**
 * List saved scenarios
 */
export async function listSavedScenarios(params: {
  tenantId?: string;
  standardCode?: string;
  difficulty?: string;
}): Promise<AuditScenario[]> {
  try {
    const {
      tenantId = '00000000-0000-0000-0000-000000000000',
      standardCode,
      difficulty
    } = params;

    let query = `
      SELECT id, title, standard_code, clauses, industry_context, difficulty, scenario_json
      FROM edcat.vera_audit_scenarios
      WHERE tenant_id = $1
    `;

    const paramsArray: any[] = [tenantId];

    if (standardCode) {
      query += ` AND standard_code = $${paramsArray.length + 1}`;
      paramsArray.push(standardCode);
    }

    if (difficulty) {
      query += ` AND difficulty = $${paramsArray.length + 1}`;
      paramsArray.push(difficulty);
    }

    query += ` ORDER BY created_at DESC LIMIT 50`;

    const result = await queryEdcatAI(query, paramsArray);

    return result.rows.map(row => {
      try {
        return JSON.parse(row.scenario_json);
      } catch {
        return {
          id: row.id,
          title: row.title,
          standardCode: row.standard_code,
          clauses: JSON.parse(row.clauses || '[]'),
          industryContext: row.industry_context,
          difficulty: row.difficulty,
          steps: []
        };
      }
    });

  } catch (error: any) {
    console.error('[VeraAuditScenario] Error listing scenarios:', error.message);
    return [];
  }
}

/**
 * Get scenario by ID
 */
export async function getScenarioById(scenarioId: string): Promise<AuditScenario | null> {
  try {
    const result = await queryEdcatAI(`
      SELECT scenario_json
      FROM edcat.vera_audit_scenarios
      WHERE id = $1
      LIMIT 1
    `, [scenarioId]);

    if (result.rows.length === 0) {
      return null;
    }

    return JSON.parse(result.rows[0].scenario_json);

  } catch (error: any) {
    console.error('[VeraAuditScenario] Error getting scenario:', error.message);
    return null;
  }
}

