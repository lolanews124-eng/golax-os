import { prisma } from "@golax/db";
import { withPage } from "../services/browser.js";

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

interface ExtractedContact {
  email?: string;
  phone?: string;
  contactPage?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
}

function pickFirstSocial(links: string[], domain: string): string | undefined {
  return links.find((l) => l.toLowerCase().includes(domain));
}

// Module 5: extract emails, phones, social links, and contact page.
export async function runContactExtraction(
  companyId: string,
): Promise<ExtractedContact> {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company?.website || company.websiteStatus !== "ACTIVE") {
    return {};
  }

  const result = await withPage(company.website, async (page) => {
    const html = await page.content();

    const links = await page.$$eval("a[href]", (els) =>
      els
        .map((e) => (e as HTMLAnchorElement).href)
        .filter((h) => typeof h === "string"),
    );

    const mailtos = links
      .filter((l) => l.startsWith("mailto:"))
      .map((l) => l.replace("mailto:", "").split("?")[0].trim());

    const bodyEmails = html.match(EMAIL_REGEX) ?? [];
    const allEmails = [...mailtos, ...bodyEmails].filter(
      (e) =>
        e.includes("@") &&
        !/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(e) &&
        !e.startsWith("@"),
    );

    const contactPage = links.find((l) => /contact/i.test(l));

    return {
      email: allEmails[0],
      contactPage,
      facebook: pickFirstSocial(links, "facebook.com"),
      instagram: pickFirstSocial(links, "instagram.com"),
      linkedin: pickFirstSocial(links, "linkedin.com"),
    } satisfies ExtractedContact;
  });

  const data: ExtractedContact = result.ok && result.data ? result.data : {};

  await prisma.contact.upsert({
    where: { companyId },
    create: {
      companyId,
      email: data.email ?? null,
      phone: company.phone ?? null,
      contactPage: data.contactPage ?? null,
      facebook: data.facebook ?? null,
      instagram: data.instagram ?? null,
      linkedin: data.linkedin ?? null,
    },
    update: {
      email: data.email ?? null,
      contactPage: data.contactPage ?? null,
      facebook: data.facebook ?? null,
      instagram: data.instagram ?? null,
      linkedin: data.linkedin ?? null,
    },
  });

  return data;
}
