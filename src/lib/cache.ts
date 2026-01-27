/**
 * Cache implementation with Upstash Redis support
 * Falls back to in-memory cache when Redis is unavailable
 */

import { Redis } from "@upstash/redis";

// ============================================
// Cache Interface
// ============================================

interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  deletePattern(pattern: string): Promise<void>;
  clear(): Promise<void>;
}

// ============================================
// Upstash Redis Cache Implementation
// ============================================

class UpstashCache implements CacheProvider {
  private client: Redis;
  private prefix: string = "muaina:";

  constructor(url: string, token: string) {
    this.client = new Redis({
      url,
      token,
    });
  }

  private fullKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get<T>(this.fullKey(key));
      return value;
    } catch (err) {
      console.error("Redis get error:", err);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    try {
      await this.client.setex(this.fullKey(key), ttlSeconds, value);
    } catch (err) {
      console.error("Redis set error:", err);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(this.fullKey(key));
    } catch (err) {
      console.error("Redis delete error:", err);
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      const fullPattern = `${this.prefix}${pattern}`;
      // Use KEYS command for pattern matching (simpler for small datasets)
      // Note: For large datasets, consider using SCAN in production
      const keys = await this.client.keys(fullPattern);

      if (keys && keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (err) {
      console.error("Redis deletePattern error:", err);
    }
  }

  async clear(): Promise<void> {
    try {
      await this.deletePattern("*");
    } catch (err) {
      console.error("Redis clear error:", err);
    }
  }

  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === "PONG";
    } catch {
      return false;
    }
  }
}

// ============================================
// In-Memory Cache Implementation (Fallback)
// ============================================

interface MemoryCacheEntry<T> {
  value: T;
  expiresAt: number;
}

class MemoryCache implements CacheProvider {
  private store = new Map<string, MemoryCacheEntry<unknown>>();

  constructor() {
    // Clean up expired entries every 60 seconds
    if (typeof setInterval !== "undefined") {
      setInterval(() => this.cleanup(), 60000);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key) as MemoryCacheEntry<T> | undefined;

    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

// ============================================
// Hybrid Cache (Upstash + Memory Fallback)
// ============================================

class HybridCache implements CacheProvider {
  private redis: UpstashCache | null = null;
  private memory: MemoryCache;
  private redisAvailable: boolean = false;

  constructor() {
    this.memory = new MemoryCache();

    // Initialize Upstash if credentials are configured
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (redisUrl && redisToken) {
      this.redis = new UpstashCache(redisUrl, redisToken);
      this.redisAvailable = true;
      console.log("✅ Upstash Redis configured");
    } else {
      console.log("ℹ️ Upstash Redis not configured, using in-memory cache only");
    }
  }

  async get<T>(key: string): Promise<T | null> {
    // Try Redis first
    if (this.redis && this.redisAvailable) {
      try {
        const value = await this.redis.get<T>(key);
        if (value !== null) return value;
      } catch {
        // Redis failed, continue to memory
      }
    }

    // Fall back to memory cache
    return this.memory.get<T>(key);
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    // Write to memory cache (always)
    await this.memory.set(key, value, ttlSeconds);

    // Write to Redis if available
    if (this.redis && this.redisAvailable) {
      try {
        await this.redis.set(key, value, ttlSeconds);
      } catch {
        // Redis write failed, memory cache still has the value
      }
    }
  }

  async delete(key: string): Promise<void> {
    await this.memory.delete(key);

    if (this.redis && this.redisAvailable) {
      try {
        await this.redis.delete(key);
      } catch {
        // Ignore Redis errors
      }
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    await this.memory.deletePattern(pattern);

    if (this.redis && this.redisAvailable) {
      try {
        await this.redis.deletePattern(pattern);
      } catch {
        // Ignore Redis errors
      }
    }
  }

  async clear(): Promise<void> {
    await this.memory.clear();

    if (this.redis && this.redisAvailable) {
      try {
        await this.redis.clear();
      } catch {
        // Ignore Redis errors
      }
    }
  }

  get isRedisConfigured(): boolean {
    return this.redisAvailable;
  }
}

// ============================================
// Singleton Cache Instance
// ============================================

// Use global to prevent multiple instances in development (hot reload)
const globalForCache = globalThis as unknown as {
  cache: HybridCache | undefined;
};

export const cache = globalForCache.cache ?? new HybridCache();

if (process.env.NODE_ENV !== "production") {
  globalForCache.cache = cache;
}

// ============================================
// Cache Key Generators
// ============================================

export const CacheKeys = {
  // Report cache keys
  report: (reportId: string) => `report:${reportId}`,
  reportsList: (orgId: string, page: number, filters?: string) =>
    `reports:${orgId}:${page}:${filters || "all"}`,
  reportsStats: (orgId: string) => `reports:stats:${orgId}`,

  // User cache keys
  userProfile: (userId: string) => `user:${userId}`,

  // Organization cache keys
  organization: (orgId: string) => `org:${orgId}`,
  organizationsList: () => `orgs:list`,
};

// ============================================
// Cache TTL Presets (in seconds)
// ============================================

export const CacheTTL = {
  SHORT: 60, // 1 minute - for frequently changing data
  MEDIUM: 300, // 5 minutes - default
  LONG: 900, // 15 minutes - for stable data
  VERY_LONG: 3600, // 1 hour - for rarely changing data
} as const;

// ============================================
// Helper Functions
// ============================================

/**
 * Get or set cache with a factory function
 */
export async function getOrSet<T>(
  key: string,
  factory: () => Promise<T>,
  ttlSeconds: number = CacheTTL.MEDIUM
): Promise<T> {
  // Try to get from cache first
  const cached = await cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Generate the value
  const value = await factory();

  // Cache it
  await cache.set(key, value, ttlSeconds);

  return value;
}

/**
 * Invalidate cache when reports change
 */
export async function invalidateReportCache(
  orgId: string,
  reportId?: string
): Promise<void> {
  // Always invalidate the list and stats
  await cache.deletePattern(`reports:${orgId}:*`);
  await cache.delete(CacheKeys.reportsStats(orgId));

  // Invalidate specific report if provided
  if (reportId) {
    await cache.delete(CacheKeys.report(reportId));
  }
}

/**
 * Invalidate user cache
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  await cache.delete(CacheKeys.userProfile(userId));
}
