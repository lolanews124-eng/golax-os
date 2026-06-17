import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

// Validates and replaces req.body with the parsed result.
export function validateBody(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(result.error);
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(result.error);
      return;
    }
    // Express 4 req.query is read-only in some setups; attach parsed copy.
    (req as Request & { validatedQuery?: unknown }).validatedQuery =
      result.data;
    next();
  };
}
