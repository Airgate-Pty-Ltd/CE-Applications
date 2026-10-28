/**
 * Vera Cache Service
 * 
 * In-memory caching for frequently accessed data to improve response speed.
 * Caches standards, learning docs, examples, and intent patterns.
 * 
 * TTL-based expiration with automatic cleanup.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  hits: number;
}

export class VeraCacheService {
  private static cache = new Map<string, CacheEntry<any>>();
  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_CACHE_SIZE = 1000;
  private static cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Get cached value or compute and cache
   */
  static async getOrSet<T>(
    key: string,
    computeFn: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    // Check cache
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      cached.hits++;
      return cached.data as T;
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
  static set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
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
  static get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      cached.hits++;
      return cached.data as T;
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
  static invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all entries matching pattern
   */
  static invalidatePattern(pattern: string | RegExp): void {
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
  static clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  static getStats(): {
    size: number;
    entries: Array<{ key: string; hits: number; age: number }>;
  } {
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
  private static evictLeastUsed(): void {
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
  private static startCleanup(): void {
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
  static stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Cache key generators
export const CacheKeys = {
  standardInfo: (code: string) => `standard:info:${code.toUpperCase()}`,
  learningDocs: (code: string, limit: number) => `learning:docs:${code.toUpperCase()}:${limit}`,
  approvedExamples: (code: string, limit: number) => `examples:approved:${code.toUpperCase()}:${limit}`,
  badExamples: (code: string, limit: number) => `examples:bad:${code.toUpperCase()}:${limit}`,
  clauseSearch: (clause: string, standard?: string) => `clause:${clause}:${standard || 'any'}`,
  intentPattern: (message: string) => `intent:${message.substring(0, 50).toLowerCase()}`,
  conversationHistory: (sessionId: string, limit: number) => `conv:history:${sessionId}:${limit}`
};

