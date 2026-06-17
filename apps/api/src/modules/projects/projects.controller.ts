import type { Request, Response } from "express";
import * as projectService from "./projects.service.js";
import { listProjectsSchema } from "./projects.schemas.js";

export async function create(req: Request, res: Response): Promise<void> {
  const project = await projectService.createProject(req.user!.id, req.body);
  res.status(201).json({ project });
}

export async function list(req: Request, res: Response): Promise<void> {
  const query = listProjectsSchema.parse(req.query);
  const result = await projectService.listProjects(req.user!.id, query);
  res.json(result);
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const project = await projectService.getProject(req.user!.id, req.params.id);
  res.json({ project });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await projectService.deleteProject(req.user!.id, req.params.id);
  res.json({ success: true });
}

export async function start(req: Request, res: Response): Promise<void> {
  const project = await projectService.startResearch(
    req.user!.id,
    req.params.id,
  );
  res.json({ project });
}

export async function progress(req: Request, res: Response): Promise<void> {
  const result = await projectService.getProjectProgress(
    req.user!.id,
    req.params.id,
  );
  res.json(result);
}
