import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateReportPDF, PDFReportData } from "@/lib/pdf-generator";

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

    // Get user profile with organization
    const { data: profile } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 401 });
    }

    // Get organization name
    const { data: organization } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", profile.organization_id)
      .single();

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: "Invalid report ID" }, { status: 400 });
    }

    // Get the report
    const { data: report, error } = await supabase
      .from("reports")
      .select("*")
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .single();

    if (error || !report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Verify the report is approved before allowing PDF generation
    const reviewData = report.review as { status?: string } | null;
    if (reviewData?.status !== "approved") {
      return NextResponse.json(
        { error: "PDF generation is only available for approved reports" },
        { status: 403 }
      );
    }

    // Extract data for PDF
    const originalFile = report.original_file as { name: string; uploaded_at: string };
    const aiAnalysis = report.ai_analysis as {
      classification?: string;
      findings?: Array<{ category: string; description: string; severity: string }>;
      draft_report?: { summary: string; details: string };
    };
    const review = report.review as { status: string; reviewed_at?: string };
    const muainaInterpretation = report.muaina_interpretation as {
      summary?: string;
      medical_condition?: {
        name: string;
        description: string;
        severity: string;
        icd_code?: string;
      };
      precautions?: string[];
      diet?: string[];
      consultation?: {
        follow_up_timing: string;
        booking_info: string;
        urgency: string;
      };
      medical_recommendations?: string[];
      dos?: string[];
      donts?: string[];
      lifestyle_changes?: string[];
      suggested_doctors?: Array<{
        name: string;
        specialty: string;
        qualification: string;
        availability: string;
        contact: string;
        location: string;
        consultation_fee?: string;
      }>;
      doctor_recommendations?: Array<{ specialty: string; reason: string; urgency: string }>;
    } | null;

    // Prepare data for PDF
    const pdfData: PDFReportData = {
      id: String(report.id),
      fileName: String(originalFile?.name || "Unknown"),
      uploadedAt: String(originalFile?.uploaded_at || report.created_at),
      classification: String(aiAnalysis?.classification || "pending"),
      findings: (aiAnalysis?.findings || []).map(f => ({
        category: String(f.category || ""),
        description: String(f.description || ""),
        severity: String(f.severity || "info"),
      })),
      summary: String(aiAnalysis?.draft_report?.summary || "No summary available"),
      details: String(aiAnalysis?.draft_report?.details || "No details available"),
      reviewStatus: String(review?.status || "pending"),
      reviewedAt: review?.reviewed_at ? String(review.reviewed_at) : undefined,
      organizationName: String(organization?.name || "Unknown Organization"),
      muainaInterpretation: muainaInterpretation ? {
        summary: String(muainaInterpretation.summary || ""),
        medicalCondition: muainaInterpretation.medical_condition ? {
          name: String(muainaInterpretation.medical_condition.name || ""),
          description: String(muainaInterpretation.medical_condition.description || ""),
          severity: String(muainaInterpretation.medical_condition.severity || "moderate"),
          icdCode: muainaInterpretation.medical_condition.icd_code ? String(muainaInterpretation.medical_condition.icd_code) : undefined,
        } : {
          name: "Unknown Condition",
          description: "Medical condition details not available",
          severity: "moderate",
        },
        precautions: (muainaInterpretation.precautions || []).map(p => String(p)),
        diet: (muainaInterpretation.diet || []).map(d => String(d)),
        consultation: muainaInterpretation.consultation ? {
          followUpTiming: String(muainaInterpretation.consultation.follow_up_timing || ""),
          bookingInfo: String(muainaInterpretation.consultation.booking_info || ""),
          urgency: String(muainaInterpretation.consultation.urgency || "routine"),
        } : {
          followUpTiming: "Please consult your doctor",
          bookingInfo: "Contact clinic for appointment",
          urgency: "routine",
        },
        medicalRecommendations: (muainaInterpretation.medical_recommendations || []).map(m => String(m)),
        dos: (muainaInterpretation.dos || []).map(d => String(d)),
        donts: (muainaInterpretation.donts || []).map(d => String(d)),
        lifestyleChanges: (muainaInterpretation.lifestyle_changes || []).map(l => String(l)),
        suggestedDoctors: (muainaInterpretation.suggested_doctors || []).map(doc => ({
          name: String(doc.name || ""),
          specialty: String(doc.specialty || ""),
          qualification: String(doc.qualification || ""),
          availability: String(doc.availability || ""),
          contact: String(doc.contact || ""),
          location: String(doc.location || ""),
          consultationFee: doc.consultation_fee ? String(doc.consultation_fee) : undefined,
        })),
        doctorRecommendations: (muainaInterpretation.doctor_recommendations || []).map(r => ({
          specialty: String(r.specialty || ""),
          reason: String(r.reason || ""),
          urgency: String(r.urgency || "routine"),
        })),
      } : undefined,
    };

    // Generate PDF with timeout (Vercel has 30s limit for serverless)
    const PDF_TIMEOUT_MS = 25000;
    const pdfBuffer = await Promise.race([
      generateReportPDF(pdfData),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("PDF generation timed out")), PDF_TIMEOUT_MS)
      ),
    ]);

    // Return PDF as response
    const safeFileName = originalFile?.name?.replace(/[^a-zA-Z0-9.-]/g, "_") || "report";

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="muaina-report-${safeFileName}.pdf"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
