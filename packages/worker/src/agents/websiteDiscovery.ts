import { prisma, type WebsiteStatus } from "@golax/db";

function normalizeUrl(url: string): string {
  if (!/^https?:\/\//i.test(url)) return `https://${url}`;
  return url;
}

// Module 4: verify the website exists and is reachable.
export async function runWebsiteDiscovery(companyId: string): Promise<{
  websiteFound: boolean;
  status: WebsiteStatus;
}> {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new Error(`Company ${companyId} not found`);

  if (!company.website) {
    await prisma.company.update({
      where: { id: companyId },
      data: { websiteFound: false, websiteStatus: "MISSING" },
    });
    return { websiteFound: false, status: "MISSING" };
  }

  const url = normalizeUrl(company.website);
  let status: WebsiteStatus = "INACTIVE";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "GolaxProspectBot/1.0" },
    });
    clearTimeout(timeout);
    status = res.ok ? "ACTIVE" : "INACTIVE";
  } catch {
    status = "INACTIVE";
  }

  await prisma.company.update({
    where: { id: companyId },
    data: { website: url, websiteFound: true, websiteStatus: status },
  });

  return { websiteFound: true, status };
}
