import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cache, CacheKeys, CacheTTL } from "@/lib/cache";
import { z } from "zod";

interface StatsData {
  totalReports: number;
  pendingReview: number;
  normalCount: number;
  abnormalCount: number;
  criticalCount: number;
  monthlyReports: number;
  adjustmentRequired: number;
  recentReports: Array<{
    id: string;
    name: string;
    classification: string;
    status: string;
    createdAt: string;
  }>;
}

// Schema for validating JSONB fields from database
const originalFileSchema = z.object({
  name: z.string().optional(),
}).passthrough();

const aiAnalysisSchema = z.object({
  classification: z.enum(["normal", "abnormal", "critical", "pending"]).optional(),
}).passthrough();

const reviewSchema = z.object({
  status: z.enum(["pending", "approved", "adjustment_required"]).optional(),
}).passthrough();

// Safe parser that returns default on failure
function safeParseJsonb<T>(schema: z.ZodType<T>, data: unknown, defaultValue: T): T {
  const result = schema.safeParse(data);
  return result.success ? result.data : defaultValue;
}

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile to get organization_id
    const { data: profile } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 401 });
    }

    const organizationId = profile.organization_id;
    const cacheKey = CacheKeys.reportsStats(organizationId);

    // Check cache first
    const cachedStats = await cache.get<StatsData>(cacheKey);
    if (cachedStats) {
      return NextResponse.json({
        data: cachedStats,
        cached: true,
      });
    }

    // Get current month's start date
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Run aggregation queries in parallel using allSettled (one failure won't break all)
    const results = await Promise.allSettled([
      supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId),
      supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('review->>status', 'pending'),
      supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('ai_analysis->>classification', 'normal'),
      supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('ai_analysis->>classification', 'abnormal'),
      supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('ai_analysis->>classification', 'critical'),
      supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('created_at', monthStart),
    ]);

    // Extract counts safely, defaulting to 0 on failure
    const getCount = (result: PromiseSettledResult<{ count: number | null }>) => {
      if (result.status === 'fulfilled') {
        return result.value.count || 0;
      }
      console.warn('Stats query failed:', result.reason);
      return 0;
    };

    const totalReports = getCount(results[0]);
    const pendingReview = getCount(results[1]);
    const normalCount = getCount(results[2]);
    const abnormalCount = getCount(results[3]);
    const criticalCount = getCount(results[4]);
    const monthlyReports = getCount(results[5]);

    // Get recent reports
    const { data: recentReports, error: recentReportsError } = await supabase
      .from('reports')
      .select('id, original_file, ai_analysis, review, created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentReportsError) {
      console.error("Error fetching recent reports:", recentReportsError);
    }

    const statsData: StatsData = {
      totalReports,
      pendingReview,
      normalCount,
      abnormalCount,
      criticalCount,
      monthlyReports,
      adjustmentRequired: abnormalCount + criticalCount,
      recentReports: recentReports?.map(r => {
        // Safely parse JSONB fields with validation
        const originalFile = safeParseJsonb(originalFileSchema, r.original_file, {});
        const aiAnalysis = safeParseJsonb(aiAnalysisSchema, r.ai_analysis, {});
        const review = safeParseJsonb(reviewSchema, r.review, {});

        return {
          id: r.id,
          name: originalFile.name || 'Unknown',
          classification: aiAnalysis.classification || "pending",
          status: review.status || "pending",
          createdAt: r.created_at,
        };
      }) || [],
    };

    // Cache for 5 minutes — stats don't change frequently enough to justify 60s
    await cache.set(cacheKey, statsData, CacheTTL.MEDIUM);

    return NextResponse.json({
      data: statsData,
      cached: false,
    });
  } catch (error) {
    console.error("Stats GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
