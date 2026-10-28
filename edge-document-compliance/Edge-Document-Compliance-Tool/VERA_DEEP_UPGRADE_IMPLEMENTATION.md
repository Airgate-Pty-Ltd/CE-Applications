# Vera Deep Upgrade Implementation Plan
## Reasoning, Personality, Templates, and DB-Backed Intelligence

This document tracks the comprehensive upgrade of Vera based on the detailed requirements provided.

**Status**: In Progress  
**Last Updated**: 2025-01-XX

---

## ✅ Completed

### SECTION 0 - Global Constraints
- ✅ Zero OpenAI dependencies maintained
- ✅ All intelligence from Postgres DB queries
- ✅ Personality from ai_persona/ai_persona_profile/ai_policy

### SECTION 1 - Persona & Personality Config
- ✅ Added Vera's name meaning: "Virtual Executive Requirements Assistant"
- ✅ Updated personalities.json with full_name field
- ✅ Updated vera_persona_profile.json with name_meaning
- ⏳ Enhanced edcatPersonality.js (IN PROGRESS)

---

## 🚧 In Progress

### SECTION 1 - Persona & Personality Config (Continuing)
- ⏳ Implement comprehensive getPersonaForTenant() with:
  - Base persona from ai_persona
  - Tenant override from ai_persona_profile
  - Persona policies from ai_policy
  - Default Vera persona with British/Scottish influence
  - Phrase banks (opening_lines, closing_lines, mild_british_phrases, mild_scottish_phrases)

### SECTION 2 - British/Scottish Influence Usage Rules
- ⏳ Create applyCulturalInfluence() helper
- ⏳ Implement subtle personality (1-2 phrases max per response)
- ⏳ High-formality context detection (FAA, EASA, etc.)
- ⏳ User preference-based modulation

---

## 📋 To Do

### SECTION 3 - Professional Language + Response Builder
- [ ] Upgrade VeraProfessionalLanguage.js:
  - Accept persona.style and user_expertise_estimate
  - Shape explanation depth (novice/intermediate/expert)
  - Insert optional opening/closing lines
  - Canonical explanation structure
  
- [ ] Upgrade VeraProfessionalResponseBuilder.js:
  - Standard response envelope
  - Persona-aware wrapping
  - British/Scottish phrase insertion (limited)

### SECTION 4 - Reasoning Engine Deepening
- [ ] Concept-driven reasoning (Knowledge Graph):
  - Use vera_knowledge_graph_concepts
  - Use vera_concept_relationships
  - Use vera_contextual_enrichment
  - Use vera_standard_profiles
  
- [ ] Multi-step reasoning flow:
  - Enhance VeraAdvancedReasoningEngine
  - Build reasoning chains
  - Store in vera_requirement_reasoning_chains
  
- [ ] Clarification and data gaps:
  - Use vera_clarification_rules
  - Use vera_data_gaps
  - Enhance VeraClarificationEngine
  
- [ ] Learning from clarifications:
  - Enhance VeraLearningEngine
  - Record to vera_learning_events
  - Track improvements

### SECTION 5 - Query Parser & Skill Orchestrator
- [ ] Upgrade VeraQueryParser:
  - Intent taxonomy (CLAUSE_EXPLANATION, GAP_ANALYSIS, etc.)
  - Clause reference detection
  - Standard name/code detection
  - Mode detection
  
- [ ] Enhance VeraSkillOrchestrator:
  - Route to appropriate skills
  - Combine results intelligently

---

## Implementation Notes

### Priority Order
1. **Persona System** (Sections 1-2) - Foundation for all responses
2. **Professional Language** (Section 3) - Shapes how Vera communicates
3. **Reasoning Engines** (Section 4) - Makes Vera smarter
4. **Query Parsing** (Section 5) - Understands user intent better

### Key Files to Modify
- `backend/src/services/edcatPersonality.js` ⏳
- `backend/src/services/vera/VeraProfessionalLanguage.js`
- `backend/src/services/vera/VeraProfessionalResponseBuilder.js`
- `backend/src/services/vera/VeraQueryParser.js`
- `backend/src/services/vera/VeraReasoningComplianceAnalyzer.js`
- `backend/src/services/vera/VeraAdvancedReasoningEngine.js`
- `backend/src/services/vera/VeraClarificationEngine.js`
- `backend/src/services/vera/VeraLearningEngine.js`
- `backend/src/services/vera/VeraSkillOrchestrator.js`

### Database Tables to Use
- `edcat.ai_persona`
- `edcat.ai_persona_profile`
- `edcat.ai_policy`
- `edcat.vera_knowledge_graph_concepts`
- `edcat.vera_concept_relationships`
- `edcat.vera_contextual_enrichment`
- `edcat.vera_standard_profiles`
- `edcat.vera_clarification_rules`
- `edcat.vera_data_gaps`
- `edcat.vera_learning_events`
- `edcat.vera_requirement_reasoning_chains`

---

## Testing Checklist

- [ ] Vera can explain her name when asked
- [ ] British/Scottish phrases appear subtly (1-2 per response max)
- [ ] High-formality contexts reduce cultural influence
- [ ] Persona loads correctly from DB with tenant overrides
- [ ] Query parser correctly identifies intent types
- [ ] Reasoning engines use knowledge graphs
- [ ] Clarification engine generates appropriate questions
- [ ] Learning engine records and improves from feedback

---

## Next Steps

1. Complete edcatPersonality.js enhancement
2. Implement applyCulturalInfluence() helper
3. Upgrade VeraProfessionalLanguage.js
4. Continue with remaining sections...

