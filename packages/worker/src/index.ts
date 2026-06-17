import { prisma } from "@golax/db";
import { env } from "./config/env.js";
import {
  getBoss,
  RESEARCH_QUEUE,
  stopBoss,
  type ResearchJobData,
} from "./queue.js";
import { runProjectPipeline } from "./pipeline.js";
import { closeBrowser } from "./services/browser.js";
import { logger } from "./lib/logger.js";

async function main() {
  const boss = await getBoss();
  console.log(`[golax-worker] started (concurrency=${env.WORKER_CONCURRENCY})`);

  await boss.work<ResearchJobData>(
    RESEARCH_QUEUE,
    { batchSize: 1, pollingIntervalSeconds: 2 },
    async (jobs) => {
      for (const job of jobs) {
        const { projectId } = job.data;
        try {
          await runProjectPipeline(projectId);
        } catch (err) {
          await logger.error(
            `Research job failed: ${(err as Error).message}`,
            projectId,
          );
          throw err;
        }
      }
    },
  );

  // Recovery: re-enqueue any projects left RUNNING with a pending discovery job
  // (e.g. if the worker crashed or the API published before the worker booted).
  const stuck = await prisma.project.findMany({
    where: {
      status: "RUNNING",
      jobs: { some: { jobType: "LEAD_DISCOVERY", status: "PENDING" } },
    },
    select: { id: true },
  });
  for (const p of stuck) {
    await boss.send(RESEARCH_QUEUE, { projectId: p.id });
    console.log(`[golax-worker] re-enqueued stuck project ${p.id}`);
  }
}

async function shutdown(signal: string) {
  console.log(`\n[golax-worker] received ${signal}, shutting down...`);
  await closeBrowser();
  await stopBoss();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

main().catch((err) => {
  console.error("[golax-worker] fatal:", err);
  process.exit(1);
});
