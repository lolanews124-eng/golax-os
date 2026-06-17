import PgBoss from "pg-boss";
import { env } from "./config/env.js";

export const RESEARCH_QUEUE = "research-pipeline";

export interface ResearchJobData {
  projectId: string;
}

let boss: PgBoss | null = null;

export async function getBoss(): Promise<PgBoss> {
  if (boss) return boss;
  boss = new PgBoss({ connectionString: env.DATABASE_URL });
  boss.on("error", (err) => console.error("[pg-boss] error:", err));
  await boss.start();
  await boss.createQueue(RESEARCH_QUEUE);
  return boss;
}

export async function stopBoss(): Promise<void> {
  if (boss) {
    await boss.stop();
    boss = null;
  }
}
