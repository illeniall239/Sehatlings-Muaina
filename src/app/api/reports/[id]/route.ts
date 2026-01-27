import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { invalidateReportCache } from "@/lib/cache";
import { deleteFile } from "@/lib/supabase/storage";

// Schema for PATCH request
const updateSchema = z.object({
  reviewStatus: z.enum(["pending", "approved", "adjustment_required"]).optional(),
  pathologistFindings: z.string().optional(),
  muaina_interpretation: z.object({
    precautions: z.array(z.string()).optional(),
    diet: z.array(z.string()).optional(),
    dos: z.array(z.string()).optional(),
    donts: z.array(z.string()).optional(),
    lifestyle_changes: z.array(z.string()).optional(),
  }).optional(),
  ai_analysis_details: z.string().optional(),
});

// GET - Get single report
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile to get organization_id
    const { data: profile } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 401 });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: "Invalid report ID" }, { status: 400 });
    }

    const { data: report, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (error || !report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({ data: report });
  } catch (error) {
    console.error("Report GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Update report (for pathologist review)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile to get organization_id
    const { data: profile } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 401 });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: "Invalid report ID" }, { status: 400 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { reviewStatus, pathologistFindings, muaina_interpretation, ai_analysis_details } = validation.data;

    // Fetch current report data to merge JSONB fields
    const { data: currentReport } = await supabase
      .from('reports')
      .select('muaina_interpretation, ai_analysis, review')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (!currentReport) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (reviewStatus || pathologistFindings !== undefined) {
      const existingReview = (currentReport.review as Record<string, unknown>) || {};
      updateData.review = {
        ...existingReview,
        status: reviewStatus || existingReview.status || 'pending',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        ...(pathologistFindings !== undefined && { pathologist_findings: pathologistFindings }),
      };
    }

    // Handle muaina_interpretation updates (merge with existing)
    if (muaina_interpretation) {
      const existingMuaina = (currentReport.muaina_interpretation as Record<string, unknown>) || {};
      updateData.muaina_interpretation = {
        ...existingMuaina,
        ...muaina_interpretation,
      };
    }

    // Handle ai_analysis_details update (update draft_report.details)
    if (ai_analysis_details !== undefined) {
      const existingAiAnalysis = (currentReport.ai_analysis as Record<string, unknown>) || {};
      const existingDraftReport = (existingAiAnalysis.draft_report as Record<string, unknown>) || {};
      updateData.ai_analysis = {
        ...existingAiAnalysis,
        draft_report: {
          ...existingDraftReport,
          details: ai_analysis_details,
        },
      };
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const { data: report, error } = await supabase
      .from('reports')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .select('*')
      .single();

    if (error || !report) {
      console.error("Report PATCH error:", error);
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Invalidate cache after update
    invalidateReportCache(profile.organization_id, id);

    return NextResponse.json({
      data: report,
      message: "Report updated successfully",
    });
  } catch (error) {
    console.error("Report PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete report
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile to get organization_id
    const { data: profile } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 401 });
    }

    // Only allow admins and directors to delete reports
    if (!['admin', 'director'].includes(profile.role)) {
      return NextResponse.json(
        { error: "You don't have permission to delete reports" },
        { status: 403 }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: "Invalid report ID" }, { status: 400 });
    }

    // Fetch report first to verify it exists and get storage info
    const { data: report, error: fetchError } = await supabase
      .from('reports')
      .select('id, original_file, organization_id')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (fetchError || !report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Clean up storage file before deleting the database record
    const originalFile = report.original_file as { path?: string; bucket?: string } | null;
    if (originalFile?.path && originalFile?.bucket) {
      // Extract org slug from bucket name (format: "reports-{slug}")
      const orgSlug = originalFile.bucket.replace(/^reports-/, '');
      const deleteResult = await deleteFile(supabase, orgSlug, originalFile.path);
      if (!deleteResult.success) {
        console.error("Failed to delete storage file:", deleteResult.error);
        // Continue with DB deletion even if storage cleanup fails
        // The file will be orphaned but the report should still be removable
      }
    }

    // Delete from database
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', id)
      .eq('organization_id', profile.organization_id);

    if (error) {
      console.error("Report DELETE error:", error);
      return NextResponse.json({ error: "Failed to delete report" }, { status: 500 });
    }

    // Invalidate cache after delete
    invalidateReportCache(profile.organization_id, id);

    return NextResponse.json({
      message: "Report deleted successfully",
    });
  } catch (error) {
    console.error("Report DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
