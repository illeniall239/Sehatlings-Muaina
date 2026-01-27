import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/usage
 * Get AI usage statistics for the current organization
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile to get organization_id
    const { data: profile } = await supabase
      .from("users")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 401 }
      );
    }

    const organizationId = profile.organization_id;

    // Get date range from query params (default: last 30 days)
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "30", 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch all reports with AI analysis for this organization
    const { data: reports, error } = await supabase
      .from("reports")
      .select("id, ai_analysis, created_at")
      .eq("organization_id", organizationId)
      .gte("created_at", startDate.toISOString())
      .not("ai_analysis->usage", "is", null);

    if (error) {
      console.error("Error fetching usage data:", error);
      return NextResponse.json(
        { error: "Failed to fetch usage data" },
        { status: 500 }
      );
    }

    // Calculate aggregated statistics
    let totalReports = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalTokens = 0;
    let totalCostUSD = 0;
    let totalApiCalls = 0;
    let totalProcessingTimeMs = 0;

    const dailyUsage: Record<string, {
      reports: number;
      tokens: number;
      cost: number;
    }> = {};

    for (const report of reports || []) {
      const analysis = report.ai_analysis as {
        usage?: {
          input_tokens: number;
          output_tokens: number;
          total_tokens: number;
          estimated_cost_usd: number;
          api_calls: number;
        };
        processing_time_ms?: number;
      };

      if (analysis?.usage) {
        totalReports++;
        totalInputTokens += analysis.usage.input_tokens || 0;
        totalOutputTokens += analysis.usage.output_tokens || 0;
        totalTokens += analysis.usage.total_tokens || 0;
        totalCostUSD += analysis.usage.estimated_cost_usd || 0;
        totalApiCalls += analysis.usage.api_calls || 0;
        totalProcessingTimeMs += analysis.processing_time_ms || 0;

        // Group by day
        const date = new Date(report.created_at).toISOString().split("T")[0];
        if (!dailyUsage[date]) {
          dailyUsage[date] = { reports: 0, tokens: 0, cost: 0 };
        }
        dailyUsage[date].reports++;
        dailyUsage[date].tokens += analysis.usage.total_tokens || 0;
        dailyUsage[date].cost += analysis.usage.estimated_cost_usd || 0;
      }
    }

    // Calculate averages
    const avgTokensPerReport = totalReports > 0 ? Math.round(totalTokens / totalReports) : 0;
    const avgCostPerReport = totalReports > 0 ? totalCostUSD / totalReports : 0;
    const avgProcessingTime = totalReports > 0 ? Math.round(totalProcessingTimeMs / totalReports) : 0;

    // Convert daily usage to sorted array
    const dailyUsageArray = Object.entries(dailyUsage)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      },
      summary: {
        totalReports,
        totalApiCalls,
        totalInputTokens,
        totalOutputTokens,
        totalTokens,
        totalCostUSD: Math.round(totalCostUSD * 1000000) / 1000000, // 6 decimal places
        avgTokensPerReport,
        avgCostPerReport: Math.round(avgCostPerReport * 1000000) / 1000000,
        avgProcessingTimeMs: avgProcessingTime,
      },
      // Cost breakdown
      costBreakdown: {
        inputCostUSD: Math.round((totalInputTokens / 1_000_000) * 3 * 1000000) / 1000000,
        outputCostUSD: Math.round((totalOutputTokens / 1_000_000) * 15 * 1000000) / 1000000,
        totalCostUSD: Math.round(totalCostUSD * 1000000) / 1000000,
      },
      // Estimated monthly cost (extrapolated)
      projectedMonthlyCost: totalReports > 0 
        ? Math.round((totalCostUSD / days) * 30 * 100) / 100 
        : 0,
      dailyUsage: dailyUsageArray,
    });
  } catch (error) {
    console.error("Usage API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
