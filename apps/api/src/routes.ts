import { Router } from "express";
import { authRouter } from "./modules/auth/auth.routes.js";
import { projectRouter } from "./modules/projects/projects.routes.js";
import { companyRouter } from "./modules/companies/companies.routes.js";
import { statsRouter } from "./modules/stats/stats.routes.js";
import { logsRouter } from "./modules/logs/logs.routes.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "golax-api", time: new Date().toISOString() });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/projects", projectRouter);
apiRouter.use("/companies", companyRouter);
apiRouter.use("/stats", statsRouter);
apiRouter.use("/logs", logsRouter);
