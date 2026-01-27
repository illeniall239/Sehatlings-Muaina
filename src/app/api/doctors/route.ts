import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Schema for POST request (adding a new doctor)
const createDoctorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  specialty: z.string().min(1, "Specialty is required"),
  qualification: z.string().min(1, "Qualification is required"),
  years_of_practice: z.number().int().positive().optional(),
  appointment_location: z.string().optional(),
  is_available_online: z.boolean().optional().default(true),
});

// GET - Fetch all doctors (global - shared across all organizations)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user (must be authenticated)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const specialty = searchParams.get('specialty');
    const activeOnly = searchParams.get('active') !== 'false';

    // Build query - doctors are global, no organization filter
    let query = supabase
      .from('doctors')
      .select('*')
      .order('name', { ascending: true });

    if (specialty) {
      query = query.eq('specialty', specialty);
    }

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data: doctors, error } = await query;

    if (error) {
      console.error("Doctors GET error:", error);
      return NextResponse.json({ error: "Failed to fetch doctors" }, { status: 500 });
    }

    return NextResponse.json({ data: doctors });
  } catch (error) {
    console.error("Doctors GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Add a new doctor (admin/director only - doctors are global)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 401 });
    }

    // Check if user has permission to add doctors
    if (!['admin', 'director'].includes(profile.role)) {
      return NextResponse.json(
        { error: "Only admins and directors can add doctors" },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = createDoctorSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    // Doctors are global - no organization_id needed
    const doctorData = {
      ...validation.data,
      is_active: true,
    };

    const { data: doctor, error } = await supabase
      .from('doctors')
      .insert(doctorData)
      .select()
      .single();

    if (error) {
      console.error("Doctors POST error:", error);
      return NextResponse.json({ error: "Failed to add doctor" }, { status: 500 });
    }

    return NextResponse.json({
      data: doctor,
      message: "Doctor added successfully",
    }, { status: 201 });
  } catch (error) {
    console.error("Doctors POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
