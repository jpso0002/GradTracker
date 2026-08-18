import {
  ListJobsResponseSchema,
  JobDetailResponseSchema,
  MeResponseSchema,
  ReviewItemSchema,
  SyncStatusResponseSchema,
  type ListJobsResponse,
  type JobDetailResponse,
  type MeResponse,
  type ReviewItem,
  type SyncStatusResponse,
  type UpdateJobBody,
  type ConfirmReviewBody,
  type Job,
  type JobStatus,
  type Stage,
} from "@gradtracker/shared";
import { z } from "zod";

/**
 * The typed API client (T5.3).
 *
 * Every type here comes from `@gradtracker/shared`. There is not one local
 * interface describing a server response — if the server's contract changes,
 * this file stops compiling, which is the entire point.
 *
 * Responses are also **parsed** at runtime, not just cast. A `fetch` that
 * returns something unexpected should fail loudly here, next to the request,
 * rather than three components deep as `undefined is not an object`.
 */

/** The browser's own timezone, sent on every request so the server ranks and
 *  computes `daysLeft` against the student's calendar, not the server's
 *  (defect C2). Resolved per-request: a student can cross a timezone. */
export function clientTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Australia/Melbourne";
  } catch {
    return "Australia/Melbourne";
  }
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Present on validation failures so an inline editor can attach the
     *  message to the offending input rather than showing a banner. */
    readonly field?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Thrown when the request never reached the server. Distinguishable from an
 *  `ApiError` so the UI can show the offline banner rather than an error. */
export class NetworkError extends Error {
  constructor(cause: unknown) {
    super("Could not reach GradTracker.");
    this.name = "NetworkError";
    this.cause = cause;
  }
}

const ErrorBodySchema = z.object({
  error: z.string(),
  field: z.string().optional(),
});

/** Generic over the schema, not its output type: a schema carrying a
 *  `.default()` has an input type that differs from its output, and
 *  `z.ZodType<T>` would collapse the two. */
async function request<S extends z.ZodTypeAny>(
  path: string,
  schema: S,
  init: RequestInit = {},
): Promise<z.infer<S>> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        "x-timezone": clientTimeZone(),
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch (cause) {
    throw new NetworkError(cause);
  }

  const text = await response.text();
  const body: unknown = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const parsed = ErrorBodySchema.safeParse(body);
    throw new ApiError(
      response.status,
      parsed.success ? parsed.data.error : response.statusText,
      parsed.success ? parsed.data.field : undefined,
    );
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ApiError(response.status, `Unexpected response from ${path}: ${result.error.message}`);
  }
  return result.data;
}

export interface ListJobsOptions {
  status?: JobStatus;
  /** Multi-select filter chips. Filters re-filter; they never re-sort. */
  stages?: Stage[];
}

export const api = {
  me(): Promise<MeResponse> {
    return request("/api/me", MeResponseSchema);
  },

  listJobs(options: ListJobsOptions = {}): Promise<ListJobsResponse> {
    const query = new URLSearchParams();
    if (options.status) query.set("status", options.status);
    for (const stage of options.stages ?? []) query.append("stage", stage);
    const suffix = query.toString();
    return request(`/api/jobs${suffix ? `?${suffix}` : ""}`, ListJobsResponseSchema);
  },

  getJob(id: string): Promise<JobDetailResponse> {
    return request(`/api/jobs/${encodeURIComponent(id)}`, JobDetailResponseSchema);
  },

  updateJob(id: string, patch: UpdateJobBody): Promise<{ job: Job; corrected: string[] }> {
    return request(
      `/api/jobs/${encodeURIComponent(id)}`,
      z.object({ job: JobDetailResponseSchema.shape.job, corrected: z.array(z.string()) }),
      { method: "PATCH", body: JSON.stringify(patch) },
    );
  },

  withdrawJob(id: string): Promise<{ ok: boolean }> {
    return request(`/api/jobs/${encodeURIComponent(id)}/withdraw`, z.object({ ok: z.boolean() }), {
      method: "POST",
    });
  },

  listReview(): Promise<{ items: ReviewItem[] }> {
    return request("/api/review", z.object({ items: z.array(ReviewItemSchema) }));
  },

  confirmReview(eventId: string, body: ConfirmReviewBody = {}): Promise<{ jobId: string; matched: boolean }> {
    return request(
      `/api/review/${encodeURIComponent(eventId)}/confirm`,
      z.object({ jobId: z.string(), matched: z.boolean() }),
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  dismissReview(eventId: string): Promise<{ ok: boolean }> {
    return request(
      `/api/review/${encodeURIComponent(eventId)}/dismiss`,
      z.object({ ok: z.boolean() }),
      { method: "POST" },
    );
  },

  syncStatus(): Promise<SyncStatusResponse> {
    return request("/api/sync/status", SyncStatusResponseSchema);
  },
};

export type Api = typeof api;
