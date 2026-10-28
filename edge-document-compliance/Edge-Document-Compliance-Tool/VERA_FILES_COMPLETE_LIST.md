# Complete List of Vera-Related Files

## 📁 Core Services (Main Engine)
- `backend/src/services/veraConversationalEngine.js` - **Main conversational engine**
- `backend/src/services/veraGreetingEngine.js` - Greeting and small talk handler
- `backend/src/services/veraDocumentLearningService.js` - Document learning service

## 📁 Vera Services Directory (`backend/src/services/vera/`)
- `VeraAdvancedReasoningEngine.js` - Advanced reasoning capabilities
- `VeraClarificationEngine.js` - Handles clarification requests
- `VeraComprehensiveResearcher.js` - Comprehensive research functionality
- `VeraContextManager.js` - Manages conversation context
- `VeraDeductiveReasoningEngine.js` - Deductive reasoning engine
- `VeraLearningEngine.js` - Learning and adaptation engine
- `VeraMemoryManager.js` - Memory management
- `VeraProfessionalFormatter.js` - Professional response formatting
- `VeraProfessionalLanguage.js` - Professional language generation
- `VeraProfessionalResponseBuilder.js` - Response building logic
- `VeraQueryParser.js` - Parses user queries
- `VeraRegulatoryLookup.js` - Regulatory requirement lookup
- `VeraRepository.js` - Data access layer
- `VeraResponseGenerator.js` - Response generation
- `VeraVectorEngine.js` - Vector embeddings and similarity
- `StandardsIntelligenceService.js` - Standards intelligence service
- `veraCronJobs.js` - Scheduled tasks and cron jobs

## 📁 Routes
- `backend/src/routes/vera.js` - **Main Vera API routes**
- `backend/src/routes/chat.js` - Chat endpoint (uses Vera)

## 📁 Middleware
- `backend/src/middleware/veraConversationMiddleware.js` - Conversation middleware
- `backend/src/middleware/veraMiddleware.js` - General Vera middleware

## 📁 Scripts (Setup & Maintenance)
- `backend/src/scripts/seed-vera-comprehensive.js` - Comprehensive seeding script
- `backend/src/scripts/create-vera-learning-tables.js` - Creates learning tables
- `backend/src/scripts/create-vera-conversation-tables.js` - Creates conversation tables
- `backend/src/scripts/generate-vera-training-data.js` - Generates training data
- `backend/src/scripts/pull-vera-learning-standards.js` - Pulls learning standards
- `backend/src/scripts/vera-final-validation.js` - Final validation script
- `backend/src/scripts/vera-diagnostics.js` - Diagnostic tools
- `backend/src/scripts/diagnose-vera.js` - Diagnostic script
- `backend/src/scripts/verify-vera-tables.js` - Verifies table structure
- `backend/src/scripts/load-vera-blueprints.js` - Loads blueprints

## 📁 Seed Data (`backend/EDCAT AIP/seed/`)
- `vera_persona_profile.json` - Persona profile data
- `vera_knowledge_base.json` - Knowledge base data
- `vera_expert_credentials.json` - Expert credentials
- `vera_customer_patterns.json` - Customer requirement patterns
- `vera_regulatory_patterns.json` - Regulatory patterns
- `vera_standard_patterns.json` - Standard patterns
- `vera_knowledge_templates.json` - Knowledge templates
- `vera_intent_router.json` - Intent routing configuration
- `vera_enhanced_intents.json` - Enhanced intent definitions
- `vera_training_materials_template.json` - Training materials template

## 📁 Persona Data (`backend/EDCAT AIP/persona/`)
- `vera_greeting_behavior.json` - Greeting behavior patterns
- `vera_persona_greetings.json` - Persona greeting templates

## 📁 Database Migrations
- `migrations/014_vera_enhanced_intelligence.sql` - Enhanced intelligence tables
- `migrations/015_vera_knowledge_base_enhancement.sql` - Knowledge base enhancement
- `migrations/016_vera_comprehensive_research.sql` - Comprehensive research tables

## 📁 Database Schemas (`backend/EDCAT AIP/schema/`)
- `vera_conversation_history.sql` - Conversation history schema
- `vera_conversation.sql` - Conversation schema

## 📁 EDCAT AIP Server Files
- `backend/EDCAT AIP/server/vera_conversation_middleware.ts` - TypeScript middleware
- `backend/EDCAT AIP/server/vera_chat_handler_example.ts` - Example chat handler

## 📁 Prompts & Policies (`backend/EDCAT AIP/`)
- `prompts/system.vera.follow_rules.txt` - System prompt for rules
- `policies/vera_follow_rules.json` - Follow rules policy

## 📁 API Contracts
- `backend/EDCAT AIP/api/contracts/vera_chat_fragment.yaml` - Chat API contract

## 📁 Documentation
- `docs/VERA_SEED_VALIDATION.md` - Seed validation documentation
- `docs/VERA_ADVANCED_REASONING.md` - Advanced reasoning docs
- `docs/vera-50-step-completion-summary.md` - 50-step completion summary
- `docs/vera-testing-commands.md` - Testing commands guide
- `docs/vera-user-guide.md` - User guide
- `docs/vera-architecture.md` - Architecture documentation
- `docs/vera-50-step-progress.md` - Progress tracking
- `docs/vera-comprehensive-upgrade-plan.md` - Upgrade plan
- `backend/EDCAT AIP/README_VERA_CONVERSATIONAL_EXTENSION.md` - Conversational extension README
- `backend/EDCAT AIP/VERA_EXPERT_KNOWLEDGE_INTEGRATION.md` - Expert knowledge integration
- `backend/EDCAT AIP/VERA_ENHANCEMENT_PLAN.md` - Enhancement plan
- `VERA_FIX_SUMMARY.md` - Fix summary
- `DEPLOY_VERA_KNOWLEDGE.md` - Deployment guide
- `DEPLOY_VERA_KNOWLEDGE_FIX.md` - Deployment fix guide

## 📁 PowerShell Scripts
- `test-vera-endpoints.ps1` - Test endpoints script
- `pull-vera-standards.ps1` - Pull standards script
- `diagnose-vera.ps1` - Diagnostic script

## 📁 Other Files That Reference Vera
- `backend/src/routes/chat.js` - Chat routes (uses Vera)
- `backend/src/routes/admin.js` - Admin routes (may reference Vera)
- `backend/src/app.js` - Main app (registers Vera routes)
- `backend/index.js` - Entry point (may initialize Vera)

## Summary
- **Total Files**: ~71 files
- **Core Services**: 3 main files + 16 in vera/ subdirectory
- **Routes**: 2 files
- **Middleware**: 2 files
- **Scripts**: 9 files
- **Seed Data**: 10 JSON files
- **Persona Data**: 2 JSON files
- **Migrations**: 3 SQL files
- **Schemas**: 2 SQL files
- **Documentation**: 13+ markdown files
- **PowerShell Scripts**: 3 files
- **Other**: Various config and example files

