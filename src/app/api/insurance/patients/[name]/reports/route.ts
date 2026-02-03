import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * GET /api/insurance/patients/[name]/reports
 * Get all reports for a specific patient within an organization.
 * Only accessible by users with 'insurance' role.
 *
 * Query params:
 * - org_id: Organization ID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const patientName = decodeURIComponent(name);
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("org_id");

    if (!orgId) {
      return NextResponse.json(
        { error: "org_id is required" },
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
      .select("id, created_at, ai_analysis, patient_info, muaina_interpretation")
      .eq("organization_id", orgId)
      .eq("patient_info->>name", patientName)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch reports" },
        { status: 500 }
      );
    }

    return NextResponse.json({ reports: reports || [] });
  } catch (error) {
    console.error("Patient reports API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
