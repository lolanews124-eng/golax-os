import { prisma } from "@golax/db";
import { generateJson, hasGemini } from "../services/gemini.js";

interface OutreachResult {
  emailSubject: string;
  emailBody: string;
  contactFormMessage: string;
  linkedinMessage: string;
  whatsappMessage: string;
}

// Module 12: generate personalized outreach drafts (Gemini + fallback).
export async function runOutreach(companyId: string): Promise<void> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      aiAnalysis: true,
      recommendations: true,
      opportunity: true,
      seoAudit: true,
      conversionAudit: true,
      technicalAudit: true,
    },
  });
  if (!company) throw new Error(`Company ${companyId} not found`);

  let result: OutreachResult;

  if (hasGemini) {
    try {
      result = await generateJson<OutreachResult>(buildPrompt(company));
    } catch {
      result = fallbackOutreach(company);
    }
  } else {
    result = fallbackOutreach(company);
  }

  await prisma.outreachMessage.upsert({
    where: { companyId },
    create: { companyId, ...result },
    update: { ...result },
  });
}

function buildPrompt(company: {
  name: string;
  category: string | null;
  recommendations: { service: string; reason: string }[];
  aiAnalysis: { weaknesses: string | null } | null;
}): string {
  const services = company.recommendations.map((r) => r.service).join(", ");
  return `You are a friendly web agency owner writing cold outreach to a local business.

Business: ${company.name}
Category: ${company.category}
Recommended services: ${services}
Identified weaknesses: ${company.aiAnalysis?.weaknesses ?? "various website issues"}

Write personalized, non-spammy outreach. Return strictly this JSON:
{
  "emailSubject": "short compelling subject (max 60 chars)",
  "emailBody": "120-160 word email referencing a specific weakness and offering the recommended service",
  "contactFormMessage": "short message suitable for a website contact form (max 80 words)",
  "linkedinMessage": "short LinkedIn connection note (max 50 words)",
  "whatsappMessage": "very short, casual WhatsApp message (max 40 words)"
}`;
}

function fallbackOutreach(company: {
  name: string;
  category: string | null;
  recommendations: { service: string }[];
  aiAnalysis: { weaknesses: string | null } | null;
}): OutreachResult {
  const topService = company.recommendations[0]?.service ?? "website improvement";
  const issue =
    company.aiAnalysis?.weaknesses?.split("\n")[0]?.replace(/^-\s*/, "") ??
    "a few things on your website that could bring in more customers";

  return {
    emailSubject: `Quick idea for ${company.name}`,
    emailBody: `Hi ${company.name} team,

I came across your ${company.category ?? "business"} online and noticed ${issue.toLowerCase()}. I help ${company.category ?? "local"} businesses win more customers with ${topService.toLowerCase()}.

I put together a few specific observations about your site and how a small change could increase enquiries. Would you be open to a quick 10-minute call this week? Happy to share the notes either way.

Best regards,
[Your Name]`,
    contactFormMessage: `Hi! I reviewed ${company.name}'s website and spotted a quick win around ${issue.toLowerCase()}. I help businesses like yours with ${topService.toLowerCase()}. Could we have a short chat?`,
    linkedinMessage: `Hi — I help ${company.category ?? "local"} businesses with ${topService.toLowerCase()}. I noticed an opportunity on ${company.name}'s site and would love to connect.`,
    whatsappMessage: `Hi ${company.name}! I spotted a quick improvement for your website (${topService.toLowerCase()}). Mind if I share a couple of ideas?`,
  };
}
