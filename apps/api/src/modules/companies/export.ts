import ExcelJS from "exceljs";
import type { ExportRow } from "./companies.service.js";

const HEADERS = [
  { key: "companyName", header: "Company Name" },
  { key: "website", header: "Website" },
  { key: "email", header: "Email" },
  { key: "phone", header: "Phone" },
  { key: "opportunityScore", header: "Opportunity Score" },
  { key: "recommendedService", header: "Recommended Service" },
  { key: "emailSubject", header: "Email Subject" },
  { key: "emailDraft", header: "Email Draft" },
] as const;

function escapeCsv(value: unknown): string {
  const str = String(value ?? "");
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(rows: ExportRow[]): string {
  const headerLine = HEADERS.map((h) => escapeCsv(h.header)).join(",");
  const lines = rows.map((row) =>
    HEADERS.map((h) => escapeCsv(row[h.key])).join(","),
  );
  return [headerLine, ...lines].join("\r\n");
}

export async function toXlsx(rows: ExportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Prospects");

  sheet.columns = HEADERS.map((h) => ({
    key: h.key,
    header: h.header,
    width: h.key === "emailDraft" ? 60 : 24,
  }));
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) sheet.addRow(row);

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
