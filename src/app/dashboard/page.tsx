"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  RefreshCw,
  Upload,
  ArrowRight,
  BarChart3,
  Eye,
  TrendingUp,
} from "lucide-react";

interface DashboardStats {
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

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { profile, user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const retryCountRef = useRef(0);

  const userName = profile?.profile?.first_name
    ? `${profile.profile.first_name} ${profile.profile.last_name || ""}`.trim()
    : "Doctor";

  const fetchStats = async (isRetry = false) => {
    setIsLoading(true);
    if (!isRetry) {
      setError(null);
    }
    try {
      const response = await fetch("/api/reports/stats");
      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }
      const data = await response.json();
      setStats(data.data);
      retryCountRef.current = 0; // Reset on success
    } catch (err) {
      // Auto-retry once after a short delay
      if (!isRetry && retryCountRef.current < 1) {
        retryCountRef.current++;
        setTimeout(() => fetchStats(true), 1500);
        return; // Don't set error yet, wait for retry
      }
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch stats when profile is ready with organization_id
    // This prevents race condition where dashboard fetches before auth is complete
    if (profile?.organization_id) {
      fetchStats();
    }
  }, [profile?.organization_id]);

  // Show loading if auth is still loading OR if user exists but profile not yet loaded
  if (authLoading || (user && !profile)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-primary-100 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary-800" />
            </div>
          </div>
          <p className="text-neutral-500 text-sm">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-primary-100 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary-800" />
            </div>
          </div>
          <p className="text-neutral-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-destructive-50 flex items-center justify-center">
          <AlertTriangle className="h-7 w-7 text-destructive-600" />
        </div>
        <p className="text-destructive-600 font-medium">{error}</p>
        <Button onClick={() => fetchStats()} variant="outline">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Reports",
      value: stats?.totalReports || 0,
      description: "All time",
      icon: FileText,
      color: "primary" as const,
      trend: "+12%",
    },
    {
      title: "Pending Review",
      value: stats?.pendingReview || 0,
      description: "Awaiting analysis",
      icon: Clock,
      color: "warning" as const,
    },
    {
      title: "Needs Attention",
      value: stats?.adjustmentRequired || 0,
      description: "Requires review",
      icon: AlertTriangle,
      color: "destructive" as const,
    },
    {
      title: "Completed",
      value: stats?.normalCount || 0,
      description: "Normal results",
      icon: CheckCircle,
      color: "success" as const,
    },
  ];

  const getIconBgColor = (color: string) => {
    switch (color) {
      case "primary":
        return "bg-primary-100 text-primary-800";
      case "warning":
        return "bg-warning-100 text-warning-700";
      case "destructive":
        return "bg-destructive-100 text-destructive-700";
      case "success":
        return "bg-success-100 text-success-700";
      default:
        return "bg-neutral-100 text-neutral-600";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="text-sm text-neutral-500 mb-1">{getGreeting()},</p>
          <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 tracking-tight">
            {userName}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchStats()}
            disabled={isLoading}
            className="text-neutral-500"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/dashboard/reports/upload">
            <Button size="sm">
              <Upload className="h-4 w-4" />
              Upload
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <div
            key={stat.title}
            className="group relative overflow-hidden rounded-2xl border border-neutral-200/60 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Background gradient on hover */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary-50/50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-neutral-500">
                  {stat.title}
                </span>
                <div className={`p-2 rounded-xl ${getIconBgColor(stat.color)}`}>
                  <stat.icon className="h-4 w-4" strokeWidth={2} />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-neutral-900 tabular-nums">
                  {stat.value}
                </span>
                {stat.trend && (
                  <span className="flex items-center text-xs font-medium text-success-600">
                    <TrendingUp className="h-3 w-3 mr-0.5" />
                    {stat.trend}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-1">{stat.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Reports - Two Columns */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Priority Queue - Adjustment Required */}
        <Card className="border-l-4 border-l-warning-500">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-warning-100">
                <AlertTriangle className="h-4 w-4 text-warning-600" strokeWidth={2} />
              </div>
              <div>
                <CardTitle className="text-base">Requires Attention</CardTitle>
                <CardDescription className="text-xs">Reports needing review</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {stats?.recentReports
                .filter(
                  (r) =>
                    r.status === "adjustment_required" || r.status === "pending"
                )
                .slice(0, 4)
                .map((report) => (
                  <Link
                    key={report.id}
                    href={`/dashboard/reports/${report.id}`}
                    className="flex items-center justify-between p-3 rounded-xl border border-neutral-100 hover:border-warning-200 hover:bg-warning-50/30 transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-1.5 rounded-lg bg-neutral-100 group-hover:bg-white transition-colors shrink-0">
                        <FileText className="h-3.5 w-3.5 text-neutral-500" strokeWidth={2} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-800 group-hover:text-warning-700 transition-colors truncate">
                          {report.name}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="adjustment" className="shrink-0 ml-2">Review</Badge>
                  </Link>
                ))}
              {(!stats?.recentReports ||
                stats.recentReports.filter(
                  (r) =>
                    r.status === "adjustment_required" || r.status === "pending"
                ).length === 0) && (
                <div className="text-center py-8">
                  <div className="w-10 h-10 rounded-xl bg-success-50 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle className="h-5 w-5 text-success-500" strokeWidth={2} />
                  </div>
                  <p className="text-sm text-neutral-500">All caught up</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Normal Reports */}
        <Card className="border-l-4 border-l-success-500">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-success-100">
                <CheckCircle className="h-4 w-4 text-success-600" strokeWidth={2} />
              </div>
              <div>
                <CardTitle className="text-base">Completed</CardTitle>
                <CardDescription className="text-xs">Recently approved reports</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {stats?.recentReports
                .filter((r) => r.status === "approved")
                .slice(0, 4)
                .map((report) => (
                  <Link
                    key={report.id}
                    href={`/dashboard/reports/${report.id}`}
                    className="flex items-center justify-between p-3 rounded-xl border border-neutral-100 hover:border-success-200 hover:bg-success-50/30 transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-1.5 rounded-lg bg-neutral-100 group-hover:bg-white transition-colors shrink-0">
                        <FileText className="h-3.5 w-3.5 text-neutral-500" strokeWidth={2} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-800 group-hover:text-success-700 transition-colors truncate">
                          {report.name}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="normal" className="shrink-0 ml-2">Normal</Badge>
                  </Link>
                ))}
              {(!stats?.recentReports ||
                stats.recentReports.filter((r) => r.status === "approved")
                  .length === 0) && (
                <div className="text-center py-8">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center mx-auto mb-2">
                    <FileText className="h-5 w-5 text-neutral-400" strokeWidth={2} />
                  </div>
                  <p className="text-sm text-neutral-500">No completed reports</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link href="/dashboard/reports/upload">
            <div className="group p-5 rounded-xl border border-neutral-200 hover:border-primary-200 hover:bg-primary-50/30 transition-all cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center mb-3 group-hover:bg-primary-800 group-hover:shadow-md group-hover:shadow-primary-800/15 transition-all">
                <Upload className="h-4 w-4 text-primary-800 group-hover:text-white transition-colors" strokeWidth={2} />
              </div>
              <p className="font-medium text-neutral-800 group-hover:text-primary-800 transition-colors text-sm">
                Upload Reports
              </p>
              <p className="text-xs text-neutral-400 mt-0.5">Add new files</p>
            </div>
          </Link>
          <Link href="/dashboard/reports">
            <div className="group p-5 rounded-xl border border-neutral-200 hover:border-primary-200 hover:bg-primary-50/30 transition-all cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center mb-3 group-hover:bg-primary-800 group-hover:shadow-md group-hover:shadow-primary-800/15 transition-all">
                <Eye className="h-4 w-4 text-neutral-600 group-hover:text-white transition-colors" strokeWidth={2} />
              </div>
              <p className="font-medium text-neutral-800 group-hover:text-primary-800 transition-colors text-sm">
                View All Reports
              </p>
              <p className="text-xs text-neutral-400 mt-0.5">Browse files</p>
            </div>
          </Link>
          <div className="p-5 rounded-xl border border-neutral-200 opacity-50 cursor-not-allowed">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center mb-3">
              <BarChart3 className="h-4 w-4 text-neutral-400" strokeWidth={2} />
            </div>
            <p className="font-medium text-neutral-500 text-sm">Analytics</p>
            <p className="text-xs text-neutral-400 mt-0.5">Coming soon</p>
          </div>
          <div className="p-5 rounded-xl border border-neutral-200 opacity-50 cursor-not-allowed">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center mb-3">
              <ArrowRight className="h-4 w-4 text-neutral-400" strokeWidth={2} />
            </div>
            <p className="font-medium text-neutral-500 text-sm">Export Data</p>
            <p className="text-xs text-neutral-400 mt-0.5">Coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}
