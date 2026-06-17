import { z } from "zod";

export const FILTERS = [
  "high_opportunity",
  "no_website",
  "missing_contact_form",
  "no_email",
  "poor_seo",
] as const;

export const listCompaniesSchema = z.object({
  projectId: z.string().min(1, "projectId is required"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  filter: z.enum(FILTERS).optional(),
});

export const exportSchema = z.object({
  projectId: z.string().min(1, "projectId is required"),
  format: z.enum(["csv", "xlsx"]).default("csv"),
});

export type ListCompaniesInput = z.infer<typeof listCompaniesSchema>;
export type ExportInput = z.infer<typeof exportSchema>;
