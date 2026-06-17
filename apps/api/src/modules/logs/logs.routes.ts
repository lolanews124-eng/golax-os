import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { listLogs } from "./logs.controller.js";

export const logsRouter = Router();

logsRouter.use(requireAuth);
logsRouter.get("/", asyncHandler(listLogs));
