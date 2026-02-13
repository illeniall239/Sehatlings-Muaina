import Anthropic from "@anthropic-ai/sdk";
import type { InsuranceSummary, InsurancePackage, Report } from "@/types/database";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Model configuration
const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 8192;

// Token pricing (per million tokens)
const INPUT_TOKEN_PRICE = 3; // $3 per million
const OUTPUT_TOKEN_PRICE = 15; // $15 per million

interface ReportData {
  id: string;
  created_at: string;
  ai_analysis: Report["ai_analysis"] | null;
  patient_info: Report["patient_info"] | null;
  muaina_interpretation: Report["muaina_interpretation"] | null;
  extracted_content: Report["extracted_content"] | null;
}

/**
 * Generate an insurance summary from multiple patient reports
 */
export async function generateInsuranceSummary(
  reports: ReportData[],
  patientName: string
): Promise<InsuranceSummary> {
  // Check if API key is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("ANTHROPIC_API_KEY not configured, using mock summary");
    return generateMockSummary(reports, patientName);
  }

  // Prepare report summaries for the prompt
  const reportSummaries = reports.map((report, index) => {
    const classification = report.ai_analysis?.classification || "unknown";
    const findings = report.ai_analysis?.findings || [];
    const summary = report.ai_analysis?.draft_report?.summary || "No summary available";
    const interpretation = report.muaina_interpretation;

    return `
Report ${index + 1} (${new Date(report.created_at).toLocaleDateString()}):
- Classification: ${classification}
- Summary: ${summary}
- Findings: ${findings.map(f => `${f.category}: ${f.description} (${f.severity})`).join("; ") || "None"}
${interpretation?.medical_condition ? `- Condition: ${interpretation.medical_condition.name} (${interpretation.medical_condition.severity})` : ""}
`;
  }).join("\n");

  const systemPrompt = `You are an insurance risk assessment AI for the Pakistani health insurance market. Your task is to analyze medical reports and provide a comprehensive risk assessment with suggested insurance packages for underwriting purposes.

You must respond with a valid JSON object only, no additional text or markdown formatting.

The JSON must have this exact structure:
{
  "risk_score": <number 0-100>,
  "risk_level": "<low|medium|high>",
  "health_summary": "<2-3 sentence summary of overall health status>",
  "risk_factors": [
    {
      "factor": "<name of risk factor>",
      "severity": "<low|medium|high>",
      "details": "<brief explanation>"
    }
  ],
  "chronic_conditions": ["<list of identified chronic conditions>"],
  "recommendations": ["<underwriting recommendations>"],
  "suggested_packages": [
    {
      "tier": "<Basic|Standard|Premium|Platinum>",
      "annual_premium": <number in PKR>,
      "monthly_premium": <number in PKR>,
      "coverage": {
        "ipd_limit": <number in PKR>,
        "opd_limit": <number in PKR>,
        "maternity_limit": <number in PKR>,
        "critical_illness_limit": <number in PKR>
      },
      "deductible": <number in PKR>,
      "room_rent_cap": <number in PKR per day>,
      "co_insurance_percentage": <number 0-100>,
      "waiting_periods": ["<waiting period descriptions>"],
      "exclusions": ["<exclusion descriptions>"],
      "premium_adjustment": {
        "base_premium": <number in PKR>,
        "adjustment_percentage": <number, positive=surcharge, negative=discount>,
        "adjustment_reason": "<why this adjustment was applied>"
      },
      "justification": "<2-3 sentences explaining why this tier is or isn't suitable for this patient>",
      "recommended": <boolean>
    }
  ]
}

Risk scoring guidelines:
- 0-30: Low risk - healthy individual with no significant conditions
- 31-60: Medium risk - some health concerns requiring monitoring
- 61-100: High risk - significant health issues or chronic conditions

Consider factors like:
- Number and severity of abnormal/critical reports
- Presence of chronic conditions
- Pattern of health issues over time
- Age and gender risk factors
- Infectious diseases
- Conditions requiring long-term treatment

PACKAGE GENERATION RULES:
- Always generate exactly 4 packages: Basic, Standard, Premium, Platinum
- Mark 1-2 packages as "recommended": true based on patient risk profile
- Each justification MUST explain why this tier fits or doesn't fit this specific patient
- Use realistic Pakistani market pricing in PKR:
  - Basic: annual premium PKR 25,000-40,000, IPD limit PKR 300,000-500,000
  - Standard: annual premium PKR 50,000-80,000, IPD limit PKR 500,000-1,000,000
  - Premium: annual premium PKR 100,000-180,000, IPD limit PKR 1,500,000-3,000,000
  - Platinum: annual premium PKR 200,000-400,000, IPD limit PKR 3,000,000-5,000,000
- Risk-based premium adjustments:
  - Low risk (0-30): 0-10% discount
  - Medium risk (31-60): 0-15% surcharge
  - High risk (61-100): 15-40% surcharge, longer waiting periods
- Low risk patients: recommend Basic or Standard
- Medium risk patients: recommend Standard or Premium
- High risk patients: recommend Premium or Platinum`;

  const userPrompt = `Analyze the following medical reports for patient "${patientName}" and generate an insurance risk assessment.

Patient has ${reports.length} medical report(s) on file.

${reportSummaries}

Generate a comprehensive insurance risk assessment JSON.`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: "user", content: userPrompt }
      ],
      system: systemPrompt,
    });

    // Extract text content
    const textContent = response.content.find(c => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    // Parse JSON response (handle potential markdown code blocks)
    let jsonText = textContent.text.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.slice(7);
    }
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith("```")) {
      jsonText = jsonText.slice(0, -3);
    }
    jsonText = jsonText.trim();

    const parsed = JSON.parse(jsonText);

    // Calculate date range
    const dates = reports.map(r => new Date(r.created_at));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    // Log usage
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const cost = (inputTokens * INPUT_TOKEN_PRICE + outputTokens * OUTPUT_TOKEN_PRICE) / 1_000_000;
    console.log(`[Insurance AI] Generated summary: ${inputTokens} input, ${outputTokens} output tokens. Cost: $${cost.toFixed(4)}`);

    return {
      patient_name: patientName,
      total_reports: reports.length,
      date_range: {
        from: minDate.toISOString(),
        to: maxDate.toISOString(),
      },
      risk_score: parsed.risk_score || 50,
      risk_level: parsed.risk_level || "medium",
      risk_factors: parsed.risk_factors || [],
      health_summary: parsed.health_summary || "Unable to generate summary",
      chronic_conditions: parsed.chronic_conditions || [],
      recommendations: parsed.recommendations || [],
      suggested_packages: parsed.suggested_packages || [],
      generated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Insurance AI error:", error);
    // Return mock summary on error
    return generateMockSummary(reports, patientName);
  }
}

/**
 * Generate a mock summary when AI is unavailable
 */
function generateMockSummary(
  reports: ReportData[],
  patientName: string
): InsuranceSummary {
  // Calculate basic risk based on report classifications
  const classifications = reports.map(r => r.ai_analysis?.classification || "normal");
  const criticalCount = classifications.filter(c => c === "critical").length;
  const abnormalCount = classifications.filter(c => c === "abnormal").length;

  let riskScore = 20;
  let riskLevel: "low" | "medium" | "high" = "low";

  if (criticalCount > 0) {
    riskScore = 70 + criticalCount * 10;
    riskLevel = "high";
  } else if (abnormalCount > 0) {
    riskScore = 40 + abnormalCount * 10;
    riskLevel = "medium";
  }

  riskScore = Math.min(riskScore, 95);

  // Calculate date range
  const dates = reports.map(r => new Date(r.created_at));
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

  return {
    patient_name: patientName,
    total_reports: reports.length,
    date_range: {
      from: minDate.toISOString(),
      to: maxDate.toISOString(),
    },
    risk_score: riskScore,
    risk_level: riskLevel,
    risk_factors: criticalCount > 0 ? [
      {
        factor: "Critical medical findings",
        severity: "high",
        details: `${criticalCount} report(s) with critical classification`,
      }
    ] : abnormalCount > 0 ? [
      {
        factor: "Abnormal findings",
        severity: "medium",
        details: `${abnormalCount} report(s) with abnormal classification`,
      }
    ] : [],
    health_summary: `Patient has ${reports.length} medical report(s) on file. ${criticalCount > 0 ? `${criticalCount} report(s) show critical findings requiring attention.` : abnormalCount > 0 ? `${abnormalCount} report(s) show abnormal findings.` : "All reports show normal findings."}`,
    chronic_conditions: [],
    recommendations: criticalCount > 0
      ? ["Manual review recommended", "Request additional medical documentation", "Consider exclusions for identified conditions"]
      : abnormalCount > 0
      ? ["Standard processing with monitoring", "Request follow-up documentation if condition persists"]
      : ["Standard processing approved"],
    suggested_packages: generateMockPackages(riskScore, riskLevel),
    generated_at: new Date().toISOString(),
  };
}

/**
 * Generate mock insurance packages based on risk profile
 */
function generateMockPackages(
  riskScore: number,
  riskLevel: "low" | "medium" | "high"
): InsurancePackage[] {
  const adjustmentPct = riskLevel === "high" ? 25 : riskLevel === "medium" ? 10 : -5;
  const adjustmentReason = riskLevel === "high"
    ? "Significant health conditions identified requiring higher premium"
    : riskLevel === "medium"
    ? "Moderate health concerns detected, slight premium surcharge applied"
    : "Healthy profile qualifies for a discount on base premium";

  const baseWaiting = ["30-day initial waiting period", "2-year pre-existing condition waiting period"];
  const highRiskWaiting = [...baseWaiting, "4-year pre-existing condition waiting period", "1-year specific disease waiting period"];
  const waitingPeriods = riskLevel === "high" ? highRiskWaiting : baseWaiting;

  return [
    {
      tier: "Basic",
      annual_premium: Math.round(30000 * (1 + adjustmentPct / 100)),
      monthly_premium: Math.round((30000 * (1 + adjustmentPct / 100)) / 12),
      coverage: { ipd_limit: 400000, opd_limit: 30000, maternity_limit: 0, critical_illness_limit: 0 },
      deductible: 10000,
      room_rent_cap: 5000,
      co_insurance_percentage: 20,
      waiting_periods: waitingPeriods,
      exclusions: ["Cosmetic procedures", "Dental treatments", "Maternity benefits", "Pre-existing conditions (first 2 years)"],
      premium_adjustment: { base_premium: 30000, adjustment_percentage: adjustmentPct, adjustment_reason: adjustmentReason },
      justification: riskLevel === "low"
        ? "This is the most affordable option and provides adequate basic coverage for a healthy individual with no significant risk factors."
        : riskLevel === "medium"
        ? "This tier may not provide sufficient coverage given the identified health concerns. Consider a higher tier for better protection."
        : "This tier is not recommended due to low coverage limits that are insufficient for the identified high-risk conditions.",
      recommended: riskLevel === "low",
    },
    {
      tier: "Standard",
      annual_premium: Math.round(65000 * (1 + adjustmentPct / 100)),
      monthly_premium: Math.round((65000 * (1 + adjustmentPct / 100)) / 12),
      coverage: { ipd_limit: 800000, opd_limit: 60000, maternity_limit: 150000, critical_illness_limit: 300000 },
      deductible: 7500,
      room_rent_cap: 8000,
      co_insurance_percentage: 15,
      waiting_periods: waitingPeriods,
      exclusions: ["Cosmetic procedures", "Dental treatments", "Pre-existing conditions (first 2 years)"],
      premium_adjustment: { base_premium: 65000, adjustment_percentage: adjustmentPct, adjustment_reason: adjustmentReason },
      justification: riskLevel === "low"
        ? "Good value-for-money option with maternity and critical illness coverage. Recommended for those wanting comprehensive protection."
        : riskLevel === "medium"
        ? "This tier provides balanced coverage and is suitable for patients with moderate health concerns requiring ongoing monitoring."
        : "This tier offers moderate coverage but may be insufficient for high-risk patients with chronic or critical conditions.",
      recommended: riskLevel === "low" || riskLevel === "medium",
    },
    {
      tier: "Premium",
      annual_premium: Math.round(140000 * (1 + adjustmentPct / 100)),
      monthly_premium: Math.round((140000 * (1 + adjustmentPct / 100)) / 12),
      coverage: { ipd_limit: 2000000, opd_limit: 120000, maternity_limit: 350000, critical_illness_limit: 1000000 },
      deductible: 5000,
      room_rent_cap: 15000,
      co_insurance_percentage: 10,
      waiting_periods: waitingPeriods,
      exclusions: ["Cosmetic procedures", "Pre-existing conditions (first 1 year)"],
      premium_adjustment: { base_premium: 140000, adjustment_percentage: adjustmentPct, adjustment_reason: adjustmentReason },
      justification: riskLevel === "low"
        ? "This tier offers extensive coverage but may be more than needed for a healthy individual. Consider if future-proofing is important."
        : riskLevel === "medium"
        ? "Recommended for patients with moderate health concerns. Provides strong coverage limits and lower co-insurance for frequent medical visits."
        : "This tier provides substantial coverage suitable for managing chronic conditions and critical care needs. Recommended for high-risk patients.",
      recommended: riskLevel === "medium" || riskLevel === "high",
    },
    {
      tier: "Platinum",
      annual_premium: Math.round(300000 * (1 + adjustmentPct / 100)),
      monthly_premium: Math.round((300000 * (1 + adjustmentPct / 100)) / 12),
      coverage: { ipd_limit: 5000000, opd_limit: 250000, maternity_limit: 500000, critical_illness_limit: 2500000 },
      deductible: 0,
      room_rent_cap: 25000,
      co_insurance_percentage: 0,
      waiting_periods: baseWaiting,
      exclusions: ["Cosmetic procedures"],
      premium_adjustment: { base_premium: 300000, adjustment_percentage: adjustmentPct, adjustment_reason: adjustmentReason },
      justification: riskLevel === "low"
        ? "Top-tier coverage with zero deductible and co-insurance. Generally overkill for healthy individuals unless maximum protection is desired."
        : riskLevel === "medium"
        ? "Comprehensive coverage with no out-of-pocket costs. A premium option for those wanting full financial protection against health risks."
        : "The most comprehensive coverage available with zero deductible. Best option for high-risk patients requiring frequent and expensive medical care.",
      recommended: riskLevel === "high",
    },
  ];
}
