"use client";

import { useState, useEffect, use } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  User,
  FileText,
  Calendar,
  AlertTriangle,
  Activity,
  Heart,
  Shield,
  Loader2,
  Sparkles,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import type { InsuranceSummary } from "@/types/database";

interface PatientReport {
  id: string;
  created_at: string;
  ai_analysis: {
    classification?: string;
    findings?: Array<{
      category: string;
      description: string;
      severity: string;
    }>;
    draft_report?: {
      summary: string;
    };
  };
  patient_info?: {
    name: string;
    age?: number;
    gender?: string;
    dob?: string;
  };
}

export default function PatientSummaryPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const resolvedParams = use(params);
  const patientName = decodeURIComponent(resolvedParams.name);
  const searchParams = useSearchParams();
  const orgId = searchParams.get("org_id");

  const [reports, setReports] = useState<PatientReport[]>([]);
  const [summary, setSummary] = useState<InsuranceSummary | null>(null);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Fetch patient reports
  useEffect(() => {
    async function fetchReports() {
      if (!orgId) return;

      try {
        const res = await fetch(
          `/api/insurance/patients/${encodeURIComponent(patientName)}/reports?org_id=${orgId}`
        );
        const data = await res.json();
        if (data.error) {
          setError(data.error);
        } else {
          setReports(data.reports || []);
        }
      } catch (err) {
        console.error("Failed to fetch reports:", err);
        setError("Failed to load patient reports");
      } finally {
        setIsLoadingReports(false);
      }
    }
    fetchReports();
  }, [patientName, orgId]);

  // Track patient view activity
  useEffect(() => {
    async function trackActivity() {
      if (!orgId || reports.length === 0) return;

      // Determine basic risk level from reports
      let riskLevel = "low";
      const hasHighRisk = reports.some(
        (r) => r.ai_analysis?.classification === "critical" || r.ai_analysis?.classification === "high"
      );
      const hasMediumRisk = reports.some(
        (r) => r.ai_analysis?.classification === "abnormal" || r.ai_analysis?.classification === "medium"
      );

      if (hasHighRisk) riskLevel = "high";
      else if (hasMediumRisk) riskLevel = "medium";

      try {
        await fetch("/api/insurance/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patient_name: patientName,
            organization_id: orgId,
            risk_level: riskLevel,
            // organization_name will be handled if we had it, but for now we skip or backend handles?
            // backend table allows null organization_name, so we are good.
          }),
        });
      } catch (error) {
        console.error("Failed to track activity:", error);
      }
    }

    trackActivity();
  }, [reports, patientName, orgId]);

  const handleGenerateSummary = async () => {
    if (!orgId) return;

    setIsGeneratingSummary(true);
    setProgress(0);
    setError(null);

    // Simulate progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.floor(Math.random() * 10) + 5;
      });
    }, 500);

    try {
      const res = await fetch("/api/insurance/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: orgId,
          patient_name: patientName,
        }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setSummary(data.summary);
        setProgress(100);
      }
    } catch (err) {
      console.error("Failed to generate summary:", err);
      setError("Failed to generate AI summary");
    } finally {
      clearInterval(interval);
      setIsGeneratingSummary(false);
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case "high":
        return "bg-destructive-100 text-destructive-700 border-destructive-200";
      case "medium":
        return "bg-warning-100 text-warning-700 border-warning-200";
      default:
        return "bg-success-100 text-success-700 border-success-200";
    }
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case "critical":
        return "bg-destructive-100 text-destructive-700";
      case "abnormal":
        return "bg-warning-100 text-warning-700";
      default:
        return "bg-success-100 text-success-700";
    }
  };

  // Get patient info from first report
  const patientInfo = reports[0]?.patient_info;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/insurance/search"
        className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Search
      </Link>

      {/* Patient Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-800 text-2xl font-bold">
            {patientName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">{patientName}</h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-neutral-500">
              {patientInfo?.age && (
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {patientInfo.age} years
                </span>
              )}
              {patientInfo?.gender && (
                <span className="capitalize">{patientInfo.gender}</span>
              )}
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                {reports.length} report{reports.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Generate Summary Button */}
        <Button
          onClick={handleGenerateSummary}
          disabled={isGeneratingSummary || reports.length === 0}
          className="bg-primary-800 hover:bg-primary-700"
        >
          {isGeneratingSummary ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating... {progress}%
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {summary ? "Regenerate AI Summary" : "Generate AI Summary"}
            </>
          )}
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive-50 border border-destructive-100">
          <AlertCircle className="h-5 w-5 text-destructive-600 shrink-0 mt-0.5" />
          <p className="text-sm text-destructive-700">{error}</p>
        </div>
      )}

      {/* AI Summary Section */}
      {summary && (
        <Card className="border-2 border-primary-200 bg-primary-50/30">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
                <Sparkles className="h-5 w-5 text-primary-800" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">
                  AI Health Summary
                </h2>
                <p className="text-sm text-neutral-500">
                  Generated from {summary.total_reports} reports
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Risk Score */}
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-600 mb-2">
                  Insurance Risk Score
                </p>
                <div className="flex items-center gap-4">
                  <div className="relative h-4 flex-1 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className={`absolute left-0 top-0 h-full rounded-full transition-all ${summary.risk_level === "high"
                        ? "bg-destructive-500"
                        : summary.risk_level === "medium"
                          ? "bg-warning-500"
                          : "bg-success-500"
                        }`}
                      style={{ width: `${summary.risk_score}%` }}
                    />
                  </div>
                  <span className="text-2xl font-bold text-neutral-900">
                    {summary.risk_score}
                  </span>
                </div>
              </div>
              <div
                className={`px-4 py-2 rounded-lg border ${getRiskLevelColor(
                  summary.risk_level
                )}`}
              >
                <p className="text-xs uppercase tracking-wider font-medium mb-0.5">
                  Risk Level
                </p>
                <p className="text-lg font-bold capitalize">{summary.risk_level}</p>
              </div>
            </div>

            {/* Health Summary */}
            <div>
              <h3 className="text-sm font-medium text-neutral-600 mb-2 flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Health Summary
              </h3>
              <p className="text-neutral-800 leading-relaxed">
                {summary.health_summary}
              </p>
            </div>

            {/* Risk Factors */}
            {summary.risk_factors.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-neutral-600 mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Risk Factors
                </h3>
                <div className="space-y-2">
                  {summary.risk_factors.map((factor, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg bg-white border border-neutral-100"
                    >
                      <div
                        className={`mt-0.5 h-2 w-2 rounded-full ${factor.severity === "high"
                          ? "bg-destructive-500"
                          : factor.severity === "medium"
                            ? "bg-warning-500"
                            : "bg-success-500"
                          }`}
                      />
                      <div>
                        <p className="font-medium text-neutral-900">
                          {factor.factor}
                        </p>
                        <p className="text-sm text-neutral-500">{factor.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chronic Conditions */}
            {summary.chronic_conditions.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-neutral-600 mb-2 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Chronic Conditions
                </h3>
                <div className="flex flex-wrap gap-2">
                  {summary.chronic_conditions.map((condition, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 rounded-full bg-neutral-100 text-neutral-700 text-sm font-medium"
                    >
                      {condition}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {summary.recommendations.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-neutral-600 mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Underwriting Recommendations
                </h3>
                <ul className="space-y-1.5">
                  {summary.recommendations.map((rec, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-neutral-700"
                    >
                      <Shield className="h-4 w-4 text-primary-600 mt-0.5 shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reports Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100">
              <FileText className="h-5 w-5 text-neutral-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">
                Medical Reports
              </h2>
              <p className="text-sm text-neutral-500">
                {isLoadingReports
                  ? "Loading..."
                  : `${reports.length} report${reports.length !== 1 ? "s" : ""} on file`}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingReports ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-neutral-300 mb-3" />
              <p className="text-neutral-600">No reports found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="p-4 rounded-xl border border-neutral-100 hover:border-neutral-200 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${getClassificationColor(
                            report.ai_analysis?.classification || "normal"
                          )}`}
                        >
                          {(report.ai_analysis?.classification || "normal")
                            .charAt(0)
                            .toUpperCase() +
                            (report.ai_analysis?.classification || "normal").slice(1)}
                        </span>
                        <span className="text-xs text-neutral-400">•</span>
                        <span className="text-xs text-neutral-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(report.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-700 line-clamp-2">
                        {report.ai_analysis?.draft_report?.summary ||
                          "No summary available"}
                      </p>
                    </div>
                  </div>

                  {/* Findings Preview */}
                  {report.ai_analysis?.findings &&
                    report.ai_analysis.findings.length > 0 && (() => {
                      // Get unique categories
                      const uniqueCategories = [...new Set(report.ai_analysis.findings.map(f => f.category))];
                      return (
                        <div className="mt-3 pt-3 border-t border-neutral-100">
                          <p className="text-xs text-neutral-500 mb-2">
                            Key Findings:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {uniqueCategories.slice(0, 3).map((category, i) => (
                              <span
                                key={i}
                                className="text-xs px-2 py-1 rounded bg-neutral-50 text-neutral-600"
                              >
                                {category}
                              </span>
                            ))}
                            {uniqueCategories.length > 3 && (
                              <span className="text-xs px-2 py-1 rounded bg-neutral-50 text-neutral-500">
                                +{uniqueCategories.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
