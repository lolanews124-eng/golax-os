import { prisma, type JobType } from "@golax/db";
import { logger } from "./lib/logger.js";
import { runLeadDiscovery } from "./agents/leadDiscovery.js";
import { runWebsiteDiscovery } from "./agents/websiteDiscovery.js";
import { runContactExtraction } from "./agents/contactExtraction.js";
import { runTechnicalAudit } from "./agents/technicalAudit.js";
import { runSeoAudit } from "./agents/seoAudit.js";
import { runConversionAudit } from "./agents/conversionAudit.js";
import { runOpportunityScoring } from "./agents/scoring.js";
import { runRecommendation } from "./agents/recommendation.js";
import { runAiAnalysis } from "./agents/aiAnalysis.js";
import { runOutreach } from "./agents/outreach.js";
import { env } from "./config/env.js";

type Step = { type: JobType; run: (companyId: string) => Promise<unknown> };

const COMPANY_STEPS: Step[] = [
  { type: "WEBSITE_DISCOVERY", run: runWebsiteDiscovery },
  { type: "CONTACT_EXTRACTION", run: runContactExtraction },
  { type: "TECHNICAL_AUDIT", run: runTechnicalAudit },
  { type: "SEO_AUDIT", run: runSeoAudit },
  { type: "CONVERSION_AUDIT", run: runConversionAudit },
  { type: "OPPORTUNITY_SCORING", run: runOpportunityScoring },
  { type: "SERVICE_RECOMMENDATION", run: runRecommendation },
  { type: "AI_ANALYSIS", run: runAiAnalysis },
  { type: "OUTREACH_GENERATION", run: runOutreach },
];

async function processCompany(
  projectId: string,
  companyId: string,
): Promise<void> {
  for (const step of COMPANY_STEPS) {
    const job = await prisma.job.create({
      data: {
        projectId,
        companyId,
        jobType: step.type,
        status: "RUNNING",
        startedAt: new Date(),
      },
    });
    try {
      await step.run(companyId);
      await prisma.job.update({
        where: { id: job.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    } catch (err) {
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          error: (err as Error).message,
        },
      });
      await logger.error(
        `Step ${step.type} failed for company ${companyId}: ${(err as Error).message}`,
        projectId,
      );
      // Continue with the next step; one failure shouldn't abort the company.
    }
  }
}

// Simple concurrency-limited map.
async function mapLimit<T>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<void>,
  onProgress?: (done: number, total: number) => Promise<void>,
): Promise<void> {
  let index = 0;
  let done = 0;
  const total = items.length;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const current = index++;
      await fn(items[current], current);
      done++;
      if (onProgress) await onProgress(done, total);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
}

export async function runProjectPipeline(projectId: string): Promise<void> {
  await logger.info(`Pipeline started for project ${projectId}`, projectId);

  // Mark the seeded LEAD_DISCOVERY job (created by the API) as running.
  await prisma.job.updateMany({
    where: { projectId, jobType: "LEAD_DISCOVERY", status: "PENDING" },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  try {
    const companyIds = await runLeadDiscovery(projectId);

    await prisma.job.updateMany({
      where: { projectId, jobType: "LEAD_DISCOVERY", status: "RUNNING" },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    await mapLimit(
      companyIds,
      env.WORKER_CONCURRENCY,
      (companyId) => processCompany(projectId, companyId),
      async (doneCount, total) => {
        const progress = Math.round((doneCount / total) * 100);
        await prisma.project.update({
          where: { id: projectId },
          data: { progress },
        });
      },
    );

    await prisma.project.update({
      where: { id: projectId },
      data: { status: "COMPLETED", progress: 100 },
    });
    await logger.info(
      `Pipeline completed for project ${projectId} (${companyIds.length} companies)`,
      projectId,
    );
  } catch (err) {
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "FAILED" },
    });
    await logger.error(
      `Pipeline failed for project ${projectId}: ${(err as Error).message}`,
      projectId,
    );
    throw err;
  }
}
