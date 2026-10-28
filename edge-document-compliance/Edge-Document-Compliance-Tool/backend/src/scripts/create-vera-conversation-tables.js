/**
 * Create Vera Conversation Tables
 * Creates the missing vera_conversation_history and vera_conversation_context tables
 * in the EDCAT AI database
 */

import { queryEdcatAI } from '../database/connection.js';

async function createVeraConversationTables() {
  console.log('\n🔧 Creating Vera Conversation Tables...\n');

  try {
    // Create vera_conversation_context table
    console.log('Creating vera_conversation_context table...');
    await queryEdcatAI(`
      CREATE TABLE IF NOT EXISTS vera_conversation_context (
        context_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        conversation_id UUID NOT NULL UNIQUE,
        active_task TEXT,
        current_phase TEXT DEFAULT 'greeting',
        conversation_topic TEXT,
        last_user_input TEXT,
        last_vera_response TEXT,
        messages_in_current_phase INT DEFAULT 0,
        confidence_level DECIMAL(3,2) DEFAULT 0.75,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ vera_conversation_context table created');

    // Create indexes for vera_conversation_context
    await queryEdcatAI(`
      CREATE INDEX IF NOT EXISTS idx_vera_conversation_context_user 
      ON vera_conversation_context(user_id, tenant_id)
    `);
    await queryEdcatAI(`
      CREATE INDEX IF NOT EXISTS idx_vera_conversation_context_conversation 
      ON vera_conversation_context(conversation_id)
    `);
    console.log('✅ Indexes created for vera_conversation_context');

    // Create vera_conversation_history table
    console.log('Creating vera_conversation_history table...');
    await queryEdcatAI(`
      CREATE TABLE IF NOT EXISTS vera_conversation_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        message_content TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (conversation_id) 
          REFERENCES vera_conversation_context(conversation_id) 
          ON DELETE CASCADE
      )
    `);
    console.log('✅ vera_conversation_history table created');

    // Create indexes for vera_conversation_history
    await queryEdcatAI(`
      CREATE INDEX IF NOT EXISTS idx_vera_conversation_history_conversation 
      ON vera_conversation_history(conversation_id, created_at DESC)
    `);
    await queryEdcatAI(`
      CREATE INDEX IF NOT EXISTS idx_vera_conversation_history_role 
      ON vera_conversation_history(conversation_id, role)
    `);
    console.log('✅ Indexes created for vera_conversation_history');

    console.log('\n✅ All Vera conversation tables created successfully!\n');
    return { success: true };

  } catch (error) {
    console.error('❌ Error creating Vera conversation tables:', error.message);
    console.error('   Stack:', error.stack);
    return { success: false, error: error.message };
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createVeraConversationTables()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { createVeraConversationTables };

