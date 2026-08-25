import { ConvexError } from "convex/values";

/**
 * Extract a human-readable error message from a Convex error.
 * ConvexError stores the payload in `.data`, not `.message`.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ConvexError) {
    const data = error.data as Record<string, unknown>;
    if (typeof data?.message === "string") return data.message;
    if (typeof data === "string") return data;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
