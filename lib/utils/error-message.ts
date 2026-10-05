import axios from "axios";

export function errorMessage(error: unknown, fallback = "Unknown error"): string {
  if (axios.isAxiosError(error)) {
    return error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export function axiosResponseStatus(error: unknown): number | undefined {
  if (axios.isAxiosError(error)) {
    return error.response?.status;
  }
  return undefined;
}
