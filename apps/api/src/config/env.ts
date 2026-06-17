import { config as loadEnv } from "dotenv";
import { z } from "zod";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load the monorepo root .env (apps/api/src/config -> ../../../../.env)
loadEnv({ path: path.resolve(__dirname, "../../../../.env") });

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  API_PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  JWT_ACCESS_SECRET: z.string().min(8, "JWT_ACCESS_SECRET too short"),
  JWT_REFRESH_SECRET: z.string().min(8, "JWT_REFRESH_SECRET too short"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "Invalid environment variables:",
    JSON.stringify(parsed.error.flatten().fieldErrors, null, 2),
  );
  throw new Error("Environment validation failed. Check your .env file.");
}

export const env = parsed.data;

export const corsOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());
