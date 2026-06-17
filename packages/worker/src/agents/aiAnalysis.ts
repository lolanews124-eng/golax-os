import { prisma } from "@golax/db";
import { generateJson, hasGemini } from "../services/gemini.js";

interface AnalysisResult {
  summary: string;
  weaknesses: string;
  opportunity: string;
}

// Module 11: AI analysis via Gemini (rule-based fallback when no key).
export async function runAiAnalysis(companyId: string): Promise<void> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      contact: true,
      technicalAudit: true,
      seoAudit: true,
      conversionAudit: true,
      opportunity: true,
    },
  });
  if (!company) throw new Error(`Company ${companyId} not found`);

  let result: AnalysisResult;

  if (hasGemini) {
    const prompt = buildPrompt(company);
    try {
      result = await generateJson<AnalysisResult>(prompt);
    } catch {
      result = fallbackAnalysis(company);
    }
  } else {
    result = fallbackAnalysis(company);
  }

  await prisma.aiAnalysis.upsert({
    where: { companyId },
    create: { companyId, ...result },
    update: { ...result },
  });
}

function buildPrompt(company: {
  name: string;
  category: string | null;
  city: string | null;
  website: string | null;
  websiteStatus: string;
  technicalAudit: unknown;
  seoAudit: unknown;
  conversionAudit: unknown;
}): string {
  return `You are a B2B web consultant. Analyse this business prospect and return JSON.

Business: ${company.name}
Category: ${company.category}
City: ${company.city}
Website: ${company.website ?? "NONE"} (status: ${company.websiteStatus})
Technical audit: ${JSON.stringify(company.technicalAudit)}
SEO audit: ${JSON.stringify(company.seoAudit)}
Conversion audit: ${JSON.stringify(company.conversionAudit)}

Return strictly this JSON shape:
{
  "summary": "2-3 sentence business summary",
  "weaknesses": "concise bullet-style summary of website weaknesses",
  "opportunity": "2-3 sentence summary of the sales opportunity for a web agency"
}`;
}

function fallbackAnalysis(company: {
  name: string;
  category: string | null;
  city: string | null;
  websiteStatus: string;
  websiteFound: boolean;
  technicalAudit: { performanceScore: number | null } | null;
  seoAudit: { seoScore: number | null; issuesJson: unknown } | null;
  conversionAudit: { issuesJson: unknown } | null;
  opportunity: { score: number } | null;
}): AnalysisResult {
  const summary = `${company.name} is a ${company.category ?? "local"} business${
    company.city ? ` in ${company.city}` : ""
  }. ${
    company.websiteFound
      ? "It has an online presence that can be improved."
      : "It currently has no working website, representing a major gap."
  }`;

  const weakBits: string[] = [];
  if (!company.websiteFound) weakBits.push("No working website");
  if (company.technicalAudit && (company.technicalAudit.performanceScore ?? 100) < 50)
    weakBits.push("Slow website performance");
  if (company.seoAudit && (company.seoAudit.seoScore ?? 100) < 60)
    weakBits.push("Weak SEO fundamentals");
  const convIssues = (company.conversionAudit?.issuesJson as string[]) ?? [];
  weakBits.push(...convIssues.slice(0, 3));

  const weaknesses = weakBits.length
    ? weakBits.map((w) => `- ${w}`).join("\n")
    : "- No major weaknesses detected";

  const opportunity = `Opportunity score ${
    company.opportunity?.score ?? "?"
  }/100. ${
    company.websiteFound
      ? "Pitch improvements to performance, SEO, and conversion to win this client."
      : "Pitch a brand-new website — the highest-value opportunity."
  }`;

  return { summary, weaknesses, opportunity };
}
