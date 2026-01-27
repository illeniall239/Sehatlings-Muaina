import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cache, CacheKeys, CacheTTL } from "@/lib/cache";

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

    // Run aggregation queries in parallel
    const [
      totalReportsResult,
      pendingReviewResult,
      normalCountResult,
      abnormalCountResult,
      criticalCountResult,
      monthlyReportsResult,
    ] = await Promise.all([
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
      totalReports: totalReportsResult.count || 0,
      pendingReview: pendingReviewResult.count || 0,
      normalCount: normalCountResult.count || 0,
      abnormalCount: abnormalCountResult.count || 0,
      criticalCount: criticalCountResult.count || 0,
      monthlyReports: monthlyReportsResult.count || 0,
      adjustmentRequired: (abnormalCountResult.count || 0) + (criticalCountResult.count || 0),
      recentReports: recentReports?.map(r => ({
        id: r.id,
        name: (r.original_file as { name?: string })?.name || 'Unknown',
        classification: (r.ai_analysis as { classification?: string })?.classification || "pending",
        status: (r.review as { status?: string })?.status || "pending",
        createdAt: r.created_at,
      })) || [],
    };

    // Cache for 1 minute (stats change frequently when uploading)
    await cache.set(cacheKey, statsData, CacheTTL.SHORT);

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
