import { prisma, type LogType } from "@golax/db";

function ts(): string {
  return new Date().toISOString();
}

export async function log(
  type: LogType,
  message: string,
  projectId?: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  const prefix = `[${ts()}] [${type}]`;
  if (type === "ERROR") console.error(prefix, message);
  else console.log(prefix, message);

  try {
    await prisma.log.create({
      data: {
        projectId: projectId ?? null,
        type,
        message,
        meta: meta ? (meta as object) : undefined,
      },
    });
  } catch {
    // Never let logging crash the pipeline.
  }
}

export const logger = {
  info: (msg: string, projectId?: string, meta?: Record<string, unknown>) =>
    log("INFO", msg, projectId, meta),
  search: (msg: string, projectId?: string, meta?: Record<string, unknown>) =>
    log("SEARCH", msg, projectId, meta),
  audit: (msg: string, projectId?: string, meta?: Record<string, unknown>) =>
    log("AUDIT", msg, projectId, meta),
  ai: (msg: string, projectId?: string, meta?: Record<string, unknown>) =>
    log("AI", msg, projectId, meta),
  error: (msg: string, projectId?: string, meta?: Record<string, unknown>) =>
    log("ERROR", msg, projectId, meta),
};
