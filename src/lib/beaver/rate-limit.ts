const WINDOW_MS = 60_000;

type Window = { start: number; count: number };

const windows = new Map<number, Window>();

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

// Fixed-window limiter, in-memory per project. Deliberately not backed by the DB —
// the whole point is to reject floods before they ever touch SQLite.
export function consumeRateLimit(
  projectId: number,
  limitPerMinute: number | null,
): RateLimitResult {
  if (!limitPerMinute || limitPerMinute <= 0) return { allowed: true };

  const now = Date.now();
  const existing = windows.get(projectId);

  if (!existing || now - existing.start >= WINDOW_MS) {
    windows.set(projectId, { start: now, count: 1 });
    return { allowed: true };
  }

  if (existing.count >= limitPerMinute) {
    const retryAfterSeconds = Math.ceil((existing.start + WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  existing.count++;
  return { allowed: true };
}
