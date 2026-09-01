export class FetchTimeoutError extends Error {
  constructor(message = "Request timed out") {
    super(message);
    this.name = "FetchTimeoutError";
  }
}

const RETRYABLE_STATUS = new Set([502, 503, 504]);

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      return;
    }
    const id = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

function mergeAbortSignals(...signals: (AbortSignal | undefined)[]): AbortSignal {
  const active = signals.filter((s): s is AbortSignal => Boolean(s));
  if (active.length === 0) return new AbortController().signal;
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any(active);
  }
  const controller = new AbortController();
  for (const signal of active) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener("abort", () => controller.abort(signal.reason), {
      once: true,
    });
  }
  return controller.signal;
}

function isRetryableNetworkError(err: unknown): boolean {
  if (err instanceof FetchTimeoutError) return true;
  if (err instanceof TypeError) {
    return (
      err.message === "Failed to fetch" ||
      err.message.includes("NetworkError") ||
      err.message.includes("network")
    );
  }
  return false;
}

export interface FetchJsonOptions {
  init?: RequestInit;
  signal?: AbortSignal;
  /** Per-attempt timeout (default 30s) */
  timeoutMs?: number;
  /** Retries after retryable failures (default 2) */
  retries?: number;
  /** Initial backoff in ms (default 1500) */
  retryDelayMs?: number;
}

export async function fetchJson<T = unknown>(
  url: string,
  options: FetchJsonOptions = {},
): Promise<{ ok: boolean; status: number; data: T }> {
  const {
    init,
    signal,
    timeoutMs = 30_000,
    retries = 2,
    retryDelayMs = 1500,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(
      () => timeoutController.abort(new FetchTimeoutError()),
      timeoutMs,
    );
    const mergedSignal = mergeAbortSignals(signal, timeoutController.signal);

    try {
      const response = await fetch(url, { ...init, signal: mergedSignal });
      clearTimeout(timeoutId);

      const data = (await response.json()) as T;
      const retryable = RETRYABLE_STATUS.has(response.status);

      if (!response.ok && retryable && attempt < retries) {
        await sleep(retryDelayMs * 2 ** attempt, signal);
        continue;
      }

      return { ok: response.ok, status: response.status, data };
    } catch (err) {
      clearTimeout(timeoutId);
      if (signal?.aborted) throw err;

      if (isRetryableNetworkError(err) && attempt < retries) {
        lastError = err;
        await sleep(retryDelayMs * 2 ** attempt, signal);
        continue;
      }
      throw err;
    }
  }

  throw lastError ?? new Error("Request failed");
}

export function friendlyFetchError(err: unknown): string {
  if (err instanceof FetchTimeoutError) {
    return "The request timed out. The server may be restarting — please try again.";
  }
  if (err instanceof TypeError && err.message === "Failed to fetch") {
    return "Could not reach the server. It may be restarting — please try again.";
  }
  if (err instanceof Error) return err.message;
  return "An unexpected error occurred";
}
