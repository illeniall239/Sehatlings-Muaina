import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { PatientSearchResult } from "@/types/database";

/**
 * GET /api/insurance/patients
 * Search for patients by name within a specific organization.
 * Only accessible by users with 'insurance' role.
 *
 * Query params:
 * - org_id: Organization ID to search within
 * - name: Patient name to search for
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("org_id");
    const name = searchParams.get("name");

    // Validate params
    if (!orgId || !name) {
      return NextResponse.json(
        { error: "org_id and name are required" },
        { status: 400 }
      );
    }

    // Authenticate user
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check user role - must be insurance
    const adminSupabase = getSupabaseAdmin();
    const { data: userData, error: userError } = await adminSupabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userError || userData?.role !== "insurance") {
      return NextResponse.json(
        { error: "Access denied. Insurance role required." },
        { status: 403 }
      );
    }

    // Search for patients by name in the organization
    // Using ilike for case-insensitive partial matching
    const { data: reports, error: searchError } = await adminSupabase
      .from("reports")
      .select("patient_info, ai_analysis, created_at")
      .eq("organization_id", orgId)
      .not("patient_info", "is", null)
      .ilike("patient_info->>name", `%${name}%`)
      .order("created_at", { ascending: false });

    if (searchError) {
      console.error("Search error:", searchError);
      return NextResponse.json(
        { error: "Search failed" },
        { status: 500 }
      );
    }

    // Aggregate results by patient name
    const patientMap = new Map<string, {
      name: string;
      report_count: number;
      latest_report_date: string;
      classifications: string[];
    }>();

    for (const report of reports || []) {
      const patientName = report.patient_info?.name;
      if (!patientName) continue;

      const existing = patientMap.get(patientName);
      const classification = report.ai_analysis?.classification || "normal";

      if (existing) {
        existing.report_count++;
        existing.classifications.push(classification);
        // Update latest date if this report is newer
        if (new Date(report.created_at) > new Date(existing.latest_report_date)) {
          existing.latest_report_date = report.created_at;
        }
      } else {
        patientMap.set(patientName, {
          name: patientName,
          report_count: 1,
          latest_report_date: report.created_at,
          classifications: [classification],
        });
      }
    }

    // Determine overall classification for each patient
    const patients: PatientSearchResult[] = Array.from(patientMap.values()).map(
      (patient) => {
        // If any report is critical, overall is critical
        // If any report is abnormal (and none critical), overall is abnormal
        // Otherwise normal
        let overall: "normal" | "abnormal" | "critical" = "normal";
        if (patient.classifications.includes("critical")) {
          overall = "critical";
        } else if (patient.classifications.includes("abnormal")) {
          overall = "abnormal";
        }

        return {
          name: patient.name,
          report_count: patient.report_count,
          latest_report_date: patient.latest_report_date,
          overall_classification: overall,
          organization_id: orgId,
        };
      }
    );

    // Sort by latest report date (most recent first)
    patients.sort(
      (a, b) =>
        new Date(b.latest_report_date).getTime() -
        new Date(a.latest_report_date).getTime()
    );

    return NextResponse.json({ patients });
  } catch (error) {
    console.error("Insurance patients API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
