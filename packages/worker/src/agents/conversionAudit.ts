import { prisma } from "@golax/db";
import { withPage } from "../services/browser.js";

// Module 8: conversion audit - detect CTAs and trust signals.
export async function runConversionAudit(companyId: string): Promise<void> {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company?.website || company.websiteStatus !== "ACTIVE") return;

  const dom = await withPage(company.website, async (page) => {
    const html = (await page.content()).toLowerCase();
    const links = await page.$$eval("a[href]", (els) =>
      els.map((e) => (e as HTMLAnchorElement).href.toLowerCase()),
    );
    const formCount = await page.$$eval("form", (els) => els.length);
    const bodyText = (await page.innerText("body").catch(() => "")).toLowerCase();

    return {
      hasForm: formCount > 0,
      hasWhatsapp:
        links.some((l) => l.includes("wa.me") || l.includes("whatsapp")) ||
        html.includes("whatsapp"),
      hasCall: links.some((l) => l.startsWith("tel:")),
      hasBooking: /book(ing)?|appointment|schedule/.test(html),
      hasQuote: /get a quote|request a quote|free quote|get quote/.test(html),
      hasTestimonials: /testimonial/.test(bodyText),
      hasReviews: /review|rating|stars/.test(bodyText),
      hasSocial: links.some(
        (l) =>
          l.includes("facebook.com") ||
          l.includes("instagram.com") ||
          l.includes("linkedin.com") ||
          l.includes("twitter.com") ||
          l.includes("x.com"),
      ),
    };
  });

  const d = dom.ok && dom.data ? dom.data : null;

  const issues: string[] = [];
  if (!d?.hasForm) issues.push("No contact form");
  if (!d?.hasWhatsapp) issues.push("No WhatsApp button");
  if (!d?.hasCall) issues.push("No click-to-call button");
  if (!d?.hasBooking) issues.push("No booking form");
  if (!d?.hasQuote) issues.push("No quote request form");
  if (!d?.hasReviews && !d?.hasTestimonials)
    issues.push("No reviews/testimonials");
  if (!d?.hasSocial) issues.push("No social media links");

  await prisma.conversionAudit.upsert({
    where: { companyId },
    create: {
      companyId,
      contactForm: Boolean(d?.hasForm),
      whatsappButton: Boolean(d?.hasWhatsapp),
      callButton: Boolean(d?.hasCall),
      bookingForm: Boolean(d?.hasBooking),
      quoteForm: Boolean(d?.hasQuote),
      testimonialsPresent: Boolean(d?.hasTestimonials),
      reviewsPresent: Boolean(d?.hasReviews),
      socialLinksPresent: Boolean(d?.hasSocial),
      issuesJson: issues,
    },
    update: {
      contactForm: Boolean(d?.hasForm),
      whatsappButton: Boolean(d?.hasWhatsapp),
      callButton: Boolean(d?.hasCall),
      bookingForm: Boolean(d?.hasBooking),
      quoteForm: Boolean(d?.hasQuote),
      testimonialsPresent: Boolean(d?.hasTestimonials),
      reviewsPresent: Boolean(d?.hasReviews),
      socialLinksPresent: Boolean(d?.hasSocial),
      issuesJson: issues,
    },
  });
}
