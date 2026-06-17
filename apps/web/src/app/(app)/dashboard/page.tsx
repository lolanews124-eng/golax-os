"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { Pagination, Project, Stats } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Briefcase,
  Building2,
  ClipboardCheck,
  Mail,
  Plus,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";

const STAT_CARDS = [
  { key: "projectsCreated", label: "Projects Created", icon: Briefcase },
  { key: "businessesFound", label: "Businesses Found", icon: Building2 },
  { key: "auditsCompleted", label: "Audits Completed", icon: ClipboardCheck },
  { key: "emailsFound", label: "Emails Found", icon: Mail },
  { key: "highOpportunityLeads", label: "High Opportunity", icon: Target },
  {
    key: "researchSuccessRate",
    label: "Success Rate",
    icon: TrendingUp,
    suffix: "%",
  },
] as const;

function statusVariant(status: Project["status"]) {
  switch (status) {
    case "COMPLETED":
      return "success" as const;
    case "RUNNING":
      return "warning" as const;
    case "FAILED":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [s, p] = await Promise.all([
      apiFetch<Stats>("/stats"),
      apiFetch<{ items: Project[]; pagination: Pagination }>("/projects"),
    ]);
    setStats(s);
    setProjects(p.items);
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  async function deleteProject(id: string, name: string) {
    if (!confirm(`Delete project "${name}"? This cannot be undone.`)) return;
    await apiFetch(`/projects/${id}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Your prospect research overview
          </p>
        </div>
        <Link href="/projects/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          const value = stats ? (stats[card.key] as number) : 0;
          return (
            <Card key={card.key}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs text-muted-foreground">
                  {card.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {value}
                  {"suffix" in card ? card.suffix : ""}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : projects.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No projects yet. Create your first one to start researching.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p) => (
                  <TableRow key={p.id} className="cursor-pointer">
                    <TableCell className="font-medium">
                      <Link href={`/projects/${p.id}`} className="hover:underline">
                        {p.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {p.city}, {p.country}
                    </TableCell>
                    <TableCell>{p.category}</TableCell>
                    <TableCell>
                      {p._count?.companies ?? 0}/{p.targetLeads}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                    </TableCell>
                    <TableCell>{p.progress}%</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteProject(p.id, p.name)}
                        aria-label="Delete project"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
