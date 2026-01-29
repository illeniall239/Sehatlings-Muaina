import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIP, createRateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  // Rate limiting - strict for auth (prevent brute force)
  const clientIP = getClientIP(request);
  const rateLimitResult = await checkRateLimit(`auth:login:${clientIP}`, RATE_LIMITS.auth);
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;
    const supabase = await createClient();

    // Attempt to sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Supabase Auth error:", error);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Get user profile from our custom users table
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, email, role, profile, organization_id, is_active')
      .eq('id', data.user.id)
      .single();

    if (profileError || !userProfile) {
      console.error("Profile fetch error:", profileError);
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!userProfile.is_active) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "Account is deactivated" },
        { status: 401 }
      );
    }

    // Fetch organization separately
    let organization = null;
    if (userProfile.organization_id) {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .eq('id', userProfile.organization_id)
        .single();
      organization = orgData;
    }

    // Update last login (don't block response on this)
    Promise.resolve(
      supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userProfile.id)
    ).then(({ error }) => {
      if (error) {
        console.warn('Failed to update last_login:', error.message);
      }
    }).catch((err) => console.error('last_login update exception:', err));

    const profile = userProfile.profile as { first_name: string; last_name: string };

    return NextResponse.json({
      message: "Login successful",
      user: {
        id: userProfile.id,
        email: userProfile.email,
        name: `${profile.first_name} ${profile.last_name}`,
        role: userProfile.role,
        organization,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
