import type { Request, Response } from "express";
import { prisma } from "@golax/db";
import { ApiError } from "../../lib/errors.js";

export async function listLogs(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const projectId = req.query.projectId as string | undefined;
  const limit = Math.min(Number(req.query.limit ?? 100), 500);

  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) throw ApiError.notFound("Project not found");
  }

  const logs = await prisma.log.findMany({
    where: projectId ? { projectId } : { project: { userId } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  res.json({ logs });
}
