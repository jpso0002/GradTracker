import type { Request, Response, NextFunction } from "express";
import type { z } from "zod";

/**
 * Zod validation at the route boundary.
 *
 * Two properties the routes depend on:
 *
 *   - **Failure names the offending field.** The inline editor shows the error
 *     beneath the input the student is typing in, and never discards what they
 *     typed — which is impossible if the API only says "invalid request".
 *   - **Unknown fields are stripped, never persisted.** Zod's default `strip`
 *     behaviour, made explicit here because it is a security property: a
 *     client cannot smuggle `status` or `userId` into a PATCH body.
 */

export interface FieldError {
  error: string;
  field?: string;
}

/** First issue wins — the editor highlights one field at a time. */
function toFieldError(error: z.ZodError): FieldError {
  const issue = error.issues[0];
  if (!issue) return { error: "Invalid request." };

  const field = issue.path.filter((p) => typeof p === "string").join(".");
  return field ? { error: issue.message, field } : { error: issue.message };
}

export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json(toFieldError(result.error));
      return;
    }
    // Replaced with the PARSED value, so unknown keys are gone by the time any
    // route handler sees the body.
    req.body = result.data;
    next();
  };
}

export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json(toFieldError(result.error));
      return;
    }
    Object.defineProperty(req, "validatedQuery", { value: result.data, configurable: true });
    next();
  };
}

export function validated<T>(req: Request): T {
  return (req as Request & { validatedQuery: T }).validatedQuery;
}

/**
 * Central error handler.
 *
 * Errors are logged without their stack going to the client, and **never**
 * carry email content — the pipeline's own errors already carry only message
 * ids (see `ports/redact.ts`), and this is the last place that could undo it.
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error("[api]", message);
  res.status(500).json({ error: "Internal server error." });
}

/**
 * A route parameter as a string.
 *
 * Express 5 types `req.params` values as `string | string[]`, since a route
 * pattern can repeat a name. Ours never do, so this narrows once here rather
 * than casting at every call site.
 */
export function param(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}
