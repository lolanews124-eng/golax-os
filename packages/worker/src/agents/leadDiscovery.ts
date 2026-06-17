import { prisma } from "@golax/db";
import { discoverPlaces } from "../services/serper.js";
import { logger } from "../lib/logger.js";

// Module 3: discover businesses for a project and store them as companies.
export async function runLeadDiscovery(projectId: string): Promise<string[]> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error(`Project ${projectId} not found`);

  await logger.search(
    `Lead discovery: ${project.category} in ${project.city}, ${project.country}`,
    projectId,
  );

  const places = await discoverPlaces({
    category: project.category,
    city: project.city,
    country: project.country,
    limit: project.targetLeads,
  });

  const companyIds: string[] = [];
  for (const place of places) {
    const company = await prisma.company.create({
      data: {
        projectId,
        name: place.name,
        website: place.website ?? null,
        phone: place.phone ?? null,
        address: place.address ?? null,
        country: project.country,
        city: project.city,
        category: project.category,
        websiteFound: Boolean(place.website),
      },
    });
    companyIds.push(company.id);
  }

  await logger.search(
    `Lead discovery found ${companyIds.length} businesses`,
    projectId,
    { found: companyIds.length },
  );

  return companyIds;
}
