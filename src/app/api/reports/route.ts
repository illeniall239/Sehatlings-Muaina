import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { extractTextFromFile } from "@/lib/file-processing";
import { analyzeReport } from "@/lib/ai/analyzer";
import { uploadFile } from "@/lib/supabase/storage";
import { checkRateLimit, getClientIP, createRateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { invalidateReportCache } from "@/lib/cache";
import { validateCsrf } from "@/lib/csrf";

// Allow up to 60s for this route (upload + text extraction + AI analysis)
export const maxDuration = 60;

// Query params schema for GET
const querySchema = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(["pending", "approved", "adjustment_required"]).optional(),
  classification: z.enum(["normal", "abnormal", "critical"]).optional(),
});

// GET - List reports
export async function GET(request: NextRequest) {
  // Rate limiting
  const clientIP = getClientIP(request);
  const rateLimitResult = await checkRateLimit(`reports:get:${clientIP}`, RATE_LIMITS.standard);
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult);
  }

  try {
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

    const organizationId = profile.organization_id;

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = querySchema.parse(searchParams);

    // Build filter
    let queryBuilder = supabase
      .from('reports')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId);

    if (query.status) {
      queryBuilder = queryBuilder.eq('review->>status', query.status);
    }
    if (query.classification) {
      queryBuilder = queryBuilder.eq('ai_analysis->>classification', query.classification);
    }

    // Calculate offset
    const offset = (query.page - 1) * query.limit;

    // Execute query with pagination
    const { data: reports, count, error } = await queryBuilder
      .order('created_at', { ascending: false })
      .range(offset, offset + query.limit - 1);

    if (error) {
      console.error("Error fetching reports:", error);
      return NextResponse.json(
        { error: "Failed to fetch reports" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: reports,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / query.limit),
      },
    });
  } catch (error) {
    console.error("Reports GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Upload and analyze a single report
export async function POST(request: NextRequest) {
  // CSRF protection
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  // Rate limiting (stricter for uploads)
  const clientIP = getClientIP(request);
  const rateLimitResult = await checkRateLimit(`reports:upload:${clientIP}`, RATE_LIMITS.upload);
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile with organization details
    const { data: profile } = await supabase
      .from('users')
      .select(`
        organization_id,
        organizations!inner (
          id,
          slug
        )
      `)
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 401 });
    }

    const organizationId = profile.organization_id;
    // organizations is returned as an object (not array) because of !inner join with single user
    const org = profile.organizations as unknown as { id: string; slug: string };
    const orgSlug = org.slug;
    const userId = user.id;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const fileType = file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "docx";
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|docx)$/i)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF and DOCX are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 50MB." },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to organization's storage bucket
    const uploadResult = await uploadFile(
      supabase,
      orgSlug,
      file.name,
      buffer,
      file.type
    );

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: uploadResult.error || "Failed to upload file" },
        { status: 500 }
      );
    }

    const storagePath = uploadResult.path!;
    const storageBucket = uploadResult.bucket!;

    // Create report record with pending status
    const { data: report, error: insertError } = await supabase
      .from('reports')
      .insert({
        organization_id: organizationId,
        uploaded_by: userId,
        original_file: {
          name: file.name,
          type: fileType,
          size: file.size,
          path: storagePath,
          bucket: storageBucket,
          uploaded_at: new Date().toISOString(),
        },
        ai_analysis: {
          status: "processing",
          started_at: new Date().toISOString(),
        },
        review: {
          status: "pending",
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating report:", insertError);
      return NextResponse.json(
        { error: "Failed to create report record" },
        { status: 500 }
      );
    }

    // Extract text from document
    let extractedText = "";
    try {
      const extraction = await extractTextFromFile(buffer, fileType);
      extractedText = extraction.text;

      // Update report with extracted content
      await supabase
        .from('reports')
        .update({
          extracted_content: {
            raw_text: extractedText,
            extracted_at: new Date().toISOString(),
          },
        })
        .eq('id', report.id);

    } catch (extractError) {
      const errorMessage =
        extractError instanceof Error ? extractError.message : String(extractError);
      console.error("Text extraction error:", errorMessage);
      await supabase
        .from('reports')
        .update({
          ai_analysis: {
            status: "failed",
            error: `Failed to extract text from document. ${errorMessage}`,
          },
        })
        .eq('id', report.id);

      // Return 422 (Unprocessable Entity) - file was uploaded but couldn't be processed
      return NextResponse.json(
        {
          error: "Text extraction failed",
          message: `File uploaded but text extraction failed: ${errorMessage}. If this is a scanned PDF, please upload a text-based PDF or DOCX.`,
          reportId: report.id,
        },
        { status: 422 }
      );
    }

    // Check AI analysis rate limit (separate from upload limit)
    const aiRateLimitResult = await checkRateLimit(
      `reports:ai:${clientIP}`,
      RATE_LIMITS.aiAnalysis
    );
    if (!aiRateLimitResult.success) {
      // Update report to show rate limited status
      await supabase
        .from('reports')
        .update({
          ai_analysis: {
            status: "rate_limited",
            error: "AI analysis rate limit exceeded. Please try again later.",
          },
        })
        .eq('id', report.id);

      return NextResponse.json(
        {
          error: "AI analysis rate limit exceeded",
          message: "Too many AI analysis requests. Please wait before uploading more reports.",
          reportId: report.id,
          retryAfter: Math.ceil((aiRateLimitResult.resetTime - Date.now()) / 1000),
        },
        { status: 429 }
      );
    }

    // Analyze with AI (doctors are global, no organizationId needed)
    try {
      const analysis = await analyzeReport(extractedText);

      // Determine review status based on classification
      const reviewStatus =
        analysis.classification === "normal" ? "approved" : "adjustment_required";

      // Build update object with usage tracking
      const updateData: Record<string, unknown> = {
        ai_analysis: {
          status: "completed",
          completed_at: new Date().toISOString(),
          classification: analysis.classification,
          findings: analysis.findings,
          draft_report: analysis.draftReport,
          processing_time_ms: analysis.processingTime,
          // AI usage and cost tracking
          usage: analysis.usage ? {
            input_tokens: analysis.usage.inputTokens,
            output_tokens: analysis.usage.outputTokens,
            total_tokens: analysis.usage.totalTokens,
            estimated_cost_usd: analysis.usage.estimatedCostUSD,
            model: analysis.usage.model,
            api_calls: analysis.usage.apiCalls,
          } : null,
        },
        review: {
          status: reviewStatus,
        },
      };

      // Add Muaina Interpretation for ALL reports
      if (analysis.muainaInterpretation) {
        const interp = analysis.muainaInterpretation;
        updateData.muaina_interpretation = {
          summary: interp.summary,
          medical_condition: {
            name: interp.medicalCondition.name,
            description: interp.medicalCondition.description,
            severity: interp.medicalCondition.severity,
            icd_code: interp.medicalCondition.icdCode,
          },
          precautions: interp.precautions,
          diet: interp.diet,
          consultation: {
            follow_up_timing: interp.consultation.followUpTiming,
            booking_info: interp.consultation.bookingInfo,
            urgency: interp.consultation.urgency,
          },
          medical_recommendations: interp.medicalRecommendations,
          dos: interp.dos,
          donts: interp.donts,
          lifestyle_changes: interp.lifestyleChanges,
          suggested_doctors: interp.suggestedDoctors.map(doc => ({
            name: doc.name,
            specialty: doc.specialty,
            qualification: doc.qualification,
            availability: doc.availability,
            contact: doc.contact,
            location: doc.location,
            consultation_fee: doc.consultationFee,
          })),
          doctor_recommendations: interp.doctorRecommendations,
          generated_at: new Date().toISOString(),
        };
      }

      // Add patient info for insurance search
      if (analysis.patientInfo?.name) {
        updateData.patient_info = {
          name: analysis.patientInfo.name,
          age: analysis.patientInfo.age || null,
          gender: analysis.patientInfo.gender || null,
          dob: analysis.patientInfo.dob || null,
        };
      }

      // Update report with analysis results
      const { data: updatedReport, error: updateError } = await supabase
        .from('reports')
        .update(updateData)
        .eq('id', report.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating report:", updateError);
        return NextResponse.json(
          { error: "Failed to update report with analysis" },
          { status: 500 }
        );
      }

      // Invalidate cache after successful upload
      invalidateReportCache(organizationId, updatedReport.id);

      return NextResponse.json({
        data: updatedReport,
        message: "Report uploaded and analyzed successfully",
      });
    } catch (analysisError) {
      const errorMessage =
        analysisError instanceof Error ? analysisError.message : String(analysisError);
      console.error("AI analysis error:", errorMessage);

      await supabase
        .from('reports')
        .update({
          ai_analysis: {
            status: "failed",
            error: `AI analysis failed: ${errorMessage}`,
            failed_at: new Date().toISOString(),
          },
        })
        .eq('id', report.id);

      // Return 422 (Unprocessable Entity) - file was uploaded but AI analysis failed
      return NextResponse.json(
        {
          error: "AI analysis failed",
          message: `File uploaded but AI analysis failed: ${errorMessage}. Please try again or contact support.`,
          reportId: report.id,
        },
        { status: 422 }
      );
    }
  } catch (error) {
    console.error("Reports POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
