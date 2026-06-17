import { prisma } from "@golax/db";
import { withPage } from "../services/browser.js";

async function urlExists(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { method: "GET", signal: controller.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

// Module 7: SEO audit.
export async function runSeoAudit(companyId: string): Promise<void> {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company?.website || company.websiteStatus !== "ACTIVE") return;

  const url = new URL(company.website);
  const origin = url.origin;

  const dom = await withPage(company.website, async (page) => {
    const title = await page.title();
    const metaDescription = await page
      .$eval('meta[name="description"]', (el) =>
        el.getAttribute("content"),
      )
      .catch(() => null);
    const h1Count = await page.$$eval("h1", (els) => els.length);
    const h2Count = await page.$$eval("h2", (els) => els.length);
    const canonical = await page
      .$eval('link[rel="canonical"]', (el) => el.getAttribute("href"))
      .catch(() => null);
    const imagesMissingAlt = await page.$$eval(
      "img",
      (els) => els.filter((e) => !(e as HTMLImageElement).alt).length,
    );

    return {
      title: title?.trim() ?? "",
      hasMeta: Boolean(metaDescription && metaDescription.trim().length > 0),
      h1Present: h1Count > 0,
      h2Count,
      canonicalPresent: Boolean(canonical),
      imagesMissingAlt,
    };
  });

  const d = dom.ok && dom.data ? dom.data : null;

  const [robots, sitemap] = await Promise.all([
    urlExists(`${origin}/robots.txt`),
    urlExists(`${origin}/sitemap.xml`),
  ]);

  const titlePresent = Boolean(d?.title && d.title.length > 0);
  const metaPresent = Boolean(d?.hasMeta);
  const h1Present = Boolean(d?.h1Present);
  const canonicalPresent = Boolean(d?.canonicalPresent);

  const issues: string[] = [];
  if (!titlePresent) issues.push("Missing <title> tag");
  if (!metaPresent) issues.push("Missing meta description");
  if (!h1Present) issues.push("Missing H1 tag");
  if (!canonicalPresent) issues.push("Missing canonical tag");
  if (!robots) issues.push("Missing robots.txt");
  if (!sitemap) issues.push("Missing sitemap.xml");
  if ((d?.imagesMissingAlt ?? 0) > 0)
    issues.push(`${d?.imagesMissingAlt} images missing alt text`);

  // Simple weighted score out of 100.
  const checks = [
    titlePresent,
    metaPresent,
    h1Present,
    canonicalPresent,
    robots,
    sitemap,
    (d?.imagesMissingAlt ?? 1) === 0,
  ];
  const seoScore = Math.round(
    (checks.filter(Boolean).length / checks.length) * 100,
  );

  await prisma.seoAudit.upsert({
    where: { companyId },
    create: {
      companyId,
      seoScore,
      titlePresent,
      metaDescriptionPresent: metaPresent,
      h1Present,
      h2Count: d?.h2Count ?? 0,
      canonicalPresent,
      robotsPresent: robots,
      sitemapPresent: sitemap,
      imagesMissingAlt: d?.imagesMissingAlt ?? 0,
      issuesJson: issues,
    },
    update: {
      seoScore,
      titlePresent,
      metaDescriptionPresent: metaPresent,
      h1Present,
      h2Count: d?.h2Count ?? 0,
      canonicalPresent,
      robotsPresent: robots,
      sitemapPresent: sitemap,
      imagesMissingAlt: d?.imagesMissingAlt ?? 0,
      issuesJson: issues,
    },
  });
}
