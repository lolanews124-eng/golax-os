import { prisma, type ProjectStatus } from "@golax/db";
import { ApiError } from "../../lib/errors.js";
import { publishResearchJob } from "../../lib/queue.js";
import type {
  CreateProjectInput,
  ListProjectsInput,
} from "./projects.schemas.js";

export async function createProject(
  userId: string,
  input: CreateProjectInput,
) {
  return prisma.project.create({
    data: {
      userId,
      name: input.name,
      country: input.country,
      city: input.city,
      category: input.category,
      targetLeads: input.targetLeads,
      status: "PENDING",
    },
  });
}

export async function listProjects(userId: string, input: ListProjectsInput) {
  const where = {
    userId,
    ...(input.status ? { status: input.status as ProjectStatus } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      include: {
        _count: { select: { companies: true } },
      },
    }),
    prisma.project.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.ceil(total / input.pageSize),
    },
  };
}

export async function getProject(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    include: {
      _count: { select: { companies: true, jobs: true } },
    },
  });
  if (!project) throw ApiError.notFound("Project not found");
  return project;
}

export async function deleteProject(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });
  if (!project) throw ApiError.notFound("Project not found");

  await prisma.project.delete({ where: { id: projectId } });
}

export async function startResearch(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });
  if (!project) throw ApiError.notFound("Project not found");
  if (project.status === "RUNNING") {
    throw ApiError.conflict("Research is already running for this project");
  }

  // Reset and mark as running. The worker picks up the LEAD_DISCOVERY job and
  // fans out the rest of the pipeline per company (wired in Phase 3).
  const updated = await prisma.$transaction(async (tx) => {
    const p = await tx.project.update({
      where: { id: projectId },
      data: { status: "RUNNING", progress: 0 },
    });
    await tx.job.create({
      data: {
        projectId,
        jobType: "LEAD_DISCOVERY",
        status: "PENDING",
      },
    });
    await tx.log.create({
      data: {
        projectId,
        type: "INFO",
        message: `Research started for "${p.name}" (${p.city}, ${p.country} / ${p.category})`,
      },
    });
    return p;
  });

  // Publish to pg-boss so the worker picks up the pipeline.
  await publishResearchJob(projectId);
  return updated;
}

export async function getProjectProgress(userId: string, projectId: string) {
  const project = await getProject(userId, projectId);

  const jobs = await prisma.job.groupBy({
    by: ["status"],
    where: { projectId },
    _count: true,
  });

  const counts = { PENDING: 0, RUNNING: 0, COMPLETED: 0, FAILED: 0 };
  for (const row of jobs) {
    counts[row.status] = row._count;
  }
  const totalJobs =
    counts.PENDING + counts.RUNNING + counts.COMPLETED + counts.FAILED;

  return {
    projectId: project.id,
    status: project.status,
    progress: project.progress,
    companies: project._count.companies,
    jobs: { ...counts, total: totalJobs },
  };
}
