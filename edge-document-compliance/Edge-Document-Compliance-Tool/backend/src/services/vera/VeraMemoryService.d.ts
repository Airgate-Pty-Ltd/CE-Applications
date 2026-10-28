/**
 * Vera Memory Service
 *
 * Enhanced memory and retrieval system for Vera.
 * Stores and retrieves:
 * - Conversation context
 * - Learned facts and corrections
 * - User preferences
 * - Standard-specific knowledge
 * - Cross-session memory
 *
 * All data stored in EDCAT AI database - 100% internal.
 */
export interface MemoryEntry {
    id: string;
    tenantId: string;
    sessionId?: string;
    userId?: string;
    key: string;
    value: any;
    category: 'fact' | 'preference' | 'correction' | 'context' | 'standard_knowledge';
    standardCode?: string;
    topic?: string;
    confidence: number;
    source: string;
    createdAt: Date;
    lastAccessed: Date;
    accessCount: number;
    metadata?: any;
}
export interface ConversationContext {
    sessionId: string;
    tenantId: string;
    userId: string;
    recentMessages: Array<{
        role: 'user' | 'assistant';
        message: string;
        intent?: string;
        topic?: string;
        timestamp: Date;
    }>;
    activeTopics: string[];
    activeStandards: string[];
    userPreferences: Record<string, any>;
    learnedFacts: Array<{
        key: string;
        value: any;
        confidence: number;
    }>;
}
export declare class VeraMemoryService {
    /**
     * Store a memory entry
     */
    static storeMemory(params: {
        tenantId: string;
        sessionId?: string;
        userId?: string;
        key: string;
        value: any;
        category: MemoryEntry['category'];
        standardCode?: string;
        topic?: string;
        confidence?: number;
        source?: string;
        metadata?: any;
    }): Promise<string>;
    /**
     * Retrieve memory entries
     */
    static retrieveMemory(params: {
        tenantId: string;
        key?: string;
        category?: MemoryEntry['category'];
        standardCode?: string;
        topic?: string;
        limit?: number;
    }): Promise<MemoryEntry[]>;
    /**
     * Get conversation context for a session
     */
    static getConversationContext(params: {
        tenantId: string;
        sessionId: string;
        userId: string;
        messageLimit?: number;
    }): Promise<ConversationContext>;
    /**
     * Store a learned fact or correction
     */
    static learnFact(params: {
        tenantId: string;
        key: string;
        value: any;
        standardCode?: string;
        topic?: string;
        confidence?: number;
        source?: string;
    }): Promise<string>;
    /**
     * Store a user correction
     */
    static storeCorrection(params: {
        tenantId: string;
        sessionId: string;
        userId: string;
        originalAnswer: string;
        correctedAnswer: string;
        question: string;
        intent?: string;
        topic?: string;
        standardCode?: string;
    }): Promise<string>;
    /**
     * Search memories by text similarity
     */
    static searchMemories(params: {
        tenantId: string;
        query: string;
        category?: MemoryEntry['category'];
        limit?: number;
    }): Promise<MemoryEntry[]>;
    /**
     * Ensure memory table exists
     */
    private static ensureMemoryTable;
}
//# sourceMappingURL=VeraMemoryService.d.ts.map