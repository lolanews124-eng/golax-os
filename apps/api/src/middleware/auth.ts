import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../lib/errors.js";
import { verifyAccessToken } from "../lib/jwt.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw ApiError.unauthorized("Missing or invalid Authorization header");
  }

  const token = header.slice("Bearer ".length).trim();
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    throw ApiError.unauthorized("Invalid or expired access token");
  }
}
