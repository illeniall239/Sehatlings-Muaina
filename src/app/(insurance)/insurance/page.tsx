"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Search,
  History,
  User,
  Building2,
  AlertTriangle,
  ChevronRight,
  Loader2,
  ArrowRight,
  Clock,
} from "lucide-react";
import type { InsuranceActivity } from "@/types/database";

export default function InsuranceDashboardPage() {
  const [activities, setActivities] = useState<InsuranceActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch recent activity on mount
  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch("/api/insurance/activity");
        const data = await res.json();
        if (data.activities) {
          setActivities(data.activities);
        }
      } catch (error) {
        console.error("Failed to fetch activity:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchActivity();
  }, []);

  const getRiskColor = (level: string | null) => {
    switch (level?.toLowerCase()) {
      case "high":
      case "critical":
        return "text-destructive-600 bg-destructive-50 border-destructive-100";
      case "medium":
      case "abnormal":
        return "text-warning-600 bg-warning-50 border-warning-100";
      case "low":
      case "normal":
        return "text-success-600 bg-success-50 border-success-100";
      default:
        return "text-neutral-600 bg-neutral-50 border-neutral-100";
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            Welcome back
          </h1>
          <p className="text-neutral-500 mt-1">
            Manage patient records and insurance summaries
          </p>
        </div>
        <Link href="/insurance/search">
          <Button className="w-full md:w-auto gap-2 bg-primary-800 hover:bg-primary-700">
            <Search className="h-4 w-4" />
            Search Patients
          </Button>
        </Link>
      </div>

      {/* Quick Stats / Actions Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/insurance/search" className="group">
          <Card className="h-full border-neutral-200 hover:border-primary-200 hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center text-primary-700 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                  <Search className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-primary-600 transition-colors" />
              </div>
              <h3 className="font-semibold text-neutral-900 mb-1">Find Patient</h3>
              <p className="text-sm text-neutral-500">
                Search by name across all linked laboratories
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Placeholder for future features */}
        <Card className="h-full border-neutral-200 bg-neutral-50/50">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full text-neutral-400">
            <p className="text-sm font-medium">Pending Claims</p>
            <p className="text-xs mt-1">Coming soon</p>
          </CardContent>
        </Card>

        <Card className="h-full border-neutral-200 bg-neutral-50/50">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full text-neutral-400">
            <p className="text-sm font-medium">Analytics</p>
            <p className="text-xs mt-1">Coming soon</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-neutral-900">
          <History className="h-5 w-5 text-neutral-500" />
          <h2 className="text-lg font-semibold">Recent Activity</h2>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
              </div>
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-12 w-12 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
                  <History className="h-6 w-6 text-neutral-400" />
                </div>
                <p className="font-medium text-neutral-900">No recent activity</p>
                <p className="text-sm text-neutral-500 mt-1 mb-4">
                  Start by searching for a patient
                </p>
                <Link href="/insurance/search">
                  <Button variant="outline" size="sm" className="gap-2">
                    Go to Search
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {activities.map((activity) => (
                  <Link
                    key={activity.id}
                    href={`/insurance/patient/${encodeURIComponent(
                      activity.patient_name
                    )}?org_id=${activity.organization_id}`}
                    className="flex items-center gap-4 p-4 hover:bg-neutral-50 transition-colors group"
                  >
                    {/* Patient Avatar/Initial */}
                    <div className="h-10 w-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 font-semibold group-hover:bg-primary-100 group-hover:text-primary-700 transition-colors">
                      {activity.patient_name.charAt(0).toUpperCase()}
                    </div>

                    {/* Patient Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">
                        {activity.patient_name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-500">
                        {activity.organization_name && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {activity.organization_name}
                          </span>
                        )}
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(activity.viewed_at).toLocaleDateString()}{" "}
                          {new Date(activity.viewed_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Risk Badge */}
                    {activity.risk_level && (
                      <span
                        className={`hidden sm:inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getRiskColor(
                          activity.risk_level
                        )}`}
                      >
                        {activity.risk_level === "critical" ||
                          activity.risk_level === "high" ? (
                          <AlertTriangle className="h-3 w-3 mr-1" />
                        ) : null}
                        {activity.risk_level.charAt(0).toUpperCase() +
                          activity.risk_level.slice(1)}
                      </span>
                    )}

                    <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-600" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
