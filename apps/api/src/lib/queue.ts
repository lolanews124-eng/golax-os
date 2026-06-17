import PgBoss from "pg-boss";
import { env } from "../config/env.js";

export const RESEARCH_QUEUE = "research-pipeline";

let boss: PgBoss | null = null;
let starting: Promise<PgBoss> | null = null;

async function getBoss(): Promise<PgBoss> {
  if (boss) return boss;
  if (starting) return starting;

  starting = (async () => {
    const instance = new PgBoss({ connectionString: env.DATABASE_URL });
    instance.on("error", (err) => console.error("[pg-boss/api] error:", err));
    await instance.start();
    await instance.createQueue(RESEARCH_QUEUE);
    boss = instance;
    return instance;
  })();

  return starting;
}

// Publish a research job so the worker picks up the pipeline for a project.
export async function publishResearchJob(projectId: string): Promise<void> {
  const b = await getBoss();
  await b.send(RESEARCH_QUEUE, { projectId });
}
