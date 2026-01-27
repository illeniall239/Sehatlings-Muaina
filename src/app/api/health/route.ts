import { NextResponse } from "next/server";
import { cache } from "@/lib/cache";
import { createClient } from "@/lib/supabase/server";

interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  services: {
    cache: "connected" | "degraded" | "disconnected";
    database: "connected" | "disconnected";
  };
  version?: string;
  environment?: string;
}

/**
 * Health check endpoint for load balancers and monitoring
 * GET /api/health
 * 
 * Returns:
 * - 200: All services healthy
 * - 503: One or more services degraded/unhealthy
 */
export async function GET() {
  const checks: HealthCheckResult = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      cache: "disconnected",
      database: "disconnected",
    },
    version: process.env.npm_package_version || "unknown",
    environment: process.env.NODE_ENV || "unknown",
  };

  // Check cache connectivity
  try {
    const testKey = `health:check:${Date.now()}`;
    await cache.set(testKey, Date.now(), 10);
    const value = await cache.get(testKey);
    await cache.delete(testKey); // Clean up
    checks.services.cache = value ? "connected" : "degraded";
  } catch (error) {
    console.error("Health check - cache error:", error);
    checks.services.cache = "disconnected";
  }

  // Check database (Supabase) - actually test the connection
  try {
    const supabase = await createClient();
    
    // Try to query a simple table with a limit of 1
    // This tests both connectivity and auth
    const { error } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);
    
    if (error) {
      // RLS might block the query, but connection is still good
      // Check if it's an auth/RLS error vs actual connection error
      if (error.code === 'PGRST301' || error.message.includes('JWT')) {
        // Auth-related error but connection is fine
        checks.services.database = "connected";
      } else {
        console.error("Health check - database error:", error);
        checks.services.database = "disconnected";
      }
    } else {
      checks.services.database = "connected";
    }
  } catch (error) {
    console.error("Health check - database connection error:", error);
    checks.services.database = "disconnected";
  }

  // Determine overall status
  const cacheOk = checks.services.cache === "connected";
  const dbOk = checks.services.database === "connected";

  if (!dbOk) {
    // Database is critical - unhealthy if down
    checks.status = "unhealthy";
  } else if (!cacheOk) {
    // Cache is nice-to-have - degraded if down
    checks.status = "degraded";
  } else {
    checks.status = "healthy";
  }

  return NextResponse.json(checks, {
    status: checks.status === "healthy" ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
