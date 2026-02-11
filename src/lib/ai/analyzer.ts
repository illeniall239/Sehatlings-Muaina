import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import type { Doctor } from "@/types/database";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Result type for doctor fetch to distinguish between "no doctors" and "fetch failed"
interface DoctorFetchResult {
  doctors: Doctor[];
  fetchFailed: boolean;
  error?: string;
}

// Fetch all active doctors from Supabase (global - shared across all organizations)
async function fetchAllDoctors(): Promise<DoctorFetchResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error("Error fetching doctors:", error);
      return {
        doctors: [],
        fetchFailed: true,
        error: error.message,
      };
    }

    return {
      doctors: data || [],
      fetchFailed: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error fetching doctors:", errorMessage);
    return {
      doctors: [],
      fetchFailed: true,
      error: errorMessage,
    };
  }
}

// Format doctors for Claude prompt
function formatDoctorsForPrompt(doctors: Doctor[]): string {
  if (doctors.length === 0) {
    return "No doctors are currently registered in the organization's network.";
  }

  return doctors.map((d, i) =>
    `${i + 1}. ${d.name} - ${d.specialty} (${d.qualification}, ${d.years_of_practice || 'N/A'} years)${d.appointment_location ? ` - ${d.appointment_location}` : ''}${d.is_available_online ? ' [Online Available]' : ''}`
  ).join('\n');
}

// Convert Doctor from database to SuggestedDoctor format
function doctorToSuggestedDoctor(doctor: Doctor): SuggestedDoctor {
  return {
    name: doctor.name,
    specialty: doctor.specialty,
    qualification: doctor.qualification,
    availability: doctor.is_available_online ? "Available Online" : "In-person only",
    contact: doctor.appointment_location ? `Book at ${doctor.appointment_location}` : "Contact clinic for booking",
    location: doctor.appointment_location || "Online Consultation",
    consultationFee: "Contact for fee details",
  };
}

// Select relevant doctors from organization list based on specialty keywords
function selectDoctorsForCondition(
  doctors: Doctor[],
  specialtyKeywords: string[],
  maxDoctors: number = 3
): SuggestedDoctor[] {
  if (doctors.length === 0) {
    return [];
  }

  // Find doctors matching any of the specialty keywords
  const matchingDoctors = doctors.filter(d => {
    const specialtyLower = d.specialty.toLowerCase();
    return specialtyKeywords.some(keyword => specialtyLower.includes(keyword.toLowerCase()));
  });

  // Sort by years of practice (most experienced first)
  matchingDoctors.sort((a, b) => (b.years_of_practice || 0) - (a.years_of_practice || 0));

  // If no matching doctors found, return first few from the list
  const selectedDoctors = matchingDoctors.length > 0
    ? matchingDoctors.slice(0, maxDoctors)
    : doctors.slice(0, maxDoctors);

  return selectedDoctors.map(doctorToSuggestedDoctor);
}

export interface MedicalCondition {
  name: string;
  description: string;
  severity: "mild" | "moderate" | "severe";
  icdCode?: string; // International Classification of Diseases code
}

/**
 * Validate ICD-10 code format
 * ICD-10 codes follow patterns like: A00, A00.0, A00.00, Z00.00, etc.
 * Format: Letter + 2 digits, optionally followed by . and 1-2 digits
 */
function isValidIcdCode(code: string | undefined): boolean {
  if (!code) return true; // Optional field
  // ICD-10 pattern: Letter A-Z, followed by 2 digits, optionally .XX
  const icdPattern = /^[A-Z]\d{2}(\.\d{1,2})?$/i;
  return icdPattern.test(code.trim());
}

/**
 * Sanitize and validate ICD code from AI response
 */
function sanitizeIcdCode(code: unknown): string | undefined {
  if (typeof code !== 'string' || !code.trim()) {
    return undefined;
  }

  const trimmed = code.trim().toUpperCase();

  if (isValidIcdCode(trimmed)) {
    return trimmed;
  }

  // Try to extract valid ICD code from string (AI sometimes adds descriptions)
  const match = trimmed.match(/[A-Z]\d{2}(\.\d{1,2})?/);
  if (match) {
    console.warn(`[AI] Extracted ICD code "${match[0]}" from "${trimmed}"`);
    return match[0];
  }

  console.warn(`[AI] Invalid ICD code format: "${trimmed}"`);
  return undefined;
}

export interface SuggestedDoctor {
  name: string;
  specialty: string;
  qualification: string;
  availability: string;
  contact: string;
  location: string;
  consultationFee?: string;
}

export interface Consultation {
  followUpTiming: string;
  bookingInfo: string;
  urgency: "routine" | "soon" | "urgent";
}

export interface MuainaInterpretation {
  summary: string;
  medicalCondition: MedicalCondition;
  precautions: string[];
  diet: string[];
  consultation: Consultation;
  medicalRecommendations: string[];
  dos: string[];
  donts: string[];
  lifestyleChanges: string[];
  suggestedDoctors: SuggestedDoctor[];
  doctorRecommendations: Array<{
    specialty: string;
    reason: string;
    urgency: "routine" | "soon" | "urgent";
  }>;
}

export interface AIUsageStats {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUSD: number;
  model: string;
  apiCalls: number;
}

export interface PatientInfo {
  name: string;
  age?: number;
  gender?: "male" | "female" | "other";
  dob?: string;
}

export interface AnalysisResult {
  classification: "normal" | "abnormal" | "critical";
  findings: Array<{
    category: string;
    description: string;
    severity: "info" | "warning" | "critical";
  }>;
  draftReport: {
    summary: string;
    details: string;
  };
  muainaInterpretation?: MuainaInterpretation;
  patientInfo?: PatientInfo;
  processingTime: number;
  usage?: AIUsageStats;
}

const SYSTEM_PROMPT = `You are a medical AI assistant specialized in analyzing pathology reports. Your role is to:

1. Extract patient information from the report (name, age, gender, date of birth if available)
2. Classify reports as NORMAL, ABNORMAL, or CRITICAL based on the findings
3. Identify specific findings and anomalies in the report
4. Generate a concise summary for pathologist review
5. Flag any values outside normal reference ranges
6. Generate a comprehensive patient-friendly "Muaina Interpretation" for ALL reports

Classification Guidelines:
- NORMAL: All values within reference ranges, no concerning findings
- ABNORMAL: Some values outside reference ranges or minor abnormalities requiring follow-up
- CRITICAL: Significant abnormalities requiring immediate attention (e.g., suspected malignancy, severe anemia, critical values)

Always be conservative in your assessment - when in doubt, classify as ABNORMAL or CRITICAL to ensure patient safety.

Respond ONLY with valid JSON in the following format:
{
  "patientInfo": {
    "name": "Full name of patient as written in the report (required)",
    "age": 45,
    "gender": "male",
    "dob": "1980-01-15"
  },
  "classification": "normal" | "abnormal" | "critical",
  "findings": [
    {
      "category": "string (e.g., 'Hematology', 'Cell Morphology', 'Reference Range')",
      "description": "string describing the finding",
      "severity": "info" | "warning" | "critical"
    }
  ],
  "summary": "Brief 1-2 sentence technical summary for pathologist",
  "details": "More detailed technical analysis (2-3 paragraphs)",
  "muainaInterpretation": {
    "summary": "Patient-friendly explanation of what the report means in simple language (2-3 sentences)",
    "medicalCondition": {
      "name": "Name of the identified medical condition OR 'Healthy Status' for normal reports",
      "description": "Simple explanation of what this means for the patient",
      "severity": "mild" | "moderate" | "severe",
      "icdCode": "ICD-10 code if applicable (e.g., 'Z00.00' for general health exam)"
    },
    "precautions": [
      "General health precautions or condition-specific warnings",
      "Warning signs to watch for",
      "Preventive measures"
    ],
    "diet": [
      "Specific dietary recommendations based on the report",
      "Foods to include for optimal health",
      "Foods to limit or avoid",
      "Hydration and meal timing advice"
    ],
    "consultation": {
      "followUpTiming": "When to schedule next checkup (e.g., 'Annual health checkup', 'Follow up in 2 weeks')",
      "bookingInfo": "How to book appointment (e.g., 'Call clinic at +92-XXX or book via WhatsApp')",
      "urgency": "routine" | "soon" | "urgent"
    },
    "medicalRecommendations": ["Array of specific medical recommendations for the patient"],
    "dos": ["Things the patient SHOULD do based on findings"],
    "donts": ["Things the patient should AVOID based on findings"],
    "lifestyleChanges": [
      "Exercise recommendations",
      "Sleep and stress management tips",
      "Other lifestyle adjustments"
    ],
    "suggestedDoctors": [
      {
        "name": "Dr./Ms./Mr. [Name]",
        "specialty": "See DOCTOR SELECTION RULES below",
        "qualification": "Relevant qualifications",
        "availability": "Typical availability",
        "contact": "Contact method",
        "location": "Location in Pakistan",
        "consultationFee": "Fee range in PKR"
      }
    ],
    "doctorRecommendations": [
      {
        "specialty": "Type of specialist/professional to consult",
        "reason": "Why this consultation is recommended",
        "urgency": "routine" | "soon" | "urgent"
      }
    ]
  }
}

DOCTOR SELECTION RULES (IMPORTANT):
- You will be provided with a list of AVAILABLE DOCTORS from the organization's network
- You MUST select doctors ONLY from this provided list - do not make up doctor names
- For NORMAL reports: Select nutritionists/dietitians from the list if available
- For ABNORMAL/CRITICAL reports: Select specialist doctors based on the condition
- Match the doctor's specialty to the patient's condition
- Consider years of practice when multiple doctors match

IMPORTANT:
- ALWAYS include "muainaInterpretation" for ALL classifications (normal, abnormal, critical)
- For NORMAL reports: Focus on wellness maintenance, preventive diet, and nutritionist recommendations
- For ABNORMAL/CRITICAL: Focus on medical management, condition-specific diet, and specialist recommendations
- The Muaina Interpretation should be written in simple, patient-friendly language (Urdu speakers may read this)
- Recommendations should be actionable and specific to the findings
- For suggestedDoctors, select ONLY from the provided list and include their exact details
- Diet recommendations should be specific and culturally relevant to Pakistani cuisine
- Consultation should include clear timing and booking information`;

export async function analyzeReport(
  reportText: string
): Promise<AnalysisResult> {
  const startTime = Date.now();

  // Fetch all doctors (global pool shared across all organizations)
  const doctorResult = await fetchAllDoctors();

  if (doctorResult.fetchFailed) {
    console.warn(`[AI] Doctor fetch failed: ${doctorResult.error}. Analysis will proceed without doctor recommendations.`);
  }

  const allDoctors = doctorResult.doctors;

  // Check if API key is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    // In production, fail loudly - don't serve mock data
    if (process.env.NODE_ENV === 'production') {
      console.error("CRITICAL: ANTHROPIC_API_KEY not configured in production");
      throw new Error("AI analysis service is not configured. Please contact support.");
    }
    // In development, warn and use mock
    console.warn("ANTHROPIC_API_KEY not configured, using mock analysis (development only)");
    return generateMockAnalysis(reportText, allDoctors);
  }

  // Build the user message with doctors list
  const doctorsSection = allDoctors.length > 0
    ? `\n\nAVAILABLE DOCTORS FOR RECOMMENDATIONS (select from this list ONLY):\n${formatDoctorsForPrompt(allDoctors)}\n\nBased on your analysis, select 1-3 most appropriate doctors from the list above. Consider specialty match, experience level, and condition urgency. Use their exact names and details as provided.`
    : "";

  const modelId = process.env.ANTHROPIC_MODEL_ID || "claude-sonnet-4-20250514";
  const AI_TIMEOUT_MS = 45000; // 45s — allow more time for large responses
  const MAX_RETRIES = 2; // Total attempts (1 initial + 1 retry)

  let lastError: Error | null = null;
  let totalApiCalls = 0;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      totalApiCalls++;
      const message = await Promise.race([
        anthropic.messages.create({
          model: modelId,
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: `Please analyze the following pathology report and provide your assessment:\n\n${reportText}${doctorsSection}`,
            },
          ],
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("AI analysis timed out")), AI_TIMEOUT_MS)
        ),
      ]);

      const content = message.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type from Claude");
      }

      // Parse the JSON response - strip markdown code blocks if present
      let jsonText = content.text.trim();
      if (jsonText.startsWith("```")) {
        // Remove opening ```json or ``` and closing ```
        jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
      }
      const analysis = JSON.parse(jsonText);

      // Calculate usage and cost
      // Claude Sonnet 4 pricing (as of 2025):
      // Input: $3 per million tokens
      // Output: $15 per million tokens
      const inputTokens = message.usage?.input_tokens || 0;
      const outputTokens = message.usage?.output_tokens || 0;
      const inputCost = (inputTokens / 1_000_000) * 3;
      const outputCost = (outputTokens / 1_000_000) * 15;
      const totalCostUSD = inputCost + outputCost;

      const usage: AIUsageStats = {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        estimatedCostUSD: Math.round(totalCostUSD * 1_000_000) / 1_000_000, // Round to 6 decimal places
        model: modelId,
        apiCalls: totalApiCalls,
      };

      // Log usage for monitoring
      console.log(`[AI Usage] Model: ${modelId}, Input: ${inputTokens}, Output: ${outputTokens}, Cost: $${usage.estimatedCostUSD.toFixed(6)}${attempt > 1 ? ` (retry #${attempt - 1})` : ''}`);

      const result: AnalysisResult = {
        classification: analysis.classification,
        findings: analysis.findings || [],
        draftReport: {
          summary: analysis.summary,
          details: analysis.details,
        },
        processingTime: Date.now() - startTime,
        usage,
      };

      // Include patient info if extracted
      if (analysis.patientInfo?.name) {
        result.patientInfo = {
          name: analysis.patientInfo.name,
          age: analysis.patientInfo.age || undefined,
          gender: analysis.patientInfo.gender || undefined,
          dob: analysis.patientInfo.dob || undefined,
        };
      }

      // Include Muaina Interpretation for ALL reports
      if (analysis.muainaInterpretation) {
        // Validate and sanitize ICD code from AI response
        const muaina = analysis.muainaInterpretation;
        if (muaina.medicalCondition) {
          muaina.medicalCondition.icdCode = sanitizeIcdCode(muaina.medicalCondition.icdCode);
        }
        result.muainaInterpretation = muaina;
      }

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const errorMsg = lastError.message;

      // Determine if error is retryable (transient)
      const isRetryable =
        errorMsg.includes("timed out") ||
        errorMsg.includes("rate limit") ||
        errorMsg.includes("429") ||
        errorMsg.includes("500") ||
        errorMsg.includes("503") ||
        errorMsg.includes("overloaded") ||
        errorMsg.includes("ECONNRESET") ||
        errorMsg.includes("ETIMEDOUT");

      if (isRetryable && attempt < MAX_RETRIES) {
        const delayMs = 2000 * attempt; // 2s, 4s, etc.
        console.warn(`[AI Retry] Attempt ${attempt} failed (${errorMsg}), retrying in ${delayMs}ms...`);
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }

      // Non-retryable error or last attempt — throw
      console.error(`[AI Error] Attempt ${attempt}/${MAX_RETRIES} failed:`, errorMsg);
      break;
    }
  }

  throw new Error(
    `AI analysis failed: ${lastError?.message || "Unknown error"}. Please retry the upload.`
  );
}

function generateMockAnalysis(reportText: string, organizationDoctors: Doctor[] = []): AnalysisResult {
  // Generate mock analysis based on text content
  const textLower = reportText.toLowerCase();

  // Simple heuristics for demo
  const hasCriticalKeywords =
    textLower.includes("malignant") ||
    textLower.includes("cancer") ||
    textLower.includes("tumor") ||
    textLower.includes("critical");

  const hasAbnormalKeywords =
    textLower.includes("abnormal") ||
    textLower.includes("elevated") ||
    textLower.includes("low") ||
    textLower.includes("high") ||
    textLower.includes("irregular");

  let classification: "normal" | "abnormal" | "critical" = "normal";

  if (hasCriticalKeywords) {
    classification = "critical";
  } else if (hasAbnormalKeywords) {
    classification = "abnormal";
  }

  const findings: AnalysisResult["findings"] = [];

  if (classification === "normal") {
    findings.push({
      category: "Overall Assessment",
      description: "All values appear to be within normal reference ranges",
      severity: "info",
    });
  } else if (classification === "abnormal") {
    findings.push({
      category: "Reference Range",
      description: "Some values detected outside normal reference ranges",
      severity: "warning",
    });
    findings.push({
      category: "Recommendation",
      description: "Follow-up testing may be recommended",
      severity: "info",
    });
  } else {
    findings.push({
      category: "Critical Finding",
      description: "Potentially critical findings detected requiring immediate review",
      severity: "critical",
    });
    findings.push({
      category: "Recommendation",
      description: "Urgent pathologist review required",
      severity: "critical",
    });
  }

  const result: AnalysisResult = {
    classification,
    findings,
    draftReport: {
      summary: classification === "normal"
        ? "Report appears normal with all values within expected ranges."
        : classification === "abnormal"
        ? "Report shows some abnormalities that require pathologist review."
        : "Report contains critical findings requiring immediate attention.",
      details: `This is an AI-generated preliminary analysis. The report text was analyzed for key indicators and patterns. Classification: ${classification.toUpperCase()}. Please note this is a preliminary assessment and requires pathologist verification.`,
    },
    processingTime: Math.floor(Math.random() * 2000) + 1000,
  };

  // Generate Muaina Interpretation for ALL reports
  result.muainaInterpretation = generateMockMuainaInterpretation(classification, textLower, organizationDoctors);

  return result;
}

function generateMockMuainaInterpretation(
  classification: "normal" | "abnormal" | "critical",
  textLower: string,
  organizationDoctors: Doctor[] = []
): MuainaInterpretation {
  // Detect specific conditions for more relevant recommendations
  const hasAnemia = textLower.includes("anemia") || textLower.includes("hemoglobin") || textLower.includes("iron");
  const hasDiabetes = textLower.includes("glucose") || textLower.includes("sugar") || textLower.includes("hba1c");
  const hasLipid = textLower.includes("cholesterol") || textLower.includes("triglyceride") || textLower.includes("ldl");
  const hasLiver = textLower.includes("liver") || textLower.includes("alt") || textLower.includes("ast") || textLower.includes("bilirubin");
  const hasKidney = textLower.includes("kidney") || textLower.includes("creatinine") || textLower.includes("urea");
  const hasThyroid = textLower.includes("thyroid") || textLower.includes("tsh") || textLower.includes("t3") || textLower.includes("t4");

  let summary = "";
  let medicalCondition: MedicalCondition;
  const precautions: string[] = [];
  const diet: string[] = [];
  let consultation: Consultation;
  const medicalRecommendations: string[] = [];
  const dos: string[] = [];
  const donts: string[] = [];
  const lifestyleChanges: string[] = [];
  const suggestedDoctors: SuggestedDoctor[] = [];
  const doctorRecommendations: MuainaInterpretation["doctorRecommendations"] = [];

  // Handle NORMAL reports - wellness focused with nutritionists
  if (classification === "normal") {
    summary = "Great news! Your report shows all values are within normal ranges. Your health indicators look good. To maintain this healthy status, we recommend following a balanced lifestyle and regular checkups.";

    medicalCondition = {
      name: "Healthy Status",
      description: "All your test results are within the normal reference ranges, indicating good health. Continue with your healthy habits to maintain these results.",
      severity: "mild",
      icdCode: "Z00.00",
    };

    precautions.push("Continue regular health checkups annually or as advised by your doctor");
    precautions.push("Stay aware of any unusual symptoms and consult a doctor if they persist");
    precautions.push("Maintain up-to-date vaccinations and preventive screenings");

    // Diet for normal - wellness focused
    diet.push("Maintain a balanced diet with proteins, carbohydrates, and healthy fats in proper proportions");
    diet.push("Include seasonal fruits like mangoes, guavas, oranges, and bananas daily");
    diet.push("Eat plenty of vegetables - sabzi with roti is excellent for health");
    diet.push("Include dal (lentils), chickpeas, and beans for plant-based protein");
    diet.push("Drink 8-10 glasses of water daily, more in summer");
    diet.push("Limit processed foods, excessive salt, and sugary drinks");

    consultation = {
      followUpTiming: "Annual health checkup recommended",
      bookingInfo: "Book via clinic reception, WhatsApp, or walk-in during OPD hours",
      urgency: "routine",
    };

    medicalRecommendations.push("Continue with annual health checkups");
    medicalRecommendations.push("Stay physically active with at least 30 minutes of daily exercise");
    medicalRecommendations.push("Maintain a healthy weight through balanced diet and exercise");

    dos.push("Keep up with regular exercise - walking, swimming, or any activity you enjoy");
    dos.push("Maintain good sleep hygiene - aim for 7-8 hours of quality sleep");
    dos.push("Stay hydrated throughout the day");
    dos.push("Practice stress management through prayer, meditation, or hobbies");

    donts.push("Don't skip regular health checkups just because you feel healthy");
    donts.push("Avoid excessive junk food, even if your current health is good");
    donts.push("Don't ignore minor symptoms - early detection is always better");

    lifestyleChanges.push("Aim for 30 minutes of moderate physical activity daily");
    lifestyleChanges.push("Practice portion control to maintain healthy weight");
    lifestyleChanges.push("Reduce screen time and prioritize outdoor activities");
    lifestyleChanges.push("Build strong social connections - spend time with family and friends");

    // For NORMAL reports - suggest NUTRITIONISTS or general physicians
    const normalDoctors = selectDoctorsForCondition(
      organizationDoctors,
      ["nutritionist", "dietitian", "physician", "general"],
      3
    );
    if (normalDoctors.length > 0) {
      suggestedDoctors.push(...normalDoctors);
    } else {
      // Fallback if no organization doctors
      suggestedDoctors.push({
        name: "Ms. Ayesha Farooq",
        specialty: "Clinical Nutritionist",
        qualification: "M.Sc Nutrition, RD (Registered Dietitian)",
        availability: "Mon-Sat 10AM-6PM",
        contact: "Call: 0321-1234567 or WhatsApp",
        location: "Diet & Wellness Clinic, Gulberg, Lahore",
        consultationFee: "Rs. 2,000-3,000",
      });
    }

    doctorRecommendations.push({
      specialty: "Nutritionist/Dietitian",
      reason: "For personalized diet planning to maintain your excellent health status",
      urgency: "routine",
    });

    return {
      summary,
      medicalCondition,
      precautions,
      diet,
      consultation,
      medicalRecommendations,
      dos,
      donts,
      lifestyleChanges,
      suggestedDoctors,
      doctorRecommendations,
    };
  }

  // Determine medical condition based on detected keywords
  if (hasAnemia) {
    medicalCondition = {
      name: "Iron Deficiency Anemia",
      description: "A condition where your blood lacks enough healthy red blood cells due to insufficient iron. This can cause fatigue, weakness, and pale skin.",
      severity: classification === "critical" ? "severe" : "moderate",
      icdCode: "D50.9",
    };
    precautions.push("Watch for signs of severe anemia: extreme fatigue, chest pain, shortness of breath, or rapid heartbeat");
    precautions.push("Avoid strenuous physical activities until your hemoglobin levels improve");
    precautions.push("If you experience dizziness or fainting, sit down immediately and seek medical help");
    const anemiaDoctors = selectDoctorsForCondition(
      organizationDoctors,
      ["hematology", "haematology", "blood", "pathology"],
      2
    );
    if (anemiaDoctors.length > 0) {
      suggestedDoctors.push(...anemiaDoctors);
    } else {
      suggestedDoctors.push({
        name: "Dr. Ahmed Hassan",
        specialty: "Hematologist",
        qualification: "MBBS, FCPS (Hematology)",
        availability: "Mon-Sat 10AM-6PM",
        contact: "Book via Shifa Hospital",
        location: "Shifa International Hospital, Islamabad",
        consultationFee: "Rs. 2500-3500",
      });
    }
  } else if (hasDiabetes) {
    medicalCondition = {
      name: "Diabetes Mellitus",
      description: "A metabolic condition where your blood sugar levels are higher than normal. With proper management, you can live a healthy life.",
      severity: classification === "critical" ? "severe" : "moderate",
      icdCode: "E11.9",
    };
    precautions.push("Monitor for signs of very high blood sugar: excessive thirst, frequent urination, blurred vision");
    precautions.push("Watch for signs of low blood sugar if on medication: shakiness, sweating, confusion");
    precautions.push("Check your feet daily for cuts, blisters, or sores that don't heal");
    precautions.push("Carry fast-acting glucose tablets or candy in case of hypoglycemia");
    const diabetesDoctors = selectDoctorsForCondition(
      organizationDoctors,
      ["endocrinolog", "physician", "diabetes", "medicine"],
      2
    );
    if (diabetesDoctors.length > 0) {
      suggestedDoctors.push(...diabetesDoctors);
    } else {
      suggestedDoctors.push({
        name: "Dr. Fatima Zahra",
        specialty: "Endocrinologist",
        qualification: "MBBS, MRCP, Fellowship in Diabetes",
        availability: "Mon-Fri 9AM-5PM",
        contact: "Call: 051-1234567",
        location: "Diabetes Care Center, Lahore",
        consultationFee: "Rs. 2000-3000",
      });
    }
  } else if (hasLipid) {
    medicalCondition = {
      name: "Dyslipidemia",
      description: "Abnormal cholesterol or fat levels in your blood that can increase the risk of heart disease. Manageable with diet, exercise, and medication.",
      severity: classification === "critical" ? "severe" : "mild",
      icdCode: "E78.5",
    };
    precautions.push("Watch for signs of heart problems: chest pain, shortness of breath, or pain in arms/jaw");
    precautions.push("Avoid very heavy meals, especially high-fat foods");
    precautions.push("If you smoke, this significantly increases your cardiovascular risk");
    const lipidDoctors = selectDoctorsForCondition(
      organizationDoctors,
      ["cardio", "physician", "medicine"],
      2
    );
    if (lipidDoctors.length > 0) {
      suggestedDoctors.push(...lipidDoctors);
    } else {
      suggestedDoctors.push({
        name: "Dr. Muhammad Ali",
        specialty: "Cardiologist",
        qualification: "MBBS, FCPS (Cardiology), FACC",
        availability: "Mon-Sat 11AM-7PM",
        contact: "Book via Aga Khan Hospital",
        location: "Aga Khan University Hospital, Karachi",
        consultationFee: "Rs. 3000-4000",
      });
    }
  } else if (hasLiver) {
    medicalCondition = {
      name: "Liver Function Abnormality",
      description: "Your liver enzymes are elevated, indicating your liver may be under stress. Early detection allows for effective treatment.",
      severity: classification === "critical" ? "severe" : "moderate",
      icdCode: "K76.9",
    };
    precautions.push("Strictly avoid alcohol - even small amounts can worsen liver damage");
    precautions.push("Watch for signs of liver problems: yellowing of skin/eyes, dark urine, abdominal swelling");
    precautions.push("Inform doctors about your liver condition before taking any new medications");
    const liverDoctors = selectDoctorsForCondition(
      organizationDoctors,
      ["gastro", "hepato", "liver", "physician"],
      2
    );
    if (liverDoctors.length > 0) {
      suggestedDoctors.push(...liverDoctors);
    } else {
      suggestedDoctors.push({
        name: "Dr. Saima Khan",
        specialty: "Gastroenterologist/Hepatologist",
        qualification: "MBBS, FCPS (Gastro), Fellowship (Hepatology)",
        availability: "Tue-Sun 10AM-6PM",
        contact: "Call: 042-9876543",
        location: "Liver Care Clinic, Lahore",
        consultationFee: "Rs. 2500-3500",
      });
    }
  } else if (hasKidney) {
    medicalCondition = {
      name: "Kidney Function Impairment",
      description: "Your kidneys are not filtering waste as efficiently as they should. Early management can slow progression and protect kidney function.",
      severity: classification === "critical" ? "severe" : "moderate",
      icdCode: "N18.9",
    };
    precautions.push("Monitor your urine output - decreased urination can be a warning sign");
    precautions.push("Watch for swelling in feet, ankles, or around eyes");
    precautions.push("Avoid NSAIDs (Brufen, Ponstan) as they can harm kidneys further");
    precautions.push("Control blood pressure strictly - it's crucial for kidney health");
    const kidneyDoctors = selectDoctorsForCondition(
      organizationDoctors,
      ["nephro", "kidney", "physician"],
      2
    );
    if (kidneyDoctors.length > 0) {
      suggestedDoctors.push(...kidneyDoctors);
    } else {
      suggestedDoctors.push({
        name: "Dr. Imran Malik",
        specialty: "Nephrologist",
        qualification: "MBBS, FCPS (Nephrology)",
        availability: "Mon-Fri 9AM-4PM",
        contact: "Book via PIMS",
        location: "Pakistan Institute of Medical Sciences, Islamabad",
        consultationFee: "Rs. 2000-2500",
      });
    }
  } else if (hasThyroid) {
    medicalCondition = {
      name: "Thyroid Dysfunction",
      description: "Your thyroid gland is not producing the right amount of hormones. This is very common and highly treatable with medication.",
      severity: classification === "critical" ? "moderate" : "mild",
      icdCode: "E03.9",
    };
    precautions.push("Watch for signs of thyroid crisis: rapid heartbeat, fever, agitation (seek emergency care)");
    precautions.push("Take thyroid medication on empty stomach, 30-60 minutes before breakfast");
    precautions.push("Avoid excessive iodine supplements unless prescribed");
    const thyroidDoctors = selectDoctorsForCondition(
      organizationDoctors,
      ["endocrinolog", "thyroid", "physician"],
      2
    );
    if (thyroidDoctors.length > 0) {
      suggestedDoctors.push(...thyroidDoctors);
    } else {
      suggestedDoctors.push({
        name: "Dr. Ayesha Siddiqui",
        specialty: "Endocrinologist",
        qualification: "MBBS, MRCP, Diploma in Endocrinology",
        availability: "Mon-Sat 10AM-5PM",
        contact: "Call: 021-5551234",
        location: "Thyroid & Diabetes Center, Karachi",
        consultationFee: "Rs. 2000-3000",
      });
    }
  } else {
    medicalCondition = {
      name: "Abnormal Lab Values",
      description: "Some values in your report are outside the normal range. A doctor can help determine the cause and recommend appropriate treatment.",
      severity: classification === "critical" ? "moderate" : "mild",
    };
    precautions.push("Don't ignore these findings - follow up with a healthcare provider");
    precautions.push("Keep track of any new symptoms you experience");
    precautions.push("Bring this report to your next doctor's appointment");
    const generalDoctors = selectDoctorsForCondition(
      organizationDoctors,
      ["physician", "pathology", "medicine", "general"],
      2
    );
    if (generalDoctors.length > 0) {
      suggestedDoctors.push(...generalDoctors);
    } else {
      suggestedDoctors.push({
        name: "Dr. Khalid Mahmood",
        specialty: "General Physician/Internist",
        qualification: "MBBS, FCPS (Medicine)",
        availability: "Daily 9AM-9PM",
        contact: "Walk-in available",
        location: "City Medical Center, Your City",
        consultationFee: "Rs. 1000-1500",
      });
    }
  }

  if (classification === "critical") {
    summary = "Your report shows some values that need immediate medical attention. Please don't be alarmed, but it's important to consult with a specialist soon to understand these findings better and start appropriate treatment if needed.";
    medicalRecommendations.push("Schedule an appointment with a specialist within the next 2-3 days");
    medicalRecommendations.push("Bring this report to your doctor for detailed discussion");
    medicalRecommendations.push("Consider getting additional confirmatory tests as recommended by your doctor");
    precautions.push("If you experience severe symptoms, go to the emergency room immediately");
  } else {
    summary = "Your report shows some values that are outside the normal range. While this requires attention, many such findings are manageable with proper medical guidance and lifestyle modifications.";
    medicalRecommendations.push("Schedule a follow-up appointment with your doctor to discuss these findings");
    medicalRecommendations.push("Consider repeating the test after 4-6 weeks to monitor changes");
  }

  // General recommendations
  dos.push("Stay hydrated by drinking 8-10 glasses of water daily");
  dos.push("Maintain a regular sleep schedule of 7-8 hours");
  dos.push("Take prescribed medications as directed by your doctor");
  dos.push("Keep a record of any symptoms you experience");

  donts.push("Don't ignore these findings - follow up with your healthcare provider");
  donts.push("Avoid self-medicating without consulting a doctor");
  donts.push("Don't skip meals or follow extreme diets without medical advice");

  lifestyleChanges.push("Include 30 minutes of moderate physical activity in your daily routine");
  lifestyleChanges.push("Practice stress management techniques like deep breathing or meditation");
  lifestyleChanges.push("Maintain a balanced diet rich in fruits, vegetables, and whole grains");
  lifestyleChanges.push("Reduce salt and sugar intake in your daily diet");
  lifestyleChanges.push("Avoid processed and junk food");

  // Condition-specific additions to dos, donts, and lifestyle
  if (hasAnemia) {
    dos.push("Include iron-rich foods like spinach, lentils, and lean red meat in your diet");
    dos.push("Pair iron-rich foods with vitamin C sources for better absorption");
    donts.push("Avoid drinking tea or coffee with meals as they reduce iron absorption");
    lifestyleChanges.push("Consider cooking in iron cookware to boost iron intake");
    doctorRecommendations.push({
      specialty: "Hematologist",
      reason: "To evaluate the cause of abnormal blood values and recommend appropriate treatment",
      urgency: classification === "critical" ? "urgent" : "soon",
    });
  }

  if (hasDiabetes) {
    dos.push("Monitor your blood sugar levels regularly as advised");
    dos.push("Eat small, frequent meals to maintain stable blood sugar");
    donts.push("Avoid sugary drinks, sweets, and refined carbohydrates");
    donts.push("Don't skip meals as it can cause blood sugar fluctuations");
    lifestyleChanges.push("Aim for at least 150 minutes of moderate exercise per week");
    lifestyleChanges.push("Maintain a healthy weight through diet and exercise");
    doctorRecommendations.push({
      specialty: "Endocrinologist",
      reason: "To manage blood sugar levels and prevent diabetes-related complications",
      urgency: classification === "critical" ? "urgent" : "soon",
    });
  }

  if (hasLipid) {
    dos.push("Include omega-3 rich foods like fish, walnuts, and flaxseeds");
    dos.push("Use healthy cooking oils like olive oil in moderation");
    donts.push("Avoid fried foods, processed snacks, and trans fats");
    donts.push("Limit intake of red meat and full-fat dairy products");
    lifestyleChanges.push("Engage in regular cardiovascular exercise like brisk walking or swimming");
    doctorRecommendations.push({
      specialty: "Cardiologist",
      reason: "To assess cardiovascular risk and recommend lipid management strategies",
      urgency: "routine",
    });
  }

  if (hasLiver) {
    dos.push("Eat a liver-friendly diet with plenty of vegetables and lean proteins");
    dos.push("Stay well-hydrated to support liver function");
    donts.push("Avoid alcohol completely until cleared by your doctor");
    donts.push("Don't take over-the-counter medications without consulting your doctor");
    lifestyleChanges.push("Maintain a healthy weight to reduce liver strain");
    doctorRecommendations.push({
      specialty: "Gastroenterologist/Hepatologist",
      reason: "To evaluate liver function and determine the cause of abnormal values",
      urgency: classification === "critical" ? "urgent" : "soon",
    });
  }

  if (hasKidney) {
    dos.push("Monitor your fluid intake as advised by your doctor");
    dos.push("Follow a kidney-friendly diet with controlled protein and sodium");
    donts.push("Avoid excessive salt and processed foods");
    donts.push("Don't take NSAIDs (like ibuprofen) without doctor's advice");
    lifestyleChanges.push("Control blood pressure through diet, exercise, and medication if prescribed");
    doctorRecommendations.push({
      specialty: "Nephrologist",
      reason: "To assess kidney function and recommend appropriate management",
      urgency: classification === "critical" ? "urgent" : "soon",
    });
  }

  if (hasThyroid) {
    dos.push("Take thyroid medication at the same time each day, if prescribed");
    dos.push("Get regular thyroid function tests as recommended");
    donts.push("Don't take thyroid medication with calcium or iron supplements");
    lifestyleChanges.push("Manage stress as it can affect thyroid function");
    doctorRecommendations.push({
      specialty: "Endocrinologist",
      reason: "To evaluate thyroid function and optimize treatment if needed",
      urgency: "routine",
    });
  }

  // Default doctor recommendation if none specific
  if (doctorRecommendations.length === 0) {
    doctorRecommendations.push({
      specialty: "General Physician/Internist",
      reason: "To review the findings and determine if specialist referral is needed",
      urgency: classification === "critical" ? "soon" : "routine",
    });
  }

  // Add condition-specific diet recommendations for abnormal/critical
  if (hasAnemia) {
    diet.push("Eat iron-rich foods: palak (spinach), chana (chickpeas), masoor dal (red lentils)");
    diet.push("Include vitamin C rich foods with meals: amla, oranges, tomatoes to boost iron absorption");
    diet.push("Add lean red meat or liver 2-3 times per week if not vegetarian");
    diet.push("Include dry fruits like dates (khajoor), raisins (kishmish), and figs (anjeer)");
    diet.push("Avoid chai/coffee with meals - drink 1 hour before or after eating");
  } else if (hasDiabetes) {
    diet.push("Focus on complex carbs: brown rice, whole wheat roti, oats instead of white rice/maida");
    diet.push("Include protein with every meal: dal, eggs, chicken, fish, paneer");
    diet.push("Eat plenty of non-starchy vegetables: karela (bitter gourd), bhindi, tori, palak");
    diet.push("Avoid: sugary drinks, mithai, white bread, processed foods");
    diet.push("Eat small, frequent meals (5-6 times) instead of 3 large meals");
    diet.push("Include methi (fenugreek) seeds - soak overnight and drink water in morning");
  } else if (hasLipid) {
    diet.push("Use olive oil or mustard oil instead of ghee/butter for cooking");
    diet.push("Eat fatty fish (salmon, sardines) or fish oil supplements for omega-3");
    diet.push("Include oats, barley, and fiber-rich foods to reduce cholesterol");
    diet.push("Add walnuts, almonds, and flaxseeds to your diet");
    diet.push("Avoid: fried foods, pakoras, samosas, full-fat dairy, red meat");
    diet.push("Increase soluble fiber: isabgol, oats, beans, fruits with skin");
  } else if (hasLiver) {
    diet.push("Eat light, easily digestible foods - khichdi, daliya, boiled vegetables");
    diet.push("Avoid: alcohol completely, fried/oily foods, processed meats");
    diet.push("Include fresh fruits and vegetables, especially beetroot and carrots");
    diet.push("Drink nimbu pani (lemon water) and coconut water for hydration");
    diet.push("Avoid excessive protein - moderate dal and lean chicken only");
    diet.push("No raw or undercooked foods - everything should be well-cooked");
  } else if (hasKidney) {
    diet.push("Limit protein intake - small portions of dal, chicken, or fish");
    diet.push("Reduce salt (namak) - avoid pickles, papad, processed foods");
    diet.push("Limit potassium-rich foods: bananas, oranges, potatoes, tomatoes");
    diet.push("Control phosphorus - avoid cola drinks, processed cheese, organ meats");
    diet.push("Stay hydrated but follow doctor's fluid recommendations");
    diet.push("Choose fresh foods over packaged/canned items");
  } else if (hasThyroid) {
    diet.push("Include iodine-rich foods in moderation: fish, dairy, iodized salt");
    diet.push("Eat selenium-rich foods: eggs, fish, sunflower seeds");
    diet.push("Limit goitrogens (if hypothyroid): raw cabbage, cauliflower - cooking reduces effect");
    diet.push("Avoid soy products close to thyroid medication timing");
    diet.push("Include zinc-rich foods: pumpkin seeds, chickpeas, cashews");
  } else {
    diet.push("Follow a balanced Pakistani diet with dal, sabzi, and roti");
    diet.push("Include protein in every meal - dal, eggs, chicken, or fish");
    diet.push("Eat fresh seasonal fruits and vegetables daily");
    diet.push("Reduce processed foods, excessive oil, and sugar");
    diet.push("Stay well hydrated - 8-10 glasses of water daily");
  }

  // Set consultation based on classification
  consultation = {
    followUpTiming: classification === "critical"
      ? "Consult specialist within 2-3 days"
      : "Follow up with doctor within 2 weeks",
    bookingInfo: classification === "critical"
      ? "Call hospital directly or visit emergency OPD if symptoms worsen"
      : "Book appointment via clinic reception, call, or WhatsApp",
    urgency: classification === "critical" ? "urgent" : "soon",
  };

  return {
    summary,
    medicalCondition,
    precautions,
    diet,
    consultation,
    medicalRecommendations,
    dos,
    donts,
    lifestyleChanges,
    suggestedDoctors,
    doctorRecommendations,
  };
}
