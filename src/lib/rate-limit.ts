/**
 * Distributed rate limiter using Upstash Redis
 * Falls back to in-memory when Redis is not configured (local dev)
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
}

// ============================================
// Redis-backed rate limiter (production)
// ============================================

let redisRatelimiters: Map<string, Ratelimit> | null = null;

function getRedisRateLimiter(config: RateLimitConfig): Ratelimit | null {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) return null;

  // Cache ratelimiters by config to avoid creating new ones per request
  if (!redisRatelimiters) {
    redisRatelimiters = new Map();
  }

  const configKey = `${config.windowMs}:${config.maxRequests}`;
  let limiter = redisRatelimiters.get(configKey);

  if (!limiter) {
    const windowSeconds = Math.ceil(config.windowMs / 1000);
    limiter = new Ratelimit({
      redis: new Redis({ url: redisUrl, token: redisToken }),
      limiter: Ratelimit.slidingWindow(config.maxRequests, `${windowSeconds} s`),
      prefix: "muaina:ratelimit",
    });
    redisRatelimiters.set(configKey, limiter);
  }

  return limiter;
}

// ============================================
// In-memory fallback (local dev only)
// ============================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, RateLimitEntry>();

function checkMemoryRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(key);

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    for (const [k, e] of memoryStore.entries()) {
      if (now > e.resetTime) memoryStore.delete(k);
    }
  }

  if (!entry || now > entry.resetTime) {
    const resetTime = now + config.windowMs;
    memoryStore.set(key, { count: 1, resetTime });
    return { success: true, remaining: config.maxRequests - 1, resetTime };
  }

  entry.count++;
  memoryStore.set(key, entry);

  if (entry.count > config.maxRequests) {
    return { success: false, remaining: 0, resetTime: entry.resetTime };
  }

  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

// ============================================
// Public API
// ============================================

/**
 * Check if a request should be rate limited.
 * Uses Redis in production, falls back to in-memory for local dev.
 */
export async function checkRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  const redisLimiter = getRedisRateLimiter(config);

  if (redisLimiter) {
    try {
      const result = await redisLimiter.limit(key);
      return {
        success: result.success,
        remaining: result.remaining,
        resetTime: result.reset,
      };
    } catch (err) {
      console.error("Redis rate limit error, falling back to memory:", err);
      // Fall through to memory-based limiter
    }
  }

  return checkMemoryRateLimit(key, config);
}

/**
 * Rate limit presets for different endpoints
 */
export const RATE_LIMITS = {
  // Standard API routes: 100 requests per minute
  standard: {
    windowMs: 60 * 1000,
    maxRequests: 100,
  },
  // Auth routes: 10 requests per minute (prevent brute force)
  auth: {
    windowMs: 60 * 1000,
    maxRequests: 10,
  },
  // File upload: 20 uploads per minute
  upload: {
    windowMs: 60 * 1000,
    maxRequests: 20,
  },
  // AI analysis: 30 requests per minute (expensive operation)
  aiAnalysis: {
    windowMs: 60 * 1000,
    maxRequests: 30,
  },
} as const;

/**
 * Validate IP address format (basic validation)
 */
function isValidIP(ip: string): boolean {
  // IPv4 pattern
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6 pattern (simplified)
  const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

  if (ipv4Pattern.test(ip)) {
    // Validate each octet is 0-255
    const octets = ip.split('.').map(Number);
    return octets.every(o => o >= 0 && o <= 255);
  }

  return ipv6Pattern.test(ip);
}

/**
 * Get client IP from request headers
 *
 * Security notes:
 * - X-Forwarded-For can be spoofed by clients
 * - In production behind a trusted proxy (Vercel, Cloudflare), the first IP is usually the client
 * - We validate IP format to prevent injection attacks
 * - For shared IPs (corporate proxies), users may share rate limits
 */
export function getClientIP(request: Request): string {
  // Try X-Forwarded-For first (set by proxies like Vercel, Cloudflare)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Take the first IP (client IP when behind trusted proxy)
    const clientIP = forwardedFor.split(",")[0].trim();

    // Validate IP format to prevent injection
    if (isValidIP(clientIP)) {
      return clientIP;
    }
    console.warn(`[RateLimit] Invalid IP format in X-Forwarded-For: ${clientIP}`);
  }

  // Try X-Real-IP (set by some proxies)
  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    const trimmedIP = realIP.trim();
    if (isValidIP(trimmedIP)) {
      return trimmedIP;
    }
    console.warn(`[RateLimit] Invalid IP format in X-Real-IP: ${trimmedIP}`);
  }

  // Fallback - use a hash of user agent + accept headers as fingerprint
  // This provides some differentiation for clients without valid IP
  const userAgent = request.headers.get("user-agent") || "";
  const accept = request.headers.get("accept") || "";
  const fingerprint = `unknown-${hashString(userAgent + accept)}`;

  return fingerprint;
}

/**
 * Simple string hash for fingerprinting
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).substring(0, 8);
}

/**
 * Create rate limit response with proper headers
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: "Too many requests",
      retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": result.resetTime.toString(),
      },
    }
  );
}
