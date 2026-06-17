"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch, downloadExport } from "@/lib/api";
import type {
  CompanyRow,
  LogEntry,
  Pagination,
  Project,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, FileSpreadsheet, Search } from "lucide-react";

const FILTERS = [
  { value: "", label: "All" },
  { value: "high_opportunity", label: "High Opportunity" },
  { value: "no_website", label: "No Website" },
  { value: "missing_contact_form", label: "No Contact Form" },
  { value: "no_email", label: "No Email" },
  { value: "poor_seo", label: "Poor SEO" },
];

function priorityBadge(p: string | null) {
  if (p === "HIGH") return "destructive" as const;
  if (p === "MEDIUM") return "warning" as const;
  return "secondary" as const;
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [project, setProject] = useState<Project | null>(null);
  const [rows, setRows] = useState<CompanyRow[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  const loadProject = useCallback(async () => {
    const { project } = await apiFetch<{ project: Project }>(
      `/projects/${projectId}`,
    );
    setProject(project);
    return project;
  }, [projectId]);

  const loadCompanies = useCallback(async () => {
    const query = new URLSearchParams({
      projectId,
      page: String(page),
      pageSize: "20",
    });
    if (search) query.set("search", search);
    if (filter) query.set("filter", filter);
    const data = await apiFetch<{
      items: CompanyRow[];
      pagination: Pagination;
    }>(`/companies?${query.toString()}`);
    setRows(data.items);
    setPagination(data.pagination);
    setLoading(false);
  }, [projectId, page, search, filter]);

  useEffect(() => {
    loadProject().catch(() => {});
  }, [loadProject]);

  useEffect(() => {
    loadCompanies().catch(() => setLoading(false));
  }, [loadCompanies]);

  // Poll while research is running.
  useEffect(() => {
    if (project?.status !== "RUNNING") return;
    const interval = setInterval(() => {
      loadProject().then((p) => {
        if (p.status !== "RUNNING") loadCompanies();
      });
      loadCompanies();
    }, 4000);
    return () => clearInterval(interval);
  }, [project?.status, loadProject, loadCompanies]);

  const loadLogs = useCallback(async () => {
    const data = await apiFetch<{ logs: LogEntry[] }>(
      `/logs?projectId=${projectId}&limit=200`,
    );
    setLogs(data.logs);
  }, [projectId]);

  useEffect(() => {
    if (showLogs) loadLogs().catch(() => {});
  }, [showLogs, loadLogs, project?.progress]);

  async function onExport(format: "csv" | "xlsx") {
    const ext = format === "xlsx" ? "xlsx" : "csv";
    await downloadExport(projectId, format, `prospects.${ext}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Back to dashboard
          </Link>
          <h1 className="text-2xl font-bold">{project?.name ?? "Project"}</h1>
          {project && (
            <p className="text-muted-foreground">
              {project.category} · {project.city}, {project.country} ·{" "}
              {project._count?.companies ?? 0}/{project.targetLeads} leads
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onExport("csv")}>
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" onClick={() => onExport("xlsx")}>
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
        </div>
      </div>

      {project?.status === "RUNNING" && (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-medium">Research in progress…</span>
              <span>{project.progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Results</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                placeholder="Search…"
                className="w-48 pl-8"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => {
                setPage(1);
                setFilter(e.target.value);
              }}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No companies yet.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Website</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Recommended</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/companies/${c.id}`}
                          className="hover:underline"
                        >
                          {c.name}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate">
                        {c.website ? (
                          <a
                            href={c.website}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline"
                          >
                            {c.website.replace(/^https?:\/\//, "")}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{c.email ?? "—"}</TableCell>
                      <TableCell>{c.phone ?? "—"}</TableCell>
                      <TableCell>
                        {c.opportunityScore != null ? (
                          <Badge variant={priorityBadge(c.priority)}>
                            {c.opportunityScore}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{c.recommendedService ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {pagination && pagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages} (
                    {pagination.total} total)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= pagination.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Activity Logs</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLogs((s) => !s)}
          >
            {showLogs ? "Hide" : "Show"}
          </Button>
        </CardHeader>
        {showLogs && (
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No logs yet.</p>
            ) : (
              <div className="max-h-80 space-y-1 overflow-auto font-mono text-xs">
                {logs.map((l) => (
                  <div key={l.id} className="flex gap-2">
                    <span className="text-muted-foreground">
                      {new Date(l.createdAt).toLocaleTimeString()}
                    </span>
                    <span
                      className={
                        l.type === "ERROR"
                          ? "text-destructive"
                          : "text-foreground"
                      }
                    >
                      [{l.type}]
                    </span>
                    <span>{l.message}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
