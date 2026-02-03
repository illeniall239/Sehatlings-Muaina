import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { generateInsuranceSummary } from "@/lib/ai/insurance-analyzer";

/**
 * POST /api/insurance/summary
 * Generate an AI-powered insurance summary for a patient.
 * Aggregates all reports and produces risk assessment.
 *
 * Body:
 * - organization_id: string
 * - patient_name: string
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { organization_id, patient_name } = body;

    if (!organization_id || !patient_name) {
      return NextResponse.json(
        { error: "organization_id and patient_name are required" },
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

    // Fetch all reports for this patient
    const { data: reports, error: fetchError } = await adminSupabase
      .from("reports")
      .select("id, created_at, ai_analysis, patient_info, muaina_interpretation, extracted_content")
      .eq("organization_id", organization_id)
      .eq("patient_info->>name", patient_name)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch reports" },
        { status: 500 }
      );
    }

    if (!reports || reports.length === 0) {
      return NextResponse.json(
        { error: "No reports found for this patient" },
        { status: 404 }
      );
    }

    // Generate AI summary
    const summary = await generateInsuranceSummary(reports, patient_name);

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Insurance summary API error:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}
