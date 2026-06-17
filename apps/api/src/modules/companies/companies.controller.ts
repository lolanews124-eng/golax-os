import type { Request, Response } from "express";
import * as companyService from "./companies.service.js";
import { exportSchema, listCompaniesSchema } from "./companies.schemas.js";
import { toCsv, toXlsx } from "./export.js";

export async function list(req: Request, res: Response): Promise<void> {
  const query = listCompaniesSchema.parse(req.query);
  const result = await companyService.listCompanies(req.user!.id, query);
  res.json(result);
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const company = await companyService.getCompany(req.user!.id, req.params.id);
  res.json({ company });
}

export async function exportData(req: Request, res: Response): Promise<void> {
  const query = exportSchema.parse(req.query);
  const { rows, projectName } = await companyService.getExportRows(
    req.user!.id,
    query.projectId,
  );

  const safeName = projectName.replace(/[^a-z0-9]+/gi, "_").toLowerCase();

  if (query.format === "xlsx") {
    const buffer = await toXlsx(rows);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}_prospects.xlsx"`,
    );
    res.send(buffer);
    return;
  }

  const csv = toCsv(rows);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${safeName}_prospects.csv"`,
  );
  res.send(csv);
}
