/**
 * Vera Cache Service
 *
 * In-memory caching for frequently accessed data to improve response speed.
 * Caches standards, learning docs, examples, and intent patterns.
 *
 * TTL-based expiration with automatic cleanup.
 */
export declare class VeraCacheService {
    private static cache;
    private static readonly DEFAULT_TTL;
    private static readonly MAX_CACHE_SIZE;
    private static cleanupInterval;
    /**
     * Get cached value or compute and cache
     */
    static getOrSet<T>(key: string, computeFn: () => Promise<T>, ttl?: number): Promise<T>;
    /**
     * Set cache value
     */
    static set<T>(key: string, data: T, ttl?: number): void;
    /**
     * Get cached value (returns null if not found or expired)
     */
    static get<T>(key: string): T | null;
    /**
     * Invalidate cache entry
     */
    static invalidate(key: string): void;
    /**
     * Invalidate all entries matching pattern
     */
    static invalidatePattern(pattern: string | RegExp): void;
    /**
     * Clear all cache
     */
    static clear(): void;
    /**
     * Get cache statistics
     */
    static getStats(): {
        size: number;
        entries: Array<{
            key: string;
            hits: number;
            age: number;
        }>;
    };
    /**
     * Evict least used entries
     */
    private static evictLeastUsed;
    /**
     * Start cleanup interval
     */
    private static startCleanup;
    /**
     * Stop cleanup interval
     */
    static stopCleanup(): void;
}
export declare const CacheKeys: {
    standardInfo: (code: string) => string;
    learningDocs: (code: string, limit: number) => string;
    approvedExamples: (code: string, limit: number) => string;
    badExamples: (code: string, limit: number) => string;
    clauseSearch: (clause: string, standard?: string) => string;
    intentPattern: (message: string) => string;
    conversationHistory: (sessionId: string, limit: number) => string;
};
//# sourceMappingURL=VeraCacheService.d.ts.map