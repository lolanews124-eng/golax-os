import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { createProjectSchema } from "./projects.schemas.js";
import * as projectController from "./projects.controller.js";

export const projectRouter = Router();

projectRouter.use(requireAuth);

projectRouter.post(
  "/",
  validateBody(createProjectSchema),
  asyncHandler(projectController.create),
);
projectRouter.get("/", asyncHandler(projectController.list));
projectRouter.get("/:id", asyncHandler(projectController.getOne));
projectRouter.delete("/:id", asyncHandler(projectController.remove));
projectRouter.post("/:id/start", asyncHandler(projectController.start));
projectRouter.get("/:id/progress", asyncHandler(projectController.progress));
