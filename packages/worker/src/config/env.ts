import { config as loadEnv } from "dotenv";
import { z } from "zod";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, "../../../../.env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SERPER_API_KEY: z.string().default(""),
  GEMINI_API_KEY: z.string().default(""),
  GEMINI_MODEL: z.string().default("gemini-1.5-flash"),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(20).default(3),
  ENABLE_LIGHTHOUSE: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    "Invalid worker env:",
    JSON.stringify(parsed.error.flatten().fieldErrors, null, 2),
  );
  throw new Error("Worker environment validation failed.");
}

export const env = parsed.data;

export const hasSerper = env.SERPER_API_KEY.length > 0;
export const hasGemini = env.GEMINI_API_KEY.length > 0;
