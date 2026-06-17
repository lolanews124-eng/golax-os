"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { Project } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NewProjectPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    country: "",
    city: "",
    category: "",
    targetLeads: 100,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form, value: string | number) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { project } = await apiFetch<{ project: Project }>("/projects", {
        method: "POST",
        body: form,
      });
      // Kick off research immediately.
      await apiFetch(`/projects/${project.id}/start`, { method: "POST" });
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError((err as Error).message || "Failed to create project");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>New Research Project</CardTitle>
          <CardDescription>
            Define your target market and start automated research.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                required
                placeholder="Sydney Plumbers Q3"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={form.country}
                  onChange={(e) => update("country", e.target.value)}
                  required
                  placeholder="Australia"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                  required
                  placeholder="Sydney"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Business Category</Label>
                <Input
                  id="category"
                  value={form.category}
                  onChange={(e) => update("category", e.target.value)}
                  required
                  placeholder="Plumber"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetLeads">Number of Leads</Label>
                <Input
                  id="targetLeads"
                  type="number"
                  min={1}
                  max={500}
                  value={form.targetLeads}
                  onChange={(e) =>
                    update("targetLeads", Number(e.target.value))
                  }
                  required
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Starting…" : "Start Research"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
