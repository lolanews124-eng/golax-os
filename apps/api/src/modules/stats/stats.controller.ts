import type { Request, Response } from "express";
import { prisma } from "@golax/db";

// Dashboard statistics scoped to the authenticated user.
export async function getStats(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const companyWhere = { project: { userId } };

  const [
    projectsCreated,
    completedProjects,
    businessesFound,
    auditsCompleted,
    emailsFound,
    highOpportunityLeads,
  ] = await Promise.all([
    prisma.project.count({ where: { userId } }),
    prisma.project.count({ where: { userId, status: "COMPLETED" } }),
    prisma.company.count({ where: companyWhere }),
    prisma.technicalAudit.count({ where: { company: companyWhere } }),
    prisma.contact.count({
      where: { company: companyWhere, email: { not: null } },
    }),
    prisma.opportunity.count({
      where: { company: companyWhere, priority: "HIGH" },
    }),
  ]);

  const researchSuccessRate =
    projectsCreated > 0
      ? Math.round((completedProjects / projectsCreated) * 100)
      : 0;

  res.json({
    projectsCreated,
    businessesFound,
    auditsCompleted,
    emailsFound,
    highOpportunityLeads,
    researchSuccessRate,
  });
}
