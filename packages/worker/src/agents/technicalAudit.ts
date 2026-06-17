import { prisma } from "@golax/db";
import { env } from "../config/env.js";
import { withPage } from "../services/browser.js";

interface TechResult {
  performanceScore: number | null;
  accessibilityScore: number | null;
  bestPracticesScore: number | null;
  mobileScore: number | null;
  sslStatus: boolean;
  httpsStatus: boolean;
  missingFavicon: boolean;
  brokenLinks: number;
  issues: string[];
}

async function runLighthouse(url: string): Promise<Partial<TechResult>> {
  // Lighthouse + chrome-launcher are ESM-only and heavy; import lazily.
  const chromeLauncher = await import("chrome-launcher");
  const { default: lighthouse } = await import("lighthouse");

  const chrome = await chromeLauncher.launch({
    chromeFlags: ["--headless", "--no-sandbox", "--disable-gpu"],
  });

  try {
    const runnerResult = await lighthouse(
      url,
      { port: chrome.port, output: "json", logLevel: "error" },
      undefined,
    );
    const lhr = runnerResult?.lhr;
    if (!lhr) return {};

    const toScore = (v: number | null | undefined) =>
      v == null ? null : Math.round(v * 100);

    return {
      performanceScore: toScore(lhr.categories.performance?.score),
      accessibilityScore: toScore(lhr.categories.accessibility?.score),
      bestPracticesScore: toScore(lhr.categories["best-practices"]?.score),
      mobileScore: toScore(lhr.categories.performance?.score),
    };
  } finally {
    await chrome.kill();
  }
}

// Module 6: technical audit (Lighthouse + basic checks).
export async function runTechnicalAudit(companyId: string): Promise<void> {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company?.website || company.websiteStatus !== "ACTIVE") return;

  const url = company.website;
  const result: TechResult = {
    performanceScore: null,
    accessibilityScore: null,
    bestPracticesScore: null,
    mobileScore: null,
    sslStatus: url.startsWith("https://"),
    httpsStatus: url.startsWith("https://"),
    missingFavicon: true,
    brokenLinks: 0,
    issues: [],
  };

  // Basic DOM checks via Playwright (favicon + broken internal links sample).
  const dom = await withPage(url, async (page) => {
    const favicon = await page.$(
      'link[rel~="icon"], link[rel="shortcut icon"]',
    );
    const links = await page.$$eval("a[href]", (els) =>
      els
        .map((e) => (e as HTMLAnchorElement).href)
        .filter((h) => h.startsWith("http")),
    );
    return { hasFavicon: Boolean(favicon), links: links.slice(0, 15) };
  });

  if (dom.ok && dom.data) {
    result.missingFavicon = !dom.data.hasFavicon;
    if (result.missingFavicon) result.issues.push("Missing favicon");

    let broken = 0;
    for (const link of dom.data.links) {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(link, {
          method: "HEAD",
          signal: controller.signal,
        });
        clearTimeout(t);
        if (res.status >= 400) broken++;
      } catch {
        broken++;
      }
    }
    result.brokenLinks = broken;
    if (broken > 0) result.issues.push(`${broken} broken links detected`);
  }

  if (!result.sslStatus) result.issues.push("No SSL / not served over HTTPS");

  if (env.ENABLE_LIGHTHOUSE) {
    try {
      const lh = await runLighthouse(url);
      Object.assign(result, lh);
      if ((result.performanceScore ?? 100) < 50) {
        result.issues.push("Poor performance score");
      }
    } catch (err) {
      result.issues.push(`Lighthouse failed: ${(err as Error).message}`);
    }
  }

  await prisma.technicalAudit.upsert({
    where: { companyId },
    create: {
      companyId,
      performanceScore: result.performanceScore,
      accessibilityScore: result.accessibilityScore,
      bestPracticesScore: result.bestPracticesScore,
      mobileScore: result.mobileScore,
      sslStatus: result.sslStatus,
      httpsStatus: result.httpsStatus,
      missingFavicon: result.missingFavicon,
      brokenLinks: result.brokenLinks,
      issuesJson: result.issues,
    },
    update: {
      performanceScore: result.performanceScore,
      accessibilityScore: result.accessibilityScore,
      bestPracticesScore: result.bestPracticesScore,
      mobileScore: result.mobileScore,
      sslStatus: result.sslStatus,
      httpsStatus: result.httpsStatus,
      missingFavicon: result.missingFavicon,
      brokenLinks: result.brokenLinks,
      issuesJson: result.issues,
    },
  });
}
