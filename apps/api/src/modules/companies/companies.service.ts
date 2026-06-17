import { Prisma, prisma } from "@golax/db";
import { ApiError } from "../../lib/errors.js";
import type { ListCompaniesInput } from "./companies.schemas.js";

async function assertProjectOwner(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });
  if (!project) throw ApiError.notFound("Project not found");
  return project;
}

function buildFilterWhere(
  filter: ListCompaniesInput["filter"],
): Prisma.CompanyWhereInput {
  switch (filter) {
    case "high_opportunity":
      return { opportunity: { priority: "HIGH" } };
    case "no_website":
      return {
        OR: [{ websiteFound: false }, { websiteStatus: "MISSING" }],
      };
    case "missing_contact_form":
      return { conversionAudit: { contactForm: false } };
    case "no_email":
      return {
        OR: [{ contact: { is: null } }, { contact: { email: null } }],
      };
    case "poor_seo":
      return { seoAudit: { seoScore: { lt: 60 } } };
    default:
      return {};
  }
}

export async function listCompanies(
  userId: string,
  input: ListCompaniesInput,
) {
  await assertProjectOwner(userId, input.projectId);

  const where: Prisma.CompanyWhereInput = {
    projectId: input.projectId,
    ...buildFilterWhere(input.filter),
    ...(input.search
      ? {
          OR: [
            { name: { contains: input.search, mode: "insensitive" } },
            { website: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.company.findMany({
      where,
      orderBy: [{ opportunity: { score: "desc" } }, { name: "asc" }],
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      include: {
        contact: true,
        opportunity: true,
        recommendations: { take: 1 },
      },
    }),
    prisma.company.count({ where }),
  ]);

  return {
    items: items.map((c) => ({
      id: c.id,
      name: c.name,
      website: c.website,
      websiteStatus: c.websiteStatus,
      email: c.contact?.email ?? null,
      phone: c.contact?.phone ?? c.phone ?? null,
      opportunityScore: c.opportunity?.score ?? null,
      priority: c.opportunity?.priority ?? null,
      recommendedService: c.recommendations[0]?.service ?? null,
    })),
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.ceil(total / input.pageSize),
    },
  };
}

export async function getCompany(userId: string, companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      project: true,
      contact: true,
      technicalAudit: true,
      seoAudit: true,
      conversionAudit: true,
      opportunity: true,
      recommendations: true,
      aiAnalysis: true,
      outreach: true,
    },
  });
  if (!company || company.project.userId !== userId) {
    throw ApiError.notFound("Company not found");
  }
  return company;
}

export interface ExportRow {
  companyName: string;
  website: string;
  email: string;
  phone: string;
  opportunityScore: number | string;
  recommendedService: string;
  emailSubject: string;
  emailDraft: string;
}

export async function getExportRows(
  userId: string,
  projectId: string,
): Promise<{ rows: ExportRow[]; projectName: string }> {
  const project = await assertProjectOwner(userId, projectId);

  const companies = await prisma.company.findMany({
    where: { projectId },
    orderBy: { opportunity: { score: "desc" } },
    include: {
      contact: true,
      opportunity: true,
      recommendations: { take: 1 },
      outreach: true,
    },
  });

  const rows: ExportRow[] = companies.map((c) => ({
    companyName: c.name,
    website: c.website ?? "",
    email: c.contact?.email ?? "",
    phone: c.contact?.phone ?? c.phone ?? "",
    opportunityScore: c.opportunity?.score ?? "",
    recommendedService: c.recommendations[0]?.service ?? "",
    emailSubject: c.outreach?.emailSubject ?? "",
    emailDraft: c.outreach?.emailBody ?? "",
  }));

  return { rows, projectName: project.name };
}
