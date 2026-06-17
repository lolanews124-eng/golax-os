import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import * as companyController from "./companies.controller.js";

export const companyRouter = Router();

companyRouter.use(requireAuth);

companyRouter.get("/export", asyncHandler(companyController.exportData));
companyRouter.get("/", asyncHandler(companyController.list));
companyRouter.get("/:id", asyncHandler(companyController.getOne));
