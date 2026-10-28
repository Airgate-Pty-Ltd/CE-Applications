/**
 * Vera Dialogue Manager
 * 
 * Manages conversational flow, maintaining goals across turns,
 * recognizing exploration vs execution, and guiding users to better questions.
 */

import { queryEdcatAI } from '../../config/databases.js';

export interface DialogueState {
  currentGoal?: string;
  subtasks?: string[];
  mode?: 'chat' | 'audit_simulation' | 'training' | 'coaching' | 'gap_analysis' | 'skill_execution';
  guidanceLevel?: 'minimal' | 'standard' | 'coaching';
  pendingClarifications?: string[];
  conversationPath?: string[];
}

export interface DialogueAction {
  action: 'answer_directly' | 'ask_clarifying_question' | 'suggest_next_step' | 'present_summary' | 'branch_to_skill';
  message?: string;
  suggestions?: string[];
  reasoning?: string;
}

/**
 * Decide next action based on user message, current state, and intent
 */
export async function decideNextAction(params: {
  userMessage: string;
  currentState: DialogueState;
  detectedIntent: string;
  topic?: string;
  sessionId: string;
  tenantId: string;
}): Promise<DialogueAction> {
  try {
    const {
      userMessage,
      currentState,
      detectedIntent,
      topic,
      sessionId,
      tenantId
    } = params;

    const guidanceLevel = currentState.guidanceLevel || 'standard';
    const lowerMessage = userMessage.toLowerCase();

    // Check if user is exploring vs executing
    const isExploratory = detectExploratoryIntent(lowerMessage, detectedIntent);
    const isExecuting = detectExecutingIntent(lowerMessage, detectedIntent);

    // If we have a current goal and user is asking something related
    if (currentState.currentGoal && isRelatedToGoal(userMessage, currentState.currentGoal)) {
      // Continue with goal
      return {
        action: 'suggest_next_step',
        message: `Continuing with: ${currentState.currentGoal}`,
        suggestions: currentState.subtasks || [],
        reasoning: 'User is continuing an active goal'
      };
    }

    // If user is exploring (asking "what is", "how does", etc.)
    if (isExploratory && guidanceLevel !== 'minimal') {
      // Suggest structured approach
      if (topic) {
        return {
          action: 'suggest_next_step',
          message: `I can help you understand ${topic}. Would you like:`,
          suggestions: [
            `A definition and overview of ${topic}`,
            `How ${topic} applies to your standard`,
            `Examples of ${topic} in practice`,
            `Common pitfalls related to ${topic}`
          ],
          reasoning: 'Exploratory question detected - offering structured learning path'
        };
      }
    }

    // If user is executing (asking for action: "create", "generate", "draft")
    if (isExecuting) {
      // Check if we need clarification
      const missingInfo = detectMissingInformation(userMessage, detectedIntent);
      if (missingInfo.length > 0 && guidanceLevel !== 'minimal') {
        return {
          action: 'ask_clarifying_question',
          message: `To help you ${extractAction(userMessage)}, I need a bit more information:`,
          suggestions: missingInfo,
          reasoning: 'Executing intent detected but missing required information'
        };
      }

      // Route to appropriate skill
      const skillMatch = matchToSkill(detectedIntent, userMessage);
      if (skillMatch) {
        return {
          action: 'branch_to_skill',
          message: skillMatch.message,
          reasoning: `Matched to skill: ${skillMatch.skill}`
        };
      }
    }

    // If user asks vague question
    if (isVagueQuestion(userMessage) && guidanceLevel === 'coaching') {
      return {
        action: 'ask_clarifying_question',
        message: 'I want to make sure I understand what you need. Are you asking about:',
        suggestions: [
          'A specific standard or clause',
          'A process or procedure',
          'A tool or methodology',
          'An audit or compliance question',
          'Help with a specific task'
        ],
        reasoning: 'Vague question detected in coaching mode'
      };
    }

    // Default: answer directly
    return {
      action: 'answer_directly',
      reasoning: 'No special dialogue management needed'
    };

  } catch (error: any) {
    console.error('[VeraDialogueManager] Error deciding action:', error.message);
    return {
      action: 'answer_directly',
      reasoning: 'Error in dialogue manager - fallback to direct answer'
    };
  }
}

/**
 * Detect if user is exploring (learning, understanding)
 */
function detectExploratoryIntent(message: string, intent: string): boolean {
  const exploratoryPatterns = [
    /^(what|how|why|when|where|explain|tell.*about|describe|define)/i,
    /^what.*is/i,
    /^how.*work/i,
    /^why.*need/i
  ];

  const exploratoryIntents = [
    'definition_question',
    'explanation_request',
    'concept_question',
    'general_question'
  ];

  return exploratoryPatterns.some(p => p.test(message)) ||
         exploratoryIntents.includes(intent);
}

/**
 * Detect if user is executing (wanting action)
 */
function detectExecutingIntent(message: string, intent: string): boolean {
  const executingPatterns = [
    /^(create|generate|draft|make|build|write|prepare|develop)/i,
    /^(help.*me|i.*need|i.*want)/i,
    /^(show.*me|give.*me|provide)/i
  ];

  const executingIntents = [
    'audit_checklist_request',
    'corrective_action_request',
    'training_outline_request',
    'procedure_request',
    'gap_analysis_request'
  ];

  return executingPatterns.some(p => p.test(message)) ||
         executingIntents.includes(intent);
}

/**
 * Check if message is related to current goal
 */
function isRelatedToGoal(message: string, goal: string): boolean {
  const goalKeywords = goal.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const messageLower = message.toLowerCase();
  
  return goalKeywords.some(keyword => messageLower.includes(keyword));
}

/**
 * Detect missing information for executing intents
 */
function detectMissingInformation(message: string, intent: string): string[] {
  const missing: string[] = [];

  // Check for standard code
  if (!message.match(/\b(AS\d{4}|ISO\s*\d{4,5}|IATF|FAA|EASA|CASA)\b/i)) {
    if (intent.includes('audit') || intent.includes('compliance') || intent.includes('gap')) {
      missing.push('Which standard are you working with? (e.g., AS9100D, ISO 9001)');
    }
  }

  // Check for clause reference
  if (!message.match(/\d+\.\d+/)) {
    if (intent.includes('clause') || intent.includes('requirement')) {
      missing.push('Which clause or section? (e.g., 8.7, 7.5)');
    }
  }

  // Check for context
  if (message.length < 20 && intent !== 'greeting') {
    missing.push('Can you provide more context about what you need?');
  }

  return missing;
}

/**
 * Extract action verb from message
 */
function extractAction(message: string): string {
  const actionMatch = message.match(/^(create|generate|draft|make|build|write|prepare|develop|help|show|give|provide)/i);
  return actionMatch ? actionMatch[1] : 'complete this';
}

/**
 * Match intent to skill
 */
function matchToSkill(intent: string, message: string): { skill: string; message: string } | null {
  const skillMap: Record<string, { skill: string; message: string }> = {
    'audit_checklist_request': {
      skill: 'generate_audit_checklist',
      message: 'I\'ll generate an audit checklist for you.'
    },
    'corrective_action_request': {
      skill: 'draft_corrective_action_plan',
      message: 'I\'ll draft a corrective action plan template.'
    },
    'training_outline_request': {
      skill: 'generate_training_outline',
      message: 'I\'ll create a training outline for you.'
    },
    'gap_analysis_request': {
      skill: 'summarize_gaps',
      message: 'I\'ll analyze and summarize compliance gaps.'
    },
    'procedure_request': {
      skill: 'draft_procedure_outline',
      message: 'I\'ll draft a procedure outline for you.'
    }
  };

  return skillMap[intent] || null;
}

/**
 * Check if question is vague
 */
function isVagueQuestion(message: string): boolean {
  const vaguePatterns = [
    /^(help|assist|support)/i,
    /^(what|how|why)\s*$/i,
    /^tell.*me/i,
    message.length < 15 && !message.match(/\b(AS\d{4}|ISO|IATF|FAA|clause|requirement|standard)\b/i)
  ];

  return vaguePatterns.some(p => typeof p === 'boolean' ? p : p.test(message));
}

/**
 * Get or create dialogue state for session
 */
export async function getDialogueState(sessionId: string, tenantId: string): Promise<DialogueState> {
  try {
    const result = await queryEdcatAI(`
      SELECT state_data
      FROM edcat.ai_conversation_state
      WHERE session_id = $1
      LIMIT 1
    `, [sessionId]);

    if (result.rows.length > 0) {
      const stateData = JSON.parse(result.rows[0].state_data || '{}');
      return {
        currentGoal: stateData.currentGoal,
        subtasks: stateData.subtasks || [],
        mode: stateData.mode || 'chat',
        guidanceLevel: stateData.guidanceLevel || 'standard',
        pendingClarifications: stateData.pendingClarifications || [],
        conversationPath: stateData.conversationPath || []
      };
    }

    // Return default state
    return {
      mode: 'chat',
      guidanceLevel: 'standard',
      subtasks: [],
      pendingClarifications: [],
      conversationPath: []
    };

  } catch (error: any) {
    console.error('[VeraDialogueManager] Error getting dialogue state:', error.message);
    return {
      mode: 'chat',
      guidanceLevel: 'standard',
      subtasks: [],
      pendingClarifications: [],
      conversationPath: []
    };
  }
}

/**
 * Update dialogue state
 */
export async function updateDialogueState(
  sessionId: string,
  tenantId: string,
  updates: Partial<DialogueState>
): Promise<void> {
  try {
    const currentState = await getDialogueState(sessionId, tenantId);
    const newState: DialogueState = {
      ...currentState,
      ...updates
    };

    await queryEdcatAI(`
      INSERT INTO edcat.ai_conversation_state
      (session_id, tenant_id, state_data, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (session_id) DO UPDATE SET
        state_data = EXCLUDED.state_data,
        updated_at = NOW()
    `, [
      sessionId,
      tenantId,
      JSON.stringify(newState)
    ]);

  } catch (error: any) {
    console.error('[VeraDialogueManager] Error updating dialogue state:', error.message);
  }
}

/**
 * Set goal for conversation
 */
export async function setGoal(
  sessionId: string,
  tenantId: string,
  goal: string,
  subtasks?: string[]
): Promise<void> {
  await updateDialogueState(sessionId, tenantId, {
    currentGoal: goal,
    subtasks: subtasks || [],
    conversationPath: [`Goal set: ${goal}`]
  });
}

/**
 * Clear goal (goal completed or abandoned)
 */
export async function clearGoal(sessionId: string, tenantId: string): Promise<void> {
  await updateDialogueState(sessionId, tenantId, {
    currentGoal: undefined,
    subtasks: [],
    conversationPath: []
  });
}

