import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  AppError,
  messageFromUnknownError,
  statusFromUnknownError,
} from "@/lib/api/errors";

export const jsonOk = <T>(data: T, status = 200): NextResponse =>
  NextResponse.json(data, { status });

export const jsonError = (message: string, status = 500): NextResponse =>
  NextResponse.json({ error: message }, { status });

type RouteHandler = (request: NextRequest) => Promise<NextResponse>;

/**
 * Shared try/catch + error JSON for App Router handlers.
 * Throw AppError for expected 4xx/5xx; other errors become 500 (or 404 if "not found").
 */
export const withHandler = (
  handler: RouteHandler,
  options?: { logLabel?: string; fallbackMessage?: string },
): RouteHandler => {
  return async (request) => {
    try {
      return await handler(request);
    } catch (error: unknown) {
      const message = messageFromUnknownError(
        error,
        options?.fallbackMessage ?? "Request failed",
      );
      const status = statusFromUnknownError(error);
      if (status >= 500) {
        console.error(
          options?.logLabel ? `${options.logLabel}:` : "API error:",
          error,
        );
      }
      return jsonError(message, status);
    }
  };
};

export { AppError };
