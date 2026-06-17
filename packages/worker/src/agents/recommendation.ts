import { prisma } from "@golax/db";

interface Rec {
  service: string;
  reason: string;
}

// Module 10: recommend services based on audit findings.
export async function runRecommendation(companyId: string): Promise<Rec[]> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      technicalAudit: true,
      seoAudit: true,
      conversionAudit: true,
    },
  });
  if (!company) throw new Error(`Company ${companyId} not found`);

  const recs: Rec[] = [];

  if (!company.websiteFound || company.websiteStatus !== "ACTIVE") {
    recs.push({
      service: "New Website",
      reason: "Business has no working website — a primary online presence is missing.",
    });
  } else {
    const tech = company.technicalAudit;
    const seo = company.seoAudit;
    const conv = company.conversionAudit;

    const perf = tech?.performanceScore ?? 100;
    if (perf < 50) {
      recs.push({
        service: "Speed Optimization",
        reason: `Performance score is low (${perf}/100). Faster load times improve conversions and SEO.`,
      });
    }

    if (perf < 40 || (tech && tech.brokenLinks > 3)) {
      recs.push({
        service: "Website Redesign",
        reason: "Multiple technical issues suggest an outdated site that would benefit from a redesign.",
      });
    }

    if (seo && (seo.seoScore ?? 100) < 60) {
      recs.push({
        service: "SEO Service",
        reason: `SEO score is ${seo.seoScore}/100 with missing on-page essentials.`,
      });
    }

    if (conv && (!conv.contactForm || (!conv.whatsappButton && !conv.callButton))) {
      recs.push({
        service: "Conversion Optimization",
        reason: "Missing contact form and/or clear call-to-action reduces lead capture.",
      });
    }

    if (recs.length === 0) {
      recs.push({
        service: "Landing Page",
        reason: "Site is healthy overall — a targeted landing page could boost campaign conversions.",
      });
    }
  }

  await prisma.recommendation.deleteMany({ where: { companyId } });
  await prisma.recommendation.createMany({
    data: recs.map((r) => ({ companyId, service: r.service, reason: r.reason })),
  });

  return recs;
}
