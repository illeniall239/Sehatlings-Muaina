import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * GET /api/organizations
 * PUBLIC endpoint — no auth required.
 * Fetches active organizations for the signup dropdown.
 * Uses admin client to bypass RLS (signup users aren't authenticated yet).
 * Only returns id, name, slug — no sensitive data exposed.
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("organizations")
      .select("id, name, slug")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching organizations:", error);
      return NextResponse.json(
        { error: "Failed to fetch organizations" },
        { status: 500 }
      );
    }

    return NextResponse.json({ organizations: data || [] });
  } catch (error) {
    console.error("Organizations API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
