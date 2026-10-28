/**
 * Vera Cache Service
 *
 * In-memory caching for frequently accessed data to improve response speed.
 * Caches standards, learning docs, examples, and intent patterns.
 *
 * TTL-based expiration with automatic cleanup.
 */
export class VeraCacheService {
    /**
     * Get cached value or compute and cache
     */
    static async getOrSet(key, computeFn, ttl = this.DEFAULT_TTL) {
        // Check cache
        const cached = this.cache.get(key);
        if (cached && cached.expiresAt > Date.now()) {
            cached.hits++;
            return cached.data;
        }
        // Compute new value
        const data = await computeFn();
        // Store in cache
        this.set(key, data, ttl);
        return data;
    }
    /**
     * Set cache value
     */
    static set(key, data, ttl = this.DEFAULT_TTL) {
        // Evict if cache is too large
        if (this.cache.size >= this.MAX_CACHE_SIZE) {
            this.evictLeastUsed();
        }
        this.cache.set(key, {
            data,
            expiresAt: Date.now() + ttl,
            hits: 0
        });
        // Start cleanup interval if not running
        if (!this.cleanupInterval) {
            this.startCleanup();
        }
    }
    /**
     * Get cached value (returns null if not found or expired)
     */
    static get(key) {
        const cached = this.cache.get(key);
        if (cached && cached.expiresAt > Date.now()) {
            cached.hits++;
            return cached.data;
        }
        // Remove expired entry
        if (cached) {
            this.cache.delete(key);
        }
        return null;
    }
    /**
     * Invalidate cache entry
     */
    static invalidate(key) {
        this.cache.delete(key);
    }
    /**
     * Invalidate all entries matching pattern
     */
    static invalidatePattern(pattern) {
        const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
            }
        }
    }
    /**
     * Clear all cache
     */
    static clear() {
        this.cache.clear();
    }
    /**
     * Get cache statistics
     */
    static getStats() {
        const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
            key,
            hits: entry.hits,
            age: Date.now() - (entry.expiresAt - this.DEFAULT_TTL)
        }));
        return {
            size: this.cache.size,
            entries: entries.sort((a, b) => b.hits - a.hits).slice(0, 20)
        };
    }
    /**
     * Evict least used entries
     */
    static evictLeastUsed() {
        const entries = Array.from(this.cache.entries())
            .sort((a, b) => a[1].hits - b[1].hits)
            .slice(0, Math.floor(this.MAX_CACHE_SIZE * 0.1)); // Evict 10%
        for (const [key] of entries) {
            this.cache.delete(key);
        }
    }
    /**
     * Start cleanup interval
     */
    static startCleanup() {
        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            for (const [key, entry] of this.cache.entries()) {
                if (entry.expiresAt <= now) {
                    this.cache.delete(key);
                }
            }
        }, 60000); // Run every minute
    }
    /**
     * Stop cleanup interval
     */
    static stopCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }
}
VeraCacheService.cache = new Map();
VeraCacheService.DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
VeraCacheService.MAX_CACHE_SIZE = 1000;
VeraCacheService.cleanupInterval = null;
// Cache key generators
export const CacheKeys = {
    standardInfo: (code) => `standard:info:${code.toUpperCase()}`,
    learningDocs: (code, limit) => `learning:docs:${code.toUpperCase()}:${limit}`,
    approvedExamples: (code, limit) => `examples:approved:${code.toUpperCase()}:${limit}`,
    badExamples: (code, limit) => `examples:bad:${code.toUpperCase()}:${limit}`,
    clauseSearch: (clause, standard) => `clause:${clause}:${standard || 'any'}`,
    intentPattern: (message) => `intent:${message.substring(0, 50).toLowerCase()}`,
    conversationHistory: (sessionId, limit) => `conv:history:${sessionId}:${limit}`
};
//# sourceMappingURL=VeraCacheService.js.map