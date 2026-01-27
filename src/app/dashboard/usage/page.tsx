"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  DollarSign,
  Zap,
  FileText,
  TrendingUp,
  Calendar,
  RefreshCw,
  AlertTriangle,
  BarChart3,
} from "lucide-react";

interface UsageData {
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
  summary: {
    totalReports: number;
    totalApiCalls: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    totalCostUSD: number;
    avgTokensPerReport: number;
    avgCostPerReport: number;
    avgProcessingTimeMs: number;
  };
  costBreakdown: {
    inputCostUSD: number;
    outputCostUSD: number;
    totalCostUSD: number;
  };
  projectedMonthlyCost: number;
  dailyUsage: Array<{
    date: string;
    reports: number;
    tokens: number;
    cost: number;
  }>;
}

export default function UsagePage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  // Check if user has access (admin or director only)
  const hasAccess = profile?.role === "admin" || profile?.role === "director";

  useEffect(() => {
    if (!authLoading && !hasAccess) {
      router.push("/dashboard");
    }
  }, [authLoading, hasAccess, router]);

  const fetchUsage = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/usage?days=${days}`);
      if (!response.ok) {
        throw new Error("Failed to fetch usage data");
      }
      const data = await response.json();
      setUsage(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess) {
      fetchUsage();
    }
  }, [days, hasAccess]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-800" />
      </div>
    );
  }

  // Redirect if no access
  if (!hasAccess) {
    return null;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            AI Usage & Costs
          </h1>
          <p className="text-neutral-500 mt-1">
            Monitor API usage, token consumption, and costs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="h-9 px-3 rounded-lg border border-neutral-300 text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsage}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Admin Notice */}
      <div className="flex items-center gap-2 p-3 bg-primary-50 border border-primary-100 rounded-lg text-sm text-primary-800">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>This page is only visible to administrators and directors.</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary-800" />
            <p className="text-sm text-neutral-500">Loading usage data...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
          <AlertTriangle className="h-12 w-12 text-destructive-500" />
          <p className="text-destructive-600">{error}</p>
          <Button onClick={fetchUsage}>Try Again</Button>
        </div>
      ) : usage ? (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary-100">
                    <FileText className="h-5 w-5 text-primary-700" />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Reports Analyzed</p>
                    <p className="text-2xl font-bold text-neutral-900">
                      {formatNumber(usage.summary.totalReports)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-blue-100">
                    <Zap className="h-5 w-5 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Total Tokens</p>
                    <p className="text-2xl font-bold text-neutral-900">
                      {formatNumber(usage.summary.totalTokens)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-green-100">
                    <DollarSign className="h-5 w-5 text-green-700" />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Total Cost</p>
                    <p className="text-2xl font-bold text-neutral-900">
                      {formatCurrency(usage.summary.totalCostUSD)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-orange-100">
                    <TrendingUp className="h-5 w-5 text-orange-700" />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Projected/Month</p>
                    <p className="text-2xl font-bold text-neutral-900">
                      {formatCurrency(usage.projectedMonthlyCost)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Stats */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Cost Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Cost Breakdown
                </CardTitle>
                <CardDescription>
                  Token costs for the selected period
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-neutral-50 rounded-lg">
                  <span className="text-sm text-neutral-600">Input Tokens</span>
                  <div className="text-right">
                    <p className="font-medium">{formatNumber(usage.summary.totalInputTokens)}</p>
                    <p className="text-xs text-neutral-500">{formatCurrency(usage.costBreakdown.inputCostUSD)}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-neutral-50 rounded-lg">
                  <span className="text-sm text-neutral-600">Output Tokens</span>
                  <div className="text-right">
                    <p className="font-medium">{formatNumber(usage.summary.totalOutputTokens)}</p>
                    <p className="text-xs text-neutral-500">{formatCurrency(usage.costBreakdown.outputCostUSD)}</p>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Cost</span>
                    <span className="text-xl font-bold text-green-600">
                      {formatCurrency(usage.costBreakdown.totalCostUSD)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Averages */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Per-Report Averages
                </CardTitle>
                <CardDescription>
                  Average usage per analyzed report
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-neutral-50 rounded-lg">
                  <span className="text-sm text-neutral-600">Avg Tokens/Report</span>
                  <p className="font-medium">{formatNumber(usage.summary.avgTokensPerReport)}</p>
                </div>
                <div className="flex justify-between items-center p-3 bg-neutral-50 rounded-lg">
                  <span className="text-sm text-neutral-600">Avg Cost/Report</span>
                  <p className="font-medium">{formatCurrency(usage.summary.avgCostPerReport)}</p>
                </div>
                <div className="flex justify-between items-center p-3 bg-neutral-50 rounded-lg">
                  <span className="text-sm text-neutral-600">Avg Processing Time</span>
                  <p className="font-medium">{(usage.summary.avgProcessingTimeMs / 1000).toFixed(2)}s</p>
                </div>
                <div className="flex justify-between items-center p-3 bg-neutral-50 rounded-lg">
                  <span className="text-sm text-neutral-600">API Calls</span>
                  <p className="font-medium">{formatNumber(usage.summary.totalApiCalls)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily Usage Table */}
          {usage.dailyUsage.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary-600" />
                  Daily Usage
                </CardTitle>
                <CardDescription>
                  Day-by-day breakdown of usage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-neutral-600">Date</th>
                        <th className="text-right py-3 px-4 font-medium text-neutral-600">Reports</th>
                        <th className="text-right py-3 px-4 font-medium text-neutral-600">Tokens</th>
                        <th className="text-right py-3 px-4 font-medium text-neutral-600">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usage.dailyUsage.slice().reverse().map((day) => (
                        <tr key={day.date} className="border-b last:border-0 hover:bg-neutral-50">
                          <td className="py-3 px-4">{new Date(day.date).toLocaleDateString()}</td>
                          <td className="py-3 px-4 text-right">{day.reports}</td>
                          <td className="py-3 px-4 text-right">{formatNumber(day.tokens)}</td>
                          <td className="py-3 px-4 text-right">{formatCurrency(day.cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pricing Info */}
          <Card className="bg-neutral-50 border-dashed">
            <CardContent className="pt-6">
              <p className="text-sm text-neutral-600">
                <strong>Pricing:</strong> Claude Sonnet 4 - Input: $3/million tokens, Output: $15/million tokens.
                Costs are estimates based on token usage.
              </p>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
