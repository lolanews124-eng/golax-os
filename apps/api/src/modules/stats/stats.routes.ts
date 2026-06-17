import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { getStats } from "./stats.controller.js";

export const statsRouter = Router();

statsRouter.use(requireAuth);
statsRouter.get("/", asyncHandler(getStats));
