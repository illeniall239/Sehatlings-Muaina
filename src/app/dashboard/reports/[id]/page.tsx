"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { EditableSection } from "@/components/EditableSection";
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
  ArrowLeft,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Loader2,
  Brain,
  Stethoscope,
  Activity,
  ThumbsUp,
  RotateCcw,
  Edit,
  CircleDot,
  ChevronRight,
  Check,
  X,
  HardDrive,
  Calendar,
  Shield,
  HeartPulse,
  Phone,
  MapPin,
  User,
  Banknote,
  ShieldAlert,
  Utensils,
  CalendarClock,
  Eye,
} from "lucide-react";

interface Report {
  id: string;
  organization_id: string;
  uploaded_by: string | null;
  original_file: {
    name: string;
    type: string;
    size: number;
    path: string;
    uploaded_at: string;
  };
  extracted_content: {
    raw_text: string;
    extracted_at: string;
  } | null;
  ai_analysis: {
    status: string;
    classification?: string;
    findings?: Array<{
      category: string;
      description: string;
      severity: string;
    }>;
    draft_report?: {
      summary: string;
      details: string;
    };
    error?: string;
  };
  review: {
    status: string;
    pathologist_findings?: string;
    reviewed_by?: string;
    reviewed_at?: string;
  };
  muaina_interpretation?: {
    summary: string;
    medical_condition?: {
      name: string;
      description: string;
      severity: string;
      icd_code?: string;
    };
    precautions?: string[];
    diet?: string[];
    consultation?: {
      follow_up_timing: string;
      booking_info: string;
      urgency: string;
    };
    medical_recommendations: string[];
    dos: string[];
    donts: string[];
    lifestyle_changes: string[];
    suggested_doctors?: Array<{
      name: string;
      specialty: string;
      qualification: string;
      availability: string;
      contact: string;
      location: string;
      consultation_fee?: string;
    }>;
    doctor_recommendations: Array<{
      specialty: string;
      reason: string;
      urgency: string;
    }>;
  };
  created_at: string;
  updated_at: string;
}

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const muainaSectionRef = useRef<HTMLDivElement>(null);

  const reportId = params.id as string;

  const scrollToMuaina = () => {
    muainaSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSaveField = async (
    field: "ai_analysis_details" | "precautions" | "diet" | "dos" | "donts" | "lifestyle_changes",
    value: string | string[]
  ) => {
    if (!report) return;

    const body: Record<string, unknown> = {};

    if (field === "ai_analysis_details") {
      body.ai_analysis_details = value;
    } else {
      body.muaina_interpretation = { [field]: value };
    }

    const response = await fetch(`/api/reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const data = await response.json();
      setReport(data.data);
    } else {
      throw new Error("Failed to save");
    }
  };

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await fetch(`/api/reports/${reportId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Report not found");
          } else {
            setError("Failed to load report");
          }
          return;
        }
        const data = await response.json();
        setReport(data.data);
      } catch (err) {
        setError("An error occurred while loading the report");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (reportId) {
      fetchReport();
    }
  }, [reportId]);

  const handleApprove = async () => {
    if (!report) return;
    setIsApproving(true);

    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus: "approved" }),
      });

      if (response.ok) {
        const data = await response.json();
        setReport(data.data);
      }
    } catch (err) {
      console.error("Failed to approve:", err);
    } finally {
      setIsApproving(false);
    }
  };

  const handleRequestAdjustment = async () => {
    if (!report) return;
    setIsApproving(true);

    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus: "adjustment_required" }),
      });

      if (response.ok) {
        const data = await response.json();
        setReport(data.data);
      }
    } catch (err) {
      console.error("Failed to update:", err);
    } finally {
      setIsApproving(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getClassificationBadge = (classification?: string) => {
    switch (classification) {
      case "normal":
        return <Badge variant="normal">Normal</Badge>;
      case "abnormal":
        return <Badge variant="adjustment">Abnormal</Badge>;
      case "critical":
        return <Badge variant="failed">Critical</Badge>;
      default:
        return <Badge variant="pending">Pending</Badge>;
    }
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case "info":
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
          badge: "bg-blue-100 text-blue-700",
        };
      case "warning":
        return {
          bg: "bg-warning-50",
          border: "border-warning-200",
          badge: "bg-warning-100 text-warning-700",
        };
      case "critical":
        return {
          bg: "bg-destructive-50",
          border: "border-destructive-200",
          badge: "bg-destructive-100 text-destructive-700",
        };
      default:
        return {
          bg: "bg-neutral-50",
          border: "border-neutral-200",
          badge: "bg-neutral-100 text-neutral-700",
        };
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary-800" />
        <p className="text-neutral-500">Loading report...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-destructive-50 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive-600" />
        </div>
        <p className="text-destructive-600 font-medium text-lg">
          {error || "Report not found"}
        </p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb & Header */}
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Link
            href="/dashboard/reports"
            className="hover:text-primary-800 transition-colors"
          >
            Reports
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-neutral-800 font-medium line-clamp-1">
            {report.original_file.name}
          </span>
        </div>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <Link href="/dashboard/reports">
              <Button variant="ghost" size="icon" className="mt-1">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-neutral-800 tracking-tight">
                {report.original_file.name}
              </h1>
              <div className="flex items-center gap-3 mt-2 text-sm text-neutral-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(report.created_at).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {new Date(report.created_at).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 ml-14 lg:ml-0">
            {getClassificationBadge(report.ai_analysis.classification)}
            <Badge
              variant={
                report.review.status === "approved" ? "normal" : "adjustment"
              }
            >
              {report.review.status === "approved" ? "Approved" : "Needs Review"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Report Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Analysis Summary */}
          <Card className="animate-fade-in">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary-100">
                    <Brain className="h-5 w-5 text-primary-800" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">AI Analysis</CardTitle>
                    <CardDescription>
                      Automated diagnostic assessment
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {report.ai_analysis.status === "failed" && report.ai_analysis.error && (
                <div className="rounded-xl border border-destructive-200 bg-destructive-50 p-4 text-destructive-700">
                  <p className="font-semibold">AI Analysis Failed</p>
                  <p className="text-sm mt-1">{report.ai_analysis.error}</p>
                </div>
              )}

              {report.ai_analysis.draft_report && (
                <>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-neutral-800">Summary</h4>
                    <p className="text-neutral-600 leading-relaxed">
                      {report.ai_analysis.draft_report.summary}
                    </p>
                  </div>
                  <div className="space-y-2 pt-4 border-t border-neutral-100">
                    <h4 className="font-semibold text-neutral-800">
                      Detailed Analysis
                    </h4>
                    <EditableSection
                      type="text"
                      value={report.ai_analysis.draft_report.details}
                      onSave={(value) => handleSaveField("ai_analysis_details", value)}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Raw AI Output */}
          <Card
            className="animate-fade-in"
            style={{ animationDelay: "50ms" }}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-neutral-100">
                  <Brain className="h-5 w-5 text-neutral-700" />
                </div>
                <div>
                  <CardTitle className="text-lg">AI Output (Raw)</CardTitle>
                  <CardDescription>
                    Full JSON output from the model
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="text-xs whitespace-pre-wrap rounded-lg border bg-neutral-50 p-4 overflow-auto max-h-[420px]">
                {JSON.stringify(report.ai_analysis, null, 2)}
              </pre>
            </CardContent>
          </Card>

          {/* Findings */}
          {report.ai_analysis.findings &&
            report.ai_analysis.findings.length > 0 && (
              <Card
                className="animate-fade-in"
                style={{ animationDelay: "100ms" }}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-warning-100">
                      <Activity className="h-5 w-5 text-warning-700" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Key Findings</CardTitle>
                      <CardDescription>
                        {report.ai_analysis.findings.length} finding
                        {report.ai_analysis.findings.length !== 1 ? "s" : ""}{" "}
                        identified
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {report.ai_analysis.findings.map((finding, index) => {
                      const styles = getSeverityStyles(finding.severity);
                      return (
                        <div
                          key={index}
                          className={`flex items-start gap-4 p-4 rounded-xl border ${styles.bg} ${styles.border}`}
                        >
                          <CircleDot className="h-5 w-5 text-neutral-400 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-neutral-800">
                                {finding.category}
                              </p>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles.badge}`}
                              >
                                {finding.severity}
                              </span>
                            </div>
                            <p className="text-sm text-neutral-600">
                              {finding.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Muaina Interpretation (for abnormal/critical) */}
          {report.muaina_interpretation && (
            <Card
              ref={muainaSectionRef}
              className="border-l-4 border-l-primary-800 animate-fade-in"
              style={{ animationDelay: "200ms" }}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary-100">
                    <Stethoscope className="h-5 w-5 text-primary-800" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      Muaina Interpretation
                    </CardTitle>
                    <CardDescription>
                      Patient-friendly report for communication
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Medical Condition */}
                {report.muaina_interpretation.medical_condition && (
                  <div className="p-4 rounded-xl bg-primary-50 border border-primary-200">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary-100">
                        <HeartPulse className="h-5 w-5 text-primary-800" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-primary-800">
                            {report.muaina_interpretation.medical_condition.name}
                          </h4>
                          <Badge
                            variant={
                              report.muaina_interpretation.medical_condition.severity === "severe"
                                ? "failed"
                                : report.muaina_interpretation.medical_condition.severity === "moderate"
                                ? "adjustment"
                                : "normal"
                            }
                            size="sm"
                          >
                            {report.muaina_interpretation.medical_condition.severity}
                          </Badge>
                          {report.muaina_interpretation.medical_condition.icd_code && (
                            <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">
                              ICD: {report.muaina_interpretation.medical_condition.icd_code}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-neutral-600">
                          {report.muaina_interpretation.medical_condition.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Summary */}
                <p className="text-neutral-600 leading-relaxed">
                  {report.muaina_interpretation.summary}
                </p>

                {/* Precautions */}
                <div className="p-4 rounded-xl bg-warning-50 border border-warning-200">
                  <h4 className="font-semibold text-warning-700 mb-3 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" />
                    Important Precautions
                  </h4>
                  <div className="text-warning-800">
                    <EditableSection
                      type="list"
                      items={report.muaina_interpretation.precautions || []}
                      onSave={(value) => handleSaveField("precautions", value)}
                    />
                  </div>
                </div>

                {/* Diet Recommendations */}
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <h4 className="font-semibold text-amber-700 mb-3 flex items-center gap-2">
                    <Utensils className="h-4 w-4" />
                    Diet Recommendations
                  </h4>
                  <div className="text-amber-800">
                    <EditableSection
                      type="list"
                      items={report.muaina_interpretation.diet || []}
                      onSave={(value) => handleSaveField("diet", value)}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Do's */}
                  <div className="p-4 rounded-xl bg-success-50 border border-success-200">
                    <h4 className="font-semibold text-success-700 mb-3 flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      Things to Do
                    </h4>
                    <div className="text-success-800">
                      <EditableSection
                        type="list"
                        items={report.muaina_interpretation.dos}
                        onSave={(value) => handleSaveField("dos", value)}
                      />
                    </div>
                  </div>

                  {/* Don'ts */}
                  <div className="p-4 rounded-xl bg-destructive-50 border border-destructive-200">
                    <h4 className="font-semibold text-destructive-700 mb-3 flex items-center gap-2">
                      <X className="h-4 w-4" />
                      Things to Avoid
                    </h4>
                    <div className="text-destructive-800">
                      <EditableSection
                        type="list"
                        items={report.muaina_interpretation.donts}
                        onSave={(value) => handleSaveField("donts", value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Lifestyle Changes */}
                <div className="pt-4 border-t border-neutral-100">
                  <h4 className="font-semibold text-neutral-800 mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Lifestyle Changes
                  </h4>
                  <div className="text-neutral-600">
                    <EditableSection
                      type="list"
                      items={report.muaina_interpretation.lifestyle_changes}
                      onSave={(value) => handleSaveField("lifestyle_changes", value)}
                    />
                  </div>
                </div>

                {/* Consultation Info */}
                {report.muaina_interpretation.consultation && (
                  <div className="pt-4 border-t border-neutral-100">
                    <h4 className="font-semibold text-neutral-800 mb-3 flex items-center gap-2">
                      <CalendarClock className="h-4 w-4" />
                      Consultation Information
                    </h4>
                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <Calendar className="h-4 w-4 mt-0.5 text-blue-600" />
                          <div>
                            <p className="text-sm font-medium text-blue-800">Follow-up Timing</p>
                            <p className="text-sm text-blue-700">{report.muaina_interpretation.consultation.follow_up_timing}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Phone className="h-4 w-4 mt-0.5 text-blue-600" />
                          <div>
                            <p className="text-sm font-medium text-blue-800">How to Book</p>
                            <p className="text-sm text-blue-700">{report.muaina_interpretation.consultation.booking_info}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              report.muaina_interpretation.consultation.urgency === "urgent"
                                ? "destructive"
                                : report.muaina_interpretation.consultation.urgency === "soon"
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {report.muaina_interpretation.consultation.urgency.toUpperCase()} Priority
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Suggested Doctors */}
                {report.muaina_interpretation.suggested_doctors && report.muaina_interpretation.suggested_doctors.length > 0 && (
                  <div className="pt-4 border-t border-neutral-100">
                    <h4 className="font-semibold text-neutral-800 mb-3 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Suggested Doctors
                    </h4>
                    <div className="grid gap-3">
                      {report.muaina_interpretation.suggested_doctors.map((doctor, i) => (
                        <div
                          key={i}
                          className="p-4 rounded-xl bg-blue-50 border border-blue-200"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h5 className="font-semibold text-blue-900">{doctor.name}</h5>
                              <p className="text-sm text-blue-700">{doctor.specialty}</p>
                              <p className="text-xs text-blue-600">{doctor.qualification}</p>
                            </div>
                            {doctor.consultation_fee && (
                              <div className="flex items-center gap-1 text-sm text-blue-800 bg-blue-100 px-2 py-1 rounded">
                                <Banknote className="h-3 w-3" />
                                {doctor.consultation_fee}
                              </div>
                            )}
                          </div>
                          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-blue-700">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {doctor.availability}
                            </div>
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {doctor.contact}
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {doctor.location}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Doctor Recommendations (Specialist Types) */}
                {report.muaina_interpretation.doctor_recommendations.length > 0 && (
                  <div className="pt-4 border-t border-neutral-100">
                    <h4 className="font-semibold text-neutral-800 mb-3">
                      Recommended Specialist Types
                    </h4>
                    <div className="space-y-2">
                      {report.muaina_interpretation.doctor_recommendations.map(
                        (rec, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200"
                          >
                            <Badge
                              variant={
                                rec.urgency === "urgent" ? "failed" : "pending"
                              }
                              size="sm"
                            >
                              {rec.urgency}
                            </Badge>
                            <span className="font-medium text-neutral-800">
                              {rec.specialty}
                            </span>
                            <span className="text-neutral-500">—</span>
                            <span className="text-sm text-neutral-600">
                              {rec.reason}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Metadata & Actions */}
        <div className="space-y-6">
          {/* Actions Card */}
          <Card className="animate-fade-in">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {report.review.status !== "approved" && (
                <Button
                  className="w-full h-11"
                  variant="success"
                  onClick={handleApprove}
                  disabled={isApproving}
                >
                  {isApproving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ThumbsUp className="h-4 w-4" />
                  )}
                  Approve Report
                </Button>
              )}
              {report.review.status === "approved" && (
                <Button
                  variant="outline"
                  className="w-full h-11"
                  onClick={handleRequestAdjustment}
                  disabled={isApproving}
                >
                  {isApproving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  Request Adjustment
                </Button>
              )}
              {report.muaina_interpretation && (
                <Button
                  variant="outline"
                  className="w-full h-11"
                  onClick={scrollToMuaina}
                >
                  <Eye className="h-4 w-4" />
                  View Muaina Interpretation
                </Button>
              )}
              <div className="space-y-1">
                <Button
                  variant="outline"
                  className="w-full h-11"
                  disabled={report.review.status !== "approved"}
                  onClick={() => {
                    window.open(`/api/reports/${reportId}/pdf`, "_blank");
                  }}
                >
                  <Download className="h-4 w-4" />
                  Download PDF Report
                </Button>
                {report.review.status !== "approved" && (
                  <p className="text-xs text-neutral-500 text-center">
                    PDF download available after approval
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* File Info Card */}
          <Card
            className="animate-fade-in"
            style={{ animationDelay: "100ms" }}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-neutral-100">
                  <FileText className="h-4 w-4 text-neutral-600" />
                </div>
                <CardTitle className="text-lg">File Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Type
                </span>
                <span className="text-sm font-medium text-neutral-800 uppercase">
                  {report.original_file.type}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500 flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  Size
                </span>
                <span className="text-sm font-medium text-neutral-800">
                  {formatFileSize(report.original_file.size)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Uploaded
                </span>
                <span className="text-sm font-medium text-neutral-800">
                  {new Date(report.original_file.uploaded_at).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Review Status Card */}
          <Card
            className="animate-fade-in"
            style={{ animationDelay: "200ms" }}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-xl ${
                    report.review.status === "approved"
                      ? "bg-success-100"
                      : "bg-warning-100"
                  }`}
                >
                  {report.review.status === "approved" ? (
                    <CheckCircle className="h-4 w-4 text-success-600" />
                  ) : (
                    <Clock className="h-4 w-4 text-warning-600" />
                  )}
                </div>
                <CardTitle className="text-lg">Review Status</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Status
                </span>
                <Badge
                  variant={
                    report.review.status === "approved" ? "normal" : "adjustment"
                  }
                >
                  {report.review.status}
                </Badge>
              </div>
              {report.review.reviewed_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-500 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Reviewed
                  </span>
                  <span className="text-sm font-medium text-neutral-800">
                    {new Date(report.review.reviewed_at).toLocaleDateString()}
                  </span>
                </div>
              )}
              {report.review.pathologist_findings && (
                <div className="pt-3 border-t border-neutral-100">
                  <p className="text-sm text-neutral-600 leading-relaxed">
                    {report.review.pathologist_findings}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
