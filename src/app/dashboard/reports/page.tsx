"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Eye,
  Download,
  Upload,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  FolderOpen,
} from "lucide-react";
import type { Report } from "@/types/database";

type FilterStatus = "all" | "normal" | "adjustment_required";

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");

  const fetchReports = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter === "normal") {
        params.set("status", "approved");
      } else if (statusFilter === "adjustment_required") {
        params.set("status", "adjustment_required");
      }

      const response = await fetch(`/api/reports?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch reports");
      }
      const data = await response.json();
      setReports(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [statusFilter]);

  const filteredReports = reports;

  const getReportStatus = (
    report: Report
  ): "normal" | "adjustment_required" => {
    return report.review.status === "approved" ? "normal" : "adjustment_required";
  };

  const normalCount = reports.filter(
    (r) => r.review.status === "approved"
  ).length;
  const adjustmentCount = reports.filter(
    (r) =>
      r.review.status === "adjustment_required" || r.review.status === "pending"
  ).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-800 tracking-tight">
            Reports
          </h1>
          <p className="text-neutral-500 mt-1">
            View and manage all analyzed pathology reports
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={fetchReports}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Link href="/dashboard/reports/upload">
            <Button>
              <Upload className="h-4 w-4" />
              Upload Reports
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters & Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-2">
              <div className="flex bg-neutral-100 rounded-xl p-1">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    statusFilter === "all"
                      ? "bg-white text-neutral-800 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-700"
                  }`}
                >
                  All
                  <span className="ml-1.5 text-xs opacity-60">
                    {reports.length}
                  </span>
                </button>
                <button
                  onClick={() => setStatusFilter("normal")}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                    statusFilter === "normal"
                      ? "bg-white text-success-700 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-700"
                  }`}
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Normal
                  <span className="text-xs opacity-60">{normalCount}</span>
                </button>
                <button
                  onClick={() => setStatusFilter("adjustment_required")}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                    statusFilter === "adjustment_required"
                      ? "bg-white text-warning-700 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-700"
                  }`}
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Needs Review
                  <span className="text-xs opacity-60">{adjustmentCount}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Download Actions */}
          <div className="flex gap-3 mt-6 pt-6 border-t border-neutral-100">
            <Button
              variant="outline"
              size="sm"
              disabled={normalCount === 0}
              className="text-neutral-600"
            >
              <Download className="h-4 w-4" />
              Export Normal ({normalCount})
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={adjustmentCount === 0}
              className="text-neutral-600"
            >
              <Download className="h-4 w-4" />
              Export Needs Review ({adjustmentCount})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary-100">
              <FileText className="h-5 w-5 text-primary-800" />
            </div>
            <div>
              <CardTitle className="text-lg">Report List</CardTitle>
              <CardDescription>
                {filteredReports.length} report
                {filteredReports.length !== 1 ? "s" : ""} found
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary-800 mb-4" />
              <p className="text-neutral-500">Loading reports...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-destructive-50 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-destructive-600" />
              </div>
              <p className="text-destructive-600 font-medium">{error}</p>
              <Button onClick={fetchReports}>Try Again</Button>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
                <FolderOpen className="h-8 w-8 text-neutral-400" />
              </div>
              {reports.length === 0 ? (
                <>
                  <p className="text-neutral-600 font-medium mb-1">
                    No reports yet
                  </p>
                  <p className="text-neutral-400 text-sm mb-6">
                    Upload your first pathology report to get started
                  </p>
                  <Link href="/dashboard/reports/upload">
                    <Button>
                      <Upload className="h-4 w-4" />
                      Upload Reports
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-neutral-600 font-medium mb-1">
                    No matching reports
                  </p>
                  <p className="text-neutral-400 text-sm">
                    Try adjusting your search or filter
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReports.map((report, index) => (
                <Link
                  key={report.id}
                  href={`/dashboard/reports/${report.id}`}
                  className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 hover:border-primary-200 hover:bg-primary-50/30 transition-all group animate-fade-in"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-neutral-100 group-hover:bg-white transition-colors">
                      <FileText className="h-5 w-5 text-neutral-500" />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-800 group-hover:text-primary-800 transition-colors line-clamp-1">
                        {report.original_file.name}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-neutral-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(report.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {report.ai_analysis.status === "processing" ? (
                      <Badge variant="processing">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Processing
                      </Badge>
                    ) : report.ai_analysis.status === "failed" ? (
                      <Badge variant="failed">Failed</Badge>
                    ) : (
                      <Badge
                        variant={
                          getReportStatus(report) === "normal"
                            ? "normal"
                            : "adjustment"
                        }
                      >
                        {getReportStatus(report) === "normal"
                          ? "Normal"
                          : "Needs Review"}
                      </Badge>
                    )}

                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
