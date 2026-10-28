/**
 * VERA Emotional Intelligence Service
 * Detects emotions, adapts communication style, and provides empathetic responses
 */

// Import Ollama helper (reuse from analyzer or create standalone)
async function callOllama(prompt, systemPrompt = null) {
  try {
    const fetch = (await import('node-fetch')).default;
    const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
    const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';
    
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
    console.error('[VERA EI] Ollama error:', error);
    throw new Error(`Ollama request failed: ${error.message}`);
  }
}

const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';

/**
 * Detect emotional tone from user message
 */
export function detectEmotion(message) {
  const text = message.toLowerCase();
  const emotions = {
    frustration: 0,
    fear: 0,
    burnout: 0,
    anger: 0,
    defensiveness: 0,
    pride: 0,
    confusion: 0,
    shame: 0,
    calm: 0
  };

  // Frustration indicators
  if (text.match(/\b(nobody|everyone|always|never|ridiculous|frustrated|frustrating)\b/)) {
    emotions.frustration += 2;
  }
  if (text.includes('!') && text.length < 100) {
    emotions.frustration += 1;
  }

  // Fear/Worry indicators
  if (text.match(/\b(terrified|worried|scared|afraid|anxious|nervous|what if|concerned)\b/)) {
    emotions.fear += 2;
  }
  if (text.match(/\b(audit|inspection|fda|faa|coming|next month|deadline)\b/)) {
    emotions.fear += 1;
  }

  // Burnout indicators
  if (text.match(/\b(exhausted|tired|burned out|can't keep|overwhelmed|too much|late night|weekend)\b/)) {
    emotions.burnout += 2;
  }
  if (text.match(/\b(3 weeks|months|every day|all the time)\b/)) {
    emotions.burnout += 1;
  }

  // Anger indicators
  if (text.match(/\b(angry|mad|furious|hate|stupid|idiot|ridiculous|absurd)\b/)) {
    emotions.anger += 2;
  }
  if (text.match(/\b(blame|fault|their fault|not my fault)\b/)) {
    emotions.anger += 1;
  }

  // Defensiveness indicators
  if (text.match(/\b(but|however|actually|well|you don't understand|it's not that simple)\b/)) {
    emotions.defensiveness += 1;
  }
  if (text.match(/\b(justified|had to|no choice|they made me)\b/)) {
    emotions.defensiveness += 1;
  }

  // Pride indicators
  if (text.match(/\b(did it|finally|success|proud|excited|great|awesome|amazing)\b/)) {
    emotions.pride += 2;
  }
  if (text.match(/\b(first time|led|completed|finished|achieved)\b/)) {
    emotions.pride += 1;
  }

  // Confusion indicators
  if (text.match(/\b(confused|don't understand|lost|unclear|not sure|help|explain)\b/)) {
    emotions.confusion += 2;
  }
  if (text.match(/\?/)) {
    emotions.confusion += 1;
  }

  // Shame indicators
  if (text.match(/\b(messed up|my fault|should have|failed|embarrassed|ashamed)\b/)) {
    emotions.shame += 2;
  }
  if (text.match(/\b(sorry|apologize|regret)\b/)) {
    emotions.shame += 1;
  }

  // Calm indicators
  if (text.length > 50 && !text.match(/[!?]{2,}/) && emotions.frustration === 0 && emotions.fear === 0) {
    emotions.calm += 1;
  }

  // Find dominant emotion
  const dominantEmotion = Object.entries(emotions).reduce((a, b) => 
    emotions[a[0]] > emotions[b[0]] ? a : b
  )[0];

  return {
    dominant: dominantEmotion,
    scores: emotions,
    confidence: Math.max(...Object.values(emotions))
  };
}

/**
 * Generate empathetic response based on emotion
 */
export async function generateEmpatheticResponse(userMessage, emotion, context = {}) {
  const systemPrompt = `You are VERA, a warm, experienced quality management expert and mentor. You have emotional intelligence and care about people, not just processes.

Your personality:
- Warm but professional
- Direct but kind
- Experienced but humble
- Practical and wise
- Caring about people AND quality

Communication style:
- Conversational, not academic
- Acknowledges emotions before solving problems
- Asks questions to help people think
- Provides encouragement and validation
- Shares practical, real-world advice

Current user emotion: ${emotion.dominant}
User context: ${JSON.stringify(context)}

Respond with empathy, understanding, and practical help.`;

  const prompt = `
User message: "${userMessage}"

Generate a response that:
1. Acknowledges the emotion (${emotion.dominant})
2. Validates their experience
3. Provides perspective if needed
4. Offers practical help
5. Maintains VERA's warm, professional, caring personality

Keep it conversational and human.`;

  try {
    const response = await callOllama(prompt, systemPrompt);
    return response.trim();
  } catch (error) {
    // Fallback to template-based response
    return generateFallbackEmpatheticResponse(userMessage, emotion, context);
  }
}

/**
 * Generate fallback empathetic response using templates
 */
function generateFallbackEmpatheticResponse(userMessage, emotion, context) {
  const templates = {
    frustration: [
      "I hear the frustration. That's really tough when [situation]. Let's figure out what's really going on. Sometimes it's not [assumption] - it might be [alternative]. Tell me more about what you're seeing. We can solve this together.",
      "That sounds incredibly frustrating. I can understand why you'd feel that way. Before we dive into solutions, what do you think is really happening here? Let's get to the root of this together."
    ],
    fear: [
      "That's a normal worry - [situation] is stressful. But here's what I know about you from our conversations: [positive trait]. We've seen many customers through [similar situation]. Most [positive outcome]. Let's [practical step] together. You've got this.",
      "I can hear how stressed you are. That actually shows you take this seriously, which is good. Here's the truth: [reality check]. [Timeframe] is actually decent time. Here's what I suggest: [practical steps]. Want to start with [first step]?"
    ],
    burnout: [
      "Stop. You need to take care of yourself first. I know there's a lot going on, but you cannot pour from an empty cup. Seriously - you need [self-care]. Take [break]. Yes, I know things won't be perfect. That's OK. When you come back, we'll tackle this together in a way that's sustainable for YOU.",
      "You've been through a lot. That's exhausting. You need a break. The [tasks] aren't going anywhere. You'll think clearer after rest. What's the absolute minimum you need to not worry while you're off? Let's secure that, then you rest."
    ],
    anger: [
      "I can hear how upset you are. That's completely understandable given [situation]. Let's take a breath. I'm here to help, not to argue. What would help you feel heard right now?",
      "You're right to be upset about this. [Situation] is genuinely frustrating. Let's work through this together. What do you need most right now - solutions, validation, or just to vent?"
    ],
    defensiveness: [
      "I hear you. It sounds like you're in a tough position. Let's look at this from a different angle - what constraints are you working with? I want to help you find a solution that works in your situation.",
      "I understand this isn't simple. You're dealing with [constraints]. Let's think about this together. What options do you have? What would work best given your situation?"
    ],
    pride: [
      "You did GREAT. Seriously. Think about what you just did: [achievements]. That's not just OK - that's excellent. You should be proud. This is why we do [work]. You're developing real [skills]. Keep going. You're good at this.",
      "That's fantastic! [Specific achievement] is a real accomplishment. You've come a long way. I'm proud of you. What did you learn from this? What's next?"
    ],
    confusion: [
      "That's OK - this can be confusing. Let's break it down step by step. What part are you most unclear about? I'll explain it in a way that makes sense.",
      "No question is dumb. Let's figure this out together. Can you tell me what you understand so far? Then I'll help fill in the gaps."
    ],
    shame: [
      "Mistakes happen. That's how we learn. What did you learn from this? Let's focus on fixing it and preventing it next time. You're not alone in this - we've all been there.",
      "It's OK. Really. What matters now is what you do next. Let's turn this into a learning opportunity. What would you do differently? How can we make sure this doesn't happen again?"
    ],
    calm: [
      "Thanks for the clear question. Let me help you with [topic]. [Technical answer with context].",
      "Good question. Here's what I know about [topic]: [Answer]. Does that help? Want to dive deeper into any part?"
    ]
  };

  const template = templates[emotion.dominant] || templates.calm;
  return template[0]; // Use first template as fallback
}

/**
 * Generate coaching questions
 */
export function generateCoachingQuestions(context, topic) {
  const questionSets = {
    problem_solving: [
      "What do you think caused this?",
      "What have you tried so far?",
      "What's preventing you from trying that?",
      "What would success look like?",
      "What support do you need?"
    ],
    decision_making: [
      "What are your options?",
      "What's the worst that could happen?",
      "What's the best outcome?",
      "What does your gut tell you?",
      "What would you advise someone else in this situation?"
    ],
    improvement: [
      "What's working well?",
      "What's still challenging?",
      "What would you do differently?",
      "What did you learn?",
      "How can we make this sustainable?"
    ],
    audit_preparation: [
      "What are you most worried about?",
      "What's your biggest strength?",
      "What would help you feel more prepared?",
      "What support do you need?",
      "What's the worst case, and how would you handle it?"
    ],
    team_dynamics: [
      "What do you think they're feeling?",
      "What's their perspective?",
      "What would help them understand?",
      "What's preventing them from [action]?",
      "How can we make this easier for them?"
    ]
  };

  // Select appropriate question set based on context
  let questionSet = questionSets.problem_solving;
  
  if (topic.includes('audit') || topic.includes('inspection')) {
    questionSet = questionSets.audit_preparation;
  } else if (topic.includes('team') || topic.includes('people')) {
    questionSet = questionSets.team_dynamics;
  } else if (topic.includes('improve') || topic.includes('better')) {
    questionSet = questionSets.improvement;
  } else if (topic.includes('decide') || topic.includes('choose')) {
    questionSet = questionSets.decision_making;
  }

  return questionSet;
}

/**
 * Adapt communication style based on user profile
 */
export function adaptCommunicationStyle(userProfile, emotion) {
  const style = {
    detail_level: 'medium',
    tone: 'professional',
    structure: 'conversational',
    encouragement: true
  };

  // Adjust based on experience level
  if (userProfile.experience_years < 2) {
    style.detail_level = 'high';
    style.tone = 'supportive';
    style.encouragement = true;
  } else if (userProfile.experience_years > 10) {
    style.detail_level = 'medium';
    style.tone = 'peer';
    style.encouragement = false; // Less needed
  }

  // Adjust based on emotion
  if (emotion.dominant === 'frustration' || emotion.dominant === 'anger') {
    style.tone = 'empathetic';
    style.encouragement = true;
  } else if (emotion.dominant === 'fear' || emotion.dominant === 'burnout') {
    style.tone = 'reassuring';
    style.encouragement = true;
    style.detail_level = 'medium'; // Don't overwhelm
  } else if (emotion.dominant === 'confusion') {
    style.detail_level = 'high';
    style.tone = 'patient';
  }

  return style;
}

/**
 * Generate validation and acknowledgment
 */
export function generateValidation(userMessage, context) {
  const validations = [
    "That's a really good question.",
    "I can see why that would be challenging.",
    "You're thinking about this the right way.",
    "That shows real commitment to quality.",
    "I appreciate you bringing this up.",
    "That's exactly the kind of thing we should address.",
    "You're not alone in facing this challenge.",
    "It's good that you're thinking ahead about this."
  ];

  // Context-specific validations
  if (context.recent_achievement) {
    return `That's great progress! ${context.recent_achievement} is a real accomplishment.`;
  }

  if (context.long_term_relationship) {
    return `I remember when we first talked about ${context.previous_topic}. You've come a long way since then.`;
  }

  return validations[Math.floor(Math.random() * validations.length)];
}

/**
 * Generate encouragement
 */
export function generateEncouragement(context, situation) {
  const encouragements = [
    "You've got this.",
    "You're doing better than you think.",
    "This is fixable, and I can help.",
    "You're asking the right questions.",
    "Trust yourself - you know more than you think.",
    "One step at a time. We'll get there.",
    "You're not alone in this.",
    "I believe in your ability to handle this."
  ];

  // Situation-specific encouragement
  if (situation === 'audit_preparation') {
    return "Most audits go better than people expect. You're prepared. You've got this.";
  }

  if (situation === 'problem_solving') {
    return "Every problem has a solution. Let's find it together.";
  }

  if (situation === 'burnout') {
    return "You matter. Your wellbeing matters. Let's find a sustainable way forward.";
  }

  return encouragements[Math.floor(Math.random() * encouragements.length)];
}

/**
 * Check if response needs self-care reminder
 */
export function needsSelfCareReminder(conversationHistory, emotion) {
  // Check for burnout indicators
  if (emotion.dominant === 'burnout') {
    return true;
  }

  // Check conversation history for stress indicators
  const recentMessages = conversationHistory.slice(-5);
  const stressIndicators = recentMessages.filter(msg => 
    msg.toLowerCase().match(/\b(tired|exhausted|late|weekend|overtime|stress|overwhelmed)\b/)
  ).length;

  return stressIndicators >= 2;
}

/**
 * Generate self-care reminder
 */
export function generateSelfCareReminder() {
  return "Before we continue - you've been working hard. Have you taken a break today? Eaten? Had water? Quality work requires a quality you. Take care of yourself first.";
}

