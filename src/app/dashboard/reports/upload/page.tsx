"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from "lucide-react";

interface QueuedFile {
  file: File;
  id: string;
  status: "pending" | "uploading" | "analyzing" | "completed" | "error";
  progress: number;
  result?: "normal" | "adjustment_required";
  error?: string;
  reportId?: string;
}

export default function UploadPage() {
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: QueuedFile[] = acceptedFiles.map((file) => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: "pending",
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
        ".docx",
      ],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 100,
  });

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const uploadAndAnalyze = async () => {
    setIsProcessing(true);
    const pendingFiles = files.filter((f) => f.status === "pending");

    for (let i = 0; i < pendingFiles.length; i++) {
      const qFile = pendingFiles[i];
      let currentProgress = 0;
      let progressInterval: NodeJS.Timeout | null = null;

      // Start progress animation
      const startProgressAnimation = (
        startProgress: number,
        targetProgress: number,
        status: "uploading" | "analyzing"
      ) => {
        currentProgress = startProgress;
        
        // Clear any existing interval
        if (progressInterval) {
          clearInterval(progressInterval);
        }

        // Update initial state
        setFiles((prev) =>
          prev.map((f) =>
            f.id === qFile.id ? { ...f, status, progress: currentProgress } : f
          )
        );

        // Animate progress smoothly
        progressInterval = setInterval(() => {
          // Slow down as we approach target (never quite reach it until complete)
          const remaining = targetProgress - currentProgress;
          const increment = Math.max(0.5, remaining * 0.08);
          
          if (currentProgress < targetProgress - 1) {
            currentProgress = Math.min(currentProgress + increment, targetProgress - 1);
            setFiles((prev) =>
              prev.map((f) =>
                f.id === qFile.id ? { ...f, progress: Math.round(currentProgress) } : f
              )
            );
          }
        }, 100);
      };

      // Stop progress animation
      const stopProgressAnimation = () => {
        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }
      };

      try {
        // Phase 1: Uploading (0-40%)
        startProgressAnimation(0, 40, "uploading");

        // Create form data
        const formData = new FormData();
        formData.append("file", qFile.file);

        // Small delay to show upload progress
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Phase 2: Analyzing (40-95%)
        stopProgressAnimation();
        startProgressAnimation(40, 95, "analyzing");

        const response = await fetch("/api/reports", {
          method: "POST",
          body: formData,
        });

        // Stop the animation
        stopProgressAnimation();

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || errorData.error || "Upload failed");
        }

        const data = await response.json();
        const report = data.data;

        // Determine result based on review status
        const result: "normal" | "adjustment_required" =
          report.review?.status === "approved" ? "normal" : "adjustment_required";

        // Phase 3: Complete (100%)
        setFiles((prev) =>
          prev.map((f) =>
            f.id === qFile.id
              ? {
                  ...f,
                  status: "completed",
                  progress: 100,
                  result,
                  reportId: report.id,
                }
              : f
          )
        );
      } catch (error) {
        // Stop any running animation
        stopProgressAnimation();
        
        console.error("Upload error:", error);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === qFile.id
              ? {
                  ...f,
                  status: "error",
                  progress: 0,
                  error: error instanceof Error ? error.message : "Upload failed",
                }
              : f
          )
        );
      }

      // Update overall progress
      setOverallProgress(Math.round(((i + 1) / pendingFiles.length) * 100));
    }

    setIsProcessing(false);
  };

  const completedCount = files.filter((f) => f.status === "completed").length;
  const pendingCount = files.filter((f) => f.status === "pending").length;
  const errorCount = files.filter((f) => f.status === "error").length;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/reports">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Upload Reports</h2>
          <p className="text-muted-foreground">
            Upload PDF or DOCX pathology reports for AI analysis
          </p>
        </div>
      </div>

      {/* Upload Zone */}
      <Card>
        <CardContent className="pt-6">
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary hover:bg-primary/5"
            )}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-lg font-medium">Drop the files here...</p>
            ) : (
              <div>
                <p className="text-lg font-medium">
                  Drag & drop files here, or click to select
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Supports PDF and DOCX files (max 50MB each, up to 100 files)
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* File Queue */}
      {files.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              File Queue ({completedCount}/{files.length} completed
              {errorCount > 0 && `, ${errorCount} failed`})
            </CardTitle>
            <div className="flex gap-2">
              {!isProcessing && pendingCount > 0 && (
                <Button onClick={uploadAndAnalyze}>
                  <Upload className="mr-2 h-4 w-4" />
                  Analyze {pendingCount} file(s)
                </Button>
              )}
              {!isProcessing && (
                <Button variant="outline" onClick={() => setFiles([])}>
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Overall Progress */}
            {isProcessing && (
              <div className="mb-6 p-4 bg-muted rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Overall Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {completedCount} of {files.length} reports analyzed
                  </span>
                </div>
                <Progress value={overallProgress} className="h-2" />
              </div>
            )}

            {/* File List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {files.map((qFile) => (
                <div
                  key={qFile.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="p-2 bg-muted rounded-lg shrink-0">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{qFile.file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(qFile.file.size)}
                      </p>

                      {/* Error message */}
                      {qFile.status === "error" && qFile.error && (
                        <p className="text-sm text-red-500 mt-1">{qFile.error}</p>
                      )}

                      {/* Progress bar for uploading/analyzing */}
                      {(qFile.status === "uploading" ||
                        qFile.status === "analyzing") && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span>
                              {qFile.status === "uploading"
                                ? "Uploading..."
                                : "Analyzing with AI..."}
                            </span>
                            <span>{qFile.progress}%</span>
                          </div>
                          <Progress value={qFile.progress} className="h-1" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {qFile.status === "pending" && (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                    {qFile.status === "uploading" && (
                      <Badge variant="secondary">
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Uploading
                      </Badge>
                    )}
                    {qFile.status === "analyzing" && (
                      <Badge variant="secondary">
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Analyzing
                      </Badge>
                    )}
                    {qFile.status === "completed" && (
                      <Badge
                        variant={
                          qFile.result === "normal" ? "success" : "destructive"
                        }
                      >
                        {qFile.result === "normal" ? (
                          <>
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Normal
                          </>
                        ) : (
                          <>
                            <AlertCircle className="mr-1 h-3 w-3" />
                            Adjustment Required
                          </>
                        )}
                      </Badge>
                    )}
                    {qFile.status === "error" && (
                      <Badge variant="destructive">Error</Badge>
                    )}

                    {qFile.status === "pending" && !isProcessing && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(qFile.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Summary */}
      {completedCount > 0 && !isProcessing && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between p-4 rounded-lg border border-green-200 bg-green-50">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">Normal</p>
                    <p className="text-sm text-green-700">
                      {files.filter((f) => f.result === "normal").length} reports
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-red-200 bg-red-50">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                  <div>
                    <p className="font-medium text-red-900">
                      Adjustment Required
                    </p>
                    <p className="text-sm text-red-700">
                      {
                        files.filter((f) => f.result === "adjustment_required")
                          .length
                      }{" "}
                      reports
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <Link href="/dashboard/reports">
                <Button className="w-full">View All Reports</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
