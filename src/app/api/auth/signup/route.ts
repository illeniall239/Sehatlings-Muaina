import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIP, createRateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  organizationId: z.string().uuid("Invalid organization ID").optional(),
  branch: z.string().max(255).optional(),
  role: z.enum(["pathologist", "insurance"]).optional().default("pathologist"),
});

export async function POST(request: NextRequest) {
  // Rate limiting - strict for auth (prevent spam signups)
  const clientIP = getClientIP(request);
  const rateLimitResult = await checkRateLimit(`auth:signup:${clientIP}`, RATE_LIMITS.auth);
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    const body = await request.json();
    const validation = signupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { email, password, firstName, lastName, organizationId, branch, role } = validation.data;
    const supabaseAdmin = getSupabaseAdmin();

    // Organization is required for pathologists, optional for insurance
    if (role !== 'insurance' && !organizationId) {
      return NextResponse.json(
        { error: "Organization is required for pathologist accounts" },
        { status: 400 }
      );
    }

    // Verify organization exists if provided (use admin client to bypass RLS)
    if (organizationId) {
      const { data: org, error: orgError } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .eq('id', organizationId)
        .eq('is_active', true)
        .single();

      if (orgError || !org) {
        console.error("Organization verification error:", orgError);
        return NextResponse.json(
          { error: "Invalid organization" },
          { status: 400 }
        );
      }
    }

    // Create user with Supabase Auth (admin client for user creation)
    // Note: email_confirm: true skips verification since admin.createUser doesn't send emails
    // To enable email verification, configure SMTP in Supabase dashboard and use auth.signUp instead
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm since admin API doesn't send emails
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      },
    });

    if (authError) {
      console.error("Supabase Auth signup error:", authError);
      return NextResponse.json(
        { error: authError.message || "Failed to create account" },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    // Build user profile data
    const userProfileData: Record<string, unknown> = {
      id: authData.user.id,
      email: email.toLowerCase(),
      role: role,
      profile: {
        first_name: firstName,
        last_name: lastName,
        title: "",
        specialization: "",
      },
      is_active: true,
    };

    // Only include organization_id if provided (not required for insurance users)
    if (organizationId) {
      userProfileData.organization_id = organizationId;
    }

    // Only include branch if provided (column may not exist in older schemas)
    if (branch) {
      userProfileData.branch = branch;
    }

    // Create user profile in our custom users table (admin bypasses RLS)
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .insert(userProfileData)
      .select()
      .single();

    if (profileError) {
      console.error("User profile creation error:", {
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
        code: profileError.code,
      });

      // Clean up orphaned auth user to prevent "profile not found" errors
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      } catch (cleanupError) {
        console.error("Failed to clean up orphaned auth user:", cleanupError);
      }

      return NextResponse.json(
        { 
          error: `Profile creation failed: ${profileError.message}`,
          details: profileError.details,
          hint: profileError.hint,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Account created successfully! You can now sign in.",
      user: {
        id: userProfile.id,
        email: userProfile.email,
        name: `${userProfile.profile.first_name} ${userProfile.profile.last_name}`,
      },
      // No email verification needed - account is ready to use
      verified: true,
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
