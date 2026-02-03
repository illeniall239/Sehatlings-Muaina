import Anthropic from "@anthropic-ai/sdk";
import type { InsuranceSummary, Report } from "@/types/database";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Model configuration
const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 4096;

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

  const systemPrompt = `You are an insurance risk assessment AI. Your task is to analyze medical reports and provide a comprehensive risk assessment for insurance underwriting purposes.

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
  "recommendations": ["<underwriting recommendations>"]
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
- Conditions requiring long-term treatment`;

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
    generated_at: new Date().toISOString(),
  };
}
