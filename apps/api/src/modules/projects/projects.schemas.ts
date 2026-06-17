import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(2, "Project name is required").max(120),
  country: z.string().min(2, "Country is required").max(80),
  city: z.string().min(1, "City is required").max(80),
  category: z.string().min(2, "Category is required").max(80),
  targetLeads: z.coerce
    .number()
    .int()
    .min(1, "At least 1 lead")
    .max(500, "Max 500 leads in V1"),
});

export const listProjectsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(["PENDING", "RUNNING", "COMPLETED", "FAILED"])
    .optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type ListProjectsInput = z.infer<typeof listProjectsSchema>;
