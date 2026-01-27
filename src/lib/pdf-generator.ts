/**
 * Muaina Report PDF Generator
 * Uses PDFKit to generate professional medical report PDFs
 * Works in serverless environments (Vercel, etc.)
 */

import PDFDocument from "pdfkit";

// Colors (hex without #)
const COLORS = {
  primary: "#5b0202",
  success: "#166534",
  warning: "#92400e",
  danger: "#991b1b",
  info: "#1e40af",
  neutral: "#374151",
  lightBg: "#f9fafb",
};

interface Finding {
  category: string;
  description: string;
  severity: string;
}

interface MedicalCondition {
  name: string;
  description: string;
  severity: string;
  icdCode?: string;
}

interface Consultation {
  followUpTiming: string;
  bookingInfo: string;
  urgency: string;
}

interface Doctor {
  name: string;
  specialty: string;
  qualification: string;
  availability: string;
  contact: string;
  location: string;
  consultationFee?: string;
}

interface DoctorRecommendation {
  specialty: string;
  reason: string;
  urgency: string;
}

interface MuainaInterpretation {
  summary: string;
  medicalCondition: MedicalCondition;
  precautions: string[];
  diet: string[];
  consultation: Consultation;
  medicalRecommendations: string[];
  dos: string[];
  donts: string[];
  lifestyleChanges: string[];
  suggestedDoctors: Doctor[];
  doctorRecommendations: DoctorRecommendation[];
}

export interface PDFReportData {
  id: string;
  fileName: string;
  uploadedAt: string;
  classification: string;
  findings: Finding[];
  summary: string;
  details: string;
  reviewStatus: string;
  reviewedAt?: string;
  organizationName: string;
  aiOutputJson?: string;
  muainaInterpretation?: MuainaInterpretation;
}

function getClassificationColor(classification: string): string {
  switch (classification) {
    case "normal":
      return COLORS.success;
    case "abnormal":
      return COLORS.warning;
    case "critical":
      return COLORS.danger;
    default:
      return COLORS.neutral;
  }
}

function getUrgencyColor(urgency: string): string {
  switch (urgency.toUpperCase()) {
    case "URGENT":
      return COLORS.danger;
    case "SOON":
      return COLORS.warning;
    default:
      return COLORS.info;
  }
}

export async function generateReportPDF(data: PDFReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 30, bottom: 30, left: 30, right: 30 },
        bufferPages: true,
      });

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // ===== PAGE 1: Report Information & Analysis =====
      addHeader(doc);
      addReportInfo(doc, data);
      addAIAnalysis(doc, data);
      addFindings(doc, data.findings);
      addDisclaimer(doc);

      // ===== PAGE 2: Muaina Interpretation (if present) =====
      if (data.muainaInterpretation) {
        doc.addPage();
        addInterpretationPage(doc, data.muainaInterpretation);
      }

      // ===== PAGE 3: Suggested Doctors (if present) =====
      if (
        data.muainaInterpretation?.suggestedDoctors?.length ||
        data.muainaInterpretation?.doctorRecommendations?.length
      ) {
        doc.addPage();
        addDoctorsPage(doc, data.muainaInterpretation);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function addHeader(doc: PDFKit.PDFDocument) {
  doc
    .fillColor(COLORS.primary)
    .fontSize(28)
    .font("Helvetica-Bold")
    .text("MUAINA", { continued: false });

  doc
    .fillColor(COLORS.neutral)
    .fontSize(10)
    .font("Helvetica")
    .text("AI-Powered Pathology Report Analysis");

  doc.moveDown(0.5);

  // Horizontal line
  doc
    .strokeColor(COLORS.primary)
    .lineWidth(2)
    .moveTo(30, doc.y)
    .lineTo(565, doc.y)
    .stroke();

  doc.moveDown(1);
}

function addSectionTitle(doc: PDFKit.PDFDocument, title: string) {
  doc.moveDown(0.5);
  doc
    .fillColor(COLORS.primary)
    .fontSize(14)
    .font("Helvetica-Bold")
    .text(title);
  doc.moveDown(0.3);
}

function addSubSectionTitle(doc: PDFKit.PDFDocument, title: string) {
  doc.moveDown(0.3);
  doc.fillColor(COLORS.neutral).fontSize(12).font("Helvetica-Bold").text(title);
  doc.moveDown(0.2);
}

function addReportInfo(doc: PDFKit.PDFDocument, data: PDFReportData) {
  addSectionTitle(doc, "Report Information");

  const info = [
    ["Report ID:", data.id?.substring(0, 8) + "..."],
    ["File Name:", data.fileName || "Unknown"],
    ["Uploaded:", data.uploadedAt || "N/A"],
    ["Organization:", data.organizationName || "Unknown"],
    ["Classification:", (data.classification || "pending").toUpperCase()],
    ["Review Status:", data.reviewStatus || "pending"],
  ];

  const classificationColor = getClassificationColor(data.classification);

  info.forEach(([label, value], index) => {
    doc
      .fillColor(COLORS.neutral)
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(label, 30, doc.y, { continued: true, width: 120 });

    // Apply color for classification
    if (index === 4) {
      doc.fillColor(classificationColor);
    } else {
      doc.fillColor(COLORS.neutral);
    }

    doc.font("Helvetica").text(value);
  });

  doc.moveDown(1);
}

function addAIAnalysis(doc: PDFKit.PDFDocument, data: PDFReportData) {
  addSectionTitle(doc, "AI Analysis Summary");

  doc
    .fillColor(COLORS.neutral)
    .fontSize(10)
    .font("Helvetica")
    .text(data.summary || "No summary available", {
      width: 535,
      lineGap: 4,
    });

  doc.moveDown(0.5);

  doc.text(data.details || "No details available", {
    width: 535,
    lineGap: 4,
  });

  doc.moveDown(1);
}

function addFindings(doc: PDFKit.PDFDocument, findings: Finding[]) {
  if (!findings || findings.length === 0) return;

  addSectionTitle(doc, "Key Findings");

  findings.forEach((finding) => {
    const severity = (finding.severity || "info").toUpperCase();
    let severityColor = COLORS.neutral;

    if (severity === "CRITICAL") severityColor = COLORS.danger;
    else if (severity === "WARNING") severityColor = COLORS.warning;

    doc
      .fillColor(severityColor)
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(`[${severity}] ${finding.category || ""}`, { width: 535 });

    doc
      .fillColor(COLORS.neutral)
      .font("Helvetica")
      .text(finding.description || "", { indent: 20, width: 515 });

    doc.moveDown(0.3);
  });
}

function addDisclaimer(doc: PDFKit.PDFDocument) {
  doc.moveDown(1);

  doc
    .fillColor(COLORS.warning)
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("DISCLAIMER: ", { continued: true });

  doc
    .font("Helvetica")
    .text(
      "This AI-generated analysis is for informational purposes only and should not " +
        "replace professional medical advice. Always consult with qualified healthcare providers " +
        "for diagnosis and treatment decisions.",
      { width: 535, lineGap: 2 }
    );
}

function addInterpretationPage(
  doc: PDFKit.PDFDocument,
  interpretation: MuainaInterpretation
) {
  // Header
  doc
    .fillColor(COLORS.primary)
    .fontSize(28)
    .font("Helvetica-Bold")
    .text("MUAINA");

  addSectionTitle(doc, "Patient-Friendly Interpretation");

  // Horizontal line
  doc
    .strokeColor(COLORS.primary)
    .lineWidth(2)
    .moveTo(30, doc.y)
    .lineTo(565, doc.y)
    .stroke();

  doc.moveDown(1);

  // Medical Condition
  const condition = interpretation.medicalCondition;
  if (condition) {
    addSubSectionTitle(doc, "Medical Condition");

    doc
      .fillColor(COLORS.danger)
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(condition.name || "Unknown");

    doc
      .fillColor(COLORS.neutral)
      .fontSize(10)
      .font("Helvetica")
      .text(condition.description || "", { width: 535 });

    let metaText = `Severity: ${(condition.severity || "moderate").toUpperCase()}`;
    if (condition.icdCode) metaText += ` | ICD Code: ${condition.icdCode}`;

    doc.text(metaText, { indent: 20 });
    doc.moveDown(0.5);
  }

  // Summary
  addSubSectionTitle(doc, "What This Means");
  doc
    .fillColor(COLORS.neutral)
    .fontSize(10)
    .font("Helvetica")
    .text(interpretation.summary || "", { width: 535 });
  doc.moveDown(0.5);

  // Precautions
  if (interpretation.precautions?.length) {
    addSubSectionTitle(doc, "Important Precautions");
    interpretation.precautions.forEach((item) => {
      doc
        .fillColor(COLORS.warning)
        .fontSize(10)
        .font("Helvetica")
        .text(`⚠ ${item}`, { indent: 20, width: 515 });
    });
    doc.moveDown(0.5);
  }

  // Diet
  if (interpretation.diet?.length) {
    addSubSectionTitle(doc, "Diet Recommendations");
    interpretation.diet.forEach((item) => {
      doc
        .fillColor(COLORS.info)
        .fontSize(10)
        .font("Helvetica")
        .text(`• ${item}`, { indent: 20, width: 515 });
    });
    doc.moveDown(0.5);
  }

  // Consultation
  const consultation = interpretation.consultation;
  if (consultation) {
    addSubSectionTitle(doc, "Consultation Information");

    doc
      .fillColor(COLORS.neutral)
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("Follow-up: ", { continued: true });
    doc.font("Helvetica").text(consultation.followUpTiming || "N/A");

    doc.font("Helvetica-Bold").text("How to Book: ", { continued: true });
    doc.font("Helvetica").text(consultation.bookingInfo || "N/A");

    const urgency = (consultation.urgency || "routine").toUpperCase();
    const urgencyColor = getUrgencyColor(urgency);

    doc.font("Helvetica-Bold").text("Priority: ", { continued: true });
    doc.fillColor(urgencyColor).font("Helvetica").text(urgency);

    doc.moveDown(0.5);
  }

  // Do's and Don'ts
  if (interpretation.dos?.length || interpretation.donts?.length) {
    addSubSectionTitle(doc, "Do's and Don'ts");

    if (interpretation.dos?.length) {
      doc
        .fillColor(COLORS.neutral)
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Things to Do:");
      interpretation.dos.forEach((item) => {
        doc
          .fillColor(COLORS.success)
          .font("Helvetica")
          .text(`✓ ${item}`, { indent: 20, width: 515 });
      });
      doc.moveDown(0.3);
    }

    if (interpretation.donts?.length) {
      doc
        .fillColor(COLORS.neutral)
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Things to Avoid:");
      interpretation.donts.forEach((item) => {
        doc
          .fillColor(COLORS.danger)
          .font("Helvetica")
          .text(`✗ ${item}`, { indent: 20, width: 515 });
      });
    }
    doc.moveDown(0.5);
  }

  // Lifestyle Changes
  if (interpretation.lifestyleChanges?.length) {
    addSubSectionTitle(doc, "Lifestyle Changes");
    interpretation.lifestyleChanges.forEach((item) => {
      doc
        .fillColor(COLORS.neutral)
        .fontSize(10)
        .font("Helvetica")
        .text(`• ${item}`, { indent: 20, width: 515 });
    });
    doc.moveDown(0.5);
  }

  // Disclaimer
  doc.moveDown(1);
  doc
    .fillColor(COLORS.warning)
    .fontSize(9)
    .font("Helvetica")
    .text(
      "This interpretation is designed to help you understand your results in simple terms. " +
        "It is NOT a substitute for professional medical advice. Please discuss these findings " +
        "with your healthcare provider.",
      { width: 535, lineGap: 2 }
    );
}

function addDoctorsPage(
  doc: PDFKit.PDFDocument,
  interpretation: MuainaInterpretation
) {
  // Header
  doc
    .fillColor(COLORS.primary)
    .fontSize(28)
    .font("Helvetica-Bold")
    .text("MUAINA");

  addSectionTitle(doc, "Recommended Healthcare Providers");

  // Horizontal line
  doc
    .strokeColor(COLORS.primary)
    .lineWidth(2)
    .moveTo(30, doc.y)
    .lineTo(565, doc.y)
    .stroke();

  doc.moveDown(1);

  // Suggested Doctors
  if (interpretation.suggestedDoctors?.length) {
    addSubSectionTitle(doc, "Suggested Doctors");

    interpretation.suggestedDoctors.forEach((doctor) => {
      doc
        .fillColor(COLORS.success)
        .fontSize(11)
        .font("Helvetica-Bold")
        .text(doctor.name || "N/A");

      doc
        .fillColor(COLORS.neutral)
        .fontSize(10)
        .font("Helvetica")
        .text(
          `${doctor.specialty || ""} - ${doctor.qualification || ""}`.trim()
        );

      doc.text(`Location: ${doctor.location || "N/A"}`, { indent: 20 });
      doc.text(`Availability: ${doctor.availability || "N/A"}`, { indent: 20 });
      doc.text(`Contact: ${doctor.contact || "N/A"}`, { indent: 20 });

      if (doctor.consultationFee) {
        doc.text(`Fee: ${doctor.consultationFee}`, { indent: 20 });
      }

      doc.moveDown(0.5);
    });
  }

  // Doctor Recommendations
  if (interpretation.doctorRecommendations?.length) {
    addSubSectionTitle(doc, "Specialist Consultations Recommended");

    interpretation.doctorRecommendations.forEach((rec) => {
      const urgency = (rec.urgency || "routine").toUpperCase();

      doc
        .fillColor(COLORS.neutral)
        .fontSize(10)
        .font("Helvetica-Bold")
        .text(`${rec.specialty || "N/A"} (${urgency})`);

      doc.font("Helvetica").text(rec.reason || "", { indent: 20, width: 515 });

      doc.moveDown(0.3);
    });
  }

  // Disclaimer
  doc.moveDown(1);
  doc
    .fillColor(COLORS.warning)
    .fontSize(9)
    .font("Helvetica")
    .text(
      "The suggested doctors are recommendations based on your medical needs. " +
        "Availability and fees may vary. Please contact the healthcare provider directly " +
        "to confirm appointment details.",
      { width: 535, lineGap: 2 }
    );
}
