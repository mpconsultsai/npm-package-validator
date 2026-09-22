/**
 * Framework-free API error. Handlers throw this; adapters map to HTTP status.
 */
export class AppError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AppError";
    this.status = status;
  }
}

export const statusFromUnknownError = (
  error: unknown,
  fallback = 500,
): number => {
  if (error instanceof AppError) return error.status;
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/not found/i.test(message)) return 404;
  if (/GROQ_API_KEY|GROQ_UPGRADE_AGENT_MODEL|GROQ_MODEL|not configured/i.test(message)) {
    return 503;
  }
  return fallback;
};

export const messageFromUnknownError = (
  error: unknown,
  fallback = "Request failed",
): string => {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};
