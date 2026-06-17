import { prisma, type Priority } from "@golax/db";

function toPriority(score: number): Priority {
  if (score >= 80) return "HIGH";
  if (score >= 50) return "MEDIUM";
  return "LOW";
}

// Module 9: opportunity scoring (0-100). Higher = better prospect.
export async function runOpportunityScoring(companyId: string): Promise<number> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      technicalAudit: true,
      seoAudit: true,
      conversionAudit: true,
    },
  });
  if (!company) throw new Error(`Company ${companyId} not found`);

  let score: number;

  if (!company.websiteFound || company.websiteStatus === "MISSING") {
    // No website is the biggest opportunity.
    score = 100;
  } else {
    score = 80; // website present but assumed improvable

    const conv = company.conversionAudit;
    const seo = company.seoAudit;
    const tech = company.technicalAudit;

    if (conv && !conv.contactForm) score += 10;
    if (
      conv &&
      !conv.whatsappButton &&
      !conv.callButton &&
      !conv.quoteForm
    ) {
      score += 10; // no clear CTA
    }
    if (tech && (tech.performanceScore ?? 100) < 50) score += 10; // slow site
    if (seo && (seo.seoScore ?? 100) < 60) score += 10; // poor SEO
  }

  score = Math.min(100, Math.max(0, score));

  await prisma.opportunity.upsert({
    where: { companyId },
    create: { companyId, score, priority: toPriority(score) },
    update: { score, priority: toPriority(score) },
  });

  return score;
}
